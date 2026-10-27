from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.roles import require_role
from app.models.employee import Employee
from app.models.user import User
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse
)


router = APIRouter(
    prefix="/employees",
    tags=["Employees"]
)


@router.post(
    "/",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED
)
def create_employee(
    employee_data: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "HR"))
):
    existing_employee_id = (
        db.query(Employee)
        .filter(Employee.employee_id == employee_data.employee_id)
        .first()
    )

    if existing_employee_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee ID already exists"
        )

    existing_email = (
        db.query(Employee)
        .filter(Employee.email == employee_data.email)
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee email already exists"
        )

    employee = Employee(
        employee_id=employee_data.employee_id,
        name=employee_data.name,
        email=employee_data.email,
        department=employee_data.department,
        joining_date=employee_data.joining_date,
        employment_status=employee_data.employment_status,
        is_active=True,
    )

    db.add(employee)
    db.commit()
    db.refresh(employee)

    return employee
@router.get(
    "/",
    response_model=list[EmployeeResponse]
)
def get_employees(
    department: str | None = None,
    employment_status: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "HR"))
):
    query = db.query(Employee)

    if department:
        query = query.filter(
            Employee.department == department
        )

    if employment_status:
        query = query.filter(
            Employee.employment_status == employment_status
        )

    if search:
        search_pattern = f"%{search}%"

        query = query.filter(
            (Employee.name.ilike(search_pattern))
            | (Employee.employee_id.ilike(search_pattern))
            | (Employee.email.ilike(search_pattern))
        )

    return query.order_by(Employee.id.desc()).all()
@router.put(
    "/{employee_id}",
    response_model=EmployeeResponse
)
def update_employee(
    employee_id: int,
    employee_data: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "HR"))
):
    employee = (
        db.query(Employee)
        .filter(Employee.id == employee_id)
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    if employee_data.email is not None:
        existing_email = (
            db.query(Employee)
            .filter(
                Employee.email == employee_data.email,
                Employee.id != employee_id
            )
            .first()
        )

        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee email already exists"
            )

    update_data = employee_data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(employee, field, value)

    db.commit()
    db.refresh(employee)

    return employee
@router.patch(
    "/{employee_id}/deactivate",
    response_model=EmployeeResponse
)
def deactivate_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "HR"))
):
    employee = (
        db.query(Employee)
        .filter(Employee.id == employee_id)
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    employee.is_active = False
    employee.employment_status = "Inactive"

    db.commit()
    db.refresh(employee)

    return employee