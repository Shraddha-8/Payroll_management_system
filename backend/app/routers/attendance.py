from datetime import date

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    UploadFile,
    File,
)

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.roles import require_role
from app.models.user import User
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.services.attendance_import import import_attendance_csv


router = APIRouter(
    prefix="/attendance",
    tags=["Attendance"]
)


ALLOWED_STATUSES = {
    "Present",
    "Absent",
    "Half Day",
    "Holiday",
    "Leave",
}


class AttendanceIn(BaseModel):
    employee_id: int
    attendance_date: date
    status: str
    remarks: str | None = None


# ============================================================
# MARK / UPDATE ATTENDANCE
# ============================================================

@router.put("")
def upsert_attendance(
    body: AttendanceIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("Admin", "HR", "Payroll Manager")
    )
):
    if body.status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed: {', '.join(sorted(ALLOWED_STATUSES))}"
        )

    employee = db.get(Employee, body.employee_id)

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    existing = db.scalar(
        select(Attendance).where(
            Attendance.employee_id == body.employee_id,
            Attendance.attendance_date == body.attendance_date
        )
    )

    if existing:
        existing.status = body.status
        existing.remarks = body.remarks
        action = "updated"
        attendance = existing
    else:
        attendance = Attendance(
            employee_id=body.employee_id,
            attendance_date=body.attendance_date,
            status=body.status,
            remarks=body.remarks,
        )
        db.add(attendance)
        action = "created"

    db.commit()
    db.refresh(attendance)

    return {
        "success": True,
        "message": f"Attendance {action} successfully",
        "attendance": {
            "id": attendance.id,
            "employee_id": attendance.employee_id,
            "attendance_date": attendance.attendance_date,
            "status": attendance.status,
            "remarks": attendance.remarks,
        },
    }


# ============================================================
# ATTENDANCE REGISTER
# ============================================================

@router.get("/employees/{employee_id}")
def get_employee_attendance(
    employee_id: int,
    year: int | None = Query(None),
    month: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("Admin", "HR", "Payroll Manager")
    )
):
    employee = db.get(Employee, employee_id)

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    query = (
        select(Attendance)
        .where(Attendance.employee_id == employee_id)
        .order_by(Attendance.attendance_date)
    )

    if year and month:
        from calendar import monthrange

        start_date = date(year, month, 1)
        end_date = date(
            year,
            month,
            monthrange(year, month)[1]
        )

        query = query.where(
            Attendance.attendance_date >= start_date,
            Attendance.attendance_date <= end_date,
        )

    records = db.scalars(query).all()

    return [
        {
            "id": record.id,
            "employee_id": record.employee_id,
            "attendance_date": record.attendance_date,
            "status": record.status,
            "remarks": record.remarks,
        }
        for record in records
    ]


# ============================================================
# CURRENT EMPLOYEE'S OWN ATTENDANCE
# ============================================================

@router.get("/me")
def get_my_attendance(
    year: int | None = Query(None),
    month: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Employee"))
):
    employee = db.scalar(
        select(Employee).where(
            Employee.user_id == current_user.id
        )
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee profile not found"
        )

    query = (
        select(Attendance)
        .where(Attendance.employee_id == employee.id)
        .order_by(Attendance.attendance_date)
    )

    if year and month:
        from calendar import monthrange

        start_date = date(year, month, 1)
        end_date = date(
            year,
            month,
            monthrange(year, month)[1]
        )

        query = query.where(
            Attendance.attendance_date >= start_date,
            Attendance.attendance_date <= end_date,
        )

    records = db.scalars(query).all()

    return [
        {
            "id": record.id,
            "employee_id": record.employee_id,
            "attendance_date": record.attendance_date,
            "status": record.status,
            "remarks": record.remarks,
        }
        for record in records
    ]


# ============================================================
# CSV IMPORT
# ============================================================

@router.post("/import-csv")
async def import_attendance(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("Admin", "HR")
    )
):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are allowed"
        )

    content = await file.read()

    try:
        file_content = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="CSV file must use UTF-8 encoding"
        )

    result = import_attendance_csv(
        db=db,
        file_content=file_content,
    )

    return result