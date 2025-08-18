// backend/db.js
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: process.env.DB_HOST,     // mysql.hostinger.com أو اللي جايبه من Hostinger
  user: process.env.DB_USER,     // يوزر الداتابيز
  password: process.env.DB_PASS, // باسورد الداتابيز
  database: process.env.DB_NAME, // اسم الداتابيز
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
