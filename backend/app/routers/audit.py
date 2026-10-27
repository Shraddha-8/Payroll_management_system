from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.roles import require_role
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLogResponse


router = APIRouter(
    prefix="/audit-logs",
    tags=["Audit Logs"]
)


@router.get(
    "/",
    response_model=list[AuditLogResponse]
)
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("Admin", "HR")
    )
):
    return (
        db.query(AuditLog)
        .order_by(AuditLog.id.desc())
        .all()
    )