import express from 'express';
import * as accountController from '../../controllers/up/account.controller.js';
import { protect } from '../../middlewares/token.middleware.js';
import { validate } from '../../middlewares/validators.middleware.js';
import * as accountValidator from '../../validators/up/account.validator.js';

const router = express.Router();

router.use(protect);

router.get('/', accountController.getAccounts);
router.get('/:id', accountController.getAccountById);
router.post('/', validate(accountValidator.createAccountSchema), accountController.createAccount);
router.patch('/:id', validate(accountValidator.updateAccountSchema), accountController.updateAccount);
router.delete('/:id', accountController.deleteAccount);

export default router;
