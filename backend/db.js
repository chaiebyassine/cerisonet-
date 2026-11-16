

require('dotenv').config(); 
const pgClient = require('pg'); 


const dbPassword = String(process.env.DB_PASSWORD ?? '').trim();


console.log("DB_HOST =", process.env.DB_HOST);
console.log("DB_PORT =", process.env.DB_PORT);
console.log("DB_NAME =", process.env.DB_NAME);
console.log("DB_USER =", process.env.DB_USER);
console.log("DB_PASSWORD type =", typeof dbPassword);
console.log("DB_PASSWORD length =", dbPassword.length);


const connectionObj = new pgClient.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: dbPassword,
  port: Number(process.env.DB_PORT || 5432),
  ssl: { rejectUnauthorized: false }
});

module.exports = connectionObj;