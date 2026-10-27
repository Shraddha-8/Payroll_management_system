from datetime import date

from pydantic import BaseModel, ConfigDict


class LeaveRequestBase(BaseModel):
    employee_id: int
    start_date: date
    end_date: date
    reason: str


class LeaveRequestCreate(LeaveRequestBase):
    pass


class LeaveRequestUpdate(BaseModel):
    start_date: date | None = None
    end_date: date | None = None
    reason: str | None = None


class LeaveRequestResponse(LeaveRequestBase):
    id: int
    status: str
    rejection_reason: str | None = None

    model_config = ConfigDict(from_attributes=True)