module.exports = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 4306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'parkwise2'
}; 