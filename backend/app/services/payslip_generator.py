from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


def generate_payslip_pdf(payroll, employee, output_path):
    """
    Generate a PDF payslip for a finalized payroll.
    """

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()

    elements = []

    # Title
    elements.append(
        Paragraph(
            "<b>PAYSLIP</b>",
            styles["Title"],
        )
    )

    elements.append(Spacer(1, 10))

    # Employee information
    employee_data = [
        ["Employee Name", employee.name],
        ["Employee ID", employee.employee_id],
        ["Department", employee.department],
        ["Payroll Month", payroll.payroll_month.strftime("%B %Y")],
    ]

    employee_table = Table(
        employee_data,
        colWidths=[50 * mm, 100 * mm],
    )

    employee_table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("BACKGROUND", (0, 0), (0, -1), colors.lightgrey),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )

    elements.append(employee_table)
    elements.append(Spacer(1, 15))

    # Salary details
    salary_data = [
        ["Earnings", "Amount"],
        ["Basic Salary", f"₹ {payroll.basic_salary:,.2f}"],
        ["Allowances", f"₹ {payroll.allowances:,.2f}"],
        ["Bonuses", f"₹ {payroll.bonuses:,.2f}"],
        ["Gross Salary", f"₹ {payroll.gross_salary:,.2f}"],
        ["Deductions", f"₹ {payroll.deductions:,.2f}"],
        [
            "Unpaid Leave Deduction",
            f"₹ {payroll.unpaid_leave_deduction:,.2f}",
        ],
        ["Net Salary", f"₹ {payroll.net_salary:,.2f}"],
    ]

    salary_table = Table(
        salary_data,
        colWidths=[100 * mm, 50 * mm],
    )

    salary_table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("PADDING", (0, 0), (-1, -1), 6),
                ("ALIGN", (1, 1), (1, -1), "RIGHT"),
            ]
        )
    )

    elements.append(salary_table)
    elements.append(Spacer(1, 15))

    # Final status
    elements.append(
        Paragraph(
            f"<b>Status:</b> {payroll.status}",
            styles["Normal"],
        )
    )

    elements.append(Spacer(1, 5))

    if payroll.finalized_at:
        elements.append(
            Paragraph(
                f"<b>Finalized On:</b> {payroll.finalized_at}",
                styles["Normal"],
            )
        )

    doc.build(elements)

    return str(output_path)