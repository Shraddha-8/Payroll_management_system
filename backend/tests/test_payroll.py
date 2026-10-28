from fastapi.testclient import TestClient

from app.main import app
from app.dependencies.auth import get_current_user
from app.models.user import User

client = TestClient(app)


def test_payroll_endpoint_requires_authentication():
    response = client.get("/payroll/")
    assert response.status_code == 401


def test_payroll_manager_can_access_payroll():
    fake_user = User(
        id=6,
        name="Ram",
        email="ram@example.com",
        role="Payroll Manager",
        is_active=True,
    )

    app.dependency_overrides[get_current_user] = lambda: fake_user

    try:
        response = client.get("/payroll/")
        assert response.status_code == 200
    finally:
        app.dependency_overrides.clear()


def test_employee_cannot_access_payroll():
    fake_user = User(
        id=5,
        name="Aman Verma",
        email="aman.verma@example.com",
        role="Employee",
        is_active=True,
    )

    app.dependency_overrides[get_current_user] = lambda: fake_user

    try:
        response = client.get("/payroll/")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_payroll_endpoint_rejects_invalid_token():
    response = client.get(
        "/payroll/",
        headers={"Authorization": "Bearer invalid-token"},
    )

    assert response.status_code == 401
def test_payroll_duplicate_is_rejected():
    fake_user = User(
        id=6,
        name="Ram",
        email="ram@example.com",
        role="Payroll Manager",
        is_active=True,
    )

    app.dependency_overrides[get_current_user] = lambda: fake_user

    try:
        response = client.post(
            "/payroll/",
            json={
                "employee_id": 3,
                "payroll_month": "2026-10-01",
            },
        )

        assert response.status_code in [400, 409]
    finally:
        app.dependency_overrides.clear()

def test_finalized_payroll_cannot_be_submitted():
    fake_user = User(
        id=6,
        name="Ram",
        email="ram@example.com",
        role="Payroll Manager",
        is_active=True,
    )

    app.dependency_overrides[get_current_user] = lambda: fake_user

    try:
        response = client.patch("/payroll/1/submit")

        assert response.status_code == 400
    finally:
        app.dependency_overrides.clear()