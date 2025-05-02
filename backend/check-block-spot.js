const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    port: 4306,
    user: 'root',
    password: '',
    database: 'parkwise2'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }

    console.log('Connected to database successfully\n');
    
    // Check BLOCK_SPOT table structure
    connection.query('DESCRIBE block_spot', (err, results) => {
        if (err) {
            console.error('Error getting table structure:', err);
        } else {
            console.log('Structure of BLOCK_SPOT table:');
            console.log(results);
        }
        
        connection.end((err) => {
            if (err) {
                console.error('Error closing connection:', err);
            } else {
                console.log('\nDatabase connection closed');
            }
        });
    });
}); 