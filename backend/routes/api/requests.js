const express = require('express');
const app = express.Router();
const { check, validationResult } = require('express-validator');

// route to handle my requests count(total, approved, pending, rejected) fetch requests
// GET /api/requests/my-requests-count
// access private
app.get('/my-requests-count', async (req, res) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
        const userId = req.user.id;
        try {
            const db = req.app.locals.db;
            const [rows] = await db.query(`
                SELECT 
                    COUNT(*) AS total,
                    SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved,
                    SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
                    SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected
                FROM requests
                WHERE initiator_id = ?
            `, [userId]);

            res.json(rows[0]);
        } catch (err) {
            console.error('Error fetching request counts:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

module.exports = app;