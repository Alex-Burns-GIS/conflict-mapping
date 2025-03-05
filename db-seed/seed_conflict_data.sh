#!/bin/bash
# db-seed/seed_conflict_data.sh

set -e

# Configuration
# These values are for running inside the Docker container
DB_USER="postgres"
DB_PASSWORD="Flnqrt5&78$%"
DB_NAME="geo_db"
DB_HOST="db"
DB_PORT="5432"
DATASETS_DIR="/datasets"  # Path inside Docker container

# ACLED API Configuration
ACLED_API_KEY="aPC!Q2Q8ItrqgJxrxpom" 
ACLED_EMAIL="z5118440@ad.unsw.edu.au"
ACLED_BASE_URL="https://api.acleddata.com/acled/read"

# Ensure required directories exist
mkdir -p $DATASETS_DIR/acled
mkdir -p $DATASETS_DIR/cast
mkdir -p $DATASETS_DIR/processed

echo "=== Starting Conflict Data Pipeline ==="

# Function to process API response to proper CSV
process_acled_data() {
  local input_file=$1
  local output_file="${input_file}.processed.csv"
  local temp_file="${input_file}.temp"

  echo "Processing ACLED data from $input_file to $output_file..."
  
  # Check if file looks like JSON (begins with {)
  if grep -q "^{" "$input_file"; then
    echo "File appears to be JSON format, extracting data..."
    
    # Install jq if not present (for JSON processing)
    if ! command -v jq &> /dev/null; then
      echo "Installing jq for JSON processing..."
      apt-get update && apt-get install -y jq
    fi
    
    # Extract data array from JSON and convert to CSV
    jq -r '.data[] | [.event_id_cnty, .event_date, .year, .time_precision, .disorder_type, 
                     .event_type, .sub_event_type, .actor1, .assoc_actor_1, .inter1,
                     .actor2, .assoc_actor_2, .inter2, .interaction, .civilian_targeting,
                     .iso, .region, .country, .admin1, .admin2, .admin3, .location, 
                     .latitude, .longitude, .geo_precision, .source, .source_scale, .notes, .fatalities, .tags] | @csv' "$input_file" > "$temp_file"
    
    # Add header
    echo "event_id_cnty,event_date,year,time_precision,disorder_type,event_type,sub_event_type,actor1,assoc_actor_1,inter1,actor2,assoc_actor_2,inter2,interaction,civilian_targeting,iso,region,country,admin1,admin2,admin3,location,latitude,longitude,geo_precision,source,source_scale,notes,fatalities,tags" > "$output_file"
    
    # Append data
    cat "$temp_file" >> "$output_file"
    
  # Check if file looks like tab-delimited format (contains tabs)
  elif grep -q $'\t' "$input_file"; then
    echo "File appears to be tab-delimited format, converting to CSV..."
    
    # Create a Python script to handle the complex tab-delimited format
    cat > "/tmp/convert_tabs_to_csv.py" << 'EOF'
#!/usr/bin/env python3
import sys
import csv
import json
import re

def clean_field(field):
    # Remove any quotation marks at the beginning/end of fields
    field = field.strip('"')
    # Replace escaped quotes with actual quotes
    field = field.replace('\\"', '"')
    return field

input_file = sys.argv[1]
output_file = sys.argv[2]

# Try to detect if this is a mangled JSON response
with open(input_file, 'r') as f:
    content = f.read()

# Look for JSON-like patterns
json_pattern = r'{"status":(\d+)\s+success:(true|false)\s+.*?data:\[(.*)\]'
match = re.search(json_pattern, content)

if match:
    print("Detected malformed JSON response, attempting to extract data...")
    data_section = match.group(3)
    
    # Split the data section by closing and opening braces
    records = re.split(r'}\s+{', data_section)
    
    # Fix the first and last record
    if records[0].startswith('{'):
        records[0] = records[0][1:]
    if records[-1].endswith('}'):
        records[-1] = records[-1][:-1]
    
    # Process each record
    with open(output_file, 'w', newline='') as csvfile:
        # Write header
        csvfile.write("event_id_cnty,event_date,year,time_precision,disorder_type,event_type,sub_event_type,actor1,assoc_actor_1,inter1,actor2,assoc_actor_2,inter2,interaction,civilian_targeting,iso,region,country,admin1,admin2,admin3,location,latitude,longitude,geo_precision,source,source_scale,notes,fatalities,tags\n")
        
        # Process each record
        for record in records:
            # Split by tab character
            fields = record.split('\t')
            cleaned_fields = []
            
            for field in fields:
                # Split field by colon to get key-value pair
                parts = field.split(':', 1)
                if len(parts) > 1:
                    # Just keep the value part
                    cleaned_fields.append(clean_field(parts[1]))
            
            # Write to CSV
            csvfile.write(','.join(f'"{f}"' for f in cleaned_fields) + '\n')
