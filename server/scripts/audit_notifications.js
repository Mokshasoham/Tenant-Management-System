import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function auditNotifications() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB successfully!");

        const Schema = new mongoose.Schema({}, { strict: false });
        const Notification = mongoose.model('Notification', Schema, 'notifications');

        const total = await Notification.countDocuments();
        console.log(`Total notifications in DB: ${total}`);

        const list = await Notification.find({}).sort({ createdAt: -1 }).limit(15);
        console.log("\nLast 15 Notifications:");
        list.forEach((n, index) => {
            console.log(`\n[Notification ${index + 1}]`);
            console.log(`  _id: ${n._id}`);
            console.log(`  title: "${n.title}"`);
            console.log(`  type: "${n.type}"`);
            console.log(`  category: "${n.category}"`);
            console.log(`  event: "${n.event}"`);
            console.log(`  entityType: "${n.entityType}"`);
            console.log(`  entityId: ${n.entityId}`);
            console.log(`  relatedId: ${n.relatedId}`);
            console.log(`  relatedModel: "${n.relatedModel}"`);
            console.log(`  redirectUrl: "${n.redirectUrl}"`);
            console.log(`  link: "${n.link}"`);
            console.log(`  action: "${n.action}"`);
            console.log(`  eventId: "${n.eventId}"`);
            console.log(`  read: ${n.read}`);
            console.log(`  isRead: ${n.isRead}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

auditNotifications();
