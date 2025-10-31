from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException
from pydantic_ai import Agent
from sqlmodel import Session, select

from app.api.deps import SessionDep
from app.core.llm import JobAgentDep
from app.services.jobs.models import (
    JobListing,
    JobListingCreate,
    JobListingParseResponse,
)


class JobListingApplicationService:
    """Application service handling job listing workflows."""

    def __init__(self, session: Session, job_agent: Agent) -> None:
        self._session = session
        self._job_agent = job_agent

    async def parse_job_listing_text(self, raw_text: str) -> JobListingParseResponse:
        """
        Run the LLM parser against raw text and return a structured schema.
        """
        if not raw_text.strip():
            raise ValueError("Input text must not be empty.")

        try:
            result = await self._job_agent.run(
                raw_text, output_type=JobListingParseResponse
            )
        except Exception as exc:
            raise ValueError("Unable to parse job listing text.") from exc

        if not isinstance(result.output, JobListingParseResponse):
            raise ValueError("Agent returned an unexpected payload.")

        return result.output

    def create_job_listing(
        self, *, listing_in: JobListingCreate, company_id: uuid.UUID
    ) -> JobListing:
        """
        Persist a structured job listing record.
        """
        db_listing = JobListing.model_validate(
            listing_in, update={"company_id": company_id}
        )

        try:
            self._session.add(db_listing)
            self._session.commit()
            self._session.refresh(db_listing)
            return db_listing
        except Exception as exc:  # pragma: no cover - re-raised as HTTP error
            self._session.rollback()
            raise HTTPException(
                status_code=500, detail=f"Failed to create job listing: {exc}"
            ) from exc

    def list_job_listings(self) -> list[JobListing]:
        """
        Return all job listings ordered by most recent posting date.
        """
        statement = select(JobListing).order_by(JobListing.posted_on.desc())
        return list(self._session.exec(statement))


def get_job_listing_service(
    session: SessionDep,
    job_agent: JobAgentDep,
) -> JobListingApplicationService:
    return JobListingApplicationService(session=session, job_agent=job_agent)


JobListingServiceDep = Annotated[
    JobListingApplicationService, Depends(get_job_listing_service)
]
