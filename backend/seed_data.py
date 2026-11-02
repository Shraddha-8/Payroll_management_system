from datetime import date, timedelta
from decimal import Decimal

from app.database import SessionLocal
from app.models.employee import Employee
from app.models.salary_structure import SalaryStructure
from app.models.attendance import Attendance
from app.models.leave_request import LeaveRequest
from app.models.payroll import Payroll
from app.models.payslip import Payslip


def seed_data():
    db = SessionLocal()

    try:
        print("\n🌱 Starting payroll demo data seeding...\n")

        # ---------------------------------------------------------
        # 1. EMPLOYEES
        # ---------------------------------------------------------

        employees_data = [
            {
                "employee_id": "EMP001",
                "name": "Aman Sharma",
                "email": "aman.sharma@company.com",
                "department": "Engineering",
                "joining_date": date(2024, 4, 15),
            },
            {
                "employee_id": "EMP002",
                "name": "Priya Verma",
                "email": "priya.verma@company.com",
                "department": "Human Resources",
                "joining_date": date(2023, 7, 10),
            },
            {
                "employee_id": "EMP003",
                "name": "Rahul Mehta",
                "email": "rahul.mehta@company.com",
                "department": "Engineering",
                "joining_date": date(2024, 1, 22),
            },
            {
                "employee_id": "EMP004",
                "name": "Sneha Kapoor",
                "email": "sneha.kapoor@company.com",
                "department": "Finance",
                "joining_date": date(2023, 11, 6),
            },
            {
                "employee_id": "EMP005",
                "name": "Arjun Patel",
                "email": "arjun.patel@company.com",
                "department": "Engineering",
                "joining_date": date(2024, 6, 3),
            },
            {
                "employee_id": "EMP006",
                "name": "Neha Joshi",
                "email": "neha.joshi@company.com",
                "department": "Marketing",
                "joining_date": date(2024, 2, 12),
            },
            {
                "employee_id": "EMP007",
                "name": "Vikram Singh",
                "email": "vikram.singh@company.com",
                "department": "Sales",
                "joining_date": date(2023, 9, 18),
            },
            {
                "employee_id": "EMP008",
                "name": "Ananya Gupta",
                "email": "ananya.gupta@company.com",
                "department": "Finance",
                "joining_date": date(2024, 8, 1),
            },
            {
                "employee_id": "EMP009",
                "name": "Rohan Malhotra",
                "email": "rohan.malhotra@company.com",
                "department": "Operations",
                "joining_date": date(2023, 5, 15),
            },
            {
                "employee_id": "EMP010",
                "name": "Kavya Nair",
                "email": "kavya.nair@company.com",
                "department": "Marketing",
                "joining_date": date(2024, 3, 25),
            },
            {
                "employee_id": "EMP011",
                "name": "Aditya Rao",
                "email": "aditya.rao@company.com",
                "department": "Operations",
                "joining_date": date(2023, 12, 4),
            },
        ]

        employees = {}

        for data in employees_data:
            employee = (
                db.query(Employee)
                .filter(Employee.employee_id == data["employee_id"])
                .first()
            )

   

            if not employee:
                employee = Employee(
                    employee_id=data["employee_id"],
                    name=data["name"],
                    email=data["email"],
                    department=data["department"],
                    joining_date=data["joining_date"],
                    employment_status="Active",
                    is_active=True,
                )

                db.add(employee)
                db.flush()

                print(f"  ✓ Employee added: {employee.name}")
            else:
                print(f"  ↻ Employee already exists: {employee.name}")

            employees[data["employee_id"]] = employee

        # ---------------------------------------------------------
        # 2. SALARY STRUCTURES
        # ---------------------------------------------------------

        salaries = {
            "EMP001": (45000, 8000, 3000, 2500),
            "EMP002": (52000, 10000, 4000, 3000),
            "EMP003": (60000, 12000, 5000, 3500),
            "EMP004": (48000, 9000, 3500, 3000),
            "EMP005": (70000, 14000, 6000, 4000),
            "EMP006": (42000, 8000, 2500, 2500),
            "EMP007": (55000, 11000, 4500, 3500),
            "EMP008": (50000, 10000, 3500, 3000),
            "EMP009": (58000, 9000, 4000, 3500),
            "EMP010": (46000, 9000, 3000, 2500),
            "EMP011": (65000, 13000, 5000, 4000),
        }

        salary_objects = {}

        for employee_code, values in salaries.items():
            employee = employees[employee_code]

            salary = (
                db.query(SalaryStructure)
                .filter(
                    SalaryStructure.employee_id == employee.id,
                    SalaryStructure.effective_from == date(2026, 1, 1),
                )
                .first()
            )

            if not salary:
                basic, allowances, bonuses, deductions = values

                salary = SalaryStructure(
                    employee_id=employee.id,
                    basic_salary=Decimal(str(basic)),
                    allowances=Decimal(str(allowances)),
                    bonuses=Decimal(str(bonuses)),
                    deductions=Decimal(str(deductions)),
                    effective_from=date(2026, 1, 1),
                    effective_to=None,
                )

                db.add(salary)
                db.flush()

                print(f"  ✓ Salary added: {employee.name}")

            salary_objects[employee_code] = salary

        # ---------------------------------------------------------
        # 3. ATTENDANCE - OCTOBER 2026
        # ---------------------------------------------------------

        period_start = date(2026, 10, 1)
        period_end = date(2026, 10, 28)

        for employee_code, employee in employees.items():

            current_date = period_start

            while current_date <= period_end:

                # Monday-Friday only
                if current_date.weekday() < 5:

                    existing = (
                        db.query(Attendance)
                        .filter(
                            Attendance.employee_id == employee.id,
                            Attendance.attendance_date == current_date,
                        )
                        .first()
                    )

                    if not existing:

                        # Different attendance patterns for realistic demo
                        if employee_code in ["EMP004", "EMP008"]:
                            status = "Half Day" if current_date.day in [8, 20] else "Present"

                        elif employee_code == "EMP007":
                            status = "Absent" if current_date.day == 14 else "Present"

                        elif employee_code == "EMP010":
                            status = "Half Day" if current_date.day == 12 else "Present"

                        else:
                            status = "Present"

                        attendance = Attendance(
                            employee_id=employee.id,
                            attendance_date=current_date,
                            status=status,
                            remarks=None,
                        )

                        db.add(attendance)

                current_date += timedelta(days=1)

        print("  ✓ Attendance records prepared")

        # ---------------------------------------------------------
        # 4. LEAVE REQUESTS
        # ---------------------------------------------------------

        leave_data = [
            ("EMP002", date(2026, 10, 5), date(2026, 10, 6),
             "Personal work", "Approved"),
            ("EMP004", date(2026, 10, 12), date(2026, 10, 13),
             "Family function", "Approved"),
            ("EMP006", date(2026, 10, 19), date(2026, 10, 20),
             "Medical leave", "Pending"),
            ("EMP009", date(2026, 10, 7), date(2026, 10, 8),
             "Personal reasons", "Rejected"),
            ("EMP011", date(2026, 10, 22), date(2026, 10, 23),
             "Travel", "Approved"),
        ]

        for employee_code, start, end, reason, status in leave_data:

            employee = employees[employee_code]

            existing = (
                db.query(LeaveRequest)
                .filter(
                    LeaveRequest.employee_id == employee.id,
                    LeaveRequest.start_date == start,
                    LeaveRequest.end_date == end,
                )
                .first()
            )

            if not existing:
                rejection_reason = (
                    "Leave could not be approved due to operational requirements."
                    if status == "Rejected"
                    else None
                )

                leave = LeaveRequest(
                    employee_id=employee.id,
                    start_date=start,
                    end_date=end,
                    reason=reason,
                    status=status,
                    rejection_reason=rejection_reason,
                )

                db.add(leave)

        print("  ✓ Leave requests prepared")

        # ---------------------------------------------------------
        # 5. PAYROLL - SEPTEMBER 2026
        # ---------------------------------------------------------

        payroll_month = date(2026, 9, 1)

        payroll_statuses = [
            "Finalized",
            "Finalized",
            "Approved",
            "Pending Approval",
            "Calculated",
            "Draft",
            "Rejected",
            "Finalized",
            "Approved",
            "Calculated",
            "Pending Approval",
        ]

        payroll_objects = {}

        for index, employee_code in enumerate(employees.keys()):

            employee = employees[employee_code]
            salary = salary_objects[employee_code]

            existing = (
                db.query(Payroll)
                .filter(
                    Payroll.employee_id == employee.id,
                    Payroll.payroll_month == payroll_month,
                )
                .first()
            )

            if existing:
                payroll_objects[employee_code] = existing
                continue

            basic = Decimal(salary.basic_salary)
            allowances = Decimal(salary.allowances)
            bonuses = Decimal(salary.bonuses)
            deductions = Decimal(salary.deductions)

            # Small variation for demo purposes
            unpaid_leave = Decimal("0.00")

            if employee_code in ["EMP004", "EMP007"]:
                unpaid_leave = Decimal("1500.00")

            gross = basic + allowances + bonuses
            net = gross - deductions - unpaid_leave

            status = payroll_statuses[index]

            finalized_at = (
                date(2026, 9, 30)
                if status == "Finalized"
                else None
            )

            rejection_reason = (
                "Payroll rejected for correction."
                if status == "Rejected"
                else None
            )

            payroll = Payroll(
                employee_id=employee.id,
                payroll_month=payroll_month,
                basic_salary=basic,
                allowances=allowances,
                bonuses=bonuses,
                deductions=deductions,
                unpaid_leave_deduction=unpaid_leave,
                gross_salary=gross,
                net_salary=net,
                status=status,
                rejection_reason=rejection_reason,
                finalized_at=finalized_at,
            )

            db.add(payroll)
            db.flush()

            payroll_objects[employee_code] = payroll

        print("  ✓ Payroll records prepared")

        # ---------------------------------------------------------
        # 6. PAYSLIPS FOR FINALIZED PAYROLL
        # ---------------------------------------------------------

        for employee_code, payroll in payroll_objects.items():

            if payroll.status != "Finalized":
                continue

            existing = (
                db.query(Payslip)
                .filter(Payslip.payroll_id == payroll.id)
                .first()
            )

            if not existing:

                payslip = Payslip(
                    payroll_id=payroll.id,
                    employee_id=payroll.employee_id,
                    file_path=None,
                )

                db.add(payslip)

        print("  ✓ Payslip records prepared")

        # ---------------------------------------------------------
        # COMMIT
        # ---------------------------------------------------------

        db.commit()

        print("\n" + "=" * 60)
        print("✅ DEMO DATA SEEDED SUCCESSFULLY")
        print("=" * 60)
        print(f"Employees : {len(employees_data)}")
        print("Departments: Engineering, HR, Finance, Marketing, Sales, Operations")
        print("Salary structures: Added")
        print("Attendance: October 2026")
        print("Leave requests: Added")
        print("Payroll: September 2026")
        print("Payslips: Added for finalized payroll")
        print("=" * 60)
        print("\n🔄 Refresh your frontend/dashboard now.\n")

    except Exception as e:
        db.rollback()
        print("\n❌ SEEDING FAILED")
        print(f"Error: {e}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_data()