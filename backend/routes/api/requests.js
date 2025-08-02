const express = require('express');
const app = express.Router();
const { check, validationResult } = require('express-validator');
const { sendMail } = require('../../middleware/mailer'); // <-- Add mailer import

const WEBSITE_URL = process.env.WEBSITE_URL || 'http://localhost:5000';

// Helper to generate HTML email body
function emailBody({ greeting, message, requestId, comments }) {
  return `
    <div style="font-family: Arial, sans-serif; color: #222;">
      <p>${greeting}</p>
      <p>${message}</p>
      <p><b>Request ID:</b> ${requestId}</p>
      ${comments ? `<p><b>Comments:</b> ${comments}</p>` : ''}
      <p>
        <a href="${WEBSITE_URL}/" style="background: #0078d4; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          View Request
        </a>
      </p>
      <hr>
      <small>This is an automated message from CBL Request Approver.</small>
    </div>
  `;
}

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

// route to create a new request
// POST /api/requests/create
// access private
app.post(
  '/create',
  [
    check('requestType').isIn(['outward', 'inward']),
    check('outwardData').optional().isObject(),
    check('inwardData').optional().isObject(),
    check('outwardData.recipient_name').optional().isString(),
    check('outwardData.date').optional().isISO8601(),
    check('outwardData.purpose').optional().isString(),
    check('outwardData.serial_no').optional().isString(),
    check('outwardData.account_code').optional().isString(),
    check('outwardData.description').optional().isString(),
    check('outwardData.unit').optional().isString(),
    check('outwardData.quantity').optional().isInt({ min: 1 }),
    check('outwardData.department').optional().isString(),
    check('outwardData.priority').optional().isString(),
    check('outwardData.comment').optional().isString(),
    check('outwardData.attachment_path').optional().isString(),
    check('outwardData.to_be_returned').optional().isBoolean(),
    check('inwardData.outward_pass_id').optional().isInt(),
    check('inwardData.date').optional().isISO8601(),
    check('inwardData.received_by').optional().isString(),
    check('inwardData.serial_no').optional().isString(),
    check('inwardData.account_code').optional().isString(),
    check('inwardData.description').optional().isString(),
    check('inwardData.unit').optional().isString(),
    check('inwardData.quantity').optional().isInt({ min: 1 }),
    check('inwardData.department').optional().isString(),
    check('inwardData.priority').optional().isString(),
    check('inwardData.comment').optional().isString(),
    check('inwardData.attachment_path').optional().isString(),
    check('inwardData.Returned').optional().isBoolean(),],
  async (req, res) => {
    if (!(req.isAuthenticated && req.isAuthenticated())) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const db = req.app.locals.db;
    const userId = req.user.id;
    const {
      requestType,
      outwardData,
      inwardData,
    } = req.body;

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Fetch request_type_id from request_types table
      const [typeRows] = await conn.query(
        `SELECT id FROM request_types WHERE name = ? LIMIT 1`,
        [requestType]
      );
      if (!typeRows.length) {
        throw new Error('Invalid requestType');
      }
      const request_type_id = typeRows[0].id;

      // Insert into requests table
      const [requestResult] = await conn.query(
        `INSERT INTO requests (request_type_id, initiator_id) VALUES (?, ?)`,
        [request_type_id, userId]
      );
      const requestId = requestResult.insertId;

      let recordResult;
      if (requestType === 'outward') {
        // Insert into outward_pass_records
        const {
          recipient_name,
          date,
          purpose,
          serial_no,
          account_code,
          description,
          unit,
          quantity,
          department,
          priority,
          comment,
          attachment_path,
          to_be_returned,
        } = outwardData;

        [recordResult] = await conn.query(
          `INSERT INTO outward_pass_records
            (request_id, recipient_name, date, purpose, serial_no, account_code, description, unit, quantity, department, priority, comment, attachment_path, to_be_returned)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            requestId,
            recipient_name,
            date,
            purpose,
            serial_no,
            account_code,
            description,
            unit,
            quantity,
            department,
            priority,
            comment,
            attachment_path,
            to_be_returned ? 1 : 0,
          ]
        );
      } else if (requestType === 'inward') {
        // Insert into inward_pass_records
        const {
          outward_pass_id,
          date,
          received_by,
          serial_no,
          account_code,
          description,
          unit,
          quantity,
          department,
          priority,
          comment,
          attachment_path,
          Returned,
        } = inwardData;

        [recordResult] = await conn.query(
          `INSERT INTO inward_pass_records
            (request_id, outward_pass_id, date, received_by, serial_no, account_code, description, unit, quantity, department, priority, comment, attachment_path, Returned)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            requestId,
            outward_pass_id,
            date,
            received_by,
            serial_no,
            account_code,
            description,
            unit,
            quantity,
            department,
            priority,
            comment,
            attachment_path,
            Returned ? 1 : 0,
          ]
        );
      } else {
        throw new Error('Invalid requestType');
      }

      // Notify first approver
      const [chainRows] = await conn.query(
        `SELECT approver_id FROM approval_chains WHERE request_type_id = ? ORDER BY sequence_number ASC LIMIT 1`,
        [request_type_id]
      );
      if (chainRows.length) {
        const approverId = chainRows[0].approver_id;
        const [userRows] = await conn.query(`SELECT email, name FROM users WHERE id = ?`, [approverId]);
        if (userRows.length) {
          await sendMail({
            to: userRows[0].email,
            subject: 'New Request Awaiting Your Approval',
            text: undefined,
            html: emailBody({
              greeting: `Dear ${userRows[0].name},`,
              message: `A new request has been initiated and requires your approval.`,
              requestId,
            }),
          });
        }
      }

      await conn.commit();
      res.status(201).json({
        message: 'Request created successfully',
        requestId,
        recordId: recordResult.insertId,
      });
    } catch (err) {
      await conn.rollback();
      console.error('Error creating request:', err);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      conn.release();
    }
  }
);




