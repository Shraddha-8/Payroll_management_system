from fastapi import APIRouter, Depends

from app.dependencies.roles import require_role
from app.models.user import User


router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


@router.get("/test")
def admin_test(
    current_user: User = Depends(require_role("Admin"))
):
    return {
        "message": "Admin access granted",
        "user": current_user.name,
        "role": current_user.role
    }