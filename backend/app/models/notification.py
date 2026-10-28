from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from datetime import datetime

from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    title = Column(String(200), nullable=False)

    message = Column(String(1000), nullable=False)

    # Used to prevent duplicate notifications for the same event
    notification_key = Column(
        String(255),
        unique=True,
        nullable=True,
        index=True
    )

    is_read = Column(
        Boolean,
        nullable=False,
        default=False
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow
    )