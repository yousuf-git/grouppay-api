import { StatusCodes } from 'http-status-codes';
import { supabase } from '../database/database.js';
import { getHealthHTML } from '../templates/health.js';
import authRoutes from '../routes/up/auth.routes.js';
import groupRoutes from '../routes/up/group.routes.js';
import sceneRoutes from '../routes/up/scene.routes.js';
import depositRoutes from '../routes/up/deposit.routes.js';
import inviteRoutes from '../routes/up/invite.routes.js';
import notificationRoutes from '../routes/up/notification.routes.js';
import transactionRoutes from '../routes/up/transaction.routes.js';
import appealRoutes from '../routes/up/appeal.routes.js';
import fileRoutes from '../routes/up/file.routes.js';

export default function (app) {
  // Health check with realtime metrics
  app.get('/', async (req, res) => {
    // Gather metrics
    const uptimeSeconds = process.uptime();
    const serverStartTime = Date.now() - (uptimeSeconds * 1000);
    
    const memoryData = process.memoryUsage();
    const memory = `${Math.round(memoryData.heapUsed / 1024 / 1024)}MB / ${Math.round(memoryData.heapTotal / 1024 / 1024)}MB`;

    let dbStatus = 'Connected';
    try {
        const { error } = await supabase.from('person').select('person_id').limit(1);
        if (error) dbStatus = 'Disconnected';
    } catch (e) {
        dbStatus = 'Error';
    }

    const metrics = {
        serverStartTime,
        memory,
        dbStatus,
        nodeVersion: process.version,
        platform: process.platform,
        env: process.env.NODE_ENV || 'development'
    };

    res.send(getHealthHTML(metrics));
  });

  // API Routes
  app.use('/api/up/auth', authRoutes);
  app.use('/api/up/groups', groupRoutes);
  app.use('/api/up/scenes', sceneRoutes);
  app.use('/api/up/deposits', depositRoutes);
  app.use('/api/up/invites', inviteRoutes);
  app.use('/api/up/notifications', notificationRoutes);
  app.use('/api/up/transactions', transactionRoutes);
  app.use('/api/up/appeals', appealRoutes);
  app.use('/api/up/files', fileRoutes);
}
