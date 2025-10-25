from __future__ import annotations

from pathlib import Path
from typing import Annotated

from fastapi import Depends, HTTPException, UploadFile

# Trigger parser registrations on import via module side effects.
import app.services.parsers.parsers  # noqa: F401

from app.services.parsers.models import ParsedDocument
from app.services.parsers.registry import (
    DocumentParserError,
    ParserRegistry,
    UnsupportedDocumentTypeError,
    parser_registry,
)


class ParserApplicationService:
    """Application service that orchestrates document parsing."""

    def __init__(self, registry: ParserRegistry | None = None) -> None:
        self._registry = registry or parser_registry

    def parse_file(self, *, file: UploadFile) -> ParsedDocument:
        filename = file.filename or ""
        extension = Path(filename).suffix.lstrip(".")
        content_type = file.content_type

        file.file.seek(0)
        peek = file.file.read(1)
        if not peek:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        file.file.seek(0)

        try:
            parser = self._registry.get_parser(extension=extension, mime_type=content_type)
        except UnsupportedDocumentTypeError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        try:
            text = parser.parse(file.file)
        except DocumentParserError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except Exception as exc:  # pragma: no cover - defensive guardrail
            raise HTTPException(status_code=500, detail=f"Unexpected parsing failure: {exc}") from exc

        return ParsedDocument(
            filename=filename,
            content_type=content_type,
            text=text,
        )

def get_parser_service() -> ParserApplicationService:
    return ParserApplicationService()


ParserServiceDep = Annotated[ParserApplicationService, Depends(get_parser_service)]
