import User from '../models/User.js';
import ProfileAudit from '../models/ProfileAudit.js';
import FILE_CATEGORIES from '../constants/fileCategories.js';
import { uploadFileBuffer, deleteFileFromStorage } from '../services/fileService.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';
import sendEmail from '../utils/sendEmail.js';
import { OAuth2Client } from 'google-auth-library';
import config from '../config/config.js';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);

const resolveUserUrls = (user, req) => {
  if (!user) return user;
  const userObj = user.toObject ? user.toObject() : user;
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  
  if (userObj.avatar && typeof userObj.avatar === 'string') {
    let fullAvatar = userObj.avatar;
    if (!fullAvatar.startsWith('http')) {
      fullAvatar = `${protocol}://${host}${fullAvatar.startsWith('/') ? '' : '/'}${fullAvatar}`;
    }
    const versionParam = userObj.avatarVersion || 1;
    userObj.avatar = fullAvatar.includes('?')
      ? `${fullAvatar}&v=${versionParam}`
      : `${fullAvatar}?v=${versionParam}`;
  }

  if (userObj.kycFileIds && userObj.kycFileIds.length > 0) {
    userObj.kycDocuments = userObj.kycFileIds.map(fileId => `${protocol}://${host}/api/files/download/${fileId}`);
  } else if (userObj.kycDocuments && userObj.kycDocuments.length > 0) {
    userObj.kycDocuments = userObj.kycDocuments.map(doc => {
      if (doc && !doc.startsWith('http')) {
        return `${protocol}://${host}/${doc.startsWith('/') ? '' : '/'}${doc}`;
      }
      return doc;
    });
  }
  return userObj;
};


