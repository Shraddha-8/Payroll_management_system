from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field, ConfigDict


class SalaryStructureBase(BaseModel):
    employee_id: int

    basic_salary: Decimal = Field(
        ge=0,
        decimal_places=2,
        max_digits=12
    )

    allowances: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
        decimal_places=2,
        max_digits=12
    )

    bonuses: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
        decimal_places=2,
        max_digits=12
    )

    deductions: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
        decimal_places=2,
        max_digits=12
    )

    effective_from: date
    effective_to: date | None = None


class SalaryStructureCreate(SalaryStructureBase):
    pass


class SalaryStructureUpdate(BaseModel):
    basic_salary: Decimal | None = Field(
        default=None,
        ge=0,
        decimal_places=2,
        max_digits=12
    )

    allowances: Decimal | None = Field(
        default=None,
        ge=0,
        decimal_places=2,
        max_digits=12
    )

    bonuses: Decimal | None = Field(
        default=None,
        ge=0,
        decimal_places=2,
        max_digits=12
    )

    deductions: Decimal | None = Field(
        default=None,
        ge=0,
        decimal_places=2,
        max_digits=12
    )

    effective_from: date | None = None
    effective_to: date | None = None


class SalaryStructureResponse(SalaryStructureBase):
    id: int

    model_config = ConfigDict(from_attributes=True)