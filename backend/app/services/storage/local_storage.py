import errno
import os
import shutil
from pathlib import Path
from typing import BinaryIO

from app.core.config import settings
from app.services.storage.base import StorageService

BACKEND_ROOT = Path(__file__).resolve().parents[3]
FALLBACK_STORAGE_ROOT = BACKEND_ROOT / "local_storage"


def _normalize_root(raw_root: str | None) -> Path:
    """Return an absolute Path for the configured storage root."""
    if raw_root:
        root_path = Path(raw_root)
        if not root_path.is_absolute():
            return BACKEND_ROOT / root_path
        return root_path
    return FALLBACK_STORAGE_ROOT


def _ensure_directory(path: Path) -> Path:
    """Create the storage directory, falling back when the path is read-only."""
    try:
        path.mkdir(parents=True, exist_ok=True)
        return path
    except OSError as exc:
        if exc.errno in (errno.EROFS, errno.EACCES):
            fallback = FALLBACK_STORAGE_ROOT
            fallback.mkdir(parents=True, exist_ok=True)
            print(
                f"Configured storage root '{path}' is not writable; "
                f"falling back to '{fallback}'."
            )
            return fallback
        raise


_configured_root = _normalize_root(settings.STORAGE_ROOT)
_effective_root = _ensure_directory(_configured_root)
STORAGE_ROOT = str(_effective_root)


class LocalStorageService(StorageService):
    """
    Concrete implementation of StorageService using the local filesystem.
    """

    def __init__(self, root_dir: str = STORAGE_ROOT):
        self._root_dir = root_dir
        print(f"LocalStorageService initialized. Root: {self._root_dir}")

    def _get_full_path(self, filename: str) -> str:
        """Helper to combine root directory with filename."""
        return os.path.join(self._root_dir, filename)

    def save(self, file_data: BinaryIO, filename: str) -> str:
        """Saves the file locally."""
        full_path = self._get_full_path(filename)
        print(full_path)
        # Use shutil.copyfileobj for efficient streaming write
        with open(full_path, "wb") as buffer:
            shutil.copyfileobj(file_data, buffer)

        # For local storage, the key is simply the filename or full path
        return filename

    def retrieve(self, file_key: str) -> BinaryIO:
        """Retrieves the file locally. Note: returns a file handle."""
        full_path = self._get_full_path(file_key)
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"File not found at key: {file_key}")

        # Returns a readable binary stream (file handle)
        return open(full_path, "rb")

    def delete(self, file_key: str) -> bool:
        """Deletes the file locally."""
        full_path = self._get_full_path(file_key)

        if os.path.exists(full_path):
            os.remove(full_path)
            return True
        return False
