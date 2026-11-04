from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    id: int
    user_id: int | None = None

    # Readable user information
    user_name: str | None = None
    user_email: str | None = None
    user_role: str | None = None

    action: str
    entity_type: str
    entity_id: int | None = None
    details: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)