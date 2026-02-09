"""
Document Processor — converts documents to text using markitdown.
Handles docx, pptx, xlsx, html, csv, epub, and other document formats.
"""

import os
import logging
from pathlib import Path
from typing import Set

from markitdown import MarkItDown

from .factory import BaseInputProcessor, ProcessingResult, InputType

logger = logging.getLogger(__name__)

# Singleton converter (stateless, safe to share)
_converter = MarkItDown()


class DocumentProcessor(BaseInputProcessor):
    """
    Extracts text from document files using Microsoft's markitdown library.
    Supports: .docx, .pptx, .xlsx, .html, .htm, .csv, .json, .xml, .epub, .ipynb
    """

    SUPPORTED_FORMATS: Set[str] = {
        '.docx', '.pptx', '.xlsx',
        '.html', '.htm',
        '.csv', '.tsv',
        '.json', '.xml',
        '.epub',
        '.ipynb',
        '.rtf',
    }

    def supports_file(self, file_path: str) -> bool:
        """Check if file is a supported document format."""
        ext = Path(file_path).suffix.lower()
        return ext in self.SUPPORTED_FORMATS

    def process(self, file_path: str, **kwargs) -> ProcessingResult:
        """
        Convert document to text using markitdown.

        Args:
            file_path: Path to the document file
            **kwargs: Optional parameters:
                - max_size_mb: Max file size in MB (default: 10)

        Returns:
            ProcessingResult with extracted markdown text
        """
        if not self.supports_file(file_path):
            return ProcessingResult(
                text="",
                input_type=InputType.TEXT,
                success=False,
                error=f"Unsupported document format: {Path(file_path).suffix}"
            )

        if not os.path.exists(file_path):
            return ProcessingResult(
                text="",
                input_type=InputType.TEXT,
                success=False,
                error=f"File not found: {file_path}"
            )

        from config.limits import FileLimits
        max_size_mb = kwargs.get('max_size_mb', FileLimits.MAX_DOCUMENT_SIZE_MB)
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
        if file_size_mb > max_size_mb:
            return ProcessingResult(
                text="",
                input_type=InputType.TEXT,
                success=False,
                error=f"File too large: {file_size_mb:.2f}MB (max {max_size_mb}MB)"
            )

        try:
            result = _converter.convert(file_path)
            text = result.text_content

            if not text or not text.strip():
                return ProcessingResult(
                    text="",
                    input_type=InputType.TEXT,
                    success=False,
                    error="No text content could be extracted from the document"
                )

            logger.info(
                f"Document converted: {Path(file_path).name} → "
                f"{len(text)} chars"
            )

            return ProcessingResult(
                text=text,
                input_type=InputType.TEXT,
                metadata={
                    'file_name': Path(file_path).name,
                    'file_size_mb': round(file_size_mb, 2),
                    'char_count': len(text),
                    'converter': 'markitdown',
                },
                success=True
            )

        except Exception as e:
            logger.error(f"Document conversion failed for {file_path}: {e}")
            return ProcessingResult(
                text="",
                input_type=InputType.TEXT,
                success=False,
                error=f"Document conversion failed: {str(e)}"
            )
