from __future__ import annotations

from io import TextIOWrapper
from typing import BinaryIO

from docx import Document  # type: ignore[import-not-found]
from pypdf import PdfReader  # type: ignore[import-not-found]

from app.services.parsers.registry import (
    DocumentParser,
    DocumentParserError,
    parser_registry,
)

__all__ = ["PdfDocumentParser", "DocxDocumentParser", "TextDocumentParser"]


@parser_registry.register(
    extensions=["pdf"],
    mime_types=["application/pdf"],
)
class PdfDocumentParser(DocumentParser):
    """Extracts plain text from PDF documents."""

    def parse(self, file_obj: BinaryIO) -> str:
        try:
            file_obj.seek(0)
            reader = PdfReader(file_obj)
        except Exception as exc:  # pragma: no cover - defensive guardrail
            raise DocumentParserError(f"Unable to open PDF document: {exc}") from exc

        texts: list[str] = []
        for page_number, page in enumerate(reader.pages, start=1):
            try:
                page_text = page.extract_text() or ""
            except Exception as exc:  # pragma: no cover - defensive guardrail
                raise DocumentParserError(
                    f"Failed to extract text from PDF page {page_number}: {exc}"
                ) from exc

            if page_text:
                texts.append(page_text)

        return "\n".join(texts).strip()


@parser_registry.register(
    extensions=["docx"],
    mime_types=["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
)
class DocxDocumentParser(DocumentParser):
    """Extracts plain text from DOCX documents."""

    def parse(self, file_obj: BinaryIO) -> str:
        try:
            file_obj.seek(0)
            document = Document(file_obj)
        except Exception as exc:  # pragma: no cover - defensive guardrail
            raise DocumentParserError(f"Unable to open DOCX document: {exc}") from exc

        lines: list[str] = [paragraph.text for paragraph in document.paragraphs if paragraph.text]
        return "\n".join(lines).strip()


@parser_registry.register(
    extensions=["txt"],
    mime_types=["text/plain"],
)
class TextDocumentParser(DocumentParser):
    """Extracts text from plain text files."""

    def parse(self, file_obj: BinaryIO) -> str:
        file_obj.seek(0)

        if isinstance(file_obj, TextIOWrapper):
            return file_obj.read()

        data = file_obj.read()
        if not isinstance(data, (bytes, bytearray)):
            raise DocumentParserError("The provided file object is not binary compatible.")
        return bytes(data).decode("utf-8", errors="ignore")

