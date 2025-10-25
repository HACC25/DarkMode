from uuid import UUID

from app.api.deps import CurrentUser

from fastapi import APIRouter, UploadFile, File as FastAPIFile, status
from fastapi.responses import StreamingResponse
from app.services.files.models import File
from app.services.files.application import FileServiceDep

router = APIRouter(prefix="/files", tags=["files"])


@router.post("", response_model=File)
async def upload_file_and_create(
        current_user: CurrentUser,
        service: FileServiceDep,
        file: UploadFile = FastAPIFile(...),
) -> File:
    """
    Handles file upload, delegates storage, and records metadata in the database.
    """
    return service.upload_file(file=file, owner=current_user)


@router.get("/{file_id}")
async def download_file_endpoint(
        file_id: UUID,
        current_user: CurrentUser,
        service: FileServiceDep,
):
    """
    Retrieves a file by its database ID, performs authorization, and streams the content.
    """
    db_file, file_stream = service.retrieve_file_stream(file_id=file_id, requester=current_user)

    return StreamingResponse(
        file_stream,
        media_type=db_file.content_type,
        headers={
            "Content-Disposition": f"attachment; filename=\"{db_file.filename.encode('ascii', 'ignore').decode('ascii')}\""
        },
    )


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file_endpoint(
        file_id: UUID,
        current_user: CurrentUser,
        service: FileServiceDep,
):
    """
    Deletes file metadata from the database and removes the file from storage.
    Only the owner or a superuser is authorized.
    """

    service.delete_file(file_id=file_id, requester=current_user)
