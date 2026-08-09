const dotenv = require('dotenv');
dotenv.config(); // MUST run before any other require that reads process.env

const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

// Connect to Database first, then start server
const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`\u2705 Server is running on port ${PORT}`);
  });

  // Handle port-already-in-use gracefully instead of crashing nodemon
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\u274c Port ${PORT} is already in use! Close the other process or change PORT in .env`);
    } else {
      console.error('\u274c Server error:', err.message);
    }
  });
};

startServer();