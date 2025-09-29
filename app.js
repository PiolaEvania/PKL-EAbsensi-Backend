import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js'
import attendanceGeneratorRoutes from './routes/attendanceGeneratorRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js'
import exportRoutes from './routes/exportRoutes.js'

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());
app.set('trust proxy', true);

const allowedOrigins = [
  'http://localhost:3000',
  'https://eabsensi-dkp3bjm-admin.vercel.app' 
];

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
};

app.use(cors(corsOptions));

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
app.use('/api', announcementRoutes);
app.use('/api', attendanceGeneratorRoutes);
app.use('/api', attendanceRoutes);
app.use('/api', userRoutes);
app.use('/api', exportRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Endpoint not found." });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});