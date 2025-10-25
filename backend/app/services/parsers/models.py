from __future__ import annotations

from pydantic import BaseModel

__all__ = ["ParsedDocument"]


class ParsedDocument(BaseModel):
    filename: str
    content_type: str | None
    text: str

