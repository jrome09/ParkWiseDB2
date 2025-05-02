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
    
    // Check both table structures
    const queries = [
        'SHOW CREATE TABLE block_spot',
        'SHOW CREATE TABLE reservation'
    ];
    
    let completed = 0;
    
    queries.forEach(query => {
        connection.query(query, (err, results) => {
            if (err) {
                if (err.code === 'ER_NO_SUCH_TABLE') {
                    console.log(`Table does not exist for query: ${query}`);
                } else {
                    console.error('Error executing query:', err);
                }
            } else {
                console.log(`\nCreate statement for ${query.split(' ').pop()}:`);
                console.log(results[0]['Create Table']);
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