from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, UploadFile
from sqlmodel import Session, select

from app.api.deps import SessionDep
from app.models import User
from app.services.files.application import FileApplicationService, FileServiceDep
from app.services.parsers import ParserApplicationService, ParserServiceDep
from app.services.resumes.models import Resume


class ResumeApplicationService:
    """Application service encapsulating resume workflows."""

    def __init__(
        self,
        session: Session,
        parser_service: ParserApplicationService,
        file_service: FileApplicationService,
    ) -> None:
        self._session = session
        self._parser_service = parser_service
        self._file_service = file_service

    def upload_resume(self, *, file: UploadFile, owner: User) -> Resume:
        """Persist an uploaded resume and its parsed text content."""
        parsed = self._parser_service.parse_file(file=file)
        if not parsed.text.strip():
            raise HTTPException(
                status_code=422,
                detail="Uploaded resume did not contain any parseable text.",
            )

        try:
            file.file.seek(0)
        except Exception:  # pragma: no cover - UploadFile may not support seek
            pass

        stored_file = self._file_service.upload_file(file=file, owner=owner)

        resume = Resume(
            user_id=owner.id,
            file_id=stored_file.id,
            text_content=parsed.text,
        )

        try:
            self._session.add(resume)
            self._session.commit()
            self._session.refresh(resume)
            return resume
        except Exception as exc:  # pragma: no cover - re-raised as HTTP error
            self._session.rollback()
            try:
                self._file_service.delete_file(file_id=stored_file.id, requester=owner)
            except Exception:  # pragma: no cover - best effort cleanup
                pass
            raise HTTPException(
                status_code=500,
                detail=f"Failed to store resume metadata: {exc}",
            ) from exc

    def list_resumes(self, *, requester: User) -> list[Resume]:
        """List resumes visible to the requester."""
        statement = select(Resume).order_by(Resume.created_at.desc())
        if not requester.is_superuser:
            statement = statement.where(Resume.user_id == requester.id)
        return list(self._session.exec(statement))

    def get_resume(self, *, resume_id: UUID, requester: User) -> Resume:
        """Retrieve a single resume if authorized."""
        resume = self._session.get(Resume, resume_id)
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found.")

        if resume.user_id != requester.id and not requester.is_superuser:
            raise HTTPException(status_code=403, detail="Not authorized to access this resume.")

        return resume

    def delete_resume(self, *, resume_id: UUID, requester: User) -> None:
        """Delete a resume and its associated stored file."""
        resume = self._session.get(Resume, resume_id)
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found.")

        if resume.user_id != requester.id and not requester.is_superuser:
            raise HTTPException(status_code=403, detail="Not authorized to delete this resume.")

        file_id = resume.file_id

        try:
            self._session.delete(resume)
            self._session.commit()
        except Exception as exc:  # pragma: no cover - re-raised as HTTP error
            self._session.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Failed to delete resume: {exc}",
            ) from exc

        try:
            self._file_service.delete_file(file_id=file_id, requester=requester)
        except Exception:  # pragma: no cover - best effort cleanup
            pass


def get_resume_service(
    session: SessionDep,
    parser_service: ParserServiceDep,
    file_service: FileServiceDep,
) -> ResumeApplicationService:
    return ResumeApplicationService(
        session=session,
        parser_service=parser_service,
        file_service=file_service,
    )


ResumeServiceDep = Annotated[ResumeApplicationService, Depends(get_resume_service)]
