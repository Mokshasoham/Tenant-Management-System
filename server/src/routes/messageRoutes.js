import express from 'express';
import * as messageController from '../controllers/messageController.js';
import { authenticate } from '../middleware/auth.js';
import { uploadChat } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.post('/', messageController.sendMessage);
router.get('/conversations', messageController.getConversations);
router.get('/available-users', messageController.getAvailableUsers);
router.get('/search', messageController.searchMessages);
router.get('/:otherUserId', messageController.getMessages);
router.put('/read/:senderId', messageController.markAsRead);
router.post('/upload', uploadChat.single('file'), messageController.uploadAttachment);
router.delete('/:messageId', messageController.deleteMessage);

export default router;
