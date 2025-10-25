from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException
from sqlmodel import Session

from app.api.deps import SessionDep
from app.core.llm import agent
from app.services.jobs.models import JobListing, JobListingCreate, JobListingSchema


class JobListingApplicationService:
    """Application service handling job listing workflows."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def parse_job_listing_text(self, raw_text: str) -> JobListingSchema:
        """
        Run the LLM parser against raw text and return a structured schema.
        """
        if not raw_text.strip():
            raise ValueError("Input text must not be empty.")

        try:
            result = agent.run_sync(raw_text, output_type=JobListingSchema)
        except Exception as exc:  # pragma: no cover - surface as validation error
            raise ValueError("Unable to parse job listing text.") from exc

        if not isinstance(result.output, JobListingSchema):
            raise ValueError("Agent returned an unexpected payload.")

        return result.output

    def create_job_listing(self, *, listing_in: JobListingCreate) -> JobListing:
        """
        Persist a structured job listing record.
        """
        db_listing = JobListing.model_validate(listing_in)

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


def get_job_listing_service(session: SessionDep) -> JobListingApplicationService:
    return JobListingApplicationService(session=session)


JobListingServiceDep = Annotated[JobListingApplicationService, Depends(get_job_listing_service)]
