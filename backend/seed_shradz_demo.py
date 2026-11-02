from datetime import date, datetime, timedelta
from decimal import Decimal
from pathlib import Path

from app.database import SessionLocal
from app.models.user import User
from app.models.employee import Employee
from app.models.salary_structure import SalaryStructure
from app.models.attendance import Attendance
from app.models.leave_request import LeaveRequest
from app.models.payroll import Payroll
from app.models.payslip import Payslip


db = SessionLocal()

try:
    # ---------------------------------------------------------
    # 1. GET EXISTING SHRADZ USER
    # ---------------------------------------------------------
    user = (
        db.query(User)
        .filter(User.email == "shrad@gmail.com")
        .first()
    )

    if not user:
        raise Exception("Shradz user not found: shrad@gmail.com")

    print(f"Found Shradz user: ID={user.id}")

    # ---------------------------------------------------------
    # 2. CREATE / GET EMPLOYEE RECORD
    # ---------------------------------------------------------
    employee = (
        db.query(Employee)
        .filter(Employee.user_id == user.id)
        .first()
    )

    if not employee:
        employee = (
            db.query(Employee)
            .filter(Employee.email == "shrad@gmail.com")
            .first()
        )

    if not employee:
        employee = Employee(
            employee_id="EMP012",
            name="Shradz",
            email="shrad@gmail.com",
            department="Engineering",
            joining_date=date(2026, 1, 10),
            employment_status="Active",
            is_active=True,
            user_id=user.id,
        )

        db.add(employee)
        db.flush()

        print("Created Shradz employee record.")
    else:
        employee.employee_id = "EMP012"
        employee.name = "Shradz"
        employee.department = "Engineering"
        employee.employment_status = "Active"
        employee.is_active = True
        employee.user_id = user.id

        db.flush()

        print(f"Shradz employee already exists: ID={employee.id}")

    # ---------------------------------------------------------
    # 3. SALARY STRUCTURE
    # ---------------------------------------------------------
    salary = (
        db.query(SalaryStructure)
        .filter(SalaryStructure.employee_id == employee.id)
        .first()
    )

    if not salary:
        salary = SalaryStructure(
            employee_id=employee.id,
            basic_salary=Decimal("60000.00"),
            allowances=Decimal("15000.00"),
            bonuses=Decimal("5000.00"),
            deductions=Decimal("5000.00"),
            effective_from=date(2026, 1, 1),
            effective_to=None,
        )

        db.add(salary)
        print("Created Shradz salary structure.")
    else:
        print("Shradz salary structure already exists.")

    db.flush()

    # ---------------------------------------------------------
    # 4. ATTENDANCE — SEPTEMBER 2026
    # ---------------------------------------------------------
    start = date(2026, 9, 1)
    end = date(2026, 9, 30)

    current = start

    while current <= end:
        # Monday-Friday
        if current.weekday() < 5:

            existing = (
                db.query(Attendance)
                .filter(
                    Attendance.employee_id == employee.id,
                    Attendance.attendance_date == current,
                )
                .first()
            )

            if not existing:
                status = "Present"

                # A couple of realistic half-days
                if current in [
                    date(2026, 9, 8),
                    date(2026, 9, 22),
                ]:
                    status = "Half Day"

                db.add(
                    Attendance(
                        employee_id=employee.id,
                        attendance_date=current,
                        status=status,
                        remarks="Demo attendance",
                    )
                )

        current += timedelta(days=1)

    print("Added September attendance.")

    # ---------------------------------------------------------
    # 5. LEAVE HISTORY
    # ---------------------------------------------------------

    # Approved leave
    approved_leave = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.employee_id == employee.id,
            LeaveRequest.start_date == date(2026, 9, 14),
        )
        .first()
    )

    if not approved_leave:
        db.add(
            LeaveRequest(
                employee_id=employee.id,
                start_date=date(2026, 9, 14),
                end_date=date(2026, 9, 15),
                reason="Personal leave",
                status="Approved",
            )
        )

    # Pending leave
    pending_leave = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.employee_id == employee.id,
            LeaveRequest.start_date == date(2026, 9, 24),
        )
        .first()
    )

    if not pending_leave:
        db.add(
            LeaveRequest(
                employee_id=employee.id,
                start_date=date(2026, 9, 24),
                end_date=date(2026, 9, 25),
                reason="Family function",
                status="Pending",
            )
        )

    print("Added leave history.")

    db.flush()

    # ---------------------------------------------------------
    # 6. FINALIZED PAYROLL — SEPTEMBER 2026
    # ---------------------------------------------------------
    payroll = (
        db.query(Payroll)
        .filter(
            Payroll.employee_id == employee.id,
            Payroll.payroll_month == date(2026, 9, 1),
        )
        .first()
    )

    if not payroll:
        payroll = Payroll(
            employee_id=employee.id,
            payroll_month=date(2026, 9, 1),

            basic_salary=Decimal("60000.00"),
            allowances=Decimal("15000.00"),
            bonuses=Decimal("5000.00"),
            deductions=Decimal("5000.00"),
            unpaid_leave_deduction=Decimal("0.00"),

            gross_salary=Decimal("80000.00"),
            net_salary=Decimal("75000.00"),

            status="Finalized",
            finalized_at=date(2026, 9, 30),
        )

        db.add(payroll)
        db.flush()

        print("Created finalized September payroll.")
    else:
        print(f"September payroll already exists: ID={payroll.id}")

    # ---------------------------------------------------------
    # 7. COMMIT DATABASE CHANGES
    # ---------------------------------------------------------
    db.commit()

    print("\n========================================")
    print("SHRADZ DEMO DATA READY")
    print("========================================")
    print(f"Employee ID : {employee.employee_id}")
    print(f"Database ID : {employee.id}")
    print(f"User ID     : {user.id}")
    print(f"Login       : {user.email}")
    print("Role        : Employee")
    print("Department  : Engineering")
    print("Salary      : ₹60,000 basic")
    print("Payroll     : September 2026")
    print("Net Salary  : ₹75,000")
    print("Status      : Finalized")
    print("========================================")

except Exception as e:
    db.rollback()
    print("\nERROR:", e)
    raise

finally:
    db.close()