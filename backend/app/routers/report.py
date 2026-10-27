import csv
from io import StringIO

from fastapi.responses import StreamingResponse
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.roles import require_role
from app.models.employee import Employee
from app.models.payroll import Payroll
from app.models.user import User
from app.schemas.report import (
    PayrollSummaryResponse,
    DepartmentPayrollSummary,
)


router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get(
    "/payroll-summary",
    response_model=PayrollSummaryResponse,
)
def get_payroll_summary(
    payroll_month: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "HR")),
):
    payrolls = (
        db.query(Payroll)
        .filter(
            Payroll.payroll_month == payroll_month,
            Payroll.status == "Finalized",
        )
        .all()
    )

    total_employees = len(payrolls)

    total_gross_salary = sum(
        (payroll.gross_salary for payroll in payrolls),
        Decimal("0.00"),
    )

    total_deductions = sum(
        (payroll.deductions for payroll in payrolls),
        Decimal("0.00"),
    )

    total_unpaid_leave_deduction = sum(
        (payroll.unpaid_leave_deduction for payroll in payrolls),
        Decimal("0.00"),
    )

    total_net_salary = sum(
        (payroll.net_salary for payroll in payrolls),
        Decimal("0.00"),
    )

    return PayrollSummaryResponse(
        payroll_month=payroll_month,
        total_employees=total_employees,
        total_gross_salary=total_gross_salary,
        total_deductions=total_deductions,
        total_unpaid_leave_deduction=total_unpaid_leave_deduction,
        total_net_salary=total_net_salary,
    )


@router.get(
    "/department-summary",
    response_model=list[DepartmentPayrollSummary],
)
def get_department_summary(
    payroll_month: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "HR")),
):
    payroll_data = (
        db.query(Payroll, Employee)
        .join(
            Employee,
            Payroll.employee_id == Employee.id,
        )
        .filter(
            Payroll.payroll_month == payroll_month,
            Payroll.status == "Finalized",
        )
        .all()
    )

    departments = {}

    for payroll, employee in payroll_data:
        department = employee.department

        if department not in departments:
            departments[department] = {
                "total_employees": 0,
                "total_gross_salary": Decimal("0.00"),
                "total_deductions": Decimal("0.00"),
                "total_net_salary": Decimal("0.00"),
            }

        departments[department]["total_employees"] += 1
        departments[department]["total_gross_salary"] += payroll.gross_salary
        departments[department]["total_deductions"] += payroll.deductions
        departments[department]["total_net_salary"] += payroll.net_salary

    return [
        DepartmentPayrollSummary(
            department=department,
            **values,
        )
        for department, values in departments.items()
    ]
@router.get("/payroll-csv")
def export_payroll_csv(
    payroll_month: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "HR")),
):
    payroll_data = (
        db.query(Payroll, Employee)
        .join(
            Employee,
            Payroll.employee_id == Employee.id,
        )
        .filter(
            Payroll.payroll_month == payroll_month,
            Payroll.status == "Finalized",
        )
        .all()
    )

    output = StringIO()

    writer = csv.writer(output)

    writer.writerow([
        "Employee ID",
        "Employee Name",
        "Department",
        "Payroll Month",
        "Basic Salary",
        "Allowances",
        "Bonuses",
        "Deductions",
        "Unpaid Leave Deduction",
        "Gross Salary",
        "Net Salary",
        "Status",
    ])

    for payroll, employee in payroll_data:
        writer.writerow([
            employee.employee_id,
            employee.name,
            employee.department,
            payroll.payroll_month,
            payroll.basic_salary,
            payroll.allowances,
            payroll.bonuses,
            payroll.deductions,
            payroll.unpaid_leave_deduction,
            payroll.gross_salary,
            payroll.net_salary,
            payroll.status,
        ])

    output.seek(0)

    filename = f"payroll_{payroll_month.strftime('%Y_%m')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        },
    )