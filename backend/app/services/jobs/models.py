from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import JSON, Column, Date, DateTime, Numeric
from sqlmodel import Field, SQLModel

from app.core.utils import MakeOptional


def _utcnow() -> datetime:
    """Return a timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


class JobTypeEnum(str, Enum):
    """Employment type codes."""

    full_time = "FT"
    part_time = "PT"
    contract = "CO"
    internship = "IN"
    temporary = "TE"


class JobListingBase(SQLModel):
    """Shared attributes for job listing payloads."""

    title: str = Field(max_length=255)
    description: str
    job_type: JobTypeEnum = Field(default=JobTypeEnum.full_time, max_length=2)
    minimum_qualifications: list[str] = Field(
        default_factory=list, sa_column=Column(JSON, nullable=False)
    )
    preferred_qualifications: list[str] = Field(
        default_factory=list, sa_column=Column(JSON, nullable=False)
    )
    company_name: str = Field(max_length=100)
    location: str = Field(max_length=150)
    is_remote: bool = Field(default=False)
    salary_min: Decimal | None = Field(
        default=None,
        sa_column=Column(Numeric(10, 2), nullable=True),
    )
    salary_max: Decimal | None = Field(
        default=None,
        sa_column=Column(Numeric(10, 2), nullable=True),
    )
    expires_on: date | None = Field(default=None, sa_column=Column(Date, nullable=True))
    is_active: bool = Field(default=True)


class JobListing(JobListingBase, table=True):
    """Database model for job listings."""

    __tablename__ = "job_listing"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    company_id: UUID = Field(
        foreign_key="user.id",
        nullable=False,
        index=True,
    )
    posted_on: datetime = Field(
        default_factory=_utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class JobListingCreate(JobListingBase):
    """Data required to create a new job listing."""

    pass


class JobListingRead(JobListingBase):
    """Public representation of a job listing."""

    id: UUID
    company_id: UUID
    posted_on: datetime


class JobListingParseRequest(SQLModel):
    """Request payload for parsing raw job listing text."""

    text: str


class JobListingParseResponse(JobListingBase, MakeOptional):
    pass


class JobListingSchema(JobListingBase):
    """Structured schema produced by the LLM parser."""

    pass
