const mongoose = require('mongoose');

const connectDB = async (retries = 5) => {
  for (let i = 1; i <= retries; i++) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000, // 10s timeout
      });
      console.log(`✅ Database Linked: ${conn.connection.host}`);
      return; // success — exit the function
    } catch (error) {
      console.error(`❌ DB connection attempt ${i}/${retries} failed: ${error.message}`);
      if (i === retries) {
        console.error('All DB connection attempts failed. Server will start without DB.');
        console.error('Fix your MONGO_URI in .env and save the file — nodemon will restart automatically.');
        // Do NOT call process.exit(1) — that crashes nodemon
        return;
      }
      // Wait 3 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
};

module.exports = connectDB;