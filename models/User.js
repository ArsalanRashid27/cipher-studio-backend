// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // bcrypt ko import karein

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true, // Har user ka naam alag hona chahiye
  },
  password: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Naya user save hone se 'pehle' yeh function chalega
userSchema.pre('save', async function (next) {
  // Agar password modify nahi hua hai, toh aage badh jaayein
  if (!this.isModified('password')) {
    return next();
  }
  
  // Password ko hash karein
  try {
    const salt = await bcrypt.genSalt(10); // 10 rounds ka salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;