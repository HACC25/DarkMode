from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from uuid import UUID, uuid4

from pydantic import Field as PydanticField
from sqlalchemy import Column, DateTime, JSON, UniqueConstraint
from sqlalchemy.types import TypeDecorator
from sqlmodel import Field, SQLModel

from app.models import UserPublic


def _utcnow() -> datetime:
    """Return a timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


class ScreeningReasonStatusEnum(str, Enum):
    """Qualification match status."""

    HIGHLY_QUALIFIED = "HIGHLY_QUALIFIED"
    QUALIFIED = "QUALIFIED"
    MEETS = "MEETS"
    NOT_QUALIFIED = "NOT_QUALIFIED"


class ScreeningReason(SQLModel):
    """Explains how a qualification was evaluated."""

    status: ScreeningReasonStatusEnum
    reason: str = PydanticField(max_length=1000)


class ScreeningReasonListType(TypeDecorator):
    """Persist ScreeningReason collections as JSON."""

    impl = JSON
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return []
        return [
            reason.model_dump() if isinstance(reason, ScreeningReason) else reason
            for reason in value
        ]

    def process_result_value(self, value, dialect):
        if value is None:
            return []
        return [
            reason if isinstance(reason, ScreeningReason) else ScreeningReason(**reason)
            for reason in value
        ]


class JobApplicationScreenBase(SQLModel):
    """Shared fields for job application screens."""

    application_id: UUID = Field(
        nullable=False,
        foreign_key="job_application.id",
    )
    minimum_qualifications: list[ScreeningReason] = Field(
        default_factory=list,
        sa_column=Column(ScreeningReasonListType(), nullable=False),
    )
    preferred_qualifications: list[ScreeningReason] = Field(
        default_factory=list,
        sa_column=Column(ScreeningReasonListType(), nullable=False),
    )


class JobApplicationScreen(JobApplicationScreenBase, table=True):
    """Database model storing automated screening results."""

    __tablename__ = "job_application_screen"
    __table_args__ = (
        UniqueConstraint("application_id", name="uq_job_application_screen_application"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(
        default_factory=_utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=_utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class JobApplicationScreenCreate(SQLModel):
    """Request payload to trigger a screening."""

    application_id: UUID


class JobApplicationScreenRead(JobApplicationScreenBase):
    """Public representation of screening results."""

    id: UUID
    created_at: datetime
    updated_at: datetime

class JobApplicationScreenAgentPayload(SQLModel):
    """Structured payload returned by the screening LLM."""

    minimum_qualifications: list[ScreeningReason] = Field(
        default_factory=list,
    )
    preferred_qualifications: list[ScreeningReason] = Field(
        default_factory=list,
    )
