from getpass import getpass

from app.database import SessionLocal
from app.models.user import User
from app.utils.security import hash_password


def create_user():
    db = SessionLocal()

    try:
        email = input("User email: ").strip()
        name = input("User name: ").strip()
        password = getpass("User password: ")
        role = input(
            "User role (Admin/HR/Payroll Manager/Employee): "
        ).strip()

        allowed_roles = [
            "Admin",
            "HR",
            "Payroll Manager",
            "Employee",
        ]

        if role not in allowed_roles:
            print(
                "Invalid role. Choose Admin, HR, Payroll Manager, or Employee."
            )
            return

        existing_user = (
            db.query(User)
            .filter(User.email == email)
            .first()
        )

        if existing_user:
            print("A user with this email already exists.")
            return

        user = User(
            name=name,
            email=email,
            hashed_password=hash_password(password),
            role=role,
            is_active=True,
        )

        db.add(user)
        db.commit()

        print(f"{role} user created successfully!")

    finally:
        db.close()


if __name__ == "__main__":
    create_user()