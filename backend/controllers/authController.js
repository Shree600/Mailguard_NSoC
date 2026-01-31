// Import required modules
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * REGISTER NEW USER
 * @route   POST /api/auth/register
 * @access  Public
 * @desc    Create a new user account
 */
const register = async (req, res) => {
  try {
    // Extract user data from request body
    const { name, email, password } = req.body;

    // Validate that all required fields are provided
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Hash the password before storing (never store plain text passwords)
    const salt = await bcrypt.genSalt(10); // Generate salt for hashing
    const passwordHash = await bcrypt.hash(password, salt);

    // Create new user in database
    const user = await User.create({
      name,
      email,
      passwordHash,
    });

    // Generate JWT token for automatic login after registration
    const token = jwt.sign(
      { userId: user._id }, // Payload: user ID
      process.env.JWT_SECRET, // Secret key from environment
      { expiresIn: '30d' } // Token expires in 30 days
    );

    // Send success response with user data and token
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        token,
      },
    });
  } catch (error) {
    // Handle any errors during registration
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message,
    });
  }
};

/**
 * LOGIN USER
 * @route   POST /api/auth/login
 * @access  Public
 * @desc    Authenticate user and return token
 */
const login = async (req, res) => {
  try {
    // Extract credentials from request body
    const { email, password } = req.body;

    // Validate that both fields are provided
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Verify password by comparing with stored hash
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token for authenticated session
    const token = jwt.sign(
      { userId: user._id }, // Payload: user ID
      process.env.JWT_SECRET, // Secret key from environment
      { expiresIn: '30d' } // Token expires in 30 days
    );

    // Send success response with user data and token
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        token,
      },
    });
  } catch (error) {
    // Handle any errors during login
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
  }
};

// Export controller functions
module.exports = {
  register,
  login,
};
