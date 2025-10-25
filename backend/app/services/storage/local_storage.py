import os
import shutil
from typing import BinaryIO
from app.core.config import settings
from app.services.storage.base import StorageService

# Configuration
STORAGE_ROOT = settings.STORAGE_ROOT
if not STORAGE_ROOT:
    raise RuntimeError("STORAGE_ROOT environment variable is not set.")
os.makedirs(STORAGE_ROOT, exist_ok=True)

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
