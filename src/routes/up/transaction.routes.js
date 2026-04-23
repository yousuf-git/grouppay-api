import express from 'express';
import * as transactionController from '../../controllers/up/transaction.controller.js';
import { protect } from '../../middlewares/token.middleware.js';

const router = express.Router();

router.use(protect); // All transaction routes protected

router.get('/', transactionController.getTransactions);
router.get('/summary/:groupId', transactionController.getGroupSummary);

export default router;
