from sqlalchemy import Column, Integer, Date, String, ForeignKey
from app.database import Base


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)

    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False,
        index=True
    )

    start_date = Column(Date, nullable=False)

    end_date = Column(Date, nullable=False)

    reason = Column(String(500), nullable=False)

    status = Column(String(20), nullable=False, default="Pending")

    rejection_reason = Column(String(500), nullable=True)