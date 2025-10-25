from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class FileBase(SQLModel):
    """Base schema for creating or updating a file entry."""

    filename: str = Field(index=True, max_length=255)
    content_type: str = Field(max_length=100)
    size_bytes: int = Field(ge=0)
    storage_key: str = Field(index=True, unique=True)
    owner_id: UUID = Field(nullable=False, foreign_key="user.id")


class File(FileBase, table=True):
    """Database model for file metadata."""

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=_utcnow, nullable=False)
