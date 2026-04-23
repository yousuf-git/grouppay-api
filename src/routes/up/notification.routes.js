import express from 'express';
import * as notificationController from '../../controllers/up/notification.controller.js';
import { protect } from '../../middlewares/token.middleware.js';

const router = express.Router();

router.use(protect); // All notification routes protected

router.get('/', notificationController.getNotifications);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);

export default router;
