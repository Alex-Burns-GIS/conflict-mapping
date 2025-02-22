# db-seed/Dockerfile

# Start from PostGIS base image
FROM postgis/postgis:14-3.2

# Install additional tools: gdal-bin, unzip, and the postgis package that includes shp2pgsql
RUN apt-get update && \
    apt-get install -y gdal-bin unzip postgis && \
    rm -rf /var/lib/apt/lists/*

# Copy your seeding script into the container
COPY seed.sh /seed.sh
RUN chmod +x /seed.sh

# Default command: run the seed script
CMD ["/seed.sh"]