else:
    # Regular tab to CSV conversion
    with open(input_file, 'r') as f, open(output_file, 'w', newline='') as csvfile:
        reader = csv.reader(f, delimiter='\t')
        writer = csv.writer(csvfile)
        for row in reader:
            writer.writerow(row)

print(f"Conversion complete: {output_file}")
EOF
    
    # Make the script executable
    chmod +x "/tmp/convert_tabs_to_csv.py"
    
    # Install Python if needed
    if ! command -v python3 &> /dev/null; then
      echo "Installing Python3 for data processing..."
      apt-get update && apt-get install -y python3
    fi
    
    # Run the conversion script
    python3 "/tmp/convert_tabs_to_csv.py" "$input_file" "$output_file"
    
  else
    # If file already appears to be CSV format, just copy it
    echo "File appears to be in CSV format, using as-is"
    cp "$input_file" "$output_file"
  fi
  
  # Check if output file was created and has content
  if [ -f "$output_file" ] && [ -s "$output_file" ]; then
    echo "Successfully processed ACLED data to proper CSV format"
    return 0
  else
    echo "Failed to process ACLED data"
    return 1
  fi
}

# Function to download ACLED data with proper parameters based on API documentation
download_acled_data() {
  local start_date=$1
  local end_date=$2
  local raw_output_file="$DATASETS_DIR/acled/acled_${start_date}_to_${end_date}.raw"
  local csv_output_file="$DATASETS_DIR/acled/acled_${start_date}_to_${end_date}.csv"
  
  if [ ! -f "$csv_output_file" ] || [ -z "$(cat "$csv_output_file")" ]; then
    echo "Downloading ACLED data from $start_date to $end_date..."
    
    # Try first with specific "export_type=csv" to request CSV format
    curl -L -o "$raw_output_file" \
      "${ACLED_BASE_URL}?key=${ACLED_API_KEY}&email=${ACLED_EMAIL}&event_date=${start_date}|${end_date}&event_date_where=BETWEEN&export_type=csv&limit=0"
    
    if [ $? -eq 0 ] && [ -s "$raw_output_file" ]; then
      echo "Successfully downloaded ACLED data ($start_date to $end_date)"
      
      # Process the downloaded data to proper CSV format
      if process_acled_data "$raw_output_file" "$csv_output_file"; then
        echo "ACLED data for $start_date to $end_date processed successfully"
      else
        echo "Failed to process ACLED data for $start_date to $end_date"
        rm -f "$csv_output_file"  # Remove file if processing failed
        return 1
      fi
      
    else
      echo "Failed to download ACLED data using primary method. Trying alternative endpoint..."
      
      # Alternative endpoint that specifies .csv extension in URL
      curl -L -o "$raw_output_file" \
        "https://api.acleddata.com/data.csv?key=${ACLED_API_KEY}&email=${ACLED_EMAIL}&event_date=${start_date}|${end_date}&event_date_where=BETWEEN&limit=0"
      
      if [ $? -eq 0 ] && [ -s "$raw_output_file" ]; then
        echo "Successfully downloaded ACLED data using alternative method"
        
        # Process the downloaded data to proper CSV format
        if process_acled_data "$raw_output_file" "$csv_output_file"; then
          echo "ACLED data for $start_date to $end_date processed successfully"
        else
          echo "Failed to process ACLED data for $start_date to $end_date"
          rm -f "$csv_output_file"  # Remove file if processing failed
          return 1
        fi
        
      else
        echo "All download attempts failed for period $start_date to $end_date"
        rm -f "$raw_output_file"  # Remove empty file if download failed
        return 1
      fi
    fi
  else
    echo "ACLED data for $start_date to $end_date already exists"
  fi
  
  return 0
}

