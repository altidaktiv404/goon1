#!/bin/bash

# ========================================
# NETWORK TEST PANEL - Ubuntu 22 Installer
# ========================================

echo "=========================================="
echo "  Network Test Panel - Ubuntu 22 Setup"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Kør venligst som root: sudo bash install.sh"
  exit 1
fi

# Update system
echo "[1/6] Opdaterer system..."
apt update && apt upgrade -y

# Install Node.js 20.x
echo "[2/6] Installerer Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify Node.js installation
node --version
npm --version

# Install PM2 for process management
echo "[3/6] Installerer PM2..."
npm install -g pm2

# Create application directory
echo "[4/6] Opretter applikationsmappe..."
APP_DIR="/var/www/nettest-panel"
mkdir -p $APP_DIR

# Copy files (if running from setup directory)
if [ -d "./server" ]; then
  cp -r ./server $APP_DIR/
  cp -r ./public $APP_DIR/
  cp -r ./install.sh $APP_DIR/ 2>/dev/null || true
else
  echo "Advarsel: Ingen filer fundet. Kopier manuelt til $APP_DIR"
fi

# Install npm dependencies
echo "[5/6] Installerer npm afhængigheder..."
cd $APP_DIR/server
npm install

# Set permissions
echo "[6/6] Sætter rettigheder..."
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR
chmod 600 $APP_DIR/server/*.js

# Create PM2 ecosystem file
cat > $APP_DIR/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'nettest-panel',
    cwd: '/var/www/nettest-panel/server',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# Create systemd service for auto-start
cat > /etc/systemd/system/nettest-panel.service << 'EOF'
[Unit]
Description=Network Test Panel
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/nettest-panel/server
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=nettest-panel
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
systemctl daemon-reload
systemctl enable nettest-panel
systemctl start nettest-panel

# Configure firewall
echo ""
echo "Konfigurerer firewall..."
ufw allow 3000/tcp
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Show status
echo ""
echo "=========================================="
echo "  INSTALLATION KOMPLET!"
echo "=========================================="
echo ""
echo "Applikationen kører på: http://SERVER_IP:3000"
echo ""
echo "Standard login:"
echo "  Brugernavn: admin"
echo "  Adgangskode: admin123"
echo ""
echo "Nyttige kommandoer:"
echo "  Status:    systemctl status nettest-panel"
echo "  Stop:      systemctl stop nettest-panel"
echo "  Start:     systemctl start nettest-panel"
echo "  Logs:      journalctl -u nettest-panel -f"
echo ""
echo "Database placering: $APP_DIR/server/network_test.db"
echo "=========================================="