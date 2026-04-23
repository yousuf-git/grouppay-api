import express from 'express';
import multer from 'multer';
import * as fileController from '../../controllers/up/file.controller.js';
import { protect } from '../../middlewares/token.middleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(protect);

router.post('/upload', upload.single('file'), fileController.uploadSingleFile);

export default router;
