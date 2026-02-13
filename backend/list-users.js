// Script to list all users and their roles
// Usage: node list-users.js

const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const listUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mailguard', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Get all users
    const users = await User.find({}).select('email name role clerkId createdAt').sort({ createdAt: -1 });

    if (users.length === 0) {
      console.log('No users found in database');
      process.exit(0);
    }

    console.log(`Found ${users.length} user(s):\n`);
    console.log('═'.repeat(80));

    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   Name: ${user.name || 'N/A'}`);
      console.log(`   Role: ${user.role === 'admin' ? '🔑 ADMIN' : '👤 USER'}`);
      console.log(`   Clerk ID: ${user.clerkId}`);
      console.log(`   Created: ${user.createdAt.toLocaleString()}`);
      console.log('─'.repeat(80));
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
    process.exit(1);
  }
};

listUsers();
