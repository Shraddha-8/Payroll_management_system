import csv
from datetime import date
from io import StringIO

from sqlalchemy.orm import Session

from app.models.attendance import Attendance
from app.models.employee import Employee


VALID_STATUSES = {
    "Present",
    "Absent",
    "Half Day",
    "Holiday",
    "Leave",
}


def import_attendance_csv(
    db: Session,
    file_content: str,
):
    reader = csv.DictReader(StringIO(file_content))

    required_columns = {
        "employee_id",
        "attendance_date",
        "status",
        "remarks",
    }

    if not reader.fieldnames:
        return {
            "success": False,
            "message": "CSV file is empty or missing headers",
            "imported": 0,
            "errors": [],
        }

    missing_columns = required_columns - set(reader.fieldnames)

    if missing_columns:
        return {
            "success": False,
            "message": (
                f"Missing columns: "
                f"{', '.join(sorted(missing_columns))}"
            ),
            "imported": 0,
            "errors": [],
        }

    valid_records = []
    errors = []

    for row_number, row in enumerate(reader, start=2):

        employee_id = (
            row.get("employee_id") or ""
        ).strip()

        attendance_date = (
            row.get("attendance_date") or ""
        ).strip()

        attendance_status = (
            row.get("status") or ""
        ).strip()

        remarks = (
            row.get("remarks") or ""
        ).strip()

        # ----------------------------------------------------
        # Validate employee ID
        # ----------------------------------------------------

        if not employee_id.isdigit():
            errors.append({
                "row": row_number,
                "error": "employee_id must be a valid number",
            })
            continue

        employee_id = int(employee_id)

        employee = (
            db.query(Employee)
            .filter(Employee.id == employee_id)
            .first()
        )

        if not employee:
            errors.append({
                "row": row_number,
                "error": f"Employee {employee_id} not found",
            })
            continue

        # ----------------------------------------------------
        # Validate date
        # ----------------------------------------------------

        try:
            parsed_date = date.fromisoformat(
                attendance_date
            )
        except ValueError:
            errors.append({
                "row": row_number,
                "error": (
                    "attendance_date must be in "
                    "YYYY-MM-DD format"
                ),
            })
            continue

        # ----------------------------------------------------
        # Validate status
        # ----------------------------------------------------

        if attendance_status not in VALID_STATUSES:
            errors.append({
                "row": row_number,
                "error": (
                    f"Invalid status '{attendance_status}'. "
                    f"Allowed values: "
                    f"{', '.join(sorted(VALID_STATUSES))}"
                ),
            })
            continue

        # ----------------------------------------------------
        # Prevent duplicate attendance
        # ----------------------------------------------------

        existing = (
            db.query(Attendance)
            .filter(
                Attendance.employee_id == employee_id,
                Attendance.attendance_date == parsed_date,
            )
            .first()
        )

        if existing:
            errors.append({
                "row": row_number,
                "error": (
                    f"Attendance already exists for "
                    f"employee {employee_id} on "
                    f"{attendance_date}"
                ),
            })
            continue

        valid_records.append(
            Attendance(
                employee_id=employee_id,
                attendance_date=parsed_date,
                status=attendance_status,
                remarks=remarks or None,
            )
        )

    # --------------------------------------------------------
    # Insert valid records
    # --------------------------------------------------------

    try:
        if valid_records:
            db.add_all(valid_records)
            db.commit()

        return {
            "success": True,
            "message": "Attendance CSV processed successfully",
            "imported": len(valid_records),
            "errors": errors,
        }

    except Exception:
        db.rollback()
        raise