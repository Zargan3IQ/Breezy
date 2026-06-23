import express from 'express';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/errorHandler.middleware';
import mediaRoutes from './routes/media.routes';
import { ensureBucket } from './config/minio';

dotenv.config();

const app = express();

ensureBucket()
  .then(() => console.log('MinIO bucket ready'))
  .catch((err) => {
    console.error('MinIO bucket init error:', err);
    process.exit(1);
  });

app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok' }));

app.use('/api/media', mediaRoutes);

app.use(errorHandler);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3005;
app.listen(PORT, () => {
  console.log(`Media Service running on port ${PORT}`);
});
