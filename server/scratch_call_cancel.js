import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import User from './src/models/User.js';

async function testCancelRoute() {
    await mongoose.connect('mongodb://localhost:27017/tenant-management-system');
    console.log('Connected to MongoDB');

    try {
        const userId = '69981b9098a309def17766e2'; // Mokshagna soham
        const user = await User.findById(userId);
        if (!user) {
            console.log('User not found!');
            return;
        }

        // Generate JWT token matching jwtToken helper
        const token = jwt.sign(
            { userId: user._id.toString(), role: user.role },
            process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production',
            { expiresIn: '7d' }
        );

        console.log(`Generated Token: ${token}`);
        console.log('Sending cancel request...');

        const bookingId = '6a61a02a723ce658895211eb';
        try {
            const res = await axios.post(`http://localhost:5000/api/bookings/${bookingId}/cancel`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            console.log('Response Status:', res.status);
            console.log('Response Data:', res.data);
        } catch (axiosErr) {
            console.error('Axios Error status:', axiosErr.response?.status);
            console.error('Axios Error data:', axiosErr.response?.data);
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

testCancelRoute();
