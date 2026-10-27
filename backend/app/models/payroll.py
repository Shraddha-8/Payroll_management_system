from sqlalchemy import (
    Column,
    Integer,
    Numeric,
    Date,
    String,
    ForeignKey,
    UniqueConstraint,
)
from app.database import Base


class Payroll(Base):
    __tablename__ = "payrolls"

    __table_args__ = (
        UniqueConstraint(
            "employee_id",
            "payroll_month",
            name="uq_payroll_employee_month",
        ),
    )
    id = Column(Integer, primary_key=True, index=True)

    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False,
        index=True
    )

    payroll_month = Column(Date, nullable=False, index=True)

    basic_salary = Column(Numeric(12, 2), nullable=False, default=0)

    allowances = Column(Numeric(12, 2), nullable=False, default=0)

    bonuses = Column(Numeric(12, 2), nullable=False, default=0)

    deductions = Column(Numeric(12, 2), nullable=False, default=0)

    unpaid_leave_deduction = Column(
        Numeric(12, 2),
        nullable=False,
        default=0
    )

    gross_salary = Column(Numeric(12, 2), nullable=False, default=0)

    net_salary = Column(Numeric(12, 2), nullable=False, default=0)

    status = Column(
        String(30),
        nullable=False,
        default="Draft"
    )

    rejection_reason = Column(String(500), nullable=True)

    finalized_at = Column(Date, nullable=True)
   