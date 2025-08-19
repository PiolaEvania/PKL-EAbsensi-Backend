import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js'
import attendanceGeneratorRoutes from './routes/attendanceGeneratorRoutes.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());
app.set('trust proxy', true);
app.use(cors({
  origin: '',
  method: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.get('/', (req, res) => {
  res.send('Server is running...');
});

mongoose.connect(process.env.DATABASE)
  .then(() => console.log("Database connected successfully."))
  .catch(err => {
    console.error("Database connection error: ", err.message);
    process.exit(1);
  });

app.use('/api', authRoutes);
app.use('/api', attendanceRoutes);
app.use('/api', attendanceGeneratorRoutes);
app.use('/api', userRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Endpoint not found." });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});