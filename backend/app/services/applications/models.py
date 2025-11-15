"""Job application schemas."""

from sqlmodel import SQLModel

from app.models import (
    JobApplication,
    JobApplicationBase,
    JobApplicationCreate,
    JobApplicationRead,
    JobApplicationStatusEnum,
)


class JobApplicationStatusUpdate(SQLModel):
    """Request body for updating a job application's status."""

    status: JobApplicationStatusEnum


__all__ = [
    "JobApplicationStatusEnum",
    "JobApplicationBase",
    "JobApplication",
    "JobApplicationCreate",
    "JobApplicationRead",
    "JobApplicationStatusUpdate",
]
