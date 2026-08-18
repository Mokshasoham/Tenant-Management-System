import { 
  getPlatformFeeConfig, 
  calculatePaymentBreakdown 
} from '../services/platformFeeService.js';
import PlatformSetting from '../models/PlatformSetting.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import { asyncHandler, AppError } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';

/**
 * GET /api/platform/fee-preview?amount=15000
 * Public / Tenant endpoint to calculate payment fee breakdown before checkout.
 */
export const getFeePreview = asyncHandler(async (req, res) => {
  const amount = Number(req.query.amount) || 0;
  const breakdown = await calculatePaymentBreakdown(amount);

  res.status(200).json({
    success: true,
    data: breakdown,
  });
});

/**
 * GET /api/platform/settings
 * Admin endpoint: Retrieve platform fee and commission settings.
 */
export const getPlatformSettings = asyncHandler(async (req, res) => {
  const settings = await getPlatformFeeConfig();

  res.status(200).json({
    success: true,
    data: settings,
  });
});

/**
 * PUT /api/platform/settings
 * Admin endpoint: Update platform fee and commission settings.
 */
export const updatePlatformSettings = asyncHandler(async (req, res) => {
  const {
    platformFeeEnabled,
    platformFeeType,
    platformFeePercentage,
    platformFeeFixedAmount,
    platformFeePayer,
    platformFeeTaxPercentage,
    managerCommissionEnabled,
    managerCommissionPercentage,
  } = req.body;

  let settings = await PlatformSetting.findOne().sort({ createdAt: -1 });
  if (!settings) {
    settings = new PlatformSetting();
  }

  if (platformFeeEnabled !== undefined) settings.platformFeeEnabled = Boolean(platformFeeEnabled);
  if (platformFeeType && ['percentage', 'fixed'].includes(platformFeeType)) {
    settings.platformFeeType = platformFeeType;
  }
  if (platformFeePercentage !== undefined) {
    settings.platformFeePercentage = Math.max(0, Math.min(100, Number(platformFeePercentage) || 0));
  }
  if (platformFeeFixedAmount !== undefined) {
    settings.platformFeeFixedAmount = Math.max(0, Number(platformFeeFixedAmount) || 0);
  }
  if (platformFeePayer && ['tenant', 'manager', 'split'].includes(platformFeePayer)) {
    settings.platformFeePayer = platformFeePayer;
  }
  if (platformFeeTaxPercentage !== undefined) {
    settings.platformFeeTaxPercentage = Math.max(0, Math.min(100, Number(platformFeeTaxPercentage) || 0));
  }
  if (managerCommissionEnabled !== undefined) {
    settings.managerCommissionEnabled = Boolean(managerCommissionEnabled);
  }
  if (managerCommissionPercentage !== undefined) {
    settings.managerCommissionPercentage = Math.max(0, Math.min(100, Number(managerCommissionPercentage) || 0));
  }

  settings.updatedBy = req.user?.userId || req.user?._id;
  await settings.save();

  logger.info(`[PlatformSettings] Updated by admin ${req.user?.userId}: fee=${settings.platformFeePercentage}%, commission=${settings.managerCommissionPercentage}%`);

  res.status(200).json({
    success: true,
    message: 'Platform settings updated successfully',
    data: settings,
  });
});

/**
 * GET /api/platform/revenue-summary
 * Admin endpoint: Comprehensive platform revenue report.
 */
export const getAdminRevenueSummary = asyncHandler(async (req, res) => {
  const transactions = await PaymentTransaction.find()
    .sort({ createdAt: -1 })
    .populate('tenant', 'firstName lastName email')
    .populate('property', 'name address')
    .populate('manager', 'firstName lastName email')
    .limit(100);

  const aggregate = await PaymentTransaction.aggregate([
    {
      $group: {
        _id: null,
        totalRentProcessed: { $sum: '$rentAmount' },
        platformFeesCollected: { $sum: '$platformFee' },
        managerCommissionsCollected: { $sum: '$managerCommission' },
        totalPlatformRevenue: { $sum: '$netPlatformRevenue' },
        refundedPlatformFees: { $sum: '$reversedPlatformFee' },
        totalRefundedAmount: { $sum: '$refundedAmount' },
        successfulPayments: {
          $sum: {
            $cond: [{ $in: ['$status', ['paid', 'captured']] }, 1, 0]
          }
        },
        refundedPayments: {
          $sum: {
            $cond: [{ $in: ['$status', ['refunded', 'partially_refunded']] }, 1, 0]
          }
        },
        failedPayments: {
          $sum: {
            $cond: [{ $eq: ['$status', 'failed'] }, 1, 0]
          }
        },
        totalTransactions: { $sum: 1 },
      }
    }
  ]);

  const summary = aggregate[0] || {
    totalRentProcessed: 0,
    platformFeesCollected: 0,
    managerCommissionsCollected: 0,
    totalPlatformRevenue: 0,
    refundedPlatformFees: 0,
    totalRefundedAmount: 0,
    successfulPayments: 0,
    refundedPayments: 0,
    failedPayments: 0,
    totalTransactions: 0,
  };

  res.status(200).json({
    success: true,
    data: {
      metrics: summary,
      recentTransactions: transactions,
    },
  });
});
