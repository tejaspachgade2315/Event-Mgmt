const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connect = require('./config/db');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middlewares/authMiddleware').errorHandler;
const app = express();

const homeRoutes = require('./routes/homeRoutes');
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');

dotenv.config();

app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const allowedOrigin = 'https://event-mgmt-six.vercel.app';
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin === allowedOrigin) return callback(null, true);
    return callback(new Error('CORS policy: This origin is not allowed'));
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

connect();

app.use('/api', homeRoutes);
app.use('/api/auth', authRoutes)
app.use('/api/events', eventRoutes);

app.use(errorHandler);
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server is running on port http://localhost:${port}`));

