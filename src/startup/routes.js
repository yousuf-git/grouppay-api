import { StatusCodes } from 'http-status-codes';
import authRoutes from '../routes/up/auth.routes.js';
import groupRoutes from '../routes/up/group.routes.js';
import sceneRoutes from '../routes/up/scene.routes.js';
import depositRoutes from '../routes/up/deposit.routes.js';
import inviteRoutes from '../routes/up/invite.routes.js';
import notificationRoutes from '../routes/up/notification.routes.js';
import transactionRoutes from '../routes/up/transaction.routes.js';
import appealRoutes from '../routes/up/appeal.routes.js';
import fileRoutes from '../routes/up/file.routes.js';

const healthHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GroupPay Server Health Check</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            background: linear-gradient(135deg, #6c00ff, #8a2be2);
            color: #333;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            text-align: center;
        }
        .container {
            background-color: white;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
            border-radius: 12px;
            padding: 40px;
            max-width: 500px;
            width: 90%;
        }
        h1 { color: #6c00ff; }
        .status { font-size: 1.6rem; font-weight: bold; margin-top: 20px; }
        .status span { color: #4caf50; }
    </style>
</head>
<body>
    <div class="container">
        <h1>GroupPay API is Online</h1>
        <p>Your server is running smoothly and efficiently.</p>
        <div class="status">Status: <span>Operational</span></div>
    </div>
</body>
</html>
`;

export default function (app) {
  // Health check
  app.get('/', (req, res) => {
    res.send(healthHTML);
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
