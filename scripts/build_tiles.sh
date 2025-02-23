#!/bin/bash
set -e

echo "Starting vector tile build..."

# 1) Export from Dockerized PostGIS to GeoJSON
# We'll connect to the container's DB on localhost if you mapped port 5432 to your host.
# If you want to connect via container name, that requires additional steps. 
# Assume your compose exposes "5432:5432" and the password: "Flnqrt5&78$%"
HOST_DB="PG:host=localhost user=postgres dbname=geo_db password=Flnqrt5&78$% port=5432"

# The layer name is up to you. We'll store a local geojson
mkdir -p ./tiles
OUTPUT_GEOJSON=./tiles/ne_10m_admin_0_countries.geojson

# Using ogr2ogr to export from DB
ogr2ogr -f "GeoJSON" $OUTPUT_GEOJSON "$HOST_DB" \
  -sql "SELECT gid, geom, name FROM public.country_polygons" \
  -lco RFC7946=YES

echo "Exported to $OUTPUT_GEOJSON"

# 2) Run Tippecanoe
OUTPUT_MBTILES=./tiles/ne_10m_admin_0_countries.mbtiles
tippecanoe -o $OUTPUT_MBTILES -l ne_10m_admin_0_countries -f \
  --drop-densest-as-needed \
  --extend-zooms-if-still-dropping \
  --no-tile-size-limit \
  --generate-ids \
  $OUTPUT_GEOJSON

echo "Generated vector tiles at $OUTPUT_MBTILES"
echo "Vector tile build complete!"
