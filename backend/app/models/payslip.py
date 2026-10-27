from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime
from app.database import Base


class Payslip(Base):
    __tablename__ = "payslips"

    id = Column(Integer, primary_key=True, index=True)

    payroll_id = Column(
        Integer,
        ForeignKey("payrolls.id"),
        nullable=False,
        unique=True
    )

    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False,
        index=True
    )

    file_path = Column(String(500), nullable=True)

    generated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow
    )