from typing import Annotated

from fastapi import Depends

from app.services.storage.base import StorageService
from app.services.storage.local_storage import LocalStorageService

storage_service: StorageService = LocalStorageService()


def get_storage_service() -> StorageService:
    """Dependency provider function."""
    return storage_service


StorageServiceDep = Annotated[StorageService, Depends(get_storage_service)]
