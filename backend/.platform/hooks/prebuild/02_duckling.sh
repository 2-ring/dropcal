#!/bin/bash
set -e

# Install Docker if not present
if ! command -v docker &> /dev/null; then
  dnf install -y docker
fi

# Ensure Docker is running
systemctl enable docker
systemctl start docker

# Wait for Docker daemon to be ready (up to 30s)
for i in $(seq 1 30); do
  docker info &>/dev/null && break
  echo "Waiting for Docker daemon... ($i/30)"
  sleep 1
done

if ! docker info &>/dev/null; then
  echo "ERROR: Docker daemon failed to start"
  exit 1
fi

# Stop any existing Duckling container
docker rm -f duckling 2>/dev/null || true

# Pull image first (this can take several minutes on first deploy)
echo "Pulling rasa/duckling image..."
docker pull rasa/duckling

# Run Duckling on localhost:8050 (port 8000 is used by Gunicorn)
echo "Starting Duckling container on port 8050..."
docker run -d \
  --name duckling \
  --restart always \
  -p 8050:8000 \
  rasa/duckling

echo "Duckling started successfully"
