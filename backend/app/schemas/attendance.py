from datetime import date

from pydantic import BaseModel, ConfigDict


class AttendanceBase(BaseModel):
    employee_id: int
    attendance_date: date
    status: str
    remarks: str | None = None


class AttendanceCreate(AttendanceBase):
    pass


class AttendanceUpdate(BaseModel):
    attendance_date: date | None = None
    status: str | None = None
    remarks: str | None = None


class AttendanceResponse(AttendanceBase):
    id: int

    model_config = ConfigDict(from_attributes=True)