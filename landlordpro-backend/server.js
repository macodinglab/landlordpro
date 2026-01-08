const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
require('./src/utils/leaseStatusUpdater');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------
// Middleware
// ---------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------
// Docker-aware and Vite-aware CORS
// ---------------------
const allowedOrigins = [
  'http://localhost',
  'http://localhost:5173',
  'http://localhost:80',
  'http://localhost:3000',
  'http://frontend',
  'https://api.landlordpro.rw',
  'https://landlordpro.rw',
  'https://www.landlordpro.rw'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200,
}));

// ---------------------
// Serve static files
// ---------------------
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------------------
// Routes
// ---------------------
const setupSwagger = require('./swagger');
const userRoutes = require('./src/routes/userRoutes');
const propertyRoutes = require('./src/routes/propertyRoutes');
const localRoutes = require('./src/routes/localRoutes');
const tenantRoutes = require('./src/routes/tenantRoutes');
const leaseRoutes = require('./src/routes/leaseRoutes');
const paymentModeRoutes = require('./src/routes/paymentModeRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const expenseRoutes = require('./src/routes/expenseRoutes');
const floorRouter = require('./src/routes/floorRouter');
const staffRoutes = require('./src/routes/staffRoutes');
const uploadRoutes = require('./src/routes/uploadRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const managerReportRoutes = require('./src/routes/managerReportRoutes');

// API endpoints
app.use('/api', userRoutes);
app.use('/api', propertyRoutes);
app.use('/api', localRoutes);
app.use('/api', tenantRoutes);
app.use('/api', leaseRoutes);
app.use('/api', paymentModeRoutes);
app.use('/api', paymentRoutes);
app.use('/api', floorRouter);
app.use('/api', expenseRoutes);
app.use('/api', staffRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/manager/reports', managerReportRoutes); // Manager and admin - MUST come before /api/reports
app.use('/api/reports', reportRoutes); // Admin only

// Swagger documentation
setupSwagger(app);

// ---------------------
// Health check
// ---------------------
app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'LandLord Pro Backend is Healthy!' });
});

// ---------------------
// 404 for unknown routes
// ---------------------
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ---------------------
// Global error handler
// ---------------------
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'An unexpected error occurred.',
  });
});

// ---------------------
// Start server
// ---------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
