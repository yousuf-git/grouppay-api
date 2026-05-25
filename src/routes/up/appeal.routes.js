import express from 'express';
import * as appealController from '../../controllers/up/appeal.controller.js';
import { protect } from '../../middlewares/token.middleware.js';
import { validate } from '../../middlewares/validators.middleware.js';
import * as appealValidator from '../../validators/up/appeal.validator.js';

const router = express.Router();

router.use(protect); // All appeal routes protected

router.get('/', appealController.getAppeals);
router.post('/', validate(appealValidator.createAppealSchema), appealController.createAppeal);
router.get('/:id', appealController.getAppealById);
router.patch('/:id', validate(appealValidator.updateAppealSchema), appealController.updateAppeal);
router.delete('/:id', appealController.deleteAppeal);

export default router;
