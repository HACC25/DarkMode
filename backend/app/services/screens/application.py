from __future__ import annotations

from typing import Annotated, TypedDict
from uuid import UUID

from fastapi import Depends, HTTPException, status
from pydantic_ai import Agent
from sqlmodel import Session, select

from app.api.deps import SessionDep
from app.core.llm import ScreenAgentDep
from app.models import User, UserRoleEnum
from app.services.applications.models import JobApplication, JobApplicationStatusEnum
from app.services.jobs.models import JobListing
from app.services.resumes.models import Resume
from app.services.screens.models import (
    JobApplicationScreen,
    JobApplicationScreenAgentPayload,
    JobApplicationScreenCreate,
    JobApplicationScreenUpdate,
    ScreeningReason,
    ScreeningReasonStatusEnum,
)


class JobApplicationScore(TypedDict):
    minimum_score: int
    minimum_max_score: int
    preferred_score: int
    preferred_max_score: int
    total_score: int
    max_score: int
    match_percentage: float


class JobApplicationScreeningService:
    """Service responsible for screening applications against job listings."""

    _STATUS_POINTS = {
        ScreeningReasonStatusEnum.HIGHLY_QUALIFIED: 4,
        ScreeningReasonStatusEnum.QUALIFIED: 3,
        ScreeningReasonStatusEnum.MEETS: 2,
        ScreeningReasonStatusEnum.NOT_QUALIFIED: 0,
    }
    _MAX_STATUS_POINTS = max(_STATUS_POINTS.values())
    _MINIMUM_WEIGHT = 2
    _PREFERRED_WEIGHT = 1

    def __init__(self, session: Session, screen_agent: Agent) -> None:
        self._session = session
        self._screen_agent = screen_agent

    async def screen_application(
        self,
        *,
        requester: User,
        payload: JobApplicationScreenCreate,
    ) -> JobApplicationScreen:
        """
        Generate screening results for a job application.
        """
        application = self._session.get(JobApplication, payload.application_id)
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job application not found.",
            )

        job_listing = self._session.get(JobListing, application.job_listing_id)
        if not job_listing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job listing not found for this application.",
            )

        if not requester.is_superuser:
            owns_application = application.applicant_id == requester.id
            owns_listing = job_listing.company_id == requester.id
            if not owns_application and not owns_listing:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to screen this application.",
                )

        if application.resume_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot screen an application without an attached resume.",
            )

        resume = self._session.get(Resume, application.resume_id)
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found for this application.",
            )

        if (
            not requester.is_superuser
            and requester.role == UserRoleEnum.APPLICANT
            and resume.user_id != requester.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot screen an application using another user's resume.",
            )

        existing_screen = self._session.exec(
            select(JobApplicationScreen).where(
                JobApplicationScreen.application_id == application.id
            )
        ).first()
        if existing_screen:
            return existing_screen

        agent_input = {
            "job_listing": {
                "title": job_listing.title,
                "description": job_listing.description,
                "minimum_qualifications": job_listing.minimum_qualifications,
                "preferred_qualifications": job_listing.preferred_qualifications,
            },
            "resume": {
                "text_content": resume.text_content or "",
            },
        }

        print(agent_input)

        try:
            agent_result = await self._screen_agent.run(
                user_prompt=str(agent_input),
                output_type=JobApplicationScreenAgentPayload,
            )
            print(agent_result)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Screening agent failed: {exc}",
            ) from exc

        if not isinstance(agent_result.output, JobApplicationScreenAgentPayload):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Screening agent returned an unexpected payload.",
            )

        structured_screen = agent_result.output

        screening = JobApplicationScreen(
            application_id=application.id,
            minimum_qualifications=structured_screen.minimum_qualifications,
            preferred_qualifications=structured_screen.preferred_qualifications,
        )
        self._update_screen_score(screening)

        try:
            self._session.add(screening)
            application.status = JobApplicationStatusEnum.UNDER_REVIEW
            self._session.add(application)
            self._session.commit()
            self._session.refresh(screening)
            return screening
        except Exception as exc:  # pragma: no cover - re-raised as HTTP error
            self._session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to store screening results: {exc}",
            ) from exc

    def save_manual_results(
        self,
        *,
        requester: User,
        application_id: UUID,
        payload: JobApplicationScreenUpdate,
    ) -> JobApplicationScreen:
        """
        Allow an authorized company user to edit screening results.
        """
        application = self._session.get(JobApplication, application_id)
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job application not found.",
            )

        job_listing = self._session.get(JobListing, application.job_listing_id)
        if not job_listing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job listing not found for this application.",
            )

        if not requester.is_superuser and job_listing.company_id != requester.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this screening result.",
            )

        screen = self._session.exec(
            select(JobApplicationScreen).where(
                JobApplicationScreen.application_id == application.id
            )
        ).first()

        if not screen:
            screen = JobApplicationScreen(application_id=application.id)
            self._session.add(screen)

        if payload.minimum_qualifications is not None:
            screen.minimum_qualifications = payload.minimum_qualifications

        if payload.preferred_qualifications is not None:
            screen.preferred_qualifications = payload.preferred_qualifications

        if (
            payload.minimum_qualifications is None
            and payload.preferred_qualifications is None
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No screening results provided.",
            )

        self._update_screen_score(screen)

        try:
            application.status = JobApplicationStatusEnum.UNDER_REVIEW
            self._session.add(application)
            self._session.add(screen)
            self._session.commit()
            self._session.refresh(screen)
            return screen
        except Exception as exc:  # pragma: no cover - re-raised as HTTP error
            self._session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update screening results: {exc}",
            ) from exc

    def list_screens(self, *, requester: User) -> list[JobApplicationScreen]:
        """
        Return screening results visible to the requester.
        """
        query = select(JobApplicationScreen).order_by(
            JobApplicationScreen.created_at.desc()
        )

        if requester.is_superuser:
            return list(self._session.exec(query))

        if requester.role == UserRoleEnum.COMPANY:
            company_query = (
                select(JobApplicationScreen)
                .join(
                    JobApplication,
                    JobApplication.id == JobApplicationScreen.application_id,
                )
                .join(
                    JobListing,
                    JobListing.id == JobApplication.job_listing_id,
                )
                .where(JobListing.company_id == requester.id)
                .order_by(JobApplicationScreen.created_at.desc())
            )
            return list(self._session.exec(company_query))

        applicant_query = (
            select(JobApplicationScreen)
            .join(
                JobApplication,
                JobApplication.id == JobApplicationScreen.application_id,
            )
            .where(JobApplication.applicant_id == requester.id)
            .order_by(JobApplicationScreen.created_at.desc())
        )
        return list(self._session.exec(applicant_query))

    def get_screen(
        self,
        *,
        screen_id: UUID,
        requester: User,
    ) -> JobApplicationScreen:
        """
        Retrieve a single screening result if the requester is authorized.
        """
        screen = self._session.get(JobApplicationScreen, screen_id)
        if not screen:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Screening result not found.",
            )

        application = self._session.get(JobApplication, screen.application_id)
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Associated application is missing.",
            )

        job_listing = self._session.get(JobListing, application.job_listing_id)

        if requester.is_superuser:
            return screen

        if application.applicant_id == requester.id:
            return screen

        if job_listing and job_listing.company_id == requester.id:
            return screen

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this screening result.",
        )

    def score_application(
        self,
        *,
        application_id: UUID,
        requester: User,
    ) -> JobApplicationScore:
        """
        Calculate a weighted score for an application's screening results.
        """
        application = self._session.get(JobApplication, application_id)
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job application not found.",
            )

        job_listing = self._session.get(JobListing, application.job_listing_id)
        if not job_listing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job listing not found for this application.",
            )

        if (
            not requester.is_superuser
            and requester.id
            not in {application.applicant_id, job_listing.company_id}
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to score this application.",
            )

        screen = self._session.exec(
            select(JobApplicationScreen).where(
                JobApplicationScreen.application_id == application.id
            )
        ).first()

        if not screen:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="This application has not been screened yet.",
            )

        score_payload = self._update_screen_score(screen)

        try:
            self._session.add(screen)
            self._session.commit()
            self._session.refresh(screen)
        except Exception as exc:  # pragma: no cover - re-raised as HTTP error
            self._session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update stored score: {exc}",
            ) from exc

        return score_payload

    def _score_reasons(
        self,
        reasons: list[ScreeningReason],
        weight: int,
    ) -> tuple[int, int]:
        """Return the earned and maximum points for a list of reasons."""
        if not reasons:
            return 0, 0

        score = sum(
            self._STATUS_POINTS.get(reason.status, 0) * weight for reason in reasons
        )
        max_score = len(reasons) * self._MAX_STATUS_POINTS * weight
        return score, max_score

    def _update_screen_score(
        self,
        screen: JobApplicationScreen,
    ) -> JobApplicationScore:
        """Recalculate and persist the score on the screen record."""
        score_data = self._calculate_score(screen)
        screen.score = score_data["match_percentage"]
        return score_data

    def _calculate_score(self, screen: JobApplicationScreen) -> JobApplicationScore:
        """Aggregate the minimum and preferred qualification scores."""
        min_score, min_max = self._score_reasons(
            screen.minimum_qualifications, self._MINIMUM_WEIGHT
        )
        pref_score, pref_max = self._score_reasons(
            screen.preferred_qualifications, self._PREFERRED_WEIGHT
        )

        total_score = min_score + pref_score
        max_score = min_max + pref_max
        match_percentage = (
            round((total_score / max_score) * 100, 2) if max_score else 0.0
        )

        return JobApplicationScore(
            minimum_score=min_score,
            minimum_max_score=min_max,
            preferred_score=pref_score,
            preferred_max_score=pref_max,
            total_score=total_score,
            max_score=max_score,
            match_percentage=match_percentage,
        )


def get_job_application_screening_service(
    session: SessionDep,
    screen_agent: ScreenAgentDep,
) -> JobApplicationScreeningService:
    return JobApplicationScreeningService(session=session, screen_agent=screen_agent)


JobApplicationScreeningServiceDep = Annotated[
    JobApplicationScreeningService,
    Depends(get_job_application_screening_service),
]
