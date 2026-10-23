import User from '../models/userModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim() === '') {
    throw new Error('Authentication configuration error: JWT_SECRET is not configured on the server.');
  }
  return secret;
};

// SEC-10: Reduced JWT access token lifespan (30 minutes default)
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30m';

const sanitizeUser = (userDoc) => {
  const userObj = userDoc?.toObject ? userDoc.toObject() : { ...userDoc };
  delete userObj.password;
  return userObj;
};

// Strict email regex (RFC 5322 standard-compliant simplified format)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Common trivial passwords to reject on registration
const COMMON_WEAK_PASSWORDS = new Set([
  'password',
  'password123',
  '12345678',
  '123456789',
  'admin123',
  'qwerty123',
  'letmein123',
  'shopify123',
]);

const registerUser = async (userData) => {
  if (!userData || typeof userData !== 'object') {
    throw new Error('Invalid request payload');
  }
  const { name, email, password } = userData;
  if (!name || !email || !password) {
    throw new Error('Name, email, and password are required');
  }
  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    throw new Error('Name, email, and password must be valid strings');
  }

  const trimmedName = String(name).trim();
  if (trimmedName.length < 2) {
    throw new Error('Name must be at least 2 characters long');
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new Error('Please provide a valid email address');
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Strengthened password policy for NEW registrations (SEC-09: minimum 6 characters)
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    throw new Error('Password must contain at least one letter and one number');
  }

  if (COMMON_WEAK_PASSWORDS.has(password.toLowerCase())) {
    throw new Error('Password is too common. Please choose a stronger password');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name: trimmedName,
    email: normalizedEmail,
    password: hashedPassword
  });

  const secret = getJwtSecret();
  const token = jwt.sign({ id: user._id, role: user.roles }, secret, { expiresIn: JWT_EXPIRES_IN });
  return { user: sanitizeUser(user), token };
};

const loginUser = async (userData) => {
  if (!userData || typeof userData !== 'object') {
    throw new Error('Invalid email or password');
  }
  const { email, password } = userData;
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new Error('Invalid email or password');
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    // SEC-08: Prevent user enumeration
    throw new Error('Invalid email or password');
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    // SEC-08: Prevent user enumeration
    throw new Error('Invalid email or password');
  }
  const secret = getJwtSecret();
  const token = jwt.sign({ id: user._id, role: user.roles }, secret, { expiresIn: JWT_EXPIRES_IN });
  return { user: sanitizeUser(user), token };
};

export default { registerUser, loginUser };
