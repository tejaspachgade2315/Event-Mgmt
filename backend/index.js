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

app.use(cors({
  origin: '*',
  credentials: true
}));

connect();

app.use('/api', homeRoutes);
app.use('/api/auth', authRoutes)
app.use('/api/events', eventRoutes);

app.use(errorHandler);
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server is running on port http://localhost:${port}`));

