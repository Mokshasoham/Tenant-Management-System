import User from '../models/User.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';
import sendEmail from '../utils/sendEmail.js';

export const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('User with this email already exists', 400);
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    role: 'user',
  });

  // Remove password from response
  user.password = undefined;

  // Generate token
  const token = generateToken(user._id, user.role);

  logger.info(`New user registered: ${user.email}`);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user,
      token,
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user and include password
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Compare passwords
  const isPasswordMatch = await comparePassword(password, user.password);
  if (!isPasswordMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new AppError('Your account has been disabled', 403);
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  user.password = undefined;

  const token = generateToken(user._id, user.role);

  logger.info(`User logged in: ${user.email}`);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user,
      token,
    },
  });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId).populate('properties');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, avatar } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user.userId,
    {
      firstName,
      lastName,
      phone,
      avatar,
    },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new AppError('User not found', 404);
  }

  logger.info(`User profile updated: ${user.email}`);

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: user,
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.userId).select('+password');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Verify current password
  const isPasswordMatch = await comparePassword(currentPassword, user.password);
  if (!isPasswordMatch) {
    throw new AppError('Current password is incorrect', 401);
  }

  // Hash and update new password
  user.password = await hashPassword(newPassword);
  await user.save();

  logger.info(`Password changed for user: ${user.email}`);

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
  });
});

export const logout = asyncHandler(async (req, res) => {
  logger.info(`User logged out: ${req.user.userId}`);

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  // 1) Get user based on POSTed email
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('There is no user with that email address.', 404);
  }

  // 2) Generate the random reset token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // 3) Hash token and set to resetPasswordToken field
  user.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // 4) Set expires (10 minutes)
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  await user.save({ validateBeforeSave: false });

  // 5) Send it via email (Non-blocking simulation)
  const resetURL = `${req.get('origin')}/reset-password/${resetToken}`;
  const message = `Forgot your password? Click the link below to reset it:\n\n${resetURL}\n\nIf you didn't forget your password, please ignore this email!`;

  // Always log to console for development/demo (The "Yesterday" behavior)
  console.log(`\n--- PASSWORD RESET SIMULATION --- \nURL: ${resetURL}\nTOKEN: ${resetToken}\n---------------------------------\n`);
  logger.info(`Password reset link generated for ${user.email}`);

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message,
    });
  } catch (err) {
    // Log the error but DO NOT fail the request
    logger.error(`Real email delivery failed (likely missing .env credentials): ${err.message}`);
  }

  // Always return success so the user is not blocked
  res.status(200).json({
    success: true,
    message: 'Reset link generated! (Check server console for demo purposes)',
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    throw new AppError('Token is invalid or has expired', 400);
  }

  user.password = await hashPassword(password);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Log in user (optional, here we'll just send success)
  logger.info(`Password successfully reset for user: ${user.email}`);

  res.status(200).json({
    success: true,
    message: 'Password reset successful. You can now log in with your new password.',
  });
});
