"""
K-means clustering for chunk embeddings.
Receives embedding vectors, returns cluster assignments + centroids.
"""
import numpy as np
from sklearn.cluster import KMeans
from typing import List, Dict, Any
import math


def determine_k(n_chunks: int) -> int:
    """
    Heuristic for choosing k (number of clusters).
    Rule: sqrt(n/3), clamped between 2 and 6.
    Ensures we don't over-fragment small libraries.
    """
    if n_chunks < 10:
        return min(2, n_chunks) if n_chunks >= 4 else 1
    k = max(2, min(6, round(math.sqrt(n_chunks / 3))))
    # k can't exceed the number of samples
    return min(k, n_chunks)


def cluster_embeddings(
    embeddings: List[List[float]],
    k: int | None = None,
) -> Dict[str, Any]:
    """
    Run k-means on a list of embedding vectors.

    Args:
        embeddings: list of float lists (each 768-dim)
        k: number of clusters (auto-determined if None)

    Returns:
        {
            "k": int,
            "assignments": [int],      # cluster index per chunk
            "centroids": [[float]],     # centroid vector per cluster
            "distances": [float],       # distance to assigned centroid per chunk
        }
    """
    X = np.array(embeddings, dtype=np.float32)
    n = X.shape[0]

    if n == 0:
        return {"k": 0, "assignments": [], "centroids": [], "distances": []}

    if k is None:
        k = determine_k(n)

    if k <= 1:
        centroid = X.mean(axis=0).tolist()
        distances = np.linalg.norm(X - X.mean(axis=0), axis=1).tolist()
        return {
            "k": 1,
            "assignments": [0] * n,
            "centroids": [centroid],
            "distances": distances,
        }

    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10, max_iter=300)
    kmeans.fit(X)

    # Distance from each point to its assigned centroid
    distances = []
    for i, label in enumerate(kmeans.labels_):
        dist = float(np.linalg.norm(X[i] - kmeans.cluster_centers_[label]))
        distances.append(dist)

    return {
        "k": k,
        "assignments": kmeans.labels_.tolist(),
        "centroids": kmeans.cluster_centers_.tolist(),
        "distances": distances,
    }
