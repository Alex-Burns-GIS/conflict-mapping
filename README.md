# War Data Map

This project is a **conflict-analysis geospatial dashboard** using Docker for PostGIS, Node/Express, and a React Leaflet frontend. It also includes an optional seeder container (`db-seed`) to automatically import shapefiles, GeoJSON, CSV, or GeoPackages into PostGIS.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Adding or Updating Datasets](#adding-or-updating-datasets)
- [Seeding PostGIS](#seeding-postgis)
- [Running Backend and Frontend](#running-backend-and-frontend)
- [Hot Reload for Frontend](#hot-reload-for-frontend)
- [One Command Workflow](#one-command-workflow)
- [Troubleshooting](#troubleshooting)
- [Next Steps: Vector Tiles](#next-steps-vector-tiles)

---

## Project Structure
war-data-map/ 
├── backend/ 
│ └── src/ 
├── frontend/ 
│ └── src/ 
├── db-seed/ 
│ ├── Dockerfile 
│ └── seed.sh 
├── datasets/ 
├── docker-compose.yml 
└── README.md

- **backend**: Node/Express server.  
- **frontend**: React + Vite + Leaflet app.  
- **db-seed**: Ephemeral container to load new datasets into PostGIS.  
- **datasets**: Place your shapefiles (`.shp`), GeoJSON, CSV, GPKG, etc.  

---

## Adding or Updating Datasets
Place new or updated files in ./datasets/. Supported formats in seed.sh:

Shapefiles (.shp + .dbf, .shx)
GeoJSON or .json
GeoPackages (.gpkg)
CSV (if the script is configured for CSV)
Important: The seeder script drops existing tables to replace them with the new data.

---

## Spin Up PostGIS:

docker-compose up -d db

## Seeding PostGIS: 
Once data is in ./datasets/, run:

docker-compose run db-seed

- The seeder container spins up, runs seed.sh, and imports data into geo_db.

You can verify in PostGIS by doing:

docker-compose exec db psql -U postgres -d geo_db
\dt

## Running Backend and Frontend
docker-compose up -d backend frontend
- Backend: Exposes APIs on http://localhost:4000.
- Frontend: Available on http://localhost:5173.

