import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import logger from '../utils/logger.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key');

// PLAN DEFINITIONS
const PLANS = {
  basic: { priceId: process.env.STRIPE_BASIC_PLAN_ID, amount: 999 }, // e.g. $9.99
  pro: { priceId: process.env.STRIPE_PRO_PLAN_ID, amount: 2999 },
  enterprise: { priceId: process.env.STRIPE_ENTERPRISE_PLAN_ID, amount: 9999 }
};

export const getMySubscription = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({ owner: req.user.userId });
  
  if (!subscription) {
    // Return a default freemium/trial state if none exists
    return res.status(200).json({
      success: true,
      data: {
        planName: 'basic',
        status: 'trialing',
        amount: 0
      }
    });
  }

  res.status(200).json({ success: true, data: subscription });
});

export const createSubscriptionCheckout = asyncHandler(async (req, res) => {
  const { planName, successUrl, cancelUrl } = req.body;
  const owner = await User.findById(req.user.userId);

  if (!PLANS[planName]) throw new AppError('Invalid plan selected', 400);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: PLANS[planName].priceId || 'mock_price_id',
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl || `${process.env.FRONTEND_URL}/settings/billing?success=true`,
    cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/settings/billing?cancel=true`,
    customer_email: owner.email,
    metadata: {
      ownerId: owner._id.toString(),
      planName: planName
    }
  });

  res.status(200).json({ success: true, url: session.url });
});

export const cancelSubscription = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({ owner: req.user.userId });
  if (!subscription || !subscription.stripeSubscriptionId) {
    throw new AppError('No active Stripe subscription found', 404);
  }

  const deletedSubscription = await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

  subscription.status = 'canceled';
  await subscription.save();

  res.status(200).json({ success: true, message: 'Subscription canceled successfully' });
});
