const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./database');

const JWT_SECRET = 'network_test_panel_secret_key_2024';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Adgang nægtet. Log venligst ind.' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(403).json({ error: 'Ugyldig eller udløbet token.' });
  }

  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Admin adgang påkrævet.' });
  }
  next();
}

function requireSuperAdmin(req, res, next) {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin adgang påkrævet.' });
  }
  next();
}

// Login
function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Brugernavn og adgangskode er påkrævet.' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database fejl.' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Ugyldigt brugernavn eller adgangskode.' });
    }

    if (user.is_blocked) {
      return res.status(403).json({ error: 'Din konto er blevet blokeret.' });
    }

    if (!comparePassword(password, user.password)) {
      return res.status(401).json({ error: 'Ugyldigt brugernavn eller adgangskode.' });
    }

    // Update last login
    db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    const token = generateToken(user);
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login succesfuld!',
      token,
      user: userWithoutPassword
    });
  });
}

// Register
function register(req, res) {
  const { username, password, email } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Brugernavn og adgangskode er påkrævet.' });
  }

  if (username.length < 3) {
    return res.status(400).json({ error: 'Brugernavn skal være mindst 3 tegn.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Adgangskode skal være mindst 6 tegn.' });
  }

  const hashedPassword = hashPassword(password);

  db.run(
    'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
    [username, email || null, hashedPassword],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Brugernavnet er allerede i brug.' });
        }
        return res.status(500).json({ error: 'Fejl ved oprettelse af bruger.' });
      }

      db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Fejl ved hentning af bruger.' });
        }

        const token = generateToken(user);
        const { password: _, ...userWithoutPassword } = user;

        res.status(201).json({
          message: 'Konto oprettet succesfuldt!',
          token,
          user: userWithoutPassword
        });
      });
    }
  );
}

// Get current user
function getCurrentUser(req, res) {
  db.get('SELECT id, username, email, role, plan_type, credits_used, credit_limit, plan_expires_at, created_at, last_login FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database fejl.' });
    }
    if (!user) {
      return res.status(404).json({ error: 'Bruger ikke fundet.' });
    }
    res.json(user);
  });
}

// Change password
function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Nuværende og ny adgangskode er påkrævet.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Ny adgangskode skal være mindst 6 tegn.' });
  }

  db.get('SELECT password FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database fejl.' });
    }

    if (!comparePassword(currentPassword, user.password)) {
      return res.status(400).json({ error: 'Nuværende adgangskode er forkert.' });
    }

    const hashedPassword = hashPassword(newPassword);
    db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Fejl ved opdatering af adgangskode.' });
      }
      res.json({ message: 'Adgangskode ændret succesfuldt!' });
    });
  });
}

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  authenticateToken,
  requireAdmin,
  requireSuperAdmin,
  login,
  register,
  getCurrentUser,
  changePassword
};