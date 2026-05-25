import express from 'express';
import * as balanceController from '../../controllers/up/balance.controller.js';
import { protect } from '../../middlewares/token.middleware.js';
import { validate } from '../../middlewares/validators.middleware.js';
import * as balanceValidator from '../../validators/up/balance.validator.js';

const router = express.Router();

router.use(protect);

router.get('/stats', balanceController.getBalanceStats);
router.get('/', balanceController.getBalances);
router.get('/:id', balanceController.getBalanceById);
router.post('/', validate(balanceValidator.createBalanceSchema), balanceController.createBalance);
router.patch('/:id', validate(balanceValidator.updateBalanceSchema), balanceController.updateBalance);
router.delete('/:id', balanceController.deleteBalance);

export default router;
