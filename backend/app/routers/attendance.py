from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
)
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.roles import require_role
from app.models.user import User
from app.services.attendance_import import import_attendance_csv


# Your existing router
router = APIRouter(
    prefix="/attendance",
    tags=["Attendance"]
)


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