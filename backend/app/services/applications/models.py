from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, Text, UniqueConstraint
from sqlalchemy import Enum as SQLAlchemyEnum
from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    """Return a timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


class JobApplicationStatusEnum(str, Enum):
    """Lifecycle states for a job application."""

    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"


class JobApplicationBase(SQLModel):
    """Shared fields between job application payloads."""

    job_listing_id: UUID = Field(
        nullable=False,
        foreign_key="job_listing.id",
        index=True,
    )
    resume_id: UUID | None = Field(
        default=None,
        foreign_key="resume.id",
    )
    cover_letter: str | None = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )


class JobApplication(JobApplicationBase, table=True):
    """Database model for job applications."""

    __tablename__ = "job_application"
    __table_args__ = (
        UniqueConstraint(
            "job_listing_id",
            "applicant_id",
            name="uq_job_application_listing_applicant",
        ),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    applicant_id: UUID = Field(
        nullable=False,
        foreign_key="user.id",
        index=True,
    )
    status: JobApplicationStatusEnum = Field(
        default=JobApplicationStatusEnum.SUBMITTED,
        sa_column=Column(
            SQLAlchemyEnum(
                JobApplicationStatusEnum,
                name="job_application_status_enum",
            ),
            nullable=False,
        ),
    )
    created_at: datetime = Field(
        default_factory=_utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=_utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class JobApplicationCreate(JobApplicationBase):
    """Payload for submitting a job application."""

    pass


class JobApplicationRead(JobApplicationBase):
    """Public representation of a job application."""

    id: UUID
    applicant_id: UUID
    status: JobApplicationStatusEnum
    created_at: datetime
    updated_at: datetime
