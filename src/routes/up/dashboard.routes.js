import express from 'express';
import * as dashboardController from '../../controllers/up/dashboard.controller.js';
import { protect } from '../../middlewares/token.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/', dashboardController.getDashboard);

export default router;