// route to handle fetch my requests
// GET /api/requests/my-requests
// access private
app.get('/my-requests', async (req, res) => {
  if (!(req.isAuthenticated && req.isAuthenticated())) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.user.id;
  const db = req.app.locals.db;

  try {
    // Fetch all requests initiated by the user, with type and status
    const [requests] = await db.query(
      `SELECT 
          r.id AS request_id,
          r.request_type_id,
          rt.name AS request_type,
          r.status,
          r.submitted_at
        FROM requests r
        JOIN request_types rt ON r.request_type_id = rt.id
        WHERE r.initiator_id = ?
        ORDER BY r.submitted_at DESC
      `,
      [userId]
    );

    // For each request, fetch its outward or inward record
    const results = [];
    for (const reqRow of requests) {
      let details = null;
      if (reqRow.request_type === 'outward') {
        const [outwardRows] = await db.query(
          `SELECT * FROM outward_pass_records WHERE request_id = ?`,
          [reqRow.request_id]
        );
        details = outwardRows[0] || null;
      } else if (reqRow.request_type === 'inward') {
        const [inwardRows] = await db.query(
          `SELECT * FROM inward_pass_records WHERE request_id = ?`,
          [reqRow.request_id]
        );
        details = inwardRows[0] || null;
      }
      results.push({
        ...reqRow,
        details,
      });
    }

    res.json(results);
  } catch (err) {
    console.error('Error fetching user requests:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// route to handle fetch request details by request ID
// GET /api/requests/:id
// access private
app.get('/:id', async (req, res) => {
  if (!(req.isAuthenticated && req.isAuthenticated())) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const requestId = req.params.id;
  const db = req.app.locals.db;

  try {
    // Fetch request details
    const [requestRows] = await db.query(
      `SELECT 
          r.id AS request_id,
          r.request_type_id,
          rt.name AS request_type,
          r.status,
          r.submitted_at,
          u.name AS initiator_name
        FROM requests r
        JOIN request_types rt ON r.request_type_id = rt.id
        JOIN users u ON r.initiator_id = u.id
        WHERE r.id = ?`,
      [requestId]
    );

    if (!requestRows.length) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const requestDetails = requestRows[0];

    // Fetch outward or inward record based on request type
    let details = null;
    if (requestDetails.request_type === 'outward') {
      const [outwardRows] = await db.query(
        `SELECT * FROM outward_pass_records WHERE request_id = ?`,
        [requestId]
      );
      details = outwardRows[0] || null;
    } else if (requestDetails.request_type === 'inward') {
      const [inwardRows] = await db.query(
        `SELECT * FROM inward_pass_records WHERE request_id = ?`,
        [requestId]
      );
      details = inwardRows[0] || null;
    }

    res.json({
      ...requestDetails,
      details,
    });
  } catch (err) {
    console.error('Error fetching request details:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// route to handle fetch all the requests that needs my approval
// GET /api/requests/pending-approvals
// access private
app.get('/pending-approvals', async (req, res) => {
  if (!(req.isAuthenticated && req.isAuthenticated())) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.user.id;
  const db = req.app.locals.db;

  try {
    // Find requests where user is the next approver in the chain and not yet acted
    const [pendingRequests] = await db.query(`
      SELECT 
        r.id AS request_id,
        r.request_type_id,
        rt.name AS request_type,
        r.status,
        r.submitted_at,
        r.initiator_id,
        u.name AS initiator_name
      FROM requests r
      JOIN request_types rt ON r.request_type_id = rt.id
      JOIN users u ON r.initiator_id = u.id
      JOIN approval_chains ac ON ac.request_type_id = r.request_type_id
      LEFT JOIN request_approvals ra 
        ON ra.request_id = r.id AND ra.approver_id = ac.approver_id AND ra.sequence_number = ac.sequence_number
      WHERE ac.approver_id = ?
        AND ra.id IS NULL
        AND r.status = 'Pending'
      ORDER BY r.submitted_at DESC
    `, [userId]);

    const results = [];
    for (const reqRow of pendingRequests) {
      let details = null;
      if (reqRow.request_type === 'outward') {
        const [outwardRows] = await db.query(
          `SELECT * FROM outward_pass_records WHERE request_id = ?`,
          [reqRow.request_id]
        );
        details = outwardRows[0] || null;
      } else if (reqRow.request_type === 'inward') {
        const [inwardRows] = await db.query(
          `SELECT * FROM inward_pass_records WHERE request_id = ?`,
          [reqRow.request_id]
        );
        details = inwardRows[0] || null;
      }
      results.push({
        ...reqRow,
        details,
      });
    }

    res.json(results);
  } catch (err) {
    console.error('Error fetching pending approvals:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// route to handle approve or reject a request
// POST /api/requests/:id/decision
// access private
app.post('/:id/decision', [
  check('decision').isIn(['Approved', 'Rejected']),
  check('comments').optional().isString()
], async (req, res) => {
  if (!(req.isAuthenticated && req.isAuthenticated())) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  const requestId = req.params.id;
  const { decision, comments } = req.body;
  const db = req.app.locals.db;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // Get request info and approval chain
    const [requestRows] = await conn.query(
      `SELECT request_type_id, status, initiator_id FROM requests WHERE id = ? FOR UPDATE`, [requestId]
    );
    if (!requestRows.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Request not found' });
    }
    if (requestRows[0].status !== 'Pending') {
      await conn.rollback();
      return res.status(400).json({ error: 'Request already processed' });
    }

    // Find user's sequence in approval chain
    const [chainRows] = await conn.query(
      `SELECT sequence_number FROM approval_chains WHERE request_type_id = ? AND approver_id = ?`,
      [requestRows[0].request_type_id, userId]
    );
    if (!chainRows.length) {
      await conn.rollback();
      return res.status(403).json({ error: 'Not authorized to approve/reject this request' });
    }
    const sequence_number = chainRows[0].sequence_number;

    // Check if already acted
    const [approvalRows] = await conn.query(
      `SELECT id FROM request_approvals WHERE request_id = ? AND approver_id = ? AND sequence_number = ?`,
      [requestId, userId, sequence_number]
    );
    if (approvalRows.length) {
      await conn.rollback();
      return res.status(400).json({ error: 'Already acted on this request' });
    }

    // Insert approval/rejection
    await conn.query(
      `INSERT INTO request_approvals (request_id, approver_id, sequence_number, decision, action_at, comments)
       VALUES (?, ?, ?, ?, NOW(), ?)`,
      [requestId, userId, sequence_number, decision, comments || null]
    );

    // Fetch initiator email
    const [initiatorRows] = await conn.query(
      `SELECT email, name FROM users WHERE id = ?`,
      [requestRows[0].initiator_id]
    );
    const initiatorEmail = initiatorRows.length ? initiatorRows[0].email : null;
    const initiatorName = initiatorRows.length ? initiatorRows[0].name : '';

    if (decision === 'Rejected') {
      // If rejected, update request status
      await conn.query(
        `UPDATE requests SET status = 'Rejected' WHERE id = ?`, [requestId]
      );

      // Notify previous approver (if any) and initiator
      const [prevChainRows] = await conn.query(
        `SELECT approver_id FROM approval_chains WHERE request_type_id = ? AND sequence_number < ? ORDER BY sequence_number DESC LIMIT 1`,
        [requestRows[0].request_type_id, sequence_number]
      );
      if (prevChainRows.length) {
        const prevApproverId = prevChainRows[0].approver_id;
        const [prevUserRows] = await conn.query(`SELECT email, name FROM users WHERE id = ?`, [prevApproverId]);
        if (prevUserRows.length) {
          await sendMail({
            to: prevUserRows[0].email,
            subject: 'Request Rejected',
            text: undefined,
            html: emailBody({
              greeting: `Dear ${prevUserRows[0].name},`,
              message: `The request has been <b>rejected</b> by ${req.user.name}.`,
              requestId,
              comments,
            }),
          });
        }
      }
      if (initiatorEmail) {
        await sendMail({
          to: initiatorEmail,
          subject: 'Your Request Was Rejected',
          text: undefined,
          html: emailBody({
            greeting: `Dear ${initiatorName},`,
            message: `Your request has been <b>rejected</b> by ${req.user.name}.`,
            requestId,
            comments,
          }),
        });
      }
    } else {
      // Approved
      // If approved, check if this is the last approver
      const [maxSeqRows] = await conn.query(
        `SELECT MAX(sequence_number) AS max_seq FROM approval_chains WHERE request_type_id = ?`,
        [requestRows[0].request_type_id]
      );
      if (sequence_number === maxSeqRows[0].max_seq) {
        // Last approver, mark as Approved
        await conn.query(
          `UPDATE requests SET status = 'Approved' WHERE id = ?`, [requestId]
        );
      }

      // Find next approver
      const [nextChainRows] = await conn.query(
        `SELECT approver_id FROM approval_chains WHERE request_type_id = ? AND sequence_number = ?`,
        [requestRows[0].request_type_id, sequence_number + 1]
      );
      if (nextChainRows.length) {
        const nextApproverId = nextChainRows[0].approver_id;
        const [nextUserRows] = await conn.query(`SELECT email, name FROM users WHERE id = ?`, [nextApproverId]);
        if (nextUserRows.length) {
          await sendMail({
            to: nextUserRows[0].email,
            subject: 'Request Awaiting Your Approval',
            text: undefined,
            html: emailBody({
              greeting: `Dear ${nextUserRows[0].name},`,
              message: `A request has been <b>approved</b> by ${req.user.name} and now requires your approval.`,
              requestId,
            }),
          });
        }
      }
      // Notify initiator
      if (initiatorEmail) {
        await sendMail({
          to: initiatorEmail,
          subject: 'Your Request Was Approved',
          text: undefined,
          html: emailBody({
            greeting: `Dear ${initiatorName},`,
            message: `Your request has been <b>approved</b> by ${req.user.name}.`,
            requestId,
          }),
        });
      }
    }

    await conn.commit();
    res.json({ message: `Request ${decision.toLowerCase()} successfully` });
  } catch (err) {
    await conn.rollback();
    console.error('Error processing decision:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
});


// route to handle approval creation by admin
// POST /api/requests/approval-chains
// access private (admin only)
app.post('/approval-chains', [
  check('requestTypeId').isInt(),
  check('approverIds').isArray({ min: 1 }).withMessage('approverIds must be a non-empty array of user IDs')
], async (req, res) => {
  if (!(req.isAuthenticated && req.isAuthenticated())) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check if user is admin
  const userId = req.user.id;
  const db = req.app.locals.db;
  const [adminRows] = await db.query(
    `SELECT id FROM admins WHERE user_id = ?`, [userId]
  );
  if (!adminRows.length) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { requestTypeId, approverIds } = req.body;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // Remove existing chain for this request type
    await conn.query(
      `DELETE FROM approval_chains WHERE request_type_id = ?`, [requestTypeId]
    );

    // Insert new approval chain
    for (let i = 0; i < approverIds.length; i++) {
      await conn.query(
        `INSERT INTO approval_chains (request_type_id, approver_id, sequence_number) VALUES (?, ?, ?)`,
        [requestTypeId, approverIds[i], i + 1]
      );
    }

    await conn.commit();
    res.json({ message: 'Approval chain created/updated successfully' });
  } catch (err) {
    await conn.rollback();
    console.error('Error creating approval chain:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
});


// route to post files on server
// POST /api/requests/upload
// access private
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Use timestamp + original name for uniqueness
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
  if (!(req.isAuthenticated && req.isAuthenticated())) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  // Return the relative path to the uploaded file
  const filePath = `/uploads/${req.file.filename}`;
  res.json({ path: filePath });
});

module.exports = app;