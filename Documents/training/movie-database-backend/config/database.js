const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

function checkDatabaseConnection() {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        console.error('Error connecting to the database:', err);
        reject(err);
      } else {
        console.log('Connected to the MySQL database.');
        connection.query('SELECT 1', (queryErr, results) => {
          connection.release();
          if (queryErr) {
            console.error('Error executing test query:', queryErr);
            reject(queryErr);
          } else {
            console.log('Test query executed successfully.');
            resolve(true);
          }
        });
      }
    });
  });
}

module.exports = {
  pool,
  checkDatabaseConnection
};