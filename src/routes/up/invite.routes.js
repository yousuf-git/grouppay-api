import express from 'express';
import * as inviteController from '../../controllers/up/invite.controller.js';
import { protect } from '../../middlewares/token.middleware.js';
import { validate } from '../../middlewares/validators.middleware.js';
import * as inviteValidator from '../../validators/up/invite.validator.js';

const router = express.Router();

router.use(protect); // All invite routes protected

router.get('/received', inviteController.getReceivedInvites);
router.get('/sent', inviteController.getSentInvites);
router.post('/', validate(inviteValidator.sendInviteSchema), inviteController.sendInvite);
router.patch('/:id/status', validate(inviteValidator.updateInviteStatusSchema), inviteController.updateInviteStatus);
router.delete('/:id', inviteController.cancelInvite);

export default router;
