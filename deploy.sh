#!/bin/bash
# RetailPro - Ubuntu VPS Automated Deployment Script
set -e

echo "🚀 Starting RetailPro Deployment..."

# 1. Update Packages
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx postgresql postgresql-contrib certbot python3-certbot-nginx

# 2. Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install PM2 process manager
sudo npm install -g pm2

# 4. Clone or Pull Repository
if [ ! -d "/var/www/retail-app" ]; then
  sudo git clone https://github.com/your-org/retail-app.git /var/www/retail-app
  sudo chown -R $USER:$USER /var/www/retail-app
fi

cd /var/www/retail-app

# 5. Install Dependencies & Build
npm install
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
npm run build

# 6. Start PM2 Process
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✅ RetailPro Deployment Successful!"
