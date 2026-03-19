# 🌐 Network Test Panel - Ubuntu 22 Installation Guide

Et professionelt netværks test panel med brugerstyring, API integration og admin panel.

---

## 📋 Systemkrav

- **OS:** Ubuntu 22.04 LTS
- **RAM:** Minimum 1GB
- **Disk:** Minimum 5GB ledig plads
- **Netværk:** Port 3000 åben

---

## 🚀 Hurtig Installation

### Metode 1: Automatisk Installation

```bash
# 1. Download eller klon filerne til serveren
# 2. Gør install-scriptet eksekverbart
chmod +x install.sh

# 3. Kør installationen
sudo ./install.sh
```

### Metode 2: Manuel Installation

```bash
# Opdater systemet
sudo apt update && sudo apt upgrade -y

# Installer Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# Opret applikationsmappe
sudo mkdir -p /var/www/nettest-panel

# Kopier filerne
sudo cp -r server public /var/www/nettest-panel/

# Installer afhængigheder
cd /var/www/nettest-panel/server
sudo npm install

# Start serveren
sudo node server.js
```

---

## 📁 Filstruktur

```
nettest-panel/
├── server/
│   ├── server.js        # Hovedserver
│   ├── database.js      # SQLite database setup
│   ├── auth.js          # Autentificering
│   ├── testMethods.js   # Test metoder API
│   ├── apiEndpoints.js  # API endpoints
│   ├── networkTest.js   # Netværks test logik
│   └── package.json
├── public/
│   ├── index.html       # Frontend HTML
│   ├── css/
│   │   └── styles.css   # Styling
│   └── js/
│       └── app.js       # Frontend JavaScript
├── install.sh           # Installationsscript
└── README.md
```

---

## ⚙️ Konfiguration

### Ændre Port

Rediger `server/server.js`:
```javascript
const PORT = process.env.PORT || 3000;  // Ændr 3000 til din ønskede port
```

### Miljøvariabler

Opret `.env` fil i `server/` mappen:
```env
NODE_ENV=production
PORT=3000
JWT_SECRET=din_hemmelige_nøgle_her
```

---

## 🔐 Standard Login

Efter installation:

| Brugernavn | Adgangskode | Rolle |
|------------|-------------|-------|
| admin      | admin123    | Super Admin |

**Vigtigt:** Ændr adgangskoden efter første login!

---

## 🎯 API Endpoints

### Autentificering
```
POST /api/auth/login      # Login
POST /api/auth/register   # Opret bruger
GET  /api/auth/me         # Hent nuværende bruger
PUT  /api/auth/password   # Skift adgangskode
```

### Test Metoder
```
GET  /api/methods         # Alle metoder
GET  /api/methods/active  # Aktive metoder
POST /api/methods         # Opret metode (admin)
PUT  /api/methods/:id     # Opdater metode (admin)
DELETE /api/methods/:id   # Slet metode (admin)
```

### Netværks Test
```
POST /api/test            # Start test
GET  /api/test/history    # Test historik
GET  /api/statistics      # Statistikker
```

### Brugeradministration (Admin)
```
GET  /api/users           # Alle brugere
POST /api/users           # Opret bruger
PUT  /api/users/:id       # Opdater bruger
DELETE /api/users/:id     # Slet bruger
```

---

## 🛠️ Service Management

### Systemd Service

```bash
# Start
sudo systemctl start nettest-panel

# Stop
sudo systemctl stop nettest-panel

# Genstart
sudo systemctl restart nettest-panel

# Status
sudo systemctl status nettest-panel

# Logs
sudo journalctl -u nettest-panel -f
```

### PM2 (Alternativ)

```bash
# Start
pm2 start ecosystem.config.js

# Stop
pm2 stop nettest-panel

# Genstart
pm2 restart nettest-panel

# Logs
pm2 logs nettest-panel
```

---

## 🔒 Sikkerhed

### Firewall Opsætning

```bash
# Tillad nødvendige porte
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # App

# Aktiver firewall
sudo ufw enable
```

### SSL/HTTPS med Nginx (Anbefales)

```bash
# Installer Nginx
sudo apt install nginx certbot python3-certbot-nginx

# Opret Nginx config
sudo nano /etc/nginx/sites-available/nettest-panel
```

Nginx konfiguration:
```nginx
server {
    listen 80;
    server_name dit-domain.dk;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Aktiver site
sudo ln -s /etc/nginx/sites-available/nettest-panel /etc/nginx/sites-enabled/

# Test konfiguration
sudo nginx -t

# Genstart Nginx
sudo systemctl restart nginx

# Få SSL certifikat
sudo certbot --nginx -d dit-domain.dk
```

---

## 📊 Database

SQLite database oprettes automatisk i:
```
/var/www/nettest-panel/server/network_test.db
```

### Backup Database

```bash
# Opret backup
cp /var/www/nettest-panel/server/network_test.db ~/backup_$(date +%Y%m%d).db

# Eller med cron (daglig backup)
crontab -e
# Tilføj:
0 2 * * * cp /var/www/nettest-panel/server/network_test.db /backup/nettest_$(date +\%Y\%m\%d).db
```

---

## 🔧 Fejlfinding

### Server starter ikke

```bash
# Tjek logs
sudo journalctl -u nettest-panel -n 50

# Tjek om port er i brug
sudo lsof -i :3000

# Tjek filrettigheder
ls -la /var/www/nettest-panel/server/
```

### Database fejl

```bash
# Slet og genskab database (ADVARSEL: Sletter alt data!)
rm /var/www/nettest-panel/server/network_test.db
sudo systemctl restart nettest-panel
```

### Node.js problemer

```bash
# Verificer installation
node --version   # Skal vise v20.x
npm --version

# Geninstaller afhængigheder
cd /var/www/nettest-panel/server
rm -rf node_modules
npm install
```

---

## 📝 License

MIT License - Brug frit efter behov.

---

## 🆘 Support

For problemer eller spørgsmål, opret et issue på repositoryet.

---

**Velkommen til Network Test Panel! 🎉**