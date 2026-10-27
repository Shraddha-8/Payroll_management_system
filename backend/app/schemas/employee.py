from datetime import date

from pydantic import BaseModel, EmailStr, ConfigDict


class EmployeeBase(BaseModel):
    employee_id: str
    name: str
    email: EmailStr
    department: str
    joining_date: date
    employment_status: str = "Active"


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    department: str | None = None
    joining_date: date | None = None
    employment_status: str | None = None


class EmployeeResponse(EmployeeBase):
    id: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)