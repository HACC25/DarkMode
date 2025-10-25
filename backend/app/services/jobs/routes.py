from fastapi import APIRouter, HTTPException, status

from app.services.jobs.application import JobListingServiceDep
from app.services.jobs.models import (
    JobListingCreate,
    JobListingParseRequest,
    JobListingRead,
    JobListingSchema,
)

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("/listings/parse", response_model=JobListingSchema)
async def parse_job_listing(
    payload: JobListingParseRequest, service: JobListingServiceDep
) -> JobListingSchema:
    """
    Parse raw job listing text into structured data using the LLM agent.
    """
    try:
        return service.parse_job_listing_text(payload.text)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post(
    "/listings",
    response_model=JobListingRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_job_listing(
    listing_in: JobListingCreate, service: JobListingServiceDep
) -> JobListingRead:
    """
    Persist a structured job listing record.
    """
    return service.create_job_listing(listing_in=listing_in)
