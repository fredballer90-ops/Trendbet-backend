// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Datastore = require('nedb-promises');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize NeDB (creates local DB files)
const users = Datastore.create({ filename: './data/users.db', autoload: true });

// Example route
app.get('/', (req, res) => {
  res.send('TrendBet backend running with NeDB (offline mode)');
});

// Example user signup route
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  const existing = await users.findOne({ username });
  if (existing) return res.status(400).json({ message: 'User already exists' });
  const user = await users.insert({ username, password });
  res.json(user);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
