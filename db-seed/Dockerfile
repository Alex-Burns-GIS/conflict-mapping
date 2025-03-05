# Start from Ubuntu base image for better control
FROM ubuntu:22.04

# Avoid prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install PostgreSQL client, PostGIS, and all required tools
RUN apt-get update && \
    apt-get install -y \
    postgresql-client \
    postgis \
    postgresql-14-postgis-3 \
    gdal-bin \
    unzip \
    curl \
    wget \
    bc \
    ncal \
    jq \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Verify shp2pgsql is installed
RUN which shp2pgsql || (echo "shp2pgsql not found"; exit 1)

# Set working directory
WORKDIR /app

# Keep container running for interactive use
CMD ["tail", "-f", "/dev/null"]