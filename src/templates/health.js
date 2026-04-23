export const getHealthHTML = (metrics) => {
  const isDev = metrics.env === 'development';
  const isConnected = metrics.dbStatus === 'Connected';
  const statusColor = isConnected ? '#10b981' : '#f43f5e';
  const statusGlow = isConnected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)';
  const statusText = isConnected ? 'All Endpoints Operational' : 'Endpoints Degraded';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Status | GroupPay API</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🛡️</text></svg>">
    <style>
        :root {
            --primary: #6366f1;
            --success: #10b981;
            --danger: #f43f5e;
            --warning: #f59e0b;
            --bg: #0f172a;
            --text-main: #f1f5f9;
            --text-muted: #94a3b8;
            --card-bg: #1e293b;
            --border: #334155;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: var(--bg);
            color: var(--text-main);
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            -webkit-font-smoothing: antialiased;
        }

        .status-container {
            width: 100%;
            max-width: 650px;
            padding: 2rem;
            animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 2rem;
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 800;
            font-size: 1.5rem;
            letter-spacing: -0.025em;
            color: #fff;
        }

        .logo-icon {
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, var(--primary), #818cf8);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.1rem;
            box-shadow: 0 0 15px rgba(99, 102, 241, 0.4);
        }

        .env-badge {
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            background: var(--border);
            color: var(--text-muted);
            border: 1px solid rgba(255,255,255,0.05);
        }

        .main-status-banner {
            background-color: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 1.5rem;
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 2rem;
            backdrop-filter: blur(10px);
        }

        .status-pulse {
            width: 10px;
            height: 10px;
            background-color: ${statusColor};
            border-radius: 50%;
            box-shadow: 0 0 12px ${statusColor};
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 ${statusGlow}; }
            70% { box-shadow: 0 0 0 10px rgba(0,0,0,0); }
            100% { box-shadow: 0 0 0 0 rgba(0,0,0,0); }
        }

        .status-text {
            font-weight: 600;
            font-size: 1.1rem;
            color: #fff;
        }

        .components-card {
            background: var(--card-bg);
            border-radius: 16px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            border: 1px solid var(--border);
        }

        .component-item {
            padding: 1.25rem 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid var(--border);
        }

        .component-item:last-child {
            border-bottom: none;
        }

        .component-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .component-name {
            font-weight: 600;
            font-size: 0.95rem;
            color: #fff;
        }

        .component-desc {
            font-size: 0.8rem;
            color: var(--text-muted);
        }

        .component-status {
            font-size: 0.75rem;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 6px;
            text-transform: uppercase;
            letter-spacing: 0.025em;
        }

        .status-up { color: var(--success); background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); }
        .status-down { color: var(--danger); background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.2); }

        .metrics-section {
            margin-top: 2rem;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
        }

        .metric-box {
            background: var(--card-bg);
            padding: 1.25rem;
            border-radius: 12px;
            border: 1px solid var(--border);
            transition: transform 0.2s ease;
        }

        .metric-box:hover {
            transform: translateY(-2px);
            border-color: var(--primary);
        }

        .metric-label {
            font-size: 0.7rem;
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
            margin-bottom: 8px;
            letter-spacing: 0.05em;
        }

        .metric-value {
            font-weight: 600;
            font-size: 1rem;
            color: #fff;
        }

        .footer {
            margin-top: 2rem;
            text-align: center;
            font-size: 0.75rem;
            color: var(--text-muted);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            flex-wrap: wrap;
        }

        .last-update {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 0;
        }

        .dot {
            width: 3px;
            height: 3px;
            background: var(--border);
            border-radius: 50%;
        }

        @media (max-width: 640px) {
            .metrics-section {
                grid-template-columns: 1fr;
            }
            
            .footer {
                gap: 8px;
                font-size: 0.7rem;
            }
        }
    </style>
</head>
<body>
    <div class="status-container">
        <div class="header">
            <div class="logo">
                <div class="logo-icon">G</div>
                GroupPay API
            </div>
            <div class="env-badge">${metrics.env}</div>
        </div>

        <div class="main-status-banner">
            <div class="status-pulse"></div>
            <div class="status-text">${statusText}</div>
        </div>

        <div class="components-card">
            <div class="component-item">
                <div class="component-info">
                    <span class="component-name">API Server</span>
                    <span class="component-desc">Express Cluster • Node.js</span>
                </div>
                <span class="component-status status-up">Operational</span>
            </div>
            <div class="component-item">
                <div class="component-info">
                    <span class="component-name">Database</span>
                    <span class="component-desc">Supabase Postgres Instance</span>
                </div>
                <span class="component-status ${isConnected ? 'status-up' : 'status-down'}">
                    ${isConnected ? 'Connected' : 'Degraded'}
                </span>
            </div>
            <div class="component-item">
                <div class="component-info">
                    <span class="component-name">Authentication</span>
                    <span class="component-desc">JWT Identity Provider</span>
                </div>
                <span class="component-status status-up">Active</span>
            </div>
        </div>

        <div class="metrics-section">
            <div class="metric-box">
                <div class="metric-label">System Uptime</div>
                <div id="uptime-counter" class="metric-value">Calculated...</div>
            </div>
            <div class="metric-box">
                <div class="metric-label">Memory Usage</div>
                <div class="metric-value">${metrics.memory}</div>
            </div>
            <div class="metric-box">
                <div class="metric-label">Node Version</div>
                <div class="metric-value">${metrics.nodeVersion}</div>
            </div>
            <div class="metric-box">
                <div class="metric-label">Platform</div>
                <div class="metric-value">${metrics.platform}</div>
            </div>
        </div>

        <div class="footer">
            <div class="last-update">
                Checked at ${new Date().toLocaleTimeString()}
                <span class="dot"></span>
                API v1.0.0
            </div>
            <span class="dot"></span>
            &copy; ${new Date().getFullYear()} GroupPay
            <span class="dot"></span>
            Developed by <a href="https://yousuf-dev.com" target="_blank" style="color: var(--primary); text-decoration: none; font-weight: 600;">M. Yousuf</a>
        </div>
    </div>

    <script>
        (function() {
            const startTime = ${metrics.serverStartTime};
            const uptimeElement = document.getElementById('uptime-counter');
            if (!uptimeElement) return;

            function updateUptime() {
                const diffInSeconds = Math.floor((Date.now() - startTime) / 1000);
                const hours = Math.floor(diffInSeconds / 3600);
                const minutes = Math.floor((diffInSeconds % 3600) / 60);
                const seconds = diffInSeconds % 60;
                uptimeElement.innerText = hours + 'h ' + minutes + 'm ' + seconds + 's';
            }

            setInterval(updateUptime, 1000);
            updateUptime();
        })();
    </script>
</body>
</html>
`;
};
