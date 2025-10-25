from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.deps import SessionDep
from app.models import User, UserRoleEnum
from app.services.applications.models import JobApplication, JobApplicationCreate
from app.services.jobs.models import JobListing
from app.services.resumes.models import Resume


class JobApplicationService:
    """Application service encapsulating job application workflows."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def submit_application(
        self,
        *,
        applicant: User,
        application_in: JobApplicationCreate,
    ) -> JobApplication:
        """
        Create a new job application for the requesting user.
        """
        if not applicant.is_superuser and applicant.role != UserRoleEnum.APPLICANT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only applicants may submit job applications.",
            )

        job_listing = self._session.get(JobListing, application_in.job_listing_id)
        if not job_listing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job listing not found.",
            )
        if not job_listing.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Job listing is no longer accepting applications.",
            )

        if application_in.resume_id is not None:
            resume = self._session.get(Resume, application_in.resume_id)
            if not resume:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Resume not found.",
                )
            if not applicant.is_superuser and resume.user_id != applicant.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot submit a resume that belongs to another user.",
                )

        existing_statement = select(JobApplication).where(
            JobApplication.job_listing_id == application_in.job_listing_id,
            JobApplication.applicant_id == applicant.id,
        )
        if self._session.exec(existing_statement).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You have already applied to this job listing.",
            )

        job_application = JobApplication.model_validate(
            application_in,
            update={"applicant_id": applicant.id},
        )

        try:
            self._session.add(job_application)
            self._session.commit()
            self._session.refresh(job_application)
            return job_application
        except Exception as exc:  # pragma: no cover - re-raised as HTTP error
            self._session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to submit job application: {exc}",
            ) from exc

    def list_applications(self, *, requester: User) -> list[JobApplication]:
        """
        Return job applications visible to the requester.
        """
        base_query = select(JobApplication).order_by(
            JobApplication.created_at.desc()
        )

        if requester.is_superuser:
            return list(self._session.exec(base_query))

        if requester.role == UserRoleEnum.COMPANY:
            company_query = (
                select(JobApplication)
                .join(
                    JobListing,
                    JobListing.id == JobApplication.job_listing_id,
                )
                .where(JobListing.company_id == requester.id)
                .order_by(JobApplication.created_at.desc())
            )
            return list(self._session.exec(company_query))

        applicant_query = base_query.where(
            JobApplication.applicant_id == requester.id
        )
        return list(self._session.exec(applicant_query))

    def get_application(
        self, *, application_id: UUID, requester: User
    ) -> JobApplication:
        """
        Retrieve a single job application if the requester is authorized.
        """
        application = self._session.get(JobApplication, application_id)
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job application not found.",
            )

        if requester.is_superuser:
            return application

        if application.applicant_id == requester.id:
            return application

        job_listing = self._session.get(JobListing, application.job_listing_id)
        if job_listing and job_listing.company_id == requester.id:
            return application

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this job application.",
        )


def get_job_application_service(
    session: SessionDep,
) -> JobApplicationService:
    return JobApplicationService(session=session)


JobApplicationServiceDep = Annotated[
    JobApplicationService, Depends(get_job_application_service)
]