# Try alternative download method if API fails
download_sample_data() {
  echo "Using sample data for demonstration..."
  
  # Create a sample CSV file with some conflict events
  cat > "$DATASETS_DIR/acled/sample_data.csv" << 'EOF'
event_id_cnty,event_date,year,time_precision,disorder_type,event_type,sub_event_type,actor1,assoc_actor_1,inter1,actor2,assoc_actor_2,inter2,interaction,civilian_targeting,iso,region,country,admin1,admin2,admin3,location,latitude,longitude,geo_precision,source,source_scale,notes,fatalities,tags
NIG2941,2010-12-31,2010,1,Political violence,Explosions/Remote violence,Remote explosive/landmine/IED,Unidentified Armed Group (Nigeria),,Political militia,Civilians (Nigeria),Military Forces of Nigeria (1999-2015),Civilians,Political militia-Civilians,Civilian targeting,566,Western Africa,Nigeria,Federal Capital Territory,Abuja Municipal,,Abuja,9.0833,7.5333,1,AFP,International,"A bomb went off at a market on the edge of a military barracks in the Nigerian capital Abuja on New Years Eve. The bomb killed at least four and injured at least 26 more more, including civilians and off-duty military personnel.",4,
PAK5375,2010-12-31,2010,1,Demonstrations,Protests,Peaceful protest,Protesters (Pakistan),,,,,,,Protesters only,,586,South Asia,Pakistan,Balochistan,Quetta,Quetta City,Quetta,30.1999,67.0097,1,Nation (Pakistan),National,Protests were held outside mosques after Friday prayers on 31 Dec 2010 in Quetta to protest against changes in the blasphemy law. This was on the call of TNR.,0,
PAK5377,2010-12-31,2010,1,Demonstrations,Protests,Peaceful protest,Protesters (Pakistan),,,,,,,Protesters only,,586,South Asia,Pakistan,Federal Capital Territory,Islamabad,Islamabad,Islamabad,33.7214,73.0432,1,Nation (Pakistan),National,Protests were held outside mosques after Friday prayers on 31 Dec 2010 in Islamabad to protest against changes in the blasphemy law. This was on the call of TNR.,0,
SUD1082,2010-12-31,2010,1,Political violence,Battles,Armed clash,"Military Forces of Sudan (2011-2019, Omar al-Bashir)",,State Forces,Justice and Equality Movement,,Rebel Groups,State Forces-Rebel Groups,,625,Northern Africa,Sudan,North Darfur,Dar as Salam,,Al Watanya,13.5833,25.6167,2,Reuters,International,"Sudanese troops clashed with Darfur rebels on New Year's Eve. Rebels claimed to have killed 21 government troops, but the army denied suffering losses. Fighting was said to have occurred close to where government and rebel offensives against civilian villages occurred in early December.",0,
PAK5380,2010-12-31,2010,1,Demonstrations,Protests,Peaceful protest,Protesters (Pakistan),,,,,,,Protesters only,,586,South Asia,Pakistan,Khyber Pakhtunkhwa,Peshawar,Peshawar,Peshawar,34.0197,71.5822,1,Nation (Pakistan),National,Protests were held outside mosques after Friday prayers on 31 Dec 2010 in Peshawar to protest against changes in the blasphemy law. This was on the call of TNR.,0,
EOF

  echo "Sample data created successfully"
}

# Download data from 1997 to current year
# Generate a sequence of all years from 1997 to current year
current_year=$(date +"%Y")
download_success=false

# Loop through all years from 1997 to current year
for year in $(seq 1997 $current_year); do
  if download_acled_data "${year}-01-01" "${year}-12-31"; then
    download_success=true
  fi
done

# If all downloads failed, use sample data
if [ "$download_success" = false ]; then
  echo "All API downloads failed. Using sample data instead."
  download_sample_data
fi

