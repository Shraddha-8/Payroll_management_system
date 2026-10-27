from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class PayrollBase(BaseModel):
    employee_id: int
    payroll_month: date


class PayrollCreate(PayrollBase):
    pass


class PayrollResponse(PayrollBase):
    id: int

    basic_salary: Decimal
    allowances: Decimal
    bonuses: Decimal
    deductions: Decimal
    unpaid_leave_deduction: Decimal

    gross_salary: Decimal
    net_salary: Decimal

    status: str
    rejection_reason: str | None = None
    finalized_at: date | None = None

    model_config = ConfigDict(from_attributes=True)