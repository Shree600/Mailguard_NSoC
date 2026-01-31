// Import mongoose for MongoDB connection
const mongoose = require('mongoose');

/**
 * Connect to MongoDB database
 * Uses MONGO_URI from environment variables
 * @returns {Promise} - Resolves when connection is successful
 */
const connectDB = async () => {
  try {
    // Attempt to connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // If connection fails, log error and exit process
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1); // Exit with failure code
  }
};

// Export the connectDB function
module.exports = connectDB;
