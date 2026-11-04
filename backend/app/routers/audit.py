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
    audit_records = (
        db.query(AuditLog, User)
        .outerjoin(
            User,
            AuditLog.user_id == User.id
        )
        .order_by(AuditLog.id.desc())
        .all()
    )

    results = []

    for audit, user in audit_records:
        results.append({
            "id": audit.id,
            "user_id": audit.user_id,

            "user_name": user.name if user else None,
            "user_email": user.email if user else None,
            "user_role": user.role if user else None,

            "action": audit.action,
            "entity_type": audit.entity_type,
            "entity_id": audit.entity_id,
            "details": audit.details,
            "created_at": audit.created_at,
        })

    return results