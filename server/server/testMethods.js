const db = require('./database');

// Get all test methods
function getAllMethods(req, res) {
  db.all('SELECT * FROM test_methods ORDER BY id', [], (err, methods) => {
    if (err) {
      return res.status(500).json({ error: 'Database fejl.' });
    }
    res.json(methods);
  });
}

// Get active test methods
function getActiveMethods(req, res) {
  db.all('SELECT * FROM test_methods WHERE is_active = 1 ORDER BY id', [], (err, methods) => {
    if (err) {
      return res.status(500).json({ error: 'Database fejl.' });
    }
    res.json(methods);
  });
}

// Get single test method
function getMethod(req, res) {
  const { id } = req.params;
  db.get('SELECT * FROM test_methods WHERE id = ?', [id], (err, method) => {
    if (err) {
      return res.status(500).json({ error: 'Database fejl.' });
    }
    if (!method) {
      return res.status(404).json({ error: 'Test metode ikke fundet.' });
    }
    res.json(method);
  });
}

// Create test method (admin only)
function createMethod(req, res) {
  const { name, description, icon, color, is_active } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Metode navn er påkrævet.' });
  }

  db.run(
    'INSERT INTO test_methods (name, description, icon, color, is_active) VALUES (?, ?, ?, ?, ?)',
    [name, description || '', icon || '🔧', color || '#8b5cf6', is_active !== undefined ? (is_active ? 1 : 0) : 1],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Fejl ved oprettelse af test metode.' });
      }
      db.get('SELECT * FROM test_methods WHERE id = ?', [this.lastID], (err, method) => {
        if (err) {
          return res.status(500).json({ error: 'Fejl ved hentning af test metode.' });
        }
        res.status(201).json(method);
      });
    }
  );
}

// Update test method (admin only)
function updateMethod(req, res) {
  const { id } = req.params;
  const { name, description, icon, color, is_active } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Metode navn er påkrævet.' });
  }

  db.run(
    'UPDATE test_methods SET name = ?, description = ?, icon = ?, color = ?, is_active = ? WHERE id = ?',
    [name, description || '', icon || '🔧', color || '#8b5cf6', is_active !== undefined ? (is_active ? 1 : 0) : 1, id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Fejl ved opdatering af test metode.' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Test metode ikke fundet.' });
      }
      db.get('SELECT * FROM test_methods WHERE id = ?', [id], (err, method) => {
        if (err) {
          return res.status(500).json({ error: 'Fejl ved hentning af test metode.' });
        }
        res.json(method);
      });
    }
  );
}

// Delete test method (admin only)
function deleteMethod(req, res) {
  const { id } = req.params;

  db.run('DELETE FROM test_methods WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Fejl ved sletning af test metode.' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Test metode ikke fundet.' });
    }
    res.json({ message: 'Test metode slettet succesfuldt!' });
  });
}

// Get method with endpoint count
function getMethodsWithStats(req, res) {
  const query = `
    SELECT tm.*, 
           (SELECT COUNT(*) FROM api_endpoints WHERE method_id = tm.id) as endpoint_count
    FROM test_methods tm
    ORDER BY tm.id
  `;
  db.all(query, [], (err, methods) => {
    if (err) {
      return res.status(500).json({ error: 'Database fejl.' });
    }
    res.json(methods);
  });
}

module.exports = {
  getAllMethods,
  getActiveMethods,
  getMethod,
  createMethod,
  updateMethod,
  deleteMethod,
  getMethodsWithStats
};