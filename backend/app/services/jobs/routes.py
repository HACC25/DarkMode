from fastapi import APIRouter, File as FastAPIFile, HTTPException, UploadFile, status

from app.api.deps import CompanyUser
from app.services.jobs.application import JobListingServiceDep
from app.services.jobs.models import (
    JobListingCreate,
    JobListingParseRequest,
    JobListingRead,
    JobListingParseResponse,
)
from app.services.parsers import ParserServiceDep

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/listings", response_model=list[JobListingRead])
async def list_job_listings(
    service: JobListingServiceDep, _: CompanyUser
) -> list[JobListingRead]:
    """
    Retrieve all job listings, newest first.
    """
    return service.list_job_listings()


@router.post("/listings/parse", response_model=JobListingParseResponse)
async def parse_job_listing(
    payload: JobListingParseRequest,
    service: JobListingServiceDep,
    _: CompanyUser,
) -> JobListingParseResponse:
    """
    Parse raw job listing text into structured data using the LLM agent.
    """
    try:
        return await service.parse_job_listing_text(payload.text)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/listings/parse-file", response_model=JobListingParseResponse)
async def parse_job_listing_file(
    parser_service: ParserServiceDep,
    service: JobListingServiceDep,
    _: CompanyUser,
    file: UploadFile = FastAPIFile(...),
) -> JobListingParseResponse:
    """
    Parse an uploaded document into a structured job listing via the LLM agent.
    """
    parsed = parser_service.parse_file(file=file)
    if not parsed.text.strip():
        raise HTTPException(status_code=422, detail="Uploaded job description was empty.")

    try:
        return await service.parse_job_listing_text(parsed.text)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post(
    "/listings",
    response_model=JobListingRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_job_listing(
    listing_in: JobListingCreate,
    service: JobListingServiceDep,
    company_user: CompanyUser,
) -> JobListingRead:
    """
    Persist a structured job listing record.
    """
    return service.create_job_listing(
        listing_in=listing_in, company_id=company_user.id
    )