# Initialize database
echo "Creating database tables if needed..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
-- Check if PostGIS extension is installed
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create table for ACLED data with all fields from the API documentation
-- Modified to use a composite primary key instead of a UNIQUE constraint on event_id_cnty
CREATE TABLE IF NOT EXISTS conflict_events (
  id SERIAL PRIMARY KEY,
  event_id_cnty VARCHAR(50),   -- Keep this as VARCHAR since it's an ID with expected format
  event_date DATE,
  year INTEGER,
  time_precision INTEGER,
  disorder_type TEXT,          -- Changed from VARCHAR
  event_type TEXT,             -- Changed from VARCHAR
  sub_event_type TEXT,         -- Changed from VARCHAR
  actor1 TEXT,
  assoc_actor_1 TEXT,
  inter1 TEXT,                 -- Changed from VARCHAR
  actor2 TEXT,
  assoc_actor_2 TEXT,
  inter2 TEXT,                 -- Changed from VARCHAR
  interaction TEXT,            -- Changed from VARCHAR
  civilian_targeting TEXT,     -- Changed from VARCHAR
  iso VARCHAR(10),             -- Keep as VARCHAR since ISO codes are fixed length
  region TEXT,                 -- Changed from VARCHAR
  country TEXT,                -- Changed from VARCHAR
  admin1 TEXT,                 -- Changed from VARCHAR
  admin2 TEXT,                 -- Changed from VARCHAR
  admin3 TEXT,                 -- Changed from VARCHAR
  location TEXT,
  latitude FLOAT,
  longitude FLOAT,
  geo_precision INTEGER,
  source TEXT,
  source_scale TEXT,           -- Changed from VARCHAR
  notes TEXT,
  fatalities INTEGER,
  tags TEXT,
  timestamp_added TIMESTAMP,
  geom GEOMETRY(Point, 4326),
  CONSTRAINT unique_event_constraint UNIQUE (event_id_cnty, event_date)
);

-- Create indices for better query performance
CREATE INDEX IF NOT EXISTS idx_conflict_events_geom ON conflict_events USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_conflict_events_date ON conflict_events(event_date);
CREATE INDEX IF NOT EXISTS idx_conflict_events_type ON conflict_events(event_type);
CREATE INDEX IF NOT EXISTS idx_conflict_events_country ON conflict_events(country);
CREATE INDEX IF NOT EXISTS idx_conflict_events_event_id ON conflict_events(event_id_cnty);
"

# Add this fix to your seed_conflict_data.sh script
# Replace the psql import section with this improved version:

