#!/bin/bash
set -e

echo "Starting data seed..."

DB_CONN="PG:host=$PGHOST user=$PGUSER dbname=$PGDATABASE password=$PGPASSWORD port=$PGPORT"

to_table_name() {
  local file_basename="$1"
  local noext=$(echo "$file_basename" | sed 's/\.[^.]*$//')
  echo "$noext" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/_/g'
}

########################################
# Step A: Import Shapefiles
########################################
# We'll use 'find' to ensure we capture subfolders
for shp in $(find /datasets -type f -iname "*.shp"); do
  BASENAME=$(basename "$shp")
  TABLE_NAME=$(to_table_name "$BASENAME")
  echo "Processing Shapefile: $shp -> table: $TABLE_NAME"

  # Drop table if exists
  psql -U "$PGUSER" -h "$PGHOST" -d "$PGDATABASE" -c "DROP TABLE IF EXISTS public.$TABLE_NAME CASCADE"

  # Import shapefile
  shp2pgsql -I -s 4326 "$shp" "public.$TABLE_NAME" | psql -U "$PGUSER" -h "$PGHOST" -d "$PGDATABASE"
done

########################################
# Step B: Import GeoPackages
########################################
for gpkg in $(find /datasets -type f -iname "*.gpkg"); do
  BASENAME=$(basename "$gpkg")
  TABLE_NAME=$(to_table_name "$BASENAME")
  echo "Processing GeoPackage: $gpkg -> table(s) named: $TABLE_NAME_*"

  ogr2ogr -f PostgreSQL "$DB_CONN" "$gpkg" \
    -lco SCHEMA=public -nlt PROMOTE_TO_MULTI -lco PRECISION=NO \
    -overwrite
done

########################################
# Step C: Import GeoJSON/JSON
########################################
for geojson in $(find /datasets -type f \( -iname "*.geojson" -o -iname "*.json" \)); do
  BASENAME=$(basename "$geojson")
  TABLE_NAME=$(to_table_name "$BASENAME")
  echo "Processing GeoJSON: $geojson -> table: $TABLE_NAME"

  psql -U "$PGUSER" -h "$PGHOST" -d "$PGDATABASE" -c "DROP TABLE IF EXISTS public.$TABLE_NAME CASCADE"

  ogr2ogr -f "PostgreSQL" "$DB_CONN" "$geojson" \
    -nln "public.$TABLE_NAME" -nlt PROMOTE_TO_MULTI -lco PRECISION=NO \
    -overwrite
done

########################################
# Step D: Import CSV
########################################
for csv in $(find /datasets -type f -iname "*.csv"); do
  BASENAME=$(basename "$csv")
  TABLE_NAME=$(to_table_name "$BASENAME")

  echo "Processing CSV: $csv -> table: $TABLE_NAME"
  
  psql -U "$PGUSER" -h "$PGHOST" -d "$PGDATABASE" -c "DROP TABLE IF EXISTS public.$TABLE_NAME CASCADE"

  ogr2ogr -f "PostgreSQL" "$DB_CONN" "$csv" \
    -nln "public.$TABLE_NAME" -oo GEOM_POSSIBLE_NAMES=geometry \
    -overwrite
done

echo "Data seeding complete!"
