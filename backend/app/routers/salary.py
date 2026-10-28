from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

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
    tags=["Salary Structures"]
)


# ============================================================
# CREATE SALARY STRUCTURE
# ============================================================

@router.post(
    "/",
    response_model=SalaryStructureResponse,
    status_code=status.HTTP_201_CREATED
)
def create_salary_structure(
    salary_data: SalaryStructureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            "Admin",
            "HR",
            "Payroll Manager"
        )
    )
):
    # --------------------------------------------------------
    # 1. Check employee
    # --------------------------------------------------------

    employee = (
        db.query(Employee)
        .filter(
            Employee.id == salary_data.employee_id
        )
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    # --------------------------------------------------------
    # 2. Create salary structure
    # --------------------------------------------------------

    salary_structure = SalaryStructure(
        employee_id=salary_data.employee_id,
        basic_salary=salary_data.basic_salary,
        allowances=salary_data.allowances,
        bonuses=salary_data.bonuses,
        deductions=salary_data.deductions,
        effective_from=salary_data.effective_from,
        effective_to=salary_data.effective_to,
    )

    db.add(salary_structure)

    db.commit()
    db.refresh(salary_structure)

    return salary_structure


# ============================================================
# GET SALARY STRUCTURES
# ============================================================

@router.get(
    "/",
    response_model=list[SalaryStructureResponse]
)
def get_salary_structures(
    employee_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            "Admin",
            "HR",
            "Payroll Manager"
        )
    )
):
    query = db.query(SalaryStructure)

    if employee_id:
        query = query.filter(
            SalaryStructure.employee_id == employee_id
        )

    return query.order_by(
        SalaryStructure.id.desc()
    ).all()


# ============================================================
# REVISE SALARY STRUCTURE
# ============================================================

@router.post(
    "/{salary_structure_id}/revise",
    response_model=SalaryStructureResponse,
    status_code=status.HTTP_201_CREATED
)
def revise_salary_structure(
    salary_structure_id: int,
    salary_data: SalaryStructureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            "Admin",
            "HR",
            "Payroll Manager"
        )
    )
):
    # --------------------------------------------------------
    # 1. Find current salary structure
    # --------------------------------------------------------

    current_salary = (
        db.query(SalaryStructure)
        .filter(
            SalaryStructure.id == salary_structure_id
        )
        .first()
    )

    if not current_salary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salary structure not found"
        )

    # --------------------------------------------------------
    # 2. Employee cannot change during revision
    # --------------------------------------------------------

    if (
        current_salary.employee_id
        != salary_data.employee_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Employee ID cannot be changed "
                "during salary revision"
            )
        )

    # --------------------------------------------------------
    # 3. Effective date validation
    # --------------------------------------------------------

    if (
        salary_data.effective_from
        <= current_salary.effective_from
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "New effective date must be after "
                "the current effective date"
            )
        )

    # --------------------------------------------------------
    # 4. Close previous salary structure
    # --------------------------------------------------------

    current_salary.effective_to = (
        salary_data.effective_from
    )

    # --------------------------------------------------------
    # 5. Create new salary structure
    # --------------------------------------------------------

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

    # Flush so new_salary.id is available
    db.flush()

    # --------------------------------------------------------
    # 6. Check salary increase alert
    # --------------------------------------------------------

    salary_alert = check_salary_increase_alert(
        db=db,
        employee_id=salary_data.employee_id,
        new_salary=new_salary.basic_salary,
        current_salary_structure_id=new_salary.id,
    )

    # --------------------------------------------------------
    # 7. Notify HR/Admin if threshold exceeded
    # --------------------------------------------------------

    if salary_alert:

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
                title="Salary Increase Alert",
                message=(
                    f"Employee "
                    f"{salary_data.employee_id} "
                    f"received a "
                    f"{salary_alert['increase_percentage']}% "
                    f"salary increase. "
                    f"Previous basic salary: ₹"
                    f"{salary_alert['previous_salary']}. "
                    f"New basic salary: ₹"
                    f"{salary_alert['new_salary']}. "
                    f"Alert threshold: "
                    f"{salary_alert['threshold']}%."
                ),
                notification_key=(
                    f"salary_increase_"
                    f"{new_salary.id}_"
                    f"user_{user.id}"
                ),
            )

    # --------------------------------------------------------
    # 8. Commit salary + notifications together
    # --------------------------------------------------------

    db.commit()
    db.refresh(new_salary)

    return new_salary