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
    
    // Check table structures
    const queries = [
        'DESCRIBE BLOCK_SPOT',
        'DESCRIBE RESERVATION',
        'SHOW CREATE TABLE BLOCK_SPOT',
        'SHOW CREATE TABLE RESERVATION'
    ];
    
    let completed = 0;
    
    queries.forEach((query, index) => {
        connection.query(query, (err, results) => {
            if (err) {
                if (err.code === 'ER_NO_SUCH_TABLE') {
                    console.log(`Table does not exist for query: ${query}`);
                } else {
                    console.error(`Error executing query ${index + 1}:`, err);
                }
            } else {
                if (query.startsWith('DESCRIBE')) {
                    console.log(`\nStructure for ${query.split(' ')[1]}:`);
                    console.log(results);
                } else {
                    console.log(`\nCreate statement for ${query.split(' ')[2]}:`);
                    console.log(results[0]['Create Table']);
                }
            }
            
            completed++;
            if (completed === queries.length) {
                connection.end((err) => {
                    if (err) {
                        console.error('Error closing connection:', err);
                    } else {
                        console.log('\nDatabase connection closed');
                    }
                });
            }
        });
    });
}); 