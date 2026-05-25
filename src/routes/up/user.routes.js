import express from 'express';
import * as userController from '../../controllers/up/user.controller.js';
import { protect } from '../../middlewares/token.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/search', userController.searchUsers);
router.get('/by-email', userController.getUserByEmail);
router.get('/:id', userController.getUserById);

export default router;
