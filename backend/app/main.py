from fastapi import FastAPI

from app.routers.auth import router as auth_router
from app.routers.admin import router as admin_router
from app.routers.employee import router as employee_router
from app.routers.salary import router as salary_router
from app.routers.attendance import router as attendance_router
from app.routers.leave import router as leave_router
from app.routers.payroll import router as payroll_router
from app.routers.audit import router as audit_router
from app.routers.notification import router as notification_router
from app.routers.payslip import router as payslip_router
from app.routers.report import router as report_router
from app.routers.salary import router as salary_router



app = FastAPI(
    title="Payroll Management System API",
    description="Backend API for managing employees, attendance, salary, payroll and payslips.",
    version="1.0.0",
)


app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(employee_router)
app.include_router(salary_router)
app.include_router(attendance_router)
app.include_router(leave_router)
app.include_router(payroll_router)  
app.include_router(audit_router)
app.include_router(notification_router)
app.include_router(payslip_router)
app.include_router(report_router)
app.include_router(salary_router)  # Include the salary router

@app.get("/")
def root():
    return {
        "message": "Payroll Management System API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }