
from datetime import timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.dependencies.roles import require_role

from app.models.salary_structure import SalaryStructure
from app.models.employee import Employee
from app.models.user import User

from app.schemas.salary import (
    SalaryStructureCreate,
    SalaryStructureResponse,
)

from app.services.alert_service import (
    check_salary_increase_alert,
)

from app.services.notification import (
    create_notification,
)


router = APIRouter(
    prefix="/salary-structures",
    tags=["Salary Structures"],
)


# ============================================================
# HELPER: BUILD SALARY RESPONSE WITH EMPLOYEE DETAILS
# ============================================================

def build_salary_response(salary, employee):
    return {
        "id": salary.id,
        "employee_id": salary.employee_id,
        "basic_salary": salary.basic_salary,
        "allowances": salary.allowances,
        "bonuses": salary.bonuses,
        "deductions": salary.deductions,
        "effective_from": salary.effective_from,
        "effective_to": salary.effective_to,
        "employee_name": employee.name,
        "employee_code": employee.employee_id,
        "employee_department": employee.department,
    }


# ============================================================
# HELPER: VALIDATE EFFECTIVE DATES
# ============================================================

def validate_salary_dates(start_date, end_date):
    if end_date and end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Effective-to date cannot be before effective-from date.",
        )


# ============================================================
# HELPER: CHECK SALARY PERIOD OVERLAPS
# ============================================================

def check_salary_overlap(
    db,
    employee_id,
    start_date,
    end_date,
    exclude_id=None,
):
    existing_records = (
        db.query(SalaryStructure)
        .filter(
            SalaryStructure.employee_id == employee_id
        )
        .all()
    )

    for record in existing_records:

        if record.id == exclude_id:
            continue

        existing_end = record.effective_to

        new_end = end_date

        # Both date ranges are treated as inclusive.
        existing_starts_before_new_ends = (
            new_end is None
            or record.effective_from <= new_end
        )

        new_starts_before_existing_ends = (
            existing_end is None
            or start_date <= existing_end
        )

        if (
            existing_starts_before_new_ends
            and new_starts_before_existing_ends
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "This salary period overlaps with an "
                    "existing salary structure for this employee."
                ),
            )


# ============================================================
# CREATE SALARY STRUCTURE
# ============================================================

@router.post(
    "/",
    response_model=SalaryStructureResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_salary_structure(
    salary_data: SalaryStructureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("Admin", "HR", "Payroll Manager")
    ),
):
    employee = (
        db.query(Employee)
        .filter(Employee.id == salary_data.employee_id)
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found.",
        )

    validate_salary_dates(
        salary_data.effective_from,
        salary_data.effective_to,
    )

    check_salary_overlap(
        db=db,
        employee_id=salary_data.employee_id,
        start_date=salary_data.effective_from,
        end_date=salary_data.effective_to,
    )

    salary = SalaryStructure(
        employee_id=salary_data.employee_id,
        basic_salary=salary_data.basic_salary,
        allowances=salary_data.allowances,
        bonuses=salary_data.bonuses,
        deductions=salary_data.deductions,
        effective_from=salary_data.effective_from,
        effective_to=salary_data.effective_to,
    )

    try:
        db.add(salary)
        db.commit()
        db.refresh(salary)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A salary structure already exists for this employee and effective date.",
        )

    return build_salary_response(salary, employee)


# ============================================================
# GET SALARY STRUCTURES
# ============================================================

@router.get(
    "/",
    response_model=list[SalaryStructureResponse],
)
def get_salary_structures(
    employee_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("Admin", "HR", "Payroll Manager")
    ),
):
    query = (
        db.query(SalaryStructure, Employee)
        .join(
            Employee,
            SalaryStructure.employee_id == Employee.id,
        )
    )

    if employee_id is not None:
        query = query.filter(
            SalaryStructure.employee_id == employee_id
        )

    records = (
        query
        .order_by(SalaryStructure.id.desc())
        .all()
    )

    return [
        build_salary_response(salary, employee)
        for salary, employee in records
    ]


# ============================================================
# REVISE SALARY STRUCTURE
# ============================================================

@router.post(
    "/{salary_structure_id}/revise",
    response_model=SalaryStructureResponse,
    status_code=status.HTTP_201_CREATED,
)
def revise_salary_structure(
    salary_structure_id: int,
    salary_data: SalaryStructureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("Admin", "HR", "Payroll Manager")
    ),
):
    current_salary = (
        db.query(SalaryStructure)
        .filter(
            SalaryStructure.id == salary_structure_id
        )
        .with_for_update()
        .first()
    )

    if not current_salary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salary structure not found.",
        )

    if current_salary.employee_id != salary_data.employee_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee cannot be changed during salary revision.",
        )

    if current_salary.effective_to is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only an open-ended salary structure can be revised.",
        )

    if salary_data.effective_from <= current_salary.effective_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New effective date must be after the current effective date.",
        )

    validate_salary_dates(
        salary_data.effective_from,
        salary_data.effective_to,
    )

    check_salary_overlap(
        db=db,
        employee_id=current_salary.employee_id,
        start_date=salary_data.effective_from,
        end_date=salary_data.effective_to,
        exclude_id=current_salary.id,
    )

    employee = (
        db.query(Employee)
        .filter(Employee.id == current_salary.employee_id)
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found.",
        )

    try:
        # Close the previous structure one day before
        # the new structure becomes effective.
        current_salary.effective_to = (
            salary_data.effective_from - timedelta(days=1)
        )

        new_salary = SalaryStructure(
            employee_id=salary_data.employee_id,
            basic_salary=salary_data.basic_salary,
            allowances=salary_data.allowances,
            bonuses=salary_data.bonuses,
            deductions=salary_data.deductions,
            effective_from=salary_data.effective_from,
            effective_to=salary_data.effective_to,
        )

        db.add(new_salary)
        db.flush()

        # Check salary increase alert.
        salary_alert = check_salary_increase_alert(
            db=db,
            employee_id=salary_data.employee_id,
            new_salary=salary_data.basic_salary,
            current_salary_structure_id=new_salary.id,
        )

        if salary_alert:

            approvers = (
                db.query(User)
                .filter(
                    User.role.in_(["Admin", "HR"]),
                    User.is_active.is_(True),
                )
                .all()
            )

            for user in approvers:

                create_notification(
                    db=db,
                    user_id=user.id,
                    title="Salary Increase Alert",
                    message=(
                        f"{employee.name} "
                        f"({employee.employee_id}) received a "
                        f"{salary_alert['increase_percentage']}% "
                        f"basic salary increase. "
                        f"Previous basic salary: "
                        f"₹{salary_alert['previous_salary']}. "
                        f"New basic salary: "
                        f"₹{salary_alert['new_salary']}. "
                        f"Alert threshold: "
                        f"{salary_alert['threshold']}%."
                    ),
                    notification_key=(
                        f"salary_increase_{new_salary.id}_user_{user.id}"
                    ),
                )

        db.commit()
        db.refresh(new_salary)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Salary revision conflicts with an existing salary record.",
        )

    return build_salary_response(new_salary, employee)
