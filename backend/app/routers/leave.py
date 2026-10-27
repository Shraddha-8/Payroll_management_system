from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.roles import require_role
from app.models.employee import Employee
from app.models.leave_request import LeaveRequest
from app.models.user import User
from app.schemas.leave import (
    LeaveRequestCreate,
    LeaveRequestUpdate,
    LeaveRequestResponse,
)

router = APIRouter(
    prefix="/leave-requests",
    tags=["Leave Requests"]
)


@router.post(
    "/",
    response_model=LeaveRequestResponse,
    status_code=status.HTTP_201_CREATED
)
def create_leave_request(
    leave_data: LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "HR", "Employee"))
):
    employee = (
        db.query(Employee)
        .filter(Employee.id == leave_data.employee_id)
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    if leave_data.end_date < leave_data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date cannot be before start date"
        )

    leave_request = LeaveRequest(
        employee_id=leave_data.employee_id,
        start_date=leave_data.start_date,
        end_date=leave_data.end_date,
        reason=leave_data.reason,
        status="Pending",
    )

    db.add(leave_request)
    db.commit()
    db.refresh(leave_request)

    return leave_request


@router.get(
    "/",
    response_model=list[LeaveRequestResponse]
)
def get_leave_requests(
    employee_id: int | None = None,
    request_status: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "HR", "Employee"))
):
    query = db.query(LeaveRequest)

    if employee_id:
        query = query.filter(
            LeaveRequest.employee_id == employee_id
        )

    if request_status:
        query = query.filter(
            LeaveRequest.status == request_status
        )

    return query.order_by(
        LeaveRequest.id.desc()
    ).all()


@router.put(
    "/{leave_request_id}",
    response_model=LeaveRequestResponse
)
def update_leave_request(
    leave_request_id: int,
    leave_data: LeaveRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "HR", "Employee"))
):
    leave_request = (
        db.query(LeaveRequest)
        .filter(LeaveRequest.id == leave_request_id)
        .first()
    )

    if not leave_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found"
        )

    if leave_request.status != "Pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending leave requests can be updated"
        )

    update_data = leave_data.model_dump(
        exclude_unset=True
    )

    start_date = update_data.get(
        "start_date",
        leave_request.start_date
    )

    end_date = update_data.get(
        "end_date",
        leave_request.end_date
    )

    if end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date cannot be before start date"
        )

    for field, value in update_data.items():
        setattr(leave_request, field, value)

    db.commit()
    db.refresh(leave_request)

    return leave_request
@router.patch(
    "/{leave_request_id}/decision",
    response_model=LeaveRequestResponse
)
def decide_leave_request(
    leave_request_id: int,
    decision: str,
    rejection_reason: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("Admin", "HR")
    )
):
    leave_request = (
        db.query(LeaveRequest)
        .filter(LeaveRequest.id == leave_request_id)
        .first()
    )

    if not leave_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found"
        )

    if leave_request.status != "Pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending leave requests can be approved or rejected"
        )

    if decision not in ["Approved", "Rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Decision must be Approved or Rejected"
        )

    if decision == "Rejected" and not rejection_reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rejection reason is required"
        )

    leave_request.status = decision

    if decision == "Rejected":
        leave_request.rejection_reason = rejection_reason
    else:
        leave_request.rejection_reason = None

    db.commit()
    db.refresh(leave_request)

    return leave_request