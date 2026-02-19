import Review from '../models/Review.js';
import Property from '../models/Property.js';
import Booking from '../models/Booking.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';

// POST /api/reviews — create review (tenant only, after completed booking)
export const createReview = asyncHandler(async (req, res) => {
    const { propertyId, rating, comment, cleanliness, location, value, communication, bookingId } = req.body;

    // Check for existing review by this user for this property
    const existing = await Review.findOne({ property: propertyId, author: req.user.userId });
    if (existing) throw new AppError('You have already reviewed this property', 400);

    const review = await Review.create({
        property: propertyId,
        author: req.user.userId,
        booking: bookingId,
        rating,
        comment,
        cleanliness,
        location,
        value,
        communication,
        verifiedStay: !!bookingId,
    });

    // Update property rating average
    const allReviews = await Review.find({ property: propertyId });
    const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    await Property.findByIdAndUpdate(propertyId, {
        rating: Math.round(avg * 10) / 10,
        reviewCount: allReviews.length,
    });

    res.status(201).json({ success: true, data: review });
});

// GET /api/reviews/property/:propertyId
export const getPropertyReviews = asyncHandler(async (req, res) => {
    const reviews = await Review.find({ property: req.params.propertyId })
        .populate('author', 'firstName lastName')
        .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: reviews });
});

// PUT /api/reviews/:id/reply — manager replies
export const replyToReview = asyncHandler(async (req, res) => {
    const review = await Review.findById(req.params.id).populate('property');
    if (!review) throw new AppError('Review not found', 404);

    // Only manager/owner of property can reply
    const property = review.property;
    const isManager = property.manager?.toString() === req.user.userId || property.owner?.toString() === req.user.userId;
    if (!isManager && req.user.role !== 'admin') throw new AppError('Not authorized', 403);

    review.managerReply = { text: req.body.text, repliedAt: new Date() };
    await review.save();

    res.status(200).json({ success: true, data: review });
});

// DELETE /api/reviews/:id
export const deleteReview = asyncHandler(async (req, res) => {
    const review = await Review.findById(req.params.id);
    if (!review) throw new AppError('Review not found', 404);
    if (review.author.toString() !== req.user.userId && req.user.role !== 'admin') {
        throw new AppError('Not authorized', 403);
    }
    await review.deleteOne();
    res.status(200).json({ success: true, message: 'Review deleted' });
});

// POST /api/reviews/:id/helpful
export const markHelpful = asyncHandler(async (req, res) => {
    const review = await Review.findById(req.params.id);
    if (!review) throw new AppError('Review not found', 404);

    const idx = review.helpful.indexOf(req.user.userId);
    if (idx > -1) {
        review.helpful.splice(idx, 1);
    } else {
        review.helpful.push(req.user.userId);
    }
    review.helpfulCount = review.helpful.length;
    await review.save();

    res.status(200).json({ success: true, data: { helpful: review.helpful.length } });
});