export const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('User with this email already exists', 400);
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Generate Email Verification Token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const hashedVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    role: 'user',
    isEmailVerified: false,
    emailVerificationToken: hashedVerificationToken,
    emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });

  // Remove password from response
  user.password = undefined;

  // Send verification email
  const verifyURL = `${req.get('origin')}/verify-email/${verificationToken}`;
  const message = `Welcome to TMS!\n\nPlease verify your email address by clicking the link below:\n\n${verifyURL}\n\nThis link will expire in 24 hours.\n\nIf you did not create this account, please ignore this email.`;

  console.log(`\n--- EMAIL VERIFICATION SIMULATION --- \nURL: ${verifyURL}\nTOKEN: ${verificationToken}\n---------------------------------\n`);

  try {
    await sendEmail({
      email: user.email,
      subject: 'Verify your email address - TMS',
      message,
    });
    logger.info(`Verification email sent to ${user.email}`);
  } catch (err) {
    logger.error(`Real email delivery failed for verification: ${err.message}`);
  }

  // Generate token so they can log in but be flagged as unverified
  const token = generateToken(user._id, user.role);

  logger.info(`New user registered: ${user.email}`);

  res.status(201).json({
    success: true,
    message: 'User registered successfully. Please check your email to verify your account.',
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

  if (user.twoFactorEnabled) {
    return res.status(200).json({
      success: true,
      message: '2FA required',
      data: {
        requires2FA: true,
        userId: user._id,
      },
    });
  }

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
    data: resolveUserUrls(user, req),
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const existingUser = await User.findById(req.user.userId);
  if (!existingUser) {
    throw new AppError('User not found', 404);
  }

  const {
    firstName,
    lastName,
    phone,
    avatar,
    preferredName,
    gender,
    dob,
    occupation,
    nationality,
    secondaryEmail,
    alternatePhone,
    emergencyContact,
    address,
  } = req.body;

  const updateData = {};
  if (firstName !== undefined) updateData.firstName = firstName;
  if (lastName !== undefined) updateData.lastName = lastName;
  if (phone !== undefined) updateData.phone = phone;
  if (avatar !== undefined) updateData.avatar = avatar;
  if (preferredName !== undefined) updateData.preferredName = preferredName;
  if (gender !== undefined) updateData.gender = gender;
  if (dob !== undefined) updateData.dob = dob;
  if (occupation !== undefined) updateData.occupation = occupation;
  if (nationality !== undefined) updateData.nationality = nationality;
  if (secondaryEmail !== undefined) updateData.secondaryEmail = secondaryEmail;
  if (alternatePhone !== undefined) updateData.alternatePhone = alternatePhone;
  if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;
  if (address !== undefined) updateData.address = address;

  // Track changed fields for Audit Log
  const changedFields = [];
  Object.keys(updateData).forEach((key) => {
    const oldVal = existingUser[key];
    const newVal = updateData[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changedFields.push({ field: key, oldValue: oldVal, newValue: newVal });
    }
  });

  const user = await User.findByIdAndUpdate(req.user.userId, updateData, {
    new: true,
    runValidators: true,
  });

  // Record Audit Trail
  if (changedFields.length > 0) {
    try {
      await ProfileAudit.create({
        userId: req.user.userId,
        updatedBy: req.user.userId,
        changedFields,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
        userAgent: req.get('user-agent') || ''
      });
    } catch (auditErr) {
      logger.warn(`Failed to record ProfileAudit: ${auditErr.message}`);
    }
  }

  logger.info(`User profile updated: ${user.email}`);

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: resolveUserUrls(user, req),
  });
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('Please select an image file to upload', 400);
  }

  const existingUser = await User.findById(req.user.userId);
  if (!existingUser) {
    throw new AppError('User not found', 404);
  }

  // Upload new avatar file
  const uploadResult = await uploadFileBuffer({
    buffer: req.file.buffer,
    filename: req.file.originalname || `avatar-${req.user.userId}.jpg`,
    mimeType: req.file.mimetype || 'image/jpeg',
    category: FILE_CATEGORIES.AVATARS,
    uploaderId: req.user.userId
  });

  const previousAvatar = existingUser.avatar;
  let user;

  try {
    const currentVersion = (existingUser.avatarVersion || 0) + 1;
    user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        avatar: uploadResult.url,
        avatarVersion: currentVersion,
        avatarUpdatedAt: new Date()
      },
      { new: true }
    );
  } catch (updateErr) {
    logger.error(`[Avatar Upload Error] Database update failed. Rolling back uploaded avatar ${uploadResult.key}:`, updateErr);
    const cleanUploadName = uploadResult.key ? uploadResult.key.split('/').pop() : uploadResult.filename;
    await deleteFileFromStorage(uploadResult.key, cleanUploadName);
    throw new AppError('Failed to update profile avatar. Upload rolled back.', 500);
  }

  // Clean up previous storage file ONLY AFTER successful database update
  if (previousAvatar && typeof previousAvatar === 'string' && previousAvatar !== uploadResult.url) {
    let cleanName = null;
    if (previousAvatar.includes('/api/files/access/')) {
      cleanName = previousAvatar.split('/api/files/access/')[1];
    } else if (previousAvatar.includes('/api/files/download/')) {
      cleanName = previousAvatar.split('/api/files/download/')[1];
    }
    if (cleanName) {
      try {
        await deleteFileFromStorage(`avatars/${cleanName}`, cleanName);
      } catch (delErr) {
        logger.warn(`Failed to delete previous avatar storage file: ${delErr.message}`);
      }
    }
  }

  // Audit Log
  try {
    await ProfileAudit.create({
      userId: req.user.userId,
      updatedBy: req.user.userId,
      changedFields: [{ field: 'avatar', oldValue: previousAvatar, newValue: uploadResult.url }],
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || ''
    });
  } catch (auditErr) {
    logger.warn(`Failed to record avatar upload audit: ${auditErr.message}`);
  }

  res.status(200).json({
    success: true,
    message: 'Avatar uploaded successfully',
    data: resolveUserUrls(user, req),
  });
});

