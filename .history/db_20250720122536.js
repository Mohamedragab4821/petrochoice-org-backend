// backend/db.js
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // use your MySQL password if any
  database: 'portal_petrochoice', // ✅ your actual DB name
});

db.connect((err) => {
  if (err) {
    console.error('MySQL connection failed:', err);
    throw err;
  }
  console.log('✅ Connected to MySQL database ' + db.config.database);
});

module.exports = db;
