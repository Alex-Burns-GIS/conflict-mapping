// backend/src/index.ts
import express from 'express';
import cors from 'cors';
import polygonsRouter from './routes/polygons';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Allow cross-origin requests
app.use(cors());

// Mount the polygons router
app.use('/api/world-polygons', polygonsRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
