from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_role

from app.models.employee import Employee
from app.models.payroll import Payroll
from app.models.payslip import Payslip
from app.models.user import User

from app.services.notification import create_notification
from app.services.payslip_generator import generate_payslip_pdf


router = APIRouter(
    prefix="/payslips",
    tags=["Payslips"]
)


# ============================================================
# GENERATE PAYSLIP
# ============================================================

@router.post("/{payroll_id}")
def generate_payslip(
    payroll_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("Admin", "HR")
    ),
):
    # --------------------------------------------------------
    # 1. Find payroll
    # --------------------------------------------------------

    payroll = (
        db.query(Payroll)
        .filter(Payroll.id == payroll_id)
        .first()
    )

    if not payroll:
        raise HTTPException(
            status_code=404,
            detail="Payroll not found"
        )

    # --------------------------------------------------------
    # 2. Payslip only for finalized payroll
    # --------------------------------------------------------

    if payroll.status != "Finalized":
        raise HTTPException(
            status_code=400,
            detail=(
                "Payslip can only be generated "
                "for finalized payroll"
            )
        )

    # --------------------------------------------------------
    # 3. Prevent duplicate payslip
    # --------------------------------------------------------

    existing_payslip = (
        db.query(Payslip)
        .filter(
            Payslip.payroll_id == payroll_id
        )
        .first()
    )

    if existing_payslip:
        raise HTTPException(
            status_code=400,
            detail="Payslip already exists for this payroll"
        )

    # --------------------------------------------------------
    # 4. Find employee
    # --------------------------------------------------------

    employee = (
        db.query(Employee)
        .filter(
            Employee.id == payroll.employee_id
        )
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    # --------------------------------------------------------
    # 5. Create PDF directory
    # --------------------------------------------------------

    pdf_directory = Path("generated_payslips")
    pdf_directory.mkdir(exist_ok=True)

    pdf_path = (
        pdf_directory
        / f"payslip_{payroll.id}_{employee.employee_id}.pdf"
    )

    # --------------------------------------------------------
    # 6. Generate PDF
    # --------------------------------------------------------

    generate_payslip_pdf(
        payroll=payroll,
        employee=employee,
        output_path=pdf_path,
    )

    # --------------------------------------------------------
    # 7. Save payslip record
    # --------------------------------------------------------

    payslip = Payslip(
        payroll_id=payroll.id,
        employee_id=employee.id,
        file_path=str(pdf_path),
    )

    db.add(payslip)

    # Flush so payslip.id is available
    db.flush()

    # --------------------------------------------------------
    # 8. Notify employee
    # --------------------------------------------------------

    if employee.user_id:
        create_notification(
            db=db,
            user_id=employee.user_id,
            title="Payslip Available",
            message=(
                f"Your payslip for "
                f"{payroll.payroll_month} "
                f"is now available for download."
            ),
            notification_key=(
                f"payslip_{payroll.id}"
                f"_available_user_{employee.user_id}"
            ),
        )

    # --------------------------------------------------------
    # 9. Commit payslip + notification together
    # --------------------------------------------------------

    db.commit()
    db.refresh(payslip)

    return {
        "message": "Payslip generated successfully",
        "payslip_id": payslip.id,
        "payroll_id": payroll.id,
        "employee_id": employee.id,
        "file_path": payslip.file_path,
    }


# ============================================================
# GET MY PAYSLIPS
# ============================================================

@router.get("/my")
def get_my_payslips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = (
        db.query(Employee)
        .filter(
            Employee.user_id == current_user.id
        )
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee profile not found"
        )

    payslips = (
        db.query(Payslip)
        .filter(
            Payslip.employee_id == employee.id
        )
        .order_by(Payslip.id.desc())
        .all()
    )

    return payslips


# ============================================================
# DOWNLOAD MY PAYSLIP
# ============================================================

@router.get("/{payslip_id}/download")
def download_my_payslip(
    payslip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # --------------------------------------------------------
    # Find employee linked to logged-in user
    # --------------------------------------------------------

    employee = (
        db.query(Employee)
        .filter(
            Employee.user_id == current_user.id
        )
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee profile not found"
        )

    # --------------------------------------------------------
    # Find payslip belonging to employee
    # --------------------------------------------------------

    payslip = (
        db.query(Payslip)
        .filter(
            Payslip.id == payslip_id,
            Payslip.employee_id == employee.id
        )
        .first()
    )

    if not payslip:
        raise HTTPException(
            status_code=404,
            detail="Payslip not found"
        )

    # --------------------------------------------------------
    # Check PDF exists
    # --------------------------------------------------------

    pdf_path = Path(payslip.file_path)

    if not pdf_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Payslip PDF file not found"
        )

    # --------------------------------------------------------
    # Return PDF
    # --------------------------------------------------------

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=pdf_path.name,
    )