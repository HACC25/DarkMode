import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from enum import Enum

from pydantic import EmailStr, Field as PydanticField
from sqlalchemy import JSON, Column, Date, DateTime, Numeric, Text, UniqueConstraint
from sqlalchemy import Enum as SQLAlchemyEnum
from sqlalchemy.types import TypeDecorator
from sqlmodel import Field, Relationship, SQLModel

from app.core.utils import MakeOptional


def _utcnow() -> datetime:
    """Return a timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


class UserRoleEnum(str, Enum):
    COMPANY = "COMPANY"
    APPLICANT = "APPLICANT"


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)
    role: UserRoleEnum = Field(default=UserRoleEnum.APPLICANT)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=40)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=40)
    full_name: str | None = Field(default=None, max_length=255)
    role: UserRoleEnum = Field(default=UserRoleEnum.APPLICANT)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=40)
    role: UserRoleEnum | None = Field(default=None)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=40)
    new_password: str = Field(min_length=8, max_length=40)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    role: UserRoleEnum = Field(
        default=UserRoleEnum.APPLICANT,
        sa_column=Column(
            SQLAlchemyEnum(
                UserRoleEnum,
                name="userroleenum",
                create_type=False,
            ),
            nullable=False,
        ),
    )
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str

    application: list["JobApplication"] = Relationship(back_populates="applicant")


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


class FileBase(SQLModel):
    """Base schema for creating or updating a file entry."""

    filename: str = Field(index=True, max_length=255)
    content_type: str = Field(max_length=100)
    size_bytes: int = Field(ge=0)
    storage_key: str = Field(index=True, unique=True)
    owner_id: uuid.UUID = Field(nullable=False, foreign_key="user.id")


class File(FileBase, table=True):
    """Database model for file metadata."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=_utcnow, nullable=False)


class ResumeBase(SQLModel):
    """Shared attributes for resume payloads."""

    user_id: uuid.UUID = Field(
        nullable=False,
        foreign_key="user.id",
        index=True,
    )
    file_id: uuid.UUID = Field(
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

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(
        default_factory=_utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=_utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )

    applications: list["JobApplication"] = Relationship(back_populates="resume")


class ResumeRead(ResumeBase):
    """Public representation of a resume record."""

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


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

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    company_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        index=True,
    )
    posted_on: datetime = Field(
        default_factory=_utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )

    applications: list["JobApplication"] = Relationship(back_populates="job_listing")


class JobListingCreate(JobListingBase):
    """Data required to create a new job listing."""

    pass


class JobListingRead(JobListingBase):
    """Public representation of a job listing."""

    id: uuid.UUID
    company_id: uuid.UUID
    posted_on: datetime
    applications: list["JobApplication"]


class JobListingParseRequest(SQLModel):
    """Request payload for parsing raw job listing text."""

    text: str


class JobListingParseResponse(JobListingBase, MakeOptional):
    pass


class JobListingSchema(JobListingBase):
    """Structured schema produced by the LLM parser."""

    pass


class JobApplicationStatusEnum(str, Enum):
    """Lifecycle states for a job application."""

    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    INTERVIEW = "INTERVIEW"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"


class JobApplicationBase(SQLModel):
    """Shared fields between job application payloads."""

    job_listing_id: uuid.UUID = Field(
        nullable=False,
        foreign_key="job_listing.id",
        index=True,
    )
    resume_id: uuid.UUID | None = Field(
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

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    applicant_id: uuid.UUID = Field(
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

    resume: "Resume" = Relationship(back_populates="applications")
    applicant: User = Relationship(back_populates="application")
    screen: "JobApplicationScreen" = Relationship(back_populates="application")
    job_listing: JobListing = Relationship(back_populates="applications")


class JobApplicationCreate(JobApplicationBase):
    """Payload for submitting a job application."""

    pass

class JobApplicationRead(JobApplicationBase):
    """Public representation of a job application."""

    id: uuid.UUID
    applicant_id: uuid.UUID
    status: JobApplicationStatusEnum
    created_at: datetime
    updated_at: datetime
    resume: "Resume"
    applicant: User
    screen: "JobApplicationScreen | None"
    job_listing: JobListing


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

    application_id: uuid.UUID = Field(
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
        UniqueConstraint(
            "application_id", name="uq_job_application_screen_application"
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(
        default_factory=_utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=_utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )

    application: "JobApplication" = Relationship(back_populates="screen")


class JobApplicationScreenCreate(SQLModel):
    """Request payload to trigger a screening."""

    application_id: uuid.UUID


class JobApplicationScreenUpdate(SQLModel):
    """Payload for manually updating screening results."""

    minimum_qualifications: list[ScreeningReason] | None = None
    preferred_qualifications: list[ScreeningReason] | None = None


class JobApplicationScreenRead(JobApplicationScreenBase):
    """Public representation of screening results."""

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    application: "JobApplication"


class JobApplicationScreenAgentPayload(SQLModel):
    """Structured payload returned by the screening LLM."""

    minimum_qualifications: list[ScreeningReason] = Field(
        default_factory=list,
    )
    preferred_qualifications: list[ScreeningReason] = Field(
        default_factory=list,
    )

# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=40)
