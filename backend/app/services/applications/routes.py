import logging
from uuid import UUID

from fastapi import APIRouter, status

from app.api.deps import CurrentUser
from app.services.applications.application import JobApplicationServiceDep
from app.services.applications.models import (
    JobApplicationCreate,
    JobApplicationRead,
    JobApplicationStatusUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/applications", tags=["applications"])


@router.get("", response_model=list[JobApplicationRead])
async def list_applications_endpoint(
    current_user: CurrentUser,
    service: JobApplicationServiceDep,
) -> list[JobApplicationRead]:
    """List job applications visible to the current user."""
    return service.list_applications(requester=current_user)


@router.get("/{application_id}", response_model=JobApplicationRead)
async def get_application_endpoint(
    application_id: UUID,
    current_user: CurrentUser,
    service: JobApplicationServiceDep,
) -> JobApplicationRead:
    """Retrieve a single job application if authorized."""
    return service.get_application(
        application_id=application_id,
        requester=current_user,
    )


@router.post("", response_model=JobApplicationRead, status_code=status.HTTP_201_CREATED)
async def submit_application_endpoint(
    payload: JobApplicationCreate,
    current_user: CurrentUser,
    service: JobApplicationServiceDep,
) -> JobApplicationRead:
    """Submit a job application on behalf of the current user."""
    return service.submit_application(applicant=current_user, application_in=payload)


@router.put(
    "/{application_id}/status",
    response_model=JobApplicationRead,
)
async def update_application_status_endpoint(
    application_id: UUID,
    payload: JobApplicationStatusUpdate,
    current_user: CurrentUser,
    service: JobApplicationServiceDep,
) -> JobApplicationRead:
    """Transition an application's status while enforcing workflow rules."""
    logger.info(
        "Application status update requested: application_id=%s new_status=%s user_id=%s",
        application_id,
        payload.status,
        current_user.id,
    )
    try:
        updated = service.update_status(
            application_id=application_id,
            requester=current_user,
            new_status=payload.status,
        )
        logger.info(
            "Application status updated successfully: application_id=%s status=%s",
            application_id,
            updated.status,
        )
        return updated
    except Exception:
        logger.exception(
            "Failed to update application status: application_id=%s new_status=%s user_id=%s",
            application_id,
            payload.status,
            current_user.id,
        )
        raise


@router.post("/{application_id}/withdraw", response_model=JobApplicationRead)
async def withdraw_application_endpoint(
    application_id: UUID,
    current_user: CurrentUser,
    service: JobApplicationServiceDep,
) -> JobApplicationRead:
    """Withdraw an application regardless of its current status."""
    return service.withdraw_application(
        application_id=application_id,
        requester=current_user,
    )
