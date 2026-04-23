import express from 'express';
import * as groupController from '../../controllers/up/group.controller.js';
import { protect } from '../../middlewares/token.middleware.js';
import { validate } from '../../middlewares/validators.middleware.js';
import * as groupValidator from '../../validators/up/group.validator.js';

const router = express.Router();

router.use(protect); // All group routes protected

router.get('/', groupController.getUserGroups);
router.get('/:id', groupController.getGroupById);
router.post('/', validate(groupValidator.createGroupSchema), groupController.createGroup);
router.patch('/:id', validate(groupValidator.updateGroupSchema), groupController.updateGroup);
router.post('/:id/star', validate(groupValidator.toggleStarSchema), groupController.toggleStarGroup);
router.delete('/:id/leave', groupController.leaveGroup);

export default router;
