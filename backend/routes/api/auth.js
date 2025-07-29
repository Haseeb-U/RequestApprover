// auth/routes.js
const express = require('express');
const passport = require('./azureStrategy');

const router = express.Router();

// Microsoft login
router.get('/login', passport.authenticate('azuread-openidconnect'));

// Microsoft callback
router.get(
  '/callback',
  passport.authenticate('azuread-openidconnect', {
    failureRedirect: '/',
  }),
  (req, res) => {
    res.redirect('/'); // Redirect to home after successful login
  }
);

// Logout route
router.get('/logout', (req, res) => {
  req.logout(function(err) {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).send('Logout failed');
    }
    req.session.destroy(() => {
      res.clearCookie('connect.sid'); // Clear session cookie (if using express-session)
      res.redirect('/'); // Redirect to home after logout
    });
  });
});

module.exports = router;
