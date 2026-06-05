# EC2 Setup — GroupPay API

## Prerequisites

- EC2 instance (Ubuntu 22.04+) with SSH access
- Security group: inbound ports 22 (SSH), 5000 (API) or 80/443 if using reverse proxy
- Node.js 22.x installed

### Install Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v  # confirm v22.x
```

## Initial Deploy

```bash
# Clone repo
cd /home/ubuntu
git clone <repo-url> grouppay-api
cd grouppay-api

# Install deps
npm ci --omit=dev

# Create .env from example
cp .env.example .env
nano .env  # fill in production values
```

## systemd Service

Create `/etc/systemd/system/grouppay-api.service`:

```ini
[Unit]
Description=GroupPay API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/grouppay-api
EnvironmentFile=/home/ubuntu/grouppay-api/.env
ExecStart=/usr/bin/node --experimental-json-modules src/index.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable grouppay-api
sudo systemctl start grouppay-api

# Check status
sudo systemctl status grouppay-api
sudo journalctl -u grouppay-api -f  # tail logs
```

## CI/CD (GitHub Actions)

The workflow at `.github/workflows/deploy.yml` auto-deploys on push to `main`.

### Required GitHub Secrets

| Secret | Value |
|--------|-------|
| `EC2_HOST` | EC2 public IP or hostname |
| `EC2_USER` | SSH user (default: `ubuntu`) |
| `EC2_SSH_KEY` | Private SSH key (PEM contents) |

### How it works

1. SSH into EC2
2. `git pull` latest code
3. `npm ci --omit=dev` (fresh install)
4. Restart systemd service

## Useful Commands

```bash
sudo systemctl restart grouppay-api   # restart
sudo systemctl stop grouppay-api      # stop
sudo journalctl -u grouppay-api -n 50 # last 50 log lines
```

## Optional: Nginx Reverse Proxy

```bash
sudo apt install nginx -y
```

`/etc/nginx/sites-available/grouppay-api`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/grouppay-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```
