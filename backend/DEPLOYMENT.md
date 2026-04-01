# Standard VPS Deployment Guide

## Quick Start

1. **Copy .env file** (if not exists):
   ```bash
   cp env.example .env
   ```

2. **Edit .env file** with your configuration:
   ```bash
   nano .env
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start with PM2**:
   ```bash
   pm2 start server.js --name Appzeto-Backend
   ```

5. **Save PM2 configuration** (auto-start on reboot):
   ```bash
   pm2 save
   pm2 startup
   ```

## Common Commands

```bash
# Start
pm2 start server.js --name Appzeto-Backend

# Restart
pm2 restart Appzeto-Backend

# Stop
pm2 stop Appzeto-Backend

# View logs
pm2 logs Appzeto-Backend

# View status
pm2 status
```

## Updating Environment Variables

1. Edit `.env` file
2. Restart: `pm2 restart Appzeto-Backend`

That's it! Standard Node.js deployment.

