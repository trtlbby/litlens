"""
LitLens Python Microservice — PDF extraction and clustering.
Stateless service: receives data, processes it, returns JSON.
"""
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from extractor import extract_pdf
from clusterer import cluster_embeddings
import tempfile
import os

app = FastAPI(title="LitLens Python Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "litlens-python"}


@app.post("/extract")
async def extract(file: UploadFile = File(...)):
    """
    Accept a PDF file upload, extract text, split into sentences.
    Returns: { full_text, title, authors, year, sentences[] }
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_FILE_TYPE", "message": "Only PDF files are accepted"},
        )

    # Save uploaded file to temp location
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"code": "FILE_SAVE_ERROR", "message": f"Failed to save uploaded file: {str(e)}"},
        )

    try:
        result = extract_pdf(tmp_path, file.filename)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=422,
            detail={"code": "EXTRACTION_ERROR", "message": str(e)},
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"code": "PROCESSING_ERROR", "message": f"Failed to process PDF: {str(e)}"},
        )
    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


# ─── Clustering endpoint ───


class ClusterRequest(BaseModel):
    embeddings: List[List[float]]
    k: Optional[int] = None


@app.post("/cluster")
async def cluster(req: ClusterRequest):
    """
    Accept embedding vectors, run k-means, return cluster assignments.
    Returns: { k, assignments[], centroids[][], distances[] }
    """
    if len(req.embeddings) == 0:
        raise HTTPException(
            status_code=400,
            detail={"code": "NO_EMBEDDINGS", "message": "No embeddings provided"},
        )

    try:
        result = cluster_embeddings(req.embeddings, k=req.k)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"code": "CLUSTERING_ERROR", "message": f"Clustering failed: {str(e)}"},
        )
