from __future__ import annotations

from typing import Annotated, BinaryIO
from uuid import UUID, uuid4

from fastapi import Depends, HTTPException, UploadFile
from sqlmodel import Session

from app.api.deps import SessionDep
from app.models import User
from app.services.files.models import File
from app.services.storage.base import StorageService
from app.services.storage.deps import StorageServiceDep


class FileApplicationService:
    """Application service that orchestrates file storage and metadata operations."""

    def __init__(self, session: Session, storage: StorageService) -> None:
        self._session = session
        self._storage = storage

    def upload_file(self, *, file: UploadFile, owner: User) -> File:
        storage_key: str | None = None

        file_id = uuid4()
        storage_filename = str(file_id)

        try:
            storage_key = self._storage.save(
                file_data=file.file, filename=storage_filename
            )
        except Exception as exc:  # pragma: no cover - propagated as HTTP error
            raise HTTPException(
                status_code=500,
                detail=f"Storage service failed to save file: {exc}",
            ) from exc

        try:
            file_metadata = File(
                id=file_id,
                filename=file.filename,
                content_type=file.content_type,
                size_bytes=file.size,
                storage_key=storage_key,
                owner_id=owner.id,
            )
            db_file = File.model_validate(file_metadata)

            self._session.add(db_file)
            self._session.commit()
            self._session.refresh(db_file)
            return db_file

        except Exception as exc:  # pragma: no cover - propagated as HTTP error
            if storage_key:
                try:
                    self._storage.delete(storage_key)
                except Exception:
                    # Any cleanup failure is logged and ignored to avoid masking the DB error.
                    print(  # noqa: T201 - best-effort warning for operators
                        f"Cleanup warning: failed to delete storage object {storage_key}"
                    )
            self._session.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Failed to record file metadata: {exc}",
            ) from exc

    def retrieve_file_stream(
        self, *, file_id: UUID, requester: User
    ) -> tuple[File, BinaryIO]:
        db_file = self._session.get(File, file_id)
        if not db_file:
            raise HTTPException(status_code=404, detail="File metadata not found")

        if db_file.owner_id != requester.id and not requester.is_superuser:
            raise HTTPException(
                status_code=403, detail="Not authorized to access this file"
            )

        try:
            file_stream = self._storage.retrieve(db_file.storage_key)
            return db_file, file_stream
        except FileNotFoundError as exc:
            raise HTTPException(
                status_code=500,
                detail="Physical file storage error (file not found in storage).",
            ) from exc
        except Exception as exc:  # pragma: no cover - propagated as HTTP error
            raise HTTPException(
                status_code=500,
                detail=f"Failed to retrieve file: {exc}",
            ) from exc

    def delete_file(self, *, file_id: UUID, requester: User) -> None:
        db_file = self._session.get(File, file_id)
        if not db_file:
            raise HTTPException(status_code=404, detail="File metadata not found")

        if db_file.owner_id != requester.id and not requester.is_superuser:
            raise HTTPException(
                status_code=403, detail="Not authorized to delete this file"
            )

        storage_key = db_file.storage_key

        try:
            self._session.delete(db_file)
            self._session.commit()
        except Exception as exc:  # pragma: no cover - propagated as HTTP error
            self._session.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Failed to delete file metadata: {exc}",
            ) from exc

        try:
            self._storage.delete(storage_key)
        except FileNotFoundError:
            print(
                f"Warning: File {storage_key} was not found in storage during cleanup."
            )  # noqa: T201
        except Exception as exc:  # pragma: no cover - logged best effort
            print(  # noqa: T201 - log critical storage cleanup failure
                f"CRITICAL: Failed to delete physical file {storage_key} from storage after DB commit: {exc}"
            )


def get_file_service(
    session: SessionDep, storage: StorageServiceDep
) -> FileApplicationService:
    return FileApplicationService(session=session, storage=storage)


FileServiceDep = Annotated[FileApplicationService, Depends(get_file_service)]
