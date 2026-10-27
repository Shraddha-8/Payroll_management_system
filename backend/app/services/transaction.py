from sqlalchemy.orm import Session


def commit_transaction(db: Session):
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise