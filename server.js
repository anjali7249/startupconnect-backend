const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// IMPORTANT: Replace this with YOUR connection string from Step 3
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_tj1SGhm7DzTe@ep-polished-term-adb5ap1u-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: { rejectUnauthorized: false }
});

// Test connection
pool.connect((err, client, release) => {
    if (err) {
        return console.error('❌ Error connecting to Neon:', err.stack);
    }
    console.log('✅ Connected to Neon Database');
    release();
});

// ==================== LOGIN ====================
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 AND password = $2',
            [username, password]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        delete user.password;
        
        res.json({ success: true, user });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== USERS ====================
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, role, name, email, phone, location FROM users');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const { username, password, role, name, email, phone, location } = req.body;
        const result = await pool.query(
            'INSERT INTO users (username, password, role, name, email, phone, location) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [username, password, role, name, email, phone, location]
        );
        const user = result.rows[0];
        delete user.password;
        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { name, email, phone, location } = req.body;
        const result = await pool.query(
            'UPDATE users SET name = $1, email = $2, phone = $3, location = $4 WHERE id = $5 RETURNING *',
            [name, email, phone, location, req.params.id]
        );
        const user = result.rows[0];
        delete user.password;
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== STARTUPS ====================
app.get('/api/startups', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM startups ORDER BY date_registered DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/startups', async (req, res) => {
    try {
        const { name, description, category, funding_amount, funding_stage, registered_by, website, tags, status } = req.body;
        const result = await pool.query(
            'INSERT INTO startups (name, description, category, funding_amount, funding_stage, registered_by, website, tags, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [name, description, category, funding_amount, funding_stage, registered_by, website, tags || [], status || 'active']
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/startups/:id', async (req, res) => {
    try {
        const { name, description, category, funding_amount, funding_stage, website, tags, status } = req.body;
        const result = await pool.query(
            'UPDATE startups SET name = $1, description = $2, category = $3, funding_amount = $4, funding_stage = $5, website = $6, tags = $7, status = $8 WHERE id = $9 RETURNING *',
            [name, description, category, funding_amount, funding_stage, website, tags, status, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/startups/:id', async (req, res) => {
    try {
        const startup = await pool.query('SELECT name FROM startups WHERE id = $1', [req.params.id]);
        if (startup.rows.length > 0) {
            await pool.query('DELETE FROM interests WHERE startup_name = $1', [startup.rows[0].name]);
        }
        await pool.query('DELETE FROM startups WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== INTERESTS ====================
app.get('/api/interests', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM interests ORDER BY date DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/interests', async (req, res) => {
    try {
        const { startup_name, investor_name, investor_email, investor_username, investment_amount, message } = req.body;
        const result = await pool.query(
            'INSERT INTO interests (startup_name, investor_name, investor_email, investor_username, investment_amount, message) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [startup_name, investor_name, investor_email, investor_username, investment_amount, message]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/interests/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const result = await pool.query(
            'UPDATE interests SET status = $1 WHERE id = $2 RETURNING *',
            [status, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/interests/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM interests WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== START SERVER ====================
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('📊 Try accessing: http://localhost:3000/api/startups');
});
