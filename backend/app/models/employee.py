from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey
from app.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)

    employee_id = Column(String(50), unique=True, nullable=False, index=True)

    name = Column(String(100), nullable=False)

    email = Column(String(255), unique=True, nullable=False, index=True)

    department = Column(String(100), nullable=False)

    joining_date = Column(Date, nullable=False)

    employment_status = Column(String(50), nullable=False, default="Active")

    is_active = Column(Boolean, nullable=False, default=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)