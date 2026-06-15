import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import postRoutes from './routes/post.routes';
import commentRoutes from './routes/comment.route';
import postLikeRoutes from './routes/post-like.routes';
import commentLikeRoutes from './routes/comment-like.routes';

dotenv.config();

const app = express();
app.use(express.json());

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('MONGO_URI not defined in environment variables.');
  process.exit(1);
}

// Establish connection to MongoDB
mongoose
  .connect(mongoUri)
  .then(() => console.log('Connected to MongoDB for the Post Service'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/post-likes', postLikeRoutes);
app.use('/api/comment-likes', commentLikeRoutes);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3003;
app.listen(PORT, () => {
  console.log(`Post Service running on port ${PORT}`);
});