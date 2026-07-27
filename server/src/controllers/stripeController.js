import Stripe from 'stripe';
import { AppError, asyncHandler } from '../utils/errorHandling.js';
import Payment from '../models/Payment.js';
import Lease from '../models/Lease.js';
import User from '../models/User.js';
import Property from '../models/Property.js';
import Subscription from '../models/Subscription.js';
import Tenant from '../models/Tenant.js';
import logger from '../utils/logger.js';
import { processPostPayment } from '../services/paymentAutomation.js';

// Initialize with a mock key so it doesn't crash if ENV is missing yet
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key');

/**
 * Creates a Stripe Checkout Session for a Rent Payment
 * For Stripe Connect, we can route a percentage to the platform and the rest to the owner's stripeAccountId
 */
export const createRentCheckoutSession = asyncHandler(async (req, res) => {
  const { leaseId, amount, successUrl, cancelUrl } = req.body;

  const lease = await Lease.findById(leaseId).populate('tenant').populate('property');
  if (!lease) throw new AppError('Lease not found', 404);

  const owner = await User.findById(lease.property.owner);
  if (!owner) throw new AppError('Owner not found', 404);

  // Platform Fee Calculation (e.g., 5%)
  const platformFeePercentage = 0.05;
  const platformFeeAmount = Math.round(amount * platformFeePercentage); // Amount is in cents for Stripe!
  const netAmount = amount - platformFeeAmount;

  // Real world implementation would pass this into Stripe's transfer_data
  // For now, we simulate the session creation
  
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `Rent Payment for ${lease.property.name}`,
              description: `Lease: ${lease.leaseNumber}`,
            },
            unit_amount: amount * 100, // INR takes subunits (paise)
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/payment-failed`,
      metadata: {
        leaseId: lease._id.toString(),
        tenantId: lease.tenant._id.toString(),
        propertyId: lease.property._id.toString(),
        ownerId: owner._id.toString(),
        type: 'rent',
        commissionAmount: platformFeeAmount,
        netAmount: netAmount
      },
      // STUB FOR STRIPE CONNECT:
      // payment_intent_data: {
      //   application_fee_amount: platformFeeAmount * 100,
      //   transfer_data: {
      //     destination: owner.stripeAccountId,
      //   },
      // },
    });

    res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url
      }
    });
  } catch (error) {
    logger.error('Stripe Session Error:', error);
    throw new AppError(`Stripe Error: ${error.message}`, 500);
  }
});

/**
 * Handle async Webhook events from Stripe
 * Specifically listening for checkout.session.completed or payment_intent.succeeded
 */
export const handleStripeWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    logger.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    if (session.mode === 'subscription') {
      // It's an owner paying for a SaaS plan
      const { ownerId, planName } = session.metadata || {};
      logger.info(`Subscription checkout completed for owner: ${ownerId}`);
      
      // Let the 'customer.subscription.created' event handle the actual DB updates, 
      // or optionally update it here if metadata is critical.
    } else {
      // Extract metadata
      const { leaseId, tenantId, propertyId, ownerId, type, commissionAmount, netAmount } = session.metadata || {};

      // 1. Create the Payment Record
      const payment = await Payment.create({
        type: type || 'rent',
        lease: leaseId,
        tenant: tenantId,
        property: propertyId,
        owner: ownerId,
        amount: session.amount_total / 100, // Convert from paise
        amountPaid: session.amount_total / 100,
        commissionAmount: Number(commissionAmount) || 0,
        netAmount: Number(netAmount) || (session.amount_total / 100),
        status: 'paid',
        paymentDate: new Date(),
        dueDate: new Date(),
        paymentMethod: 'card', // Stripe Connect
        stripePaymentIntentId: session.payment_intent,
      });

      logger.info(`Stripe Webhook processed successfully for payment: ${payment?._id}`);
      
      // 2. Automate Post-Payment Documentation (Async)
      if (payment?._id) {
        processPostPayment(payment._id).catch((error) => {
          logger.error(`Failed to process post-payment for Stripe payment ${payment._id}: ${error.message}`);
        });
      }
    }
  } else if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    
    // We can lookup by stripeCustomerId if metadata ownerId isn't on the subscription directly
    // But usually metadata propagates from checkout session.
    // If not, we fall back to stripeCustomerId (which we should have saved).
    const ownerId = subscription.metadata?.ownerId;
    
    const updateData = {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    };

    if (subscription.metadata?.planName) updateData.planName = subscription.metadata.planName;

    if (ownerId) {
      await Subscription.findOneAndUpdate(
        { owner: ownerId },
        { ...updateData, owner: ownerId },
        { upsert: true, new: true }
      );
      logger.info(`Subscription created/updated for owner: ${ownerId}`);
    } else {
      // Fallback: finding by customer ID
      await Subscription.findOneAndUpdate(
        { stripeCustomerId: subscription.customer },
        updateData
      );
      logger.info(`Subscription created/updated for stripeCustomer: ${subscription.customer}`);
    }
  } else if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      { status: 'canceled' }
    );
    logger.info(`Subscription canceled: ${subscription.id}`);
  } else if (event.type === 'payment_intent.payment_failed' || event.type === 'invoice.payment_failed') {
    const object = event.data.object;
    const { tenantId, ownerId, amount } = object.metadata || {};
    const failureMessage = object.last_payment_error?.message || 'Payment declined';

    logger.warn(`Stripe Payment Failed [${event.type}]: ${object.id} - ${failureMessage}`);

    // If we have a tenant ID, we can notify them
    if (tenantId) {
      try {
        const tenant = await Tenant.findById(tenantId).populate('user');
        if (tenant?.user) {
          await sendPaymentFailedEmail(tenant.user, (object.amount || object.amount_due) / 100, failureMessage);
        }
      } catch (err) {
        logger.error(`Failed to send failure email: ${err.message}`);
      }
    } else if (ownerId) {
       // Notify owner for subscription failure
       try {
        const owner = await User.findById(ownerId);
        if (owner) {
          await sendPaymentFailedEmail(owner, (object.amount || object.amount_due) / 100, failureMessage);
        }
      } catch (err) {
        logger.error(`Failed to send failure email to owner: ${err.message}`);
      }
    }
  }

  res.json({ received: true });
});
