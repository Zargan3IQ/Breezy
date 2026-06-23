import express from 'express';
import dotenv from 'dotenv';
import userRoutes from './routes/user.routes';
import { errorHandler } from './middlewares/errorHandler.middleware';
import './config/db';

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok' }));

app.use('/api/users', userRoutes);

app.use(errorHandler);  

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(PORT, () => {
  console.log(`User Service en ligne sur le port ${PORT}`);
});
