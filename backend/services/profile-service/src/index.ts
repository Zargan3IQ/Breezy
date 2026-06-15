import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import profileRoutes from './routes/profile.routes';
import followsRoutes from './routes/follows.routes';

dotenv.config();

const app = express();
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI is not defined');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB - profil-service'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

app.use('/api/profile', profileRoutes);
app.use('/api/profile', followsRoutes);

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`Profile service running on port ${PORT}`);
});
