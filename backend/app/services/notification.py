from sqlalchemy.orm import Session

from app.models.notification import Notification


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notification_key: str | None = None,
):
    """
    Create a notification.

    If notification_key is provided and a notification with the same
    key already exists, the existing notification is returned.

    This makes notification creation idempotent.
    """

    # ---------------------------------------------------------
    # Prevent duplicate notification
    # ---------------------------------------------------------

    if notification_key:
        existing_notification = (
            db.query(Notification)
            .filter(
                Notification.notification_key == notification_key
            )
            .first()
        )

        if existing_notification:
            return existing_notification

    # ---------------------------------------------------------
    # Create notification
    # ---------------------------------------------------------

    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_key=notification_key,
        is_read=False,
    )

    db.add(notification)

    return notification