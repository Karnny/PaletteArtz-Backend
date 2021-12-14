const mysql = require('mysql2');
const util = require('util');

const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_DATABASE,
    multipleStatements: true,
    dateStrings: true
}

// Changed .createConnection() to .createPool() because we are using same connection and prevent ECONN time out error
let db = mysql.createPool(config);
db = db.promise();
// Promisify let we use MySQL library with async await
// con.query = util.promisify(con.query);
module.exports = { db, mysql };