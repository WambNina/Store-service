const app = require('./app');
const { sequelize } = require('./config/database');
const initDatabase = require('./config/initDatabase');
const initCronJobs = require('./config/initCronJobs');

const PORT = process.env.PORT || 3000;
const USE_SEQUELIZE_SYNC = process.env.USE_SEQUELIZE_SYNC === 'true';

const startServer = async () => {
  try {
    if (USE_SEQUELIZE_SYNC) {
      await sequelize.authenticate();
      console.log('✅ MySQL Database connected successfully.');
      await sequelize.sync({ alter: true });
      console.log('✅ Database models synchronized.');
    } else {
      await initDatabase();
      console.log('✅ MySQL Database connected successfully.');
    }

    initCronJobs();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📚 Swagger Docs: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
};

startServer();