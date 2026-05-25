import express from 'express';
import * as expenseController from '../../controllers/up/expense.controller.js';
import { protect } from '../../middlewares/token.middleware.js';
import { validate } from '../../middlewares/validators.middleware.js';
import * as expenseValidator from '../../validators/up/expense.validator.js';

const router = express.Router();

router.use(protect);

router.get('/stats', expenseController.getExpenseStats);
router.get('/', expenseController.getExpenses);
router.get('/:id', expenseController.getExpenseById);
router.post('/', validate(expenseValidator.createExpenseSchema), expenseController.createExpense);
router.put('/:id', validate(expenseValidator.updateExpenseSchema), expenseController.updateExpense);
router.delete('/:id', expenseController.deleteExpense);

export default router;
