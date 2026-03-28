"""
PDF text extraction with pdfplumber (primary) and Tesseract OCR (fallback).
Also extracts basic metadata: title, authors, year.
"""
import re
import pdfplumber
import pytesseract
from pdf2image import convert_from_path
from nltk.tokenize import sent_tokenize


# Minimum word count threshold before falling back to OCR
MIN_TEXT_WORDS = 100


def extract_pdf(file_path: str, filename: str) -> dict:
    """
    Extract text and metadata from a PDF file.
    
    Args:
        file_path: Path to the PDF file on disk
        filename: Original filename for metadata hints
        
    Returns:
        dict with keys: full_text, title, authors, year, sentences
        
    Raises:
        ValueError: If the PDF is password-protected or unreadable
    """
    full_text = ""
    
    # --- Primary extraction: pdfplumber ---
    try:
        with pdfplumber.open(file_path) as pdf:
            pages_text = []
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages_text.append(text)
            full_text = "\n\n".join(pages_text)
    except Exception as e:
        error_msg = str(e).lower()
        if "password" in error_msg or "encrypted" in error_msg:
            raise ValueError(
                "This PDF is password-protected. Please remove the password and try again."
            )
        # If pdfplumber fails for other reasons, try OCR fallback
        full_text = ""

    # --- Fallback: Tesseract OCR if text is too short ---
    word_count = len(full_text.split()) if full_text else 0
    if word_count < MIN_TEXT_WORDS:
        try:
            images = convert_from_path(file_path)
            ocr_pages = []
            for img in images:
                ocr_text = pytesseract.image_to_string(img)
                if ocr_text.strip():
                    ocr_pages.append(ocr_text.strip())
            ocr_full = "\n\n".join(ocr_pages)
            
            # Use OCR result if it's substantially better
            if len(ocr_full.split()) > word_count:
                full_text = ocr_full
        except Exception:
            pass  # If OCR also fails, we use whatever pdfplumber got

    if not full_text or len(full_text.strip()) < 10:
        raise ValueError(
            "Could not extract any readable text from this PDF. "
            "The file may be corrupted or contain only images that OCR could not process."
        )

    # --- Clean text ---
    full_text = _clean_text(full_text)

    # --- Sentence tokenization ---
    sentences = sent_tokenize(full_text)
    # Filter out very short sentences (likely headers, page numbers, etc.)
    sentences = [s.strip() for s in sentences if len(s.split()) >= 3]

    # --- Extract metadata ---
    title = _extract_title(full_text, filename)
    authors = _extract_authors(full_text)
    year = _extract_year(full_text)

    return {
        "full_text": full_text,
        "title": title,
        "authors": authors,
        "year": year,
        "sentences": sentences,
    }


def _clean_text(text: str) -> str:
    """Clean extracted text: normalize whitespace, remove artifacts."""
    # Replace multiple newlines with double newline
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Replace multiple spaces with single space
    text = re.sub(r" {2,}", " ", text)
    # Remove form feed characters
    text = text.replace("\f", "\n\n")
    # Strip leading/trailing whitespace from each line
    lines = [line.strip() for line in text.split("\n")]
    text = "\n".join(lines)
    return text.strip()


def _extract_title(text: str, filename: str) -> str:
    """
    Attempt to extract paper title from the text.
    Heuristic: first non-empty line that's reasonably long and not all caps header.
    Falls back to cleaned filename.
    """
    lines = text.split("\n")
    for line in lines[:10]:  # Check first 10 lines
        line = line.strip()
        if not line:
            continue
        # Skip very short lines (likely headers) or lines that are all numbers
        if len(line) < 10 or line.replace(" ", "").isdigit():
            continue
        # Skip common header patterns
        if line.upper() in ["ABSTRACT", "INTRODUCTION", "REFERENCES"]:
            continue
        # This is likely the title
        return line[:200]  # Cap at 200 chars
    
    # Fallback: use filename
    title = filename.replace(".pdf", "").replace("-", " ").replace("_", " ")
    return title


def _extract_authors(text: str) -> str:
    """
    Attempt to extract authors. Very basic heuristic.
    Looks for lines near the top with comma-separated names.
    """
    lines = text.split("\n")
    for line in lines[1:15]:  # Skip first line (likely title), check next 14
        line = line.strip()
        if not line or len(line) < 5:
            continue
        # Author lines often contain commas and "and"
        if ("," in line or " and " in line.lower()) and len(line) < 300:
            # Check if it looks like names (contains mostly letters, commas, periods)
            alpha_ratio = sum(1 for c in line if c.isalpha() or c in ", .") / max(len(line), 1)
            if alpha_ratio > 0.7 and not any(kw in line.lower() for kw in [
                "abstract", "introduction", "university", "department", "journal",
                "copyright", "published", "received", "accepted"
            ]):
                return line[:500]
    return ""


def _extract_year(text: str) -> int | None:
    """Extract publication year from text. Looks for 4-digit years (1990-2030)."""
    # Check first few hundred characters for year patterns
    header_text = text[:2000]
    
    # Common patterns: (2023), 2023, ©2023
    year_patterns = [
        r"\((\d{4})\)",       # (2023)
        r"©\s*(\d{4})",       # ©2023
        r"(\d{4})\s",         # 2023 followed by space
    ]
    
    for pattern in year_patterns:
        matches = re.findall(pattern, header_text)
        for match in matches:
            year = int(match)
            if 1990 <= year <= 2030:
                return year
    
    return None
