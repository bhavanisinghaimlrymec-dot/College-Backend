const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../src/models/User');

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      console.log('⚠ Admin already exists.');
      process.exit();
    }

    await User.create({
      name: 'System Administrator',
      usn: 'ADMIN01', // Your login ID
      email: 'admin@college.edu',
      password: 'adminpassword123', // Will be auto-hashed by the model
      role: 'admin',
      branch: 'Administration'
    });

    console.log(' Admin user created: ADMIN01 / adminpassword123');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();