export const deleteAvatar = asyncHandler(async (req, res) => {
  const existingUser = await User.findById(req.user.userId);
  if (!existingUser) {
    throw new AppError('User not found', 404);
  }

  const previousAvatar = existingUser.avatar;

  if (previousAvatar && typeof previousAvatar === 'string') {
    let cleanName = null;
    if (previousAvatar.includes('/api/files/access/')) {
      cleanName = previousAvatar.split('/api/files/access/')[1];
    } else if (previousAvatar.includes('/api/files/download/')) {
      cleanName = previousAvatar.split('/api/files/download/')[1];
    }
    if (cleanName) {
      try {
        await deleteFileFromStorage(`avatars/${cleanName}`, cleanName);
      } catch (delErr) {
        logger.warn(`Failed to delete avatar storage file: ${delErr.message}`);
      }
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user.userId,
    { avatar: null },
    { new: true }
  );

  // Audit Log
  try {
    await ProfileAudit.create({
      userId: req.user.userId,
      updatedBy: req.user.userId,
      changedFields: [{ field: 'avatar', oldValue: previousAvatar, newValue: null }],
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || ''
    });
  } catch (auditErr) {
    logger.warn(`Failed to record avatar delete audit: ${auditErr.message}`);
  }

  res.status(200).json({
    success: true,
    message: 'Avatar removed successfully',
    data: resolveUserUrls(user, req),
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

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new AppError('Token is invalid or has expired', 400);
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  logger.info(`Email verified for user: ${user.email}`);

  const authToken = generateToken(user._id, user.role);

  res.status(200).json({
    success: true,
    message: 'Email successfully verified',
    data: {
      user,
      token: authToken,
    }
  });
});

export const googleAuth = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  // Verify the Google ID Token
  const ticket = await client.verifyIdToken({
    idToken: idToken,
    audience: config.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
  }).catch((err) => {
    logger.error('Google token verification failed', err);
    throw new AppError('Invalid Google Token', 401);
  });

  const payload = ticket.getPayload();
  const { sub: googleId, email, given_name, family_name, picture } = payload;

  let user = await User.findOne({ email });

  if (user) {
    if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }
  } else {
    const randomPassword = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await hashPassword(randomPassword);

    user = await User.create({
      firstName: given_name || 'User',
      lastName: family_name || 'Name',
      email: email,
      password: hashedPassword,
      role: 'user',
      isEmailVerified: true,
      googleId: googleId,
      avatar: picture,
    });
    logger.info(`New user registered via Google: ${user.email}`);
  }

  if (!user.isActive) {
    throw new AppError('Your account has been disabled', 403);
  }

  user.lastLogin = new Date();
  await user.save();

  user.password = undefined;

  const token = generateToken(user._id, user.role);

  logger.info(`User logged in via Google: ${user.email}`);

  res.status(200).json({
    success: true,
    message: 'Google login successful',
    data: {
      user,
      token,
    },
  });
});

export const verify2FALogin = asyncHandler(async (req, res) => {
  const { userId, token } = req.body;

  const user = await User.findById(userId);
  if (!user || !user.twoFactorEnabled) {
    throw new AppError('Invalid request', 400);
  }

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: token,
  });

  if (!verified) {
    throw new AppError('Invalid 2FA code', 400);
  }

  user.lastLogin = new Date();
  await user.save();

  const authToken = generateToken(user._id, user.role);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user,
      token: authToken,
    },
  });
});

export const setup2FA = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);

  if (user.twoFactorEnabled) {
    throw new AppError('2FA is already enabled', 400);
  }

  const secret = speakeasy.generateSecret({
    name: `TMS (${user.email})`
  });

  user.twoFactorSecret = secret.base32;
  await user.save();

  qrcode.toDataURL(secret.otpauth_url, (err, dataUrl) => {
    if (err) {
      throw new AppError('Error generating QR code', 500);
    }
    res.status(200).json({
      success: true,
      data: {
        qrCodeUrl: dataUrl,
        secret: secret.base32,
      }
    });
  });
});

export const verifyAndEnable2FA = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const user = await User.findById(req.user.userId);

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: token,
  });

  if (!verified) {
    throw new AppError('Invalid 2FA code', 400);
  }

  user.twoFactorEnabled = true;
  await user.save();

  res.status(200).json({
    success: true,
    message: '2FA successfully enabled',
  });
});
