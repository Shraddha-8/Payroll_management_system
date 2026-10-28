# Payroll Management System

A full-stack payroll management application designed to manage employees, attendance, leave, salary structures, monthly payroll processing, approvals, payslips, reporting, and role-based access.

## Overview

The Payroll Management System provides a centralized platform for organizations to manage the complete payroll lifecycle.

The system supports four roles:

- **Admin**
- **HR Manager**
- **Payroll Manager**
- **Employee**

Each role has controlled access to the operations relevant to its responsibilities.

---

## Key Features

### Authentication & Authorization
- Secure user authentication
- Password hashing
- JWT/token-based authentication
- Role-based access control
- Protected backend endpoints
- Employee data isolation

### Employee Management
- Add and update employees
- Search and filter employees
- Activate/deactivate employees
- Manage employee information

### Salary Management
- Salary structure management
- Salary components and calculations
- Gross and net salary calculation
- Salary revision history
- Effective-dated salary changes
- Salary snapshot protection for finalized payroll

### Attendance & Leave
- Attendance management
- Attendance CSV import
- Attendance validation
- Missing/inconsistent attendance detection
- Employee leave submission
- HR leave approval/rejection
- Paid and unpaid leave handling

### Payroll Processing
The payroll workflow follows:

```text
Draft
  ↓
Calculated
  ↓
Pending Approval
  ↓
Approved
  ↓
Finalized
```

The system supports:

- Monthly payroll generation
- Salary-based calculations
- Attendance-based calculations
- Unpaid leave deductions
- Payroll preview and exceptions
- Approval/rejection workflow
- Rejection reasons
- Duplicate payroll prevention
- Transaction-safe processing
- Idempotent repeated operations
- Finalized payroll protection
- Explicit correction process

### Payslips & Reports
- Payslip generation
- Employee payslip access
- PDF payslips
- Monthly payroll summaries
- Department-wise payroll totals
- CSV report export

### Audit & Notifications
- Audit trail for important actions
- Actor and timestamp tracking
- Payroll approval notifications
- Payslip availability notifications
- Salary/payroll change alerts
- Duplicate notification prevention

### Testing
Automated tests cover important business rules including:

- Salary calculations
- Unpaid leave
- Payroll workflow
- Role-based permissions
- Duplicate processing
- Approval rules
- Finalization rules
- Failure and rollback scenarios

---

## Technology Stack

### Backend
- Python
- FastAPI
- SQLAlchemy
- PostgreSQL
- Alembic
- Pydantic
- JWT Authentication
- Pytest
- ReportLab

### Frontend
- React
- Vite
- Axios
- JavaScript
- HTML
- CSS

### Development Tools
- Git
- GitHub
- VS Code
- Postman

---

## System Architecture

```text
                    ┌─────────────────────┐
                    │      React UI       │
                    │     Vite Frontend   │
                    └──────────┬──────────┘
                               │
                               │ HTTP / REST API
                               ▼
                    ┌─────────────────────┐
                    │      FastAPI        │
                    │      Backend        │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
        Authentication    Business Logic    Reporting
        & RBAC            & Workflows       & Payslips
              │                │                │
              └────────────────┼────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     PostgreSQL      │
                    │      Database       │
                    └─────────────────────┘
                               │
                               ▼
                         Alembic Migrations
```

---

## Role-Based Access

| Role | Main Responsibilities |
|---|---|
| **Admin** | System administration, user management, corrections and privileged operations |
| **HR Manager** | Employee management, salary management, attendance and leave management |
| **Payroll Manager** | Payroll calculation, review, approval and finalization |
| **Employee** | Own profile, attendance, leave and payslip access |

All sensitive operations are enforced at the backend level through role-based permissions.

---

## Project Structure

```text
PAYROLL MS/
│
├── backend/
│   ├── app/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── core/
│   │   └── main.py
│   │
│   ├── alembic/
│   ├── tests/
│   ├── requirements.txt
│   └── alembic.ini
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── context/
│   │   ├── hooks/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.js
│
├── .env.example
├── .gitignore
└── README.md
```

---

## Prerequisites

Make sure the following are installed:

- Python 3.11+
- Node.js and npm
- PostgreSQL
- Git

---

## Backend Setup

Navigate to the backend:

```bash
cd backend
```

Create and activate a virtual environment:

### Windows

```bash
python -m venv .venv
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create the environment configuration using `.env.example`.

Configure the PostgreSQL connection and authentication settings.

Run database migrations:

```bash
alembic upgrade head
```

Start the FastAPI server:

```bash
uvicorn app.main:app --reload
```

Backend API:

```text
http://127.0.0.1:8000
```

Swagger API documentation:

```text
http://127.0.0.1:8000/docs
```

---

## Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will be available at the URL shown by Vite, normally:

```text
http://localhost:5173
```

---

## Running Tests

From the backend directory:

```bash
pytest -v
```

The test suite validates important payroll business rules, permissions, workflow transitions, duplicate prevention and failure scenarios.

---

## Database Migrations

Create a new migration:

```bash
alembic revision --autogenerate -m "description"
```

Apply migrations:

```bash
alembic upgrade head
```

Check the current migration:

```bash
alembic current
```

Check available heads:

```bash
alembic heads
```

---

## Payroll Workflow

The payroll lifecycle is designed to prevent unauthorized or accidental changes to finalized payroll.

```text
Generate Payroll
       ↓
     Draft
       ↓
   Calculate
       ↓
  Calculated
       ↓
Submit for Approval
       ↓
Pending Approval
       ↓
Approve / Reject
       ↓
   Approved
       ↓
   Finalize
       ↓
   Finalized
       ↓
    Payslip
```

Once payroll is finalized, the historical payroll snapshot is protected from subsequent salary or attendance changes.

---

## Git Workflow

Development is organized using feature branches and pull requests.

Example:

```text
master
  │
  ├── feat/payroll-workflow-reliability
  │
  ├── feat/frontend-payroll-ui
  │
  └── docs/update-readme
```

Changes are developed in separate branches and submitted through pull requests before being merged into `master`.

---

## Project Management

GitHub Issues are used to track major project areas:

- Authentication & RBAC
- Employee & Salary Management
- Attendance & Leave
- Payroll Workflow
- Payslips & Reporting
- Audit, Notifications & Reliability
- Automated Testing & Documentation

---

## Security Considerations

- Passwords are stored using secure hashing.
- Authentication uses token-based access.
- Role-based permissions are enforced on the backend.
- Employees are restricted to their own sensitive information.
- Finalized payroll records are protected from normal modification.
- Database transactions are used for critical payroll operations.
- Repeated operations are designed to be idempotent where required.

---

## Development Status

The project is being developed as an internship project with a focus on:

- Secure role-based access
- Reliable payroll calculations
- Approval-driven payroll processing
- Data consistency
- Automated testing
- Maintainable full-stack architecture