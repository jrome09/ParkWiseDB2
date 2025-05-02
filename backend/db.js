const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',  // empty password as shown in your console output
    database: 'parkwise2',
    port: 4306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Test the connection
pool.getConnection()
    .then(connection => {
        console.log('Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('Error connecting to the database:', err);
    });

module.exports = {
    connect: async () => {
        try {
            const connection = await pool.getConnection();
            return connection;
        } catch (error) {
            console.error('Error getting database connection:', error);
            throw error;
        }
    },
    query: async (sql, params) => {
        try {
            const [results] = await pool.execute(sql, params);
            return results;
        } catch (error) {
            console.error('Error executing query:', error);
            throw error;
        }
    },
    pool: pool
}; 