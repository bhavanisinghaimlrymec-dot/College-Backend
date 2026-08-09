/**
 * Run this with: node scripts/diagnose.js
 * It will test each part of the app separately to find the crash.
 */

console.log('=== DIAGNOSIS START ===\n');

// Step 1: Check .env loading
console.log('1. Loading .env...');
require('dotenv').config();

if (!process.env.MONGO_URI) {
  console.error('   FAIL: MONGO_URI is not set in .env');
  process.exit(1);
}
console.log('   OK: MONGO_URI loaded');
console.log('   URI:', process.env.MONGO_URI.replace(/:[^:@]+@/, ':****@')); // hide password

if (!process.env.JWT_SECRET) {
  console.error('   FAIL: JWT_SECRET is not set');
  process.exit(1);
}
console.log('   OK: JWT_SECRET loaded\n');

// Step 2: Check all requires
console.log('2. Loading modules...');
const modules = [
  ['express', 'express'],
  ['cors', 'cors'],
  ['mongoose', 'mongoose'],
  ['bcryptjs', 'bcryptjs'],
  ['jsonwebtoken', 'jsonwebtoken'],
  ['multer', 'multer'],
  ['cloudinary', 'cloudinary'],
  ['multer-storage-cloudinary', 'multer-storage-cloudinary'],
];

for (const [name, pkg] of modules) {
  try {
    const m = require(pkg);
    const version = m.version || (m.default && m.default.version) || 'loaded';
    console.log(`   OK: ${name} (${version})`);
  } catch (e) {
    console.error(`   FAIL: ${name} - ${e.message}`);
  }
}
console.log('');

// Step 3: Check all source files load
console.log('3. Loading source files...');
const sourceFiles = [
  '../src/constants/roles',
  '../src/models/User',
  '../src/models/Assignment',
  '../src/models/Attendance',
  '../src/models/FeedPost',
  '../src/models/Marks',
  '../src/models/Submission',
  '../src/middleware/errorMiddleware',
  '../src/middleware/authMiddleware',
  '../src/middleware/roleMiddleware',
  '../src/config/db',
  '../src/config/storage',
  '../src/controllers/authController',
  '../src/controllers/adminController',
  '../src/controllers/facultyController',
  '../src/controllers/feedController',
  '../src/controllers/studentController',
  '../src/routes/authRoutes',
  '../src/routes/adminRoutes',
  '../src/routes/facultyRoutes',
  '../src/routes/feedRoutes',
  '../src/routes/studentRoutes',
  '../src/app',
];

let hasError = false;
for (const file of sourceFiles) {
  try {
    require(file);
    console.log(`   OK: ${file}`);
  } catch (e) {
    console.error(`   FAIL: ${file}`);
    console.error(`         ${e.message}`);
    hasError = true;
  }
}
console.log('');

if (hasError) {
  console.log('=== FIX THE ABOVE ERRORS FIRST ===');
  process.exit(1);
}

// Step 4: Test MongoDB connection
console.log('4. Connecting to MongoDB...');
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI)
  .then((conn) => {
    console.log(`   OK: Connected to ${conn.connection.host}`);
    console.log('\n=== ALL CHECKS PASSED ===');
    process.exit(0);
  })
  .catch((err) => {
    console.error(`   FAIL: ${err.message}`);
    console.log('\n=== DATABASE CONNECTION FAILED ===');
    console.log('   Check your MONGO_URI in .env');
    console.log('   Check your IP is whitelisted in MongoDB Atlas');
    process.exit(1);
  });
