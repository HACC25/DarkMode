from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, Text
from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    """Return a timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


class ResumeBase(SQLModel):
    """Shared attributes for resume payloads."""

    user_id: UUID = Field(
        nullable=False,
        foreign_key="user.id",
        index=True,
    )
    file_id: UUID = Field(
        nullable=False,
        foreign_key="file.id",
        unique=True,
    )
    text_content: str = Field(
        default="",
        sa_column=Column(Text, nullable=False),
    )


class Resume(ResumeBase, table=True):
    """Database model for stored resumes."""

    __tablename__ = "resume"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(
        default_factory=_utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=_utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class ResumeRead(ResumeBase):
    """Public representation of a resume record."""

    id: UUID
    created_at: datetime
    updated_at: datetime
