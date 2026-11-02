from app.database import SessionLocal
from app.models.user import User
from app.utils.security import hash_password


db = SessionLocal()

try:
    email = "hr@payroll.com"

    existing = db.query(User).filter(User.email == email).first()

    if existing:
        print("HR Manager already exists.")
    else:
        user = User(
            name="Neha Sharma",
            email=email,
            hashed_password=hash_password("HR@12345"),
            role="HR Manager",
            is_active=True,
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        print("HR Manager created successfully.")
        print("Email: hr@payroll.com")
        print("Password: HR@123")

finally:
    db.close()