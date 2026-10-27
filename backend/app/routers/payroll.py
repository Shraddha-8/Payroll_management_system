from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.roles import require_role
from app.models.employee import Employee
from app.models.payroll import Payroll
from app.models.user import User
from app.schemas import payroll
from app.schemas.payroll import (
    PayrollCreate,
    PayrollResponse,
)
from app.services.payroll_calculator import calculate_payroll
from app.services.audit import create_audit_log
from app.services.notification import create_notification
from app.services.alert_service import check_payroll_change_alert
from app.services.transaction import commit_transaction
from sqlalchemy.exc import IntegrityError


router = APIRouter(
    prefix="/payroll",
    tags=["Payroll"]
)


# ============================================================
# CREATE PAYROLL
# ============================================================

@router.post(
    "/",
    response_model=PayrollResponse,
    status_code=status.HTTP_201_CREATED
)
def create_payroll(
    payroll_data: PayrollCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("Admin", "HR")
    )
):
    # 1. Check employee exists
    employee = (
        db.query(Employee)
        .filter(
            Employee.id == payroll_data.employee_id
        )
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    if not employee.is_active:
        raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Cannot create payroll for an inactive employee"
    )

    # 2. Prevent duplicate payroll
    existing_payroll = (
        db.query(Payroll)
        .filter(
            Payroll.employee_id == payroll_data.employee_id,
            Payroll.payroll_month == payroll_data.payroll_month
        )
        .first()
    )

    if existing_payroll:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payroll already exists for this employee and month"
        )

    # 3. Calculate payroll
    try:
        calculation = calculate_payroll(
            db=db,
            employee_id=payroll_data.employee_id,
            payroll_month=payroll_data.payroll_month,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )

    # 4. Create payroll record
    payroll = Payroll(
        employee_id=payroll_data.employee_id,
        payroll_month=payroll_data.payroll_month,

        basic_salary=calculation["basic_salary"],
        allowances=calculation["allowances"],
        bonuses=calculation["bonuses"],
        deductions=calculation["deductions"],

        unpaid_leave_deduction=(
            calculation["unpaid_leave_deduction"]
        ),

        gross_salary=calculation["gross_salary"],
        net_salary=calculation["net_salary"],

        status="Calculated",
    )

    db.add(payroll)

    # Flush so payroll.id is generated
    db.flush()

    # 5. Create audit log
    create_audit_log(
        db=db,
        user_id=current_user.id,
        action="CREATE",
        entity_type="Payroll",
        entity_id=payroll.id,
        details=(
            f"Payroll created for employee "
            f"{payroll.employee_id} for "
            f"{payroll.payroll_month}"
        ),
    )

    # 6. Commit payroll + audit log together
    db.commit()
    db.refresh(payroll)

    return payroll


# ============================================================
# GET PAYROLLS
# ============================================================

@router.get(
    "/",
    response_model=list[PayrollResponse]
)
def get_payrolls(
    employee_id: int | None = None,
    payroll_month: date | None = None,
    payroll_status: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("Admin", "HR")
    )
):
    query = db.query(Payroll)

    if employee_id:
        query = query.filter(
            Payroll.employee_id == employee_id
        )

    if payroll_month:
        query = query.filter(
            Payroll.payroll_month == payroll_month
        )

    if payroll_status:
        query = query.filter(
            Payroll.status == payroll_status
        )

    return query.order_by(
        Payroll.id.desc()
    ).all()


# ============================================================
# SUBMIT PAYROLL FOR APPROVAL
# ============================================================

@router.patch(
    "/{payroll_id}/submit",
    response_model=PayrollResponse
)
def submit_payroll(
    payroll_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("Admin", "HR")
    )
):
    payroll = (
        db.query(Payroll)
        .filter(Payroll.id == payroll_id)
        .first()
    )

    if not payroll:
        raise HTTPException(
            status_code=404,
            detail="Payroll not found"
        )

    if payroll.status != "Calculated":
        raise HTTPException(
            status_code=400,
            detail="Only calculated payroll can be submitted for approval"
        )

    payroll.status = "Pending Approval"

    # Audit log
    create_audit_log(
        db=db,
        user_id=current_user.id,
        action="SUBMIT",
        entity_type="Payroll",
        entity_id=payroll.id,
        details="Payroll submitted for approval",
    )

    db.commit()
    db.refresh(payroll)

    return payroll


# ============================================================
# APPROVE / REJECT PAYROLL
# ============================================================

@router.patch(
    "/{payroll_id}/decision",
    response_model=PayrollResponse
)
def decide_payroll(
    payroll_id: int,
    decision: str,
    rejection_reason: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("Admin", "HR")
    )
):
    payroll = (
        db.query(Payroll)
        .filter(Payroll.id == payroll_id)
        .first()
    )

    if not payroll:
        raise HTTPException(
            status_code=404,
            detail="Payroll not found"
        )

    if payroll.status != "Pending Approval":
        raise HTTPException(
            status_code=400,
            detail="Only pending payroll can be approved or rejected"
        )

    if decision not in ["Approved", "Rejected"]:
        raise HTTPException(
            status_code=400,
            detail="Decision must be Approved or Rejected"
        )

    if decision == "Rejected" and not rejection_reason:
        raise HTTPException(
            status_code=400,
            detail="Rejection reason is required"
        )

    payroll.status = decision

    if decision == "Rejected":
        payroll.rejection_reason = rejection_reason
    else:
        payroll.rejection_reason = None

    # --------------------------------------------------------
    # Find employee/user for notification
    # --------------------------------------------------------

    employee = (
        db.query(Employee)
        .filter(
            Employee.id == payroll.employee_id
        )
        .first()
    )

    # --------------------------------------------------------
    # Audit + Notification
    # --------------------------------------------------------

    if decision == "Approved":

        action = "APPROVE"
        details = "Payroll approved"

        # Send notification to employee
        if employee and employee.user_id:
            create_notification(
                db=db,
                user_id=employee.user_id,
                title="Payroll Approved",
                message=(
                    f"Your payroll for "
                    f"{payroll.payroll_month} has been approved."
                ),
            )

    else:

        action = "REJECT"
        details = (
            f"Payroll rejected. "
            f"Reason: {rejection_reason}"
        )

        # Send notification to employee
        if employee and employee.user_id:
            create_notification(
                db=db,
                user_id=employee.user_id,
                title="Payroll Rejected",
                message=(
                    f"Your payroll for "
                    f"{payroll.payroll_month} has been rejected. "
                    f"Reason: {rejection_reason}"
                ),
            )

    # Create audit log
    create_audit_log(
        db=db,
        user_id=current_user.id,
        action=action,
        entity_type="Payroll",
        entity_id=payroll.id,
        details=details,
    )

    # Commit payroll + notification + audit log together
    db.commit()
    db.refresh(payroll)

    return payroll


# ============================================================
# FINALIZE PAYROLL
# ============================================================

@router.patch(
    "/{payroll_id}/finalize",
    response_model=PayrollResponse
)
def finalize_payroll(
    payroll_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("Admin", "HR")
    )
):
    payroll = (
        db.query(Payroll)
        .filter(Payroll.id == payroll_id)
        .first()
    )

    if not payroll:
        raise HTTPException(
            status_code=404,
            detail="Payroll not found"
        )

    if payroll.status != "Approved":
        raise HTTPException(
            status_code=400,
            detail="Only approved payroll can be finalized"
        )

    # --------------------------------------------------------
    # Check month-over-month payroll change
    # --------------------------------------------------------
    payroll_alert = check_payroll_change_alert(
        db=db,
        employee_id=payroll.employee_id,
        current_payroll_month=payroll.payroll_month,
        current_net_salary=payroll.net_salary,
    )

    payroll.status = "Finalized"
    payroll.finalized_at = date.today()

    # --------------------------------------------------------
    # Create notification for significant salary change
    # --------------------------------------------------------
    if payroll_alert:
        employee = (
            db.query(Employee)
            .filter(Employee.id == payroll.employee_id)
            .first()
        )

        if employee and employee.user_id:
            create_notification(
                db=db,
                user_id=employee.user_id,
                title="Payroll Change Alert",
                message=(
                    f"Your net salary changed by "
                    f"{payroll_alert['change_percentage']}% "
                    f"compared with the previous finalized payroll. "
                    f"Previous: ₹"
                    f"{payroll_alert['previous_net_salary']}. "
                    f"Current: ₹"
                    f"{payroll_alert['current_net_salary']}."
                ),
            )

        # Also notify active Admin and HR users
        hr_admin_users = (
            db.query(User)
            .filter(
                User.role.in_(["Admin", "HR"]),
                User.is_active == True
            )
            .all()
        )

        for user in hr_admin_users:
            create_notification(
                db=db,
                user_id=user.id,
                title="Payroll Change Alert",
                message=(
                    f"Employee {payroll.employee_id} has a "
                    f"{payroll_alert['change_percentage']}% "
                    f"change in net salary compared with the "
                    f"previous finalized payroll."
                ),
            )

    # --------------------------------------------------------
    # Audit log
    # --------------------------------------------------------
    create_audit_log(
        db=db,
        user_id=current_user.id,
        action="FINALIZE",
        entity_type="Payroll",
        entity_id=payroll.id,
        details="Payroll finalized",
    )

    # Commit payroll + notifications + audit together
    try:
        commit_transaction(db)
    except IntegrityError:
        db.rollback()
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Payroll finalization failed due to a database conflict"
    )

    db.refresh(payroll)
    return payroll