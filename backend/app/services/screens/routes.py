from uuid import UUID

from fastapi import APIRouter, status

from app.api.deps import CurrentUser
from app.services.screens.application import JobApplicationScreeningServiceDep
from app.services.screens.models import (
    JobApplicationScreenCreate,
    JobApplicationScreenRead,
    JobApplicationScreenUpdate,
)

router = APIRouter(prefix="/screens", tags=["screens"])


@router.get("", response_model=list[JobApplicationScreenRead])
async def list_screens_endpoint(
    current_user: CurrentUser,
    service: JobApplicationScreeningServiceDep,
) -> list[JobApplicationScreenRead]:
    """Return screening results visible to the current user."""
    return service.list_screens(requester=current_user)


@router.get("/{screen_id}", response_model=JobApplicationScreenRead)
async def get_screen_endpoint(
    screen_id: UUID,
    current_user: CurrentUser,
    service: JobApplicationScreeningServiceDep,
) -> JobApplicationScreenRead:
    """Retrieve a screening result if the requester is authorized."""
    return service.get_screen(screen_id=screen_id, requester=current_user)


@router.post(
    "",
    response_model=JobApplicationScreenRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_screen_endpoint(
    payload: JobApplicationScreenCreate,
    current_user: CurrentUser,
    service: JobApplicationScreeningServiceDep,
) -> JobApplicationScreenRead:
    """Screen a job application against its listing."""
    return await service.screen_application(requester=current_user, payload=payload)


@router.put("/application/{application_id}", response_model=JobApplicationScreenRead)
async def upsert_application_screen_endpoint(
    application_id: UUID,
    payload: JobApplicationScreenUpdate,
    current_user: CurrentUser,
    service: JobApplicationScreeningServiceDep,
) -> JobApplicationScreenRead:
    """Create or update manual screening results."""
    return service.save_manual_results(
        requester=current_user,
        application_id=application_id,
        payload=payload,
    )
