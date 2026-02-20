import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Message from './src/models/Message.js';

dotenv.config();

const createDemo = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // 1. Find User 'Mokshagna'
        const users = await User.find({});
        const user = users.find(u =>
            (u.firstName && u.firstName.match(/Mokshagna|sanka/i)) ||
            (u.lastName && u.lastName.match(/Mokshagna|sanka/i))
        );

        if (!user) {
            console.log('User Mokshagna not found!');
            return;
        }
        console.log('User found:', user.firstName);

        // 2. Find a Manager
        const manager = await User.findOne({ role: 'manager' });
        if (!manager) {
            console.log('No manager found to chat with!');
            return;
        }
        console.log('Manager found:', manager.firstName);

        // 3. Create Messages
        const messages = [
            {
                sender: manager._id,
                receiver: user._id,
                content: `Hi ${user.firstName}, welcome to the Resident Portal! I'm your property manager. Let me know if you need any help getting settled.`,
                read: false,
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
            },
            {
                sender: user._id,
                receiver: manager._id,
                content: "Thanks! I was wondering how to pay my rent online?",
                read: true,
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1.5) // 1.5 hours ago
            },
            {
                sender: manager._id,
                receiver: user._id,
                content: "You can go to the 'Pay Now' section in your dashboard. It accepts UPI and cards.",
                read: false,
                createdAt: new Date(Date.now() - 1000 * 60 * 5) // 5 mins ago
            }
        ];

        await Message.insertMany(messages);
        console.log('✅ Created 3 demo messages!');

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

createDemo();
