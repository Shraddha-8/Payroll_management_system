import os
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.payroll import Payroll
from app.models.salary_structure import SalaryStructure


# ============================================================
# CONFIGURABLE ALERT THRESHOLDS
# ============================================================

SALARY_INCREASE_THRESHOLD = Decimal(
    os.getenv("SALARY_INCREASE_THRESHOLD", "10.00")
)

PAYROLL_CHANGE_THRESHOLD = Decimal(
    os.getenv("PAYROLL_CHANGE_THRESHOLD", "10.00")
)


# ============================================================
# SALARY INCREASE ALERT
# ============================================================

def check_salary_increase_alert(
    db: Session,
    employee_id: int,
    new_salary: Decimal,
    current_salary_structure_id: int | None = None,
):
    query = (
        db.query(SalaryStructure)
        .filter(
            SalaryStructure.employee_id == employee_id,
        )
        .order_by(
            SalaryStructure.effective_from.desc()
        )
    )

    if current_salary_structure_id is not None:
        query = query.filter(
            SalaryStructure.id != current_salary_structure_id
        )

    previous_salary = query.first()

    if (
        not previous_salary
        or previous_salary.basic_salary == 0
    ):
        return None

    increase_percentage = (
        (
            new_salary
            - previous_salary.basic_salary
        )
        / previous_salary.basic_salary
    ) * Decimal("100")

    increase_percentage = increase_percentage.quantize(
        Decimal("0.01")
    )

    if increase_percentage > SALARY_INCREASE_THRESHOLD:
        return {
            "alert": True,
            "increase_percentage": increase_percentage,
            "previous_salary": previous_salary.basic_salary,
            "new_salary": new_salary,
            "threshold": SALARY_INCREASE_THRESHOLD,
        }

    return None


# ============================================================
# PAYROLL MONTH-OVER-MONTH CHANGE ALERT
# ============================================================

def check_payroll_change_alert(
    db: Session,
    employee_id: int,
    current_payroll_month,
    current_net_salary: Decimal,
):
    previous_payroll = (
        db.query(Payroll)
        .filter(
            Payroll.employee_id == employee_id,
            Payroll.payroll_month < current_payroll_month,
            Payroll.status == "Finalized",
        )
        .order_by(
            Payroll.payroll_month.desc()
        )
        .first()
    )

    if (
        not previous_payroll
        or previous_payroll.net_salary == 0
    ):
        return None

    change_percentage = (
        (
            current_net_salary
            - previous_payroll.net_salary
        )
        / previous_payroll.net_salary
    ) * Decimal("100")

    change_percentage = change_percentage.quantize(
        Decimal("0.01")
    )

    if abs(change_percentage) > PAYROLL_CHANGE_THRESHOLD:
        return {
            "alert": True,
            "change_percentage": change_percentage,
            "previous_net_salary": previous_payroll.net_salary,
            "current_net_salary": current_net_salary,
            "previous_payroll_month": previous_payroll.payroll_month,
            "threshold": PAYROLL_CHANGE_THRESHOLD,
        }

    return None