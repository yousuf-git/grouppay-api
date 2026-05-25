import express from 'express';
import * as depositController from '../../controllers/up/deposit.controller.js';
import { protect } from '../../middlewares/token.middleware.js';
import { validate } from '../../middlewares/validators.middleware.js';
import * as depositValidator from '../../validators/up/deposit.validator.js';

const router = express.Router();

router.use(protect); // All deposit routes protected

router.get('/', depositController.getDeposits);
router.get('/:id', depositController.getDepositById);
router.post('/', validate(depositValidator.createDepositSchema), depositController.createDeposit);
router.patch('/:id/status', validate(depositValidator.updateDepositStatusSchema), depositController.updateDepositStatus);
router.patch('/:id', validate(depositValidator.updateDepositSchema), depositController.updateDeposit);

export default router;
