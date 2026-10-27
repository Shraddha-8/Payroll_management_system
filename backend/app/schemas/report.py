from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class PayrollSummaryResponse(BaseModel):
    payroll_month: date
    total_employees: int
    total_gross_salary: Decimal
    total_deductions: Decimal
    total_unpaid_leave_deduction: Decimal
    total_net_salary: Decimal


class DepartmentPayrollSummary(BaseModel):
    department: str
    total_employees: int
    total_gross_salary: Decimal
    total_deductions: Decimal
    total_net_salary: Decimal