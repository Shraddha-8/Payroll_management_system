from sqlalchemy import (
    Column,
    Integer,
    Date,
    String,
    ForeignKey,
    UniqueConstraint,
)
from app.database import Base


class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint(
            "employee_id",
            "attendance_date",
            name="uq_attendance_employee_date",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False,
        index=True
    )

    attendance_date = Column(Date, nullable=False)

    status = Column(String(20), nullable=False)

    remarks = Column(String(255), nullable=True)