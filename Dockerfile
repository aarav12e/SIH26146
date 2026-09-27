# ==============================================================================
# Multi-Stage Dockerfile for NTRO Bitcoin Forensic Platform (SIH26146)
# Builds React Frontend + Python FastAPI Backend into a Single Production Container
# ==============================================================================

# Stage 1: Build Frontend Assets
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Production Python Backend & SPA Server
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application and data
COPY backend/ ./backend/
COPY data/ ./data/

# Copy built frontend assets from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose port (default 8000)
EXPOSE 8000
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

# Run FastAPI backend with Uvicorn
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT}"]
