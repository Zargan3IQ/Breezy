import express, { NextFunction, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/errorHandler.middleware';
import authRoutes from './routes/auth.routes';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});
