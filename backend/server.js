
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('./routes/api/azureStrategy');
const authRoutes = require('./routes/api/auth');
const userRoutes = require('./routes/api/user');
const requestsRoutes = require('./routes/api/requests');
const path = require('path');
const { initDatabase } = require('./DB/mysql');

const app = express();
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true for HTTPS
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 1, // 1 hour
  },
}));


app.use(passport.initialize());
app.use(passport.session());


// Serve static files from "public"
app.use(express.static(path.join(__dirname, 'public')));


app.use('/auth', authRoutes); // 👈 Routes are modular

app.use('/api/user', userRoutes); // 👈 Routes are modular

app.use('/api/requests', requestsRoutes); // 👈 Routes are modular

const port = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// app.use('/api/users', require('./routes/api/users'));
// app.use('/api/forms', require('./routes/api/forms'));
// app.use('/api/responses', require('./routes/api/responses'));

// ...existing code...



// ...existing code...

(async () => {
  const db = await initDatabase();
  app.locals.db = db;

  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
})();