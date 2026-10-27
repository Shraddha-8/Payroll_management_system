from sqlalchemy import Column, Integer, Numeric, Date, ForeignKey
from app.database import Base


class SalaryStructure(Base):
    __tablename__ = "salary_structures"

    id = Column(Integer, primary_key=True, index=True)

    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False,
        index=True
    )

    basic_salary = Column(Numeric(12, 2), nullable=False, default=0)

    allowances = Column(Numeric(12, 2), nullable=False, default=0)

    bonuses = Column(Numeric(12, 2), nullable=False, default=0)

    deductions = Column(Numeric(12, 2), nullable=False, default=0)

    effective_from = Column(Date, nullable=False)

    effective_to = Column(Date, nullable=True)