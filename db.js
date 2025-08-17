// backend/db.js
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '', // use your MySQL password if any
  database: process.env.DB_NAME || 'portal_petrochoice', // ✅ your actual DB name
  port: process.env.DB_PORT || 3306
});

db.connect((err) => {
  if (err) {
    console.error('MySQL connection failed:', err);
    throw err;
  }
  console.log('✅ Connected to MySQL database ' + db.config.database);
});

module.exports = db;
