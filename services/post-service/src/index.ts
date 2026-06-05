import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import postRoutes from './routes/post.routes';

dotenv.config();

const app = express();
app.use(express.json());

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('MONGO_URI not defined in environment variables.');
  process.exit(1);
}

mongoose
  .connect(mongoUri)
  .then(() => console.log('Connected to MongoDB for the Post Service'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

app.use('/api/posts', postRoutes);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3003;
app.listen(PORT, () => {
  console.log(`Post Service running on port ${PORT}`);
});