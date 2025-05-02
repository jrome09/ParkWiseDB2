const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    port: 4306,
    user: 'root',
    password: '',
    database: 'parkwise2'
});

const tables = ['customer', 'floor_level', 'payment', 'discount'];

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }

    console.log('Connected to database successfully\n');
    
    let completedQueries = 0;
    
    tables.forEach(table => {
        connection.query(`DESCRIBE ${table}`, (err, results) => {
            if (err) {
                console.error(`Error getting structure for ${table}:`, err);
            } else {
                console.log(`Structure of ${table} table:`);
                console.log(results);
                console.log('\n');
            }
            
            completedQueries++;
            if (completedQueries === tables.length) {
                connection.end((err) => {
                    if (err) {
                        console.error('Error closing connection:', err);
                    } else {
                        console.log('Database connection closed');
                    }
                });
            }
        });
    });
}); 