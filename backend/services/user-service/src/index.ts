import express from 'express';
import dotenv from 'dotenv';
import userRoutes from './routes/user.routes';
import './config/db';

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/users', userRoutes);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(PORT, () => {
  console.log(`User Service en ligne sur le port ${PORT}`);
});
