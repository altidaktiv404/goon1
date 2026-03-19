const db = require('./database');

// Get all API endpoints (admin only)
function getAllEndpoints(req, res) {
  const query = `
    SELECT ae.*, tm.name as method_name
    FROM api_endpoints ae
    LEFT JOIN test_methods tm ON ae.method_id = tm.id
    ORDER BY ae.method_id, ae.priority
  `;
  db.all(query, [], (err, endpoints) => {
    if (err) {
      return res.status(500).json({ error: 'Database fejl.' });
    }
    // Mask API keys for security
    const maskedEndpoints = endpoints.map(ep => ({
      ...ep,
      api_key: ep.api_key ? ep.api_key.substring(0, 8) + '****' : null
    }));
    res.json(maskedEndpoints);
  });
}

// Get endpoints by method
function getEndpointsByMethod(req, res) {
  const { methodId } = req.params;
  db.all('SELECT * FROM api_endpoints WHERE method_id = ? AND is_active = 1 ORDER BY priority', [methodId], (err, endpoints) => {
    if (err) {
      return res.status(500).json({ error: 'Database fejl.' });
    }
    const maskedEndpoints = endpoints.map(ep => ({
      ...ep,
      api_key: ep.api_key ? ep.api_key.substring(0, 8) + '****' : null
    }));
    res.json(maskedEndpoints);
  });
}

// Get single endpoint
function getEndpoint(req, res) {
  const { id } = req.params;
  db.get('SELECT * FROM api_endpoints WHERE id = ?', [id], (err, endpoint) => {
    if (err) {
      return res.status(500).json({ error: 'Database fejl.' });
    }
    if (!endpoint) {
      return res.status(404).json({ error: 'API endpoint ikke fundet.' });
    }
    endpoint.api_key = endpoint.api_key ? endpoint.api_key.substring(0, 8) + '****' : null;
    res.json(endpoint);
  });
}

// Create API endpoint (admin only)
function createEndpoint(req, res) {
  const { method_id, api_url, username, api_key, priority, is_active } = req.body;

  if (!api_url) {
    return res.status(400).json({ error: 'API URL er påkrævet.' });
  }

  db.run(
    'INSERT INTO api_endpoints (method_id, api_url, username, api_key, priority, is_active) VALUES (?, ?, ?, ?, ?, ?)',
    [method_id || null, api_url, username || null, api_key || null, priority || 1, is_active !== undefined ? (is_active ? 1 : 0) : 1],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Fejl ved oprettelse af API endpoint.' });
      }
      db.get('SELECT * FROM api_endpoints WHERE id = ?', [this.lastID], (err, endpoint) => {
        if (err) {
          return res.status(500).json({ error: 'Fejl ved hentning af API endpoint.' });
        }
        endpoint.api_key = endpoint.api_key ? endpoint.api_key.substring(0, 8) + '****' : null;
        res.status(201).json(endpoint);
      });
    }
  );
}

// Update API endpoint (admin only)
function updateEndpoint(req, res) {
  const { id } = req.params;
  const { method_id, api_url, username, api_key, priority, is_active } = req.body;

  if (!api_url) {
    return res.status(400).json({ error: 'API URL er påkrævet.' });
  }

  // First get the existing endpoint to preserve api_key if not provided
  db.get('SELECT * FROM api_endpoints WHERE id = ?', [id], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: 'Database fejl.' });
    }
    if (!existing) {
      return res.status(404).json({ error: 'API endpoint ikke fundet.' });
    }

    const finalApiKey = api_key || existing.api_key;

    db.run(
      'UPDATE api_endpoints SET method_id = ?, api_url = ?, username = ?, api_key = ?, priority = ?, is_active = ? WHERE id = ?',
      [method_id || null, api_url, username || null, finalApiKey, priority || 1, is_active !== undefined ? (is_active ? 1 : 0) : 1, id],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Fejl ved opdatering af API endpoint.' });
        }
        db.get('SELECT * FROM api_endpoints WHERE id = ?', [id], (err, endpoint) => {
          if (err) {
            return res.status(500).json({ error: 'Fejl ved hentning af API endpoint.' });
          }
          endpoint.api_key = endpoint.api_key ? endpoint.api_key.substring(0, 8) + '****' : null;
          res.json(endpoint);
        });
      }
    );
  });
}

// Delete API endpoint (admin only)
function deleteEndpoint(req, res) {
  const { id } = req.params;

  db.run('DELETE FROM api_endpoints WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Fejl ved sletning af API endpoint.' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'API endpoint ikke fundet.' });
    }
    res.json({ message: 'API endpoint slettet succesfuldt!' });
  });
}

module.exports = {
  getAllEndpoints,
  getEndpointsByMethod,
  getEndpoint,
  createEndpoint,
  updateEndpoint,
  deleteEndpoint
};