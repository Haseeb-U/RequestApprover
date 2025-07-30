const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_NAME = process.env.MYSQL_DB_NAME || 'CBLRequestApproverDB';

async function initDatabase() {
  // Connect without specifying database to check/create it
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    multipleStatements: true,
  });

  // Create database if it doesn't exist
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
  await connection.end();

  // Connect to the created database
  const db = await mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  // Create tables if they don't exist (run each separately)
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      date DATE DEFAULT (CURRENT_DATE)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNIQUE NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS request_types (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS request_initiators (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      request_type_id INT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (request_type_id) REFERENCES request_types(id),
      UNIQUE(user_id, request_type_id)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS approval_chains (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_type_id INT NOT NULL,
      approver_id INT NOT NULL,
      sequence_number INT NOT NULL,
      FOREIGN KEY (request_type_id) REFERENCES request_types(id),
      FOREIGN KEY (approver_id) REFERENCES users(id)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_type_id INT NOT NULL,
      initiator_id INT NOT NULL,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
      FOREIGN KEY (request_type_id) REFERENCES request_types(id),
      FOREIGN KEY (initiator_id) REFERENCES users(id)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS request_approvals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_id INT NOT NULL,
      approver_id INT NOT NULL,
      sequence_number INT NOT NULL,
      decision ENUM('Approved', 'Rejected') NOT NULL,
      action_at DATETIME,
      comments TEXT,
      FOREIGN KEY (request_id) REFERENCES requests(id),
      FOREIGN KEY (approver_id) REFERENCES users(id)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS outward_pass_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_id INT NOT NULL,
      recipient_name VARCHAR(150),
      date DATETIME,
      purpose ENUM('Refilling', 'Sample', 'Returned', 'Sold', 'Transferred', 'Rejected', 'Repair'),
      serial_no INT,
      account_code VARCHAR(100),
      description TEXT,
      unit VARCHAR(50),
      quantity INT,
      department VARCHAR(100),
      priority ENUM('Medium', 'High', 'Critical'),
      comment TEXT,
      attachment_path VARCHAR(255),
      to_be_returned BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (request_id) REFERENCES requests(id)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS inward_pass_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_id INT NOT NULL,
      outward_pass_id INT,
      date DATETIME,
      received_by VARCHAR(100),
      serial_no INT,
      account_code VARCHAR(100),
      description TEXT,
      unit VARCHAR(50),
      quantity INT,
      department VARCHAR(100),
      priority ENUM('Medium', 'High', 'Critical'),
      comment TEXT,
      attachment_path VARCHAR(255),
      Returned BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (request_id) REFERENCES requests(id),
      FOREIGN KEY (outward_pass_id) REFERENCES outward_pass_records(id)
    );
  `);

  return db;
}

module.exports = { initDatabase, DB_NAME };