from uuid import UUID

from fastapi import APIRouter, UploadFile, status
from fastapi import File as FastAPIFile

from app.api.deps import CurrentUser
from app.services.resumes.application import ResumeServiceDep
from app.services.resumes.models import ResumeRead

router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.get("", response_model=list[ResumeRead])
async def list_resumes_endpoint(
    current_user: CurrentUser,
    service: ResumeServiceDep,
) -> list[ResumeRead]:
    """Return resumes accessible to the current user."""
    return service.list_resumes(requester=current_user)


@router.get("/{resume_id}", response_model=ResumeRead)
async def get_resume_endpoint(
    resume_id: UUID,
    current_user: CurrentUser,
    service: ResumeServiceDep,
) -> ResumeRead:
    """Return a single resume if the requester is authorized."""
    return service.get_resume(resume_id=resume_id, requester=current_user)


@router.post("", response_model=ResumeRead, status_code=status.HTTP_201_CREATED)
async def upload_resume_endpoint(
    current_user: CurrentUser,
    service: ResumeServiceDep,
    file: UploadFile = FastAPIFile(...),
) -> ResumeRead:
    """Upload a resume, persist the file, and store parsed text content."""
    return service.upload_resume(file=file, owner=current_user)


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume_endpoint(
    resume_id: UUID,
    current_user: CurrentUser,
    service: ResumeServiceDep,
) -> None:
    """Delete a resume and its backing file if authorized."""
    service.delete_resume(resume_id=resume_id, requester=current_user)
