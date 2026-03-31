// config/initCronJobs.js
const cron = require('node-cron');

const initCronJobs = () => {
    // Example: Add your cron jobs here
    // cron.schedule('0 0 * * *', () => {
    //     console.log('Running daily task...');
    // });
    
    console.log('✅ Cron jobs initialized');
};

module.exports = initCronJobs;