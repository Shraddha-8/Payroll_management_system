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
from app.services.alert_service import check_salary_increase_alert
from app.services.notification import create_notification


router = APIRouter(
    prefix="/salary-structures",
    tags=["Salary Structures"]
)


@router.post(
    "/",
    response_model=SalaryStructureResponse,
    status_code=status.HTTP_201_CREATED
)
def create_salary_structure(
    salary_data: SalaryStructureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "HR"))
):
    employee = (
        db.query(Employee)
        .filter(Employee.id == salary_data.employee_id)
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

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


@router.get(
    "/",
    response_model=list[SalaryStructureResponse]
)
def get_salary_structures(
    employee_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "HR"))
):
    query = db.query(SalaryStructure)

    if employee_id:
        query = query.filter(
            SalaryStructure.employee_id == employee_id
        )

    return query.order_by(
        SalaryStructure.id.desc()
    ).all()


@router.post(
    "/{salary_structure_id}/revise",
    response_model=SalaryStructureResponse,
    status_code=status.HTTP_201_CREATED
)
def revise_salary_structure(
    salary_structure_id: int,
    salary_data: SalaryStructureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "HR"))
):
    current_salary = (
        db.query(SalaryStructure)
        .filter(SalaryStructure.id == salary_structure_id)
        .first()
    )

    if not current_salary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salary structure not found"
        )

    if current_salary.employee_id != salary_data.employee_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee ID cannot be changed during salary revision"
        )

    if (
        salary_data.effective_from
        <= current_salary.effective_from
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New effective date must be after the current effective date"
        )

    current_salary.effective_to = salary_data.effective_from

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

    salary_alert = check_salary_increase_alert(
        db=db,
        employee_id=salary_data.employee_id,
        new_salary=new_salary.basic_salary,
        current_salary_structure_id=new_salary.id,
    )

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
                f"Employee {salary_data.employee_id} received a "
                f"{salary_alert['increase_percentage']}% salary increase. "
                f"Previous basic salary: ₹{salary_alert['previous_salary']}. "
                f"New basic salary: ₹{salary_alert['new_salary']}."
            ),
        )

    db.commit()
    db.refresh(new_salary)

    return new_salary