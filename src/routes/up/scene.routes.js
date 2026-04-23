import express from 'express';
import * as sceneController from '../../controllers/up/scene.controller.js';
import { protect } from '../../middlewares/token.middleware.js';
import { validate } from '../../middlewares/validators.middleware.js';
import * as sceneValidator from '../../validators/up/scene.validator.js';

const router = express.Router();

router.use(protect); // All scene routes protected

router.get('/', sceneController.getUserScenes);
router.get('/:id', sceneController.getSceneById);
router.post('/', validate(sceneValidator.createSceneSchema), sceneController.createScene);
router.delete('/:id', sceneController.deleteScene);

export default router;
