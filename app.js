require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const storeRoutes = require('./routes/storeRoutes');
const errorHandler = require('./middleware/errorHandler');

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

// // Swagger
// const swaggerOptions = {
//   explorer: true,
//   customCss: `
//     .swagger-ui .topbar { display: none }
//     .swagger-ui .info .title { font-size: 36px; font-weight: bold; }
//     .swagger-ui .info { margin: 20px 0; }
//   `,
//   customSiteTitle: 'Store Service API',
//   swaggerOptions: {
//     persistAuthorization: true,
//     displayRequestDuration: true,
//     filter: true,
//     tryItOutEnabled: true
//   }
// };


// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    explorer: true,
    swaggerOptions: {
        url: '/api-docs/swagger.json',
        validatorUrl: null,
        tryItOutEnabled: true
    },
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'store Service API'
}));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes
app.use('/api/v1/stores', storeRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use(errorHandler);

module.exports = app;