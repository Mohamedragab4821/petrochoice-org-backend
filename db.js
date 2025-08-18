// backend/db.js
const mysql = require('mysql2');

const db = mysql.createConnection({
<<<<<<< HEAD
  host: process.env.DB_HOST,     // mysql.hostinger.com أو اللي جايبه من Hostinger
  user: process.env.DB_USER,     // يوزر الداتابيز
  password: process.env.DB_PASS, // باسورد الداتابيز
  database: process.env.DB_NAME, // اسم الداتابيز
=======
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '', // use your MySQL password if any
  database: process.env.DB_NAME || 'portal_petrochoice', // ✅ your actual DB name
>>>>>>> fb689be2fbfe7873906edac825c0841b432fa439
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
