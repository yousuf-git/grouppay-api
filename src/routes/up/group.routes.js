import express from 'express';
import * as groupController from '../../controllers/up/group.controller.js';
import { protect } from '../../middlewares/token.middleware.js';
import { validate } from '../../middlewares/validators.middleware.js';
import * as groupValidator from '../../validators/up/group.validator.js';

const router = express.Router();

router.use(protect); // All group routes protected

router.get('/', groupController.getUserGroups);
router.get('/:id', groupController.getGroupById);
router.get('/:id/members', groupController.getGroupMembers);
router.get('/:id/my-balance', groupController.getMyGroupBalance);
router.post('/', validate(groupValidator.createGroupSchema), groupController.createGroup);
router.patch('/:id', validate(groupValidator.updateGroupSchema), groupController.updateGroup);
router.post('/:id/star', validate(groupValidator.toggleStarSchema), groupController.toggleStarGroup);
router.delete('/:id/leave', groupController.leaveGroup);
router.delete('/:id', groupController.deleteGroup);
router.patch('/:id/members/:personId/role', validate(groupValidator.updateMemberRoleSchema), groupController.updateMemberRole);
router.delete('/:id/members/:personId', groupController.removeMember);

export default router;
