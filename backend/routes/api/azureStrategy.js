// auth/azureStrategy.js
const passport = require('passport');
const { OIDCStrategy } = require('passport-azure-ad');
require('dotenv').config();

passport.use(
  new OIDCStrategy(
    {
      identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0/.well-known/openid-configuration`,
      clientID: process.env.AZURE_CLIENT_ID,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
      responseType: 'code',
      responseMode: 'query',
      redirectUrl: process.env.AZURE_REDIRECT_URI,
      allowHttpForRedirectUrl: true,
      scope: ['profile', 'email', 'openid'],
      passReqToCallback: true, // 👈 Add this line
    },
    async(req, issuer, subject, profile, accessToken, refreshToken, done) => {
      // 👇 Here you can store or update the user in DB
      // Example usage in a route
      // const db = req.app.locals.db;
      // const [rows] = await db.query('SELECT 1');
      // console.log('Microsoft 365 profile:', profile);
      // return done(null, profile);

      try {
        const db = req.app.locals.db; // Now you can access it
        const email = profile._json.preferred_username || profile._json.email || profile.email;
        const name = profile.displayName || profile.name || '';

        await db.query(
          `INSERT INTO users (name, email) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name)`,
          [name, email]
        );

        console.log('Microsoft 365 profile:', profile);
        return done(null, profile);
      } catch (err) {
        console.error('DB error:', err);
        return done(err, null);
      }

    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

module.exports = passport;
