const express = require('express');
const app = express.Router();
const { check, validationResult } = require('express-validator');

app.get('/me', async (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    const { name, email, id } = req.user || {};
    let isAdmin = false;

    try {
      if (req.locals && req.locals.db) {
        const [rows] = await req.locals.db.query(
          'SELECT 1 FROM admins WHERE user_id = ? LIMIT 1',
          [id]
        );
        isAdmin = rows.length > 0;
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    res.json({ user: { name, email, isAdmin } });
  } else {
    res.json({ user: null });
  }
});

module.exports = app;

// const express = require('express');
// const router = express.Router();
// const { check, validationResult } = require('express-validator');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const User = require('../../DB/models/User');
// require('dotenv').config();
// const jwtTokenDecoder = require('../../middleware/jwtTokenDecoder');

// // route to handle user register requests
// // POST /api/users
// // access public
// router.post(
// 	'/register',
// 	[
// 		check('name', 'Name is required').not().isEmpty(),
// 		check('email', 'Please include a valid email').isEmail(),
// 		check('password', 'Password must be at least 8 characters').isLength({
// 			min: 8,
// 		}),
// 	],
// 	async (req, res) => {
// 		const errors = validationResult(req);

// 		if (!errors.isEmpty()) {
// 			return res.status(400).json({ errors: errors.array() });
// 		}

// 		const { name, email, password } = req.body;

// 		try {
// 			const userExists = await User.findOne({ email: email }).select(
// 				'_id'
// 			);

// 			if (userExists) {
// 				return res
// 					.status(400)
// 					.json({ errors: [{ msg: 'User already exists' }] });
// 			}

// 			const salt = await bcrypt.genSalt(10);
// 			const hashedPassword = await bcrypt.hash(password, salt);

// 			const newUser = new User({
// 				fullname: name,
// 				email: email,
// 				password: hashedPassword,
// 			});

// 			await newUser.save();

// 			res.status(201).json({
// 				msg: 'User registered successfully',
// 			});
// 		} catch (error) {
// 			console.error(error);
// 			res.status(500).send('Server error');
// 		}
// 	}
// );

// // route to handle user login requests
// // POST /api/users
// // access public
// router.post(
// 	'/login',
// 	[
// 		check('email', 'Please include a valid email').isEmail(),
// 		check('password', 'Please include a Password').exists(),
// 	],
// 	async (req, res) => {
// 		const errors = validationResult(req);

// 		if (!errors.isEmpty()) {
// 			return res.status(400).json({ errors: errors.array() });
// 		}

// 		const { email, password } = req.body;

// 		try {
// 			const userExists = await User.findOne({ email: email });

// 			if (!userExists) {
// 				return res
// 					.status(400)
// 					.json({ errors: [{ msg: 'Invalid Credentials' }] });
// 			}

// 			const isMatch = await bcrypt.compare(password, userExists.password);

// 			if (!isMatch) {
// 				return res
// 					.status(400)
// 					.json({ errors: [{ msg: 'Invalid Credentials' }] });
// 			}

// 			const payload = {
// 				user: {
// 					id: userExists.id,
// 				},
// 			};

// 			jwt.sign(
// 				payload,
// 				process.env.JWT_SECRET,
// 				{
// 					expiresIn: '1h',
// 				},
// 				(err, token) => {
// 					if (err) {
// 						res.status(500).send('Server error');
// 						throw err;
// 					}
// 					res.status(201).json({
// 						token,
// 						user: { name: userExists.fullname },
// 					});
// 				}
// 			);
// 		} catch (error) {
// 			console.error(error);
// 			res.status(500).send('Server error');
// 		}
// 	}
// );

// // route to handle user change password requests
// // PATCH /api/users
// // access private
// router.patch(
// 	'/change-password',
// 	[
// 		jwtTokenDecoder,
// 		[
// 			check('password', 'Password is required').exists(),
// 			check(
// 				'newPassword',
// 				'New Password must be at least 8 characters'
// 			).isLength({
// 				min: 8,
// 			}),
// 		],
// 	],
// 	async (req, res) => {
// 		const errors = validationResult(req);

// 		if (!errors.isEmpty()) {
// 			return res.status(400).json({ errors: errors.array() });
// 		}

// 		const userId = req.user.id;
// 		const { password, newPassword } = req.body;

// 		try {
// 			const userExists = await User.findById({ _id: userId });

// 			if (!userExists) {
// 				return res
// 					.status(400)
// 					.json({ errors: [{ msg: 'Invalid Credentials' }] });
// 			}

// 			const isMatch = await bcrypt.compare(password, userExists.password);

// 			if (!isMatch) {
// 				return res
// 					.status(400)
// 					.json({ errors: [{ msg: 'Invalid Credentials' }] });
// 			}

// 			const salt = await bcrypt.genSalt(10);
// 			const hashedNewPassword = await bcrypt.hash(newPassword, salt);

// 			userExists.password = hashedNewPassword;
// 			await userExists.save();

// 			res.status(200).json({
// 				msg: 'Password changed successfully',
// 			});
// 		} catch (error) {
// 			console.error(error);
// 			res.status(500).send('Server error');
// 		}
// 	}
// );

// module.exports = router;