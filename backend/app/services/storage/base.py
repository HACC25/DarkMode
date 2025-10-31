from abc import ABC, abstractmethod
from typing import BinaryIO


class StorageService(ABC):
    """
    Abstract Base Class defining the contract for all storage implementations.
    """

    @abstractmethod
    def save(self, file_data: BinaryIO, filename: str) -> str:
        """
        Saves the file data and returns the resulting storage path/key.

        Args:
            file_data: A file-like object (e.g., the raw content stream).
            filename: The desired name for the file.

        Returns:
            The unique identifier or path where the file was stored.
        """
        pass

    @abstractmethod
    def retrieve(self, file_key: str) -> BinaryIO:
        """
        Retrieves the file data given its storage key/path.
        """
        pass

    @abstractmethod
    def delete(self, file_key: str) -> bool:
        """
        Deletes a file given its storage key/path.
        Returns True on successful deletion.
        """
        pass
