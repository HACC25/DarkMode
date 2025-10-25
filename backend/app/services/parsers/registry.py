from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterable
from typing import BinaryIO, Callable, TypeVar

__all__ = [
    "DocumentParser",
    "DocumentParserError",
    "ParserRegistry",
    "UnsupportedDocumentTypeError",
    "parser_registry",
]


class DocumentParserError(Exception):
    """Raised when a parser encounters a recoverable error while extracting text."""


class UnsupportedDocumentTypeError(Exception):
    """Raised when no registered parser matches the provided document type."""


class DocumentParser(ABC):
    """Interface for document parsers."""

    @abstractmethod
    def parse(self, file_obj: BinaryIO) -> str:
        """Return the plain text content extracted from ``file_obj``."""


ParserType = TypeVar("ParserType", bound=DocumentParser)


class ParserRegistry:
    """Registry that maps file identifiers to parser implementations."""

    def __init__(self) -> None:
        self._by_extension: dict[str, type[DocumentParser]] = {}
        self._mime_to_extension: dict[str, str] = {}

    def register(
        self,
        *,
        extensions: Iterable[str],
        mime_types: Iterable[str] | None = None,
    ) -> Callable[[type[ParserType]], type[ParserType]]:
        normalized_extensions = [ext.lower().lstrip(".") for ext in extensions if ext]
        if not normalized_extensions:
            raise ValueError("At least one extension must be provided for parser registration.")

        def decorator(parser_cls: type[ParserType]) -> type[ParserType]:
            for extension in normalized_extensions:
                self._by_extension[extension] = parser_cls

            if mime_types:
                for mime_type in mime_types:
                    self._mime_to_extension[mime_type.lower()] = normalized_extensions[0]

            return parser_cls

        return decorator

    def get_parser(
        self,
        *,
        extension: str | None,
        mime_type: str | None,
    ) -> DocumentParser:
        parser_cls = self._resolve_parser(extension=extension, mime_type=mime_type)
        return parser_cls()

    def _resolve_parser(
        self,
        *,
        extension: str | None,
        mime_type: str | None,
    ) -> type[DocumentParser]:
        parser_cls: type[DocumentParser] | None = None

        if extension:
            parser_cls = self._by_extension.get(extension.lower().lstrip("."))

        if parser_cls is None and mime_type:
            mapped_extension = self._mime_to_extension.get(mime_type.lower())
            if mapped_extension:
                parser_cls = self._by_extension.get(mapped_extension)

        if parser_cls is None:
            raise UnsupportedDocumentTypeError("Unsupported document type; no parser registered.")
        return parser_cls


parser_registry = ParserRegistry()
