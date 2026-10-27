from calendar import monthrange
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy.orm import Session

from app.models.attendance import Attendance
from app.models.leave_request import LeaveRequest
from app.models.salary_structure import SalaryStructure


def calculate_payroll(
    db: Session,
    employee_id: int,
    payroll_month: date,
):
    """
    Calculate monthly payroll for an employee.

    Rules:
    - Present attendance = no deduction
    - Absent attendance = unpaid day
    - Approved leave = unpaid day
    - Same date is counted only once
    - Missing attendance is flagged
    """

    month_start = payroll_month.replace(day=1)

    days_in_month = monthrange(
        payroll_month.year,
        payroll_month.month
    )[1]

    month_end = payroll_month.replace(
        day=days_in_month
    )

    # -------------------------------------------------
    # 1. Find applicable salary structure
    # -------------------------------------------------

    salary_structure = (
        db.query(SalaryStructure)
        .filter(
            SalaryStructure.employee_id == employee_id,
            SalaryStructure.effective_from <= month_end,
            (
                (SalaryStructure.effective_to.is_(None))
                |
                (SalaryStructure.effective_to >= month_start)
            )
        )
        .order_by(
            SalaryStructure.effective_from.desc()
        )
        .first()
    )

    if not salary_structure:
        raise ValueError(
            "No salary structure found for this payroll month"
        )

    basic_salary = Decimal(
        str(salary_structure.basic_salary)
    )

    allowances = Decimal(
        str(salary_structure.allowances)
    )

    bonuses = Decimal(
        str(salary_structure.bonuses)
    )

    deductions = Decimal(
        str(salary_structure.deductions)
    )

    # -------------------------------------------------
    # 2. Get attendance for the month
    # -------------------------------------------------

    attendance_records = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == employee_id,
            Attendance.attendance_date >= month_start,
            Attendance.attendance_date <= month_end,
        )
        .all()
    )

    absent_dates = set()

    for attendance in attendance_records:
        if attendance.status.lower() == "absent":
            absent_dates.add(
                attendance.attendance_date
            )

    # -------------------------------------------------
    # 3. Get approved leaves
    # -------------------------------------------------

    approved_leaves = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.employee_id == employee_id,
            LeaveRequest.status == "Approved",
            LeaveRequest.start_date <= month_end,
            LeaveRequest.end_date >= month_start,
        )
        .all()
    )

    approved_leave_dates = set()

    for leave in approved_leaves:
        current_date = max(
            leave.start_date,
            month_start
        )

        leave_end = min(
            leave.end_date,
            month_end
        )

        while current_date <= leave_end:
            approved_leave_dates.add(current_date)

            from datetime import timedelta

            current_date += timedelta(days=1)

    # -------------------------------------------------
    # 4. Combine unpaid dates
    # -------------------------------------------------

    unpaid_dates = (
        absent_dates | approved_leave_dates
    )

    unpaid_days = len(unpaid_dates)

    # -------------------------------------------------
    # 5. Detect missing attendance
    # -------------------------------------------------

    recorded_dates = {
        attendance.attendance_date
        for attendance in attendance_records
    }

    missing_attendance_dates = []

    current_date = month_start

    while current_date <= month_end:
        if current_date not in recorded_dates:
            missing_attendance_dates.append(
                current_date
            )

        from datetime import timedelta

        current_date += timedelta(days=1)

    # -------------------------------------------------
    # 6. Calculate salary
    # -------------------------------------------------

    daily_salary = (
        basic_salary / Decimal(days_in_month)
    )

    unpaid_leave_deduction = (
        daily_salary * Decimal(unpaid_days)
    ).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP
    )

    gross_salary = (
        basic_salary
        + allowances
        + bonuses
    )

    net_salary = (
        gross_salary
        - deductions
        - unpaid_leave_deduction
    ).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP
    )

    return {
        "basic_salary": basic_salary,
        "allowances": allowances,
        "bonuses": bonuses,
        "deductions": deductions,
        "unpaid_leave_deduction": unpaid_leave_deduction,
        "gross_salary": gross_salary,
        "net_salary": net_salary,
        "unpaid_days": unpaid_days,
        "missing_attendance_dates": missing_attendance_dates,
        "attendance_records": len(attendance_records),
        "approved_leave_days": len(
            approved_leave_dates
        ),
    }