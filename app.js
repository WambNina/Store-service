require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const storeRoutes = require('./routes/storeRoutes');
const errorHandler = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/auth');

console.log('errorHandler type:', typeof errorHandler);  // Should be 'function'
console.log('authenticate type:', typeof authenticate);

const app = express();

// Security middleware
app.use(helmet({
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false
}));
app.use(cors({
    origin: true,
    credentials: true
}));

// Logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    explorer: true,
    swaggerOptions: {
        url: '/api-docs/swagger.json',
        validatorUrl: null,
        persistAuthorization: true,
        tryItOutEnabled: true
    },
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'store Service API'
}));

// Health check (public)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Protected routes - authentication required
app.use('/api/v1/stores', authenticate, storeRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler - MUST be last
app.use(errorHandler);

module.exports = app;