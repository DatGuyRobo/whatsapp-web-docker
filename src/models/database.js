const mongoose = require('mongoose');
const config = require('../../config');
const logger = require('../utils/logger');

// Connection state
let isConnected = false;

// Connect to MongoDB
const connectDB = async () => {
    if (isConnected) {
        logger.info('MongoDB already connected');
        return;
    }

    try {
        await mongoose.connect(config.MONGODB_URI, config.MONGODB_OPTIONS);
        isConnected = true;
        logger.info(`MongoDB connected successfully to ${config.MONGODB_URI}`);
    } catch (error) {
        logger.error('MongoDB connection error:', error);
        // Don't exit process, allow app to run without DB if needed
        logger.warn('Application will continue without database features');
    }
};

// Disconnect from MongoDB
const disconnectDB = async () => {
    if (!isConnected) {
        return;
    }

    try {
        await mongoose.disconnect();
        isConnected = false;
        logger.info('MongoDB disconnected');
    } catch (error) {
        logger.error('MongoDB disconnection error:', error);
    }
};

// Get connection status
const getConnectionStatus = () => isConnected;

module.exports = {
    connectDB,
    disconnectDB,
    getConnectionStatus,
};
