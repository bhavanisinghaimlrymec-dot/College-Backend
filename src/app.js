const express = require('express');
const cors = require('cors');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// 1. IMPORT ALL ROUTES AT THE TOP
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const studentRoutes = require('./routes/studentRoutes');
const feedRoutes = require('./routes/feedRoutes');
const timetableRoutes = require('./routes/timetableRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/timetable', timetableRoutes);

// Root Test
app.get('/', (req, res) => {
    res.send('College App API is Active.');
});

// Error Middleware
app.use(notFound);
app.use(errorHandler);

module.exports = app;