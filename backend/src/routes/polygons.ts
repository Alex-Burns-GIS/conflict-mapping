// backend/src/routes/polygons.ts
import { Router } from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

// Adjust connection details to match your Postgres setup
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: parseInt(process.env.PGPORT || '5432'),
});

// GET /api/world-polygons
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT
        gid,
        name,
        ST_AsGeoJSON(geom)::json AS geometry
      FROM public.ne_10m_admin_0_countries
    `;
    const result = await pool.query(query);

    // We'll return a GeoJSON "FeatureCollection" structure.
    // Each row becomes a Feature with geometry and properties.
    const features = result.rows.map((row: any) => ({
      type: 'Feature',
      geometry: row.geometry,
      properties: {
        id: row.id,
        name: row.name,
      },
    }));

    const geoJson = {
      type: 'FeatureCollection',
      features,
    };

    res.json(geoJson);
  } catch (error) {
    console.error('Error fetching polygons:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