# Process and import ACLED data
echo "Processing and importing ACLED data..."
for file in $DATASETS_DIR/acled/*.csv; do
  if [ -f "$file" ] && [ -s "$file" ]; then
    echo "Importing $file..."
    
    # Modified import process with better error handling
    # First let's verify the CSV format
    head -n 1 "$file" > "/tmp/csv_header.txt"
    
    # Check if header looks valid
    if grep -q "event_id_cnty" "/tmp/csv_header.txt"; then
      echo "CSV header looks valid, proceeding with import..."
      
      # Using psql COPY command for fast data loading
      psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
      -- Create temporary table for importing WITHOUT the id column
      -- Create temporary table for importing WITHOUT the id column
      CREATE TEMP TABLE temp_import (
        event_id_cnty VARCHAR(50),
        event_date DATE,
        year INTEGER,
        time_precision INTEGER,
        disorder_type TEXT,          
        event_type TEXT,             
        sub_event_type TEXT,         
        actor1 TEXT,                 
        assoc_actor_1 TEXT,          -- Changed from VARCHAR(200)
        inter1 TEXT,                 
        actor2 TEXT,                 
        assoc_actor_2 TEXT,          -- Changed from VARCHAR(200)
        inter2 TEXT,                 
        interaction TEXT,            
        civilian_targeting TEXT,     
        iso VARCHAR(10),
        region TEXT,                 
        country TEXT,                
        admin1 TEXT,                 
        admin2 TEXT,                 
        admin3 TEXT,                 
        location TEXT,               
        latitude FLOAT,
        longitude FLOAT,
        geo_precision INTEGER,
        source TEXT,                 
        source_scale TEXT,           
        notes TEXT,
        fatalities INTEGER,
        tags TEXT
      );
      
      -- Copy data from CSV (handling variations in header names)
      COPY temp_import (
        event_id_cnty, event_date, year, time_precision, disorder_type, 
        event_type, sub_event_type, actor1, assoc_actor_1, inter1,
        actor2, assoc_actor_2, inter2, interaction, civilian_targeting,
        iso, region, country, admin1, admin2, admin3, location, 
        latitude, longitude, geo_precision, source, source_scale, notes, fatalities, tags
      ) FROM STDIN WITH CSV HEADER;
      
      -- Insert data and create geometry, using the composite key for conflict resolution
      INSERT INTO conflict_events (
        event_id_cnty, event_date, year, time_precision, disorder_type,
        event_type, sub_event_type, actor1, assoc_actor_1, inter1,
        actor2, assoc_actor_2, inter2, interaction, civilian_targeting,
        iso, region, country, admin1, admin2, admin3, location, 
        latitude, longitude, geo_precision, source, source_scale, notes, fatalities, tags,
        timestamp_added, geom
      )
      SELECT 
        event_id_cnty, event_date, year, time_precision, disorder_type,
        event_type, sub_event_type, actor1, assoc_actor_1, inter1,
        actor2, assoc_actor_2, inter2, interaction, civilian_targeting,
        iso, region, country, admin1, admin2, admin3, location, 
        latitude, longitude, geo_precision, source, source_scale, notes, fatalities, tags,
        NOW(),
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) as geom
      FROM temp_import
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      ON CONFLICT (event_id_cnty, event_date) DO UPDATE
      SET 
        event_type = EXCLUDED.event_type,
        sub_event_type = EXCLUDED.sub_event_type,
        actor1 = EXCLUDED.actor1,
        actor2 = EXCLUDED.actor2,
        admin1 = EXCLUDED.admin1,
        admin2 = EXCLUDED.admin2,
        admin3 = EXCLUDED.admin3,
        location = EXCLUDED.location,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        geo_precision = EXCLUDED.geo_precision,
        source = EXCLUDED.source,
        notes = EXCLUDED.notes,
        fatalities = EXCLUDED.fatalities,
        timestamp_added = NOW(),
        geom = ST_SetSRID(ST_MakePoint(EXCLUDED.longitude, EXCLUDED.latitude), 4326);
      
      -- Report counts
      SELECT COUNT(*) AS rows_imported FROM temp_import;
      
      -- Drop temporary table
      DROP TABLE temp_import;
      " < "$file"
      
      # Check if import was successful
      import_status=$?
      if [ $import_status -eq 0 ]; then
        echo "Successfully imported $file"
      else
        echo "Failed to import $file (error code: $import_status)"
      fi
    else
      echo "CSV header invalid in $file - skipping"
    fi
  fi
done

# Create views for Martin Tile Server
echo "Creating views for Martin Tile Server..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
-- Create recent conflicts view for tiling
CREATE OR REPLACE VIEW recent_conflicts AS
SELECT id, event_type, sub_event_type, actor1, location, 
       fatalities, event_date, year, geom
FROM conflict_events
WHERE event_date >= (CURRENT_DATE - INTERVAL '1 year')
ORDER BY event_date DESC;

-- Create filtered views by event type for better performance
CREATE OR REPLACE VIEW battles AS
SELECT id, sub_event_type, actor1, actor2, location, 
       fatalities, event_date, year, geom
FROM conflict_events
WHERE event_type = 'Battle' OR event_type LIKE '%Battle%'
ORDER BY event_date DESC;

CREATE OR REPLACE VIEW violence_against_civilians AS
SELECT id, sub_event_type, actor1, actor2, location, 
       fatalities, event_date, year, geom
FROM conflict_events
WHERE event_type = 'Violence against civilians' OR event_type LIKE '%Violence%'
ORDER BY event_date DESC;

-- Create region-specific views
CREATE OR REPLACE VIEW africa_conflicts AS
SELECT id, event_type, sub_event_type, actor1, location, 
       fatalities, event_date, year, country, geom
FROM conflict_events
WHERE region IN ('Western Africa', 'Middle Africa', 'Eastern Africa', 'Southern Africa', 'Northern Africa')
ORDER BY event_date DESC;

CREATE OR REPLACE VIEW middle_east_conflicts AS
SELECT id, event_type, sub_event_type, actor1, location, 
       fatalities, event_date, year, country, geom
FROM conflict_events
WHERE region = 'Middle East'
ORDER BY event_date DESC;

-- Create fatality-based view
CREATE OR REPLACE VIEW high_fatality_events AS
SELECT id, event_type, sub_event_type, actor1, location, 
       fatalities, event_date, year, country, geom
FROM conflict_events
WHERE fatalities >= 10
ORDER BY fatalities DESC;
"

# Verify data was imported correctly
echo "Verifying data import..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT COUNT(*) AS total_events FROM conflict_events;
SELECT COUNT(*) AS events_with_geometry FROM conflict_events WHERE geom IS NOT NULL;
SELECT MIN(event_date) AS oldest_event, MAX(event_date) AS newest_event FROM conflict_events;
"

echo "=== Conflict Data Pipeline Complete ==="