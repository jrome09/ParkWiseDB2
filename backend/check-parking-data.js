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
    
    // Check data in all relevant tables
    const queries = [
        'SELECT * FROM FLOOR_LEVEL',
        'SELECT * FROM PARKING_BLOCK',
        'SELECT bs.*, pb.BLOCK_NAME, fl.FLOOR_NUMBER FROM BLOCK_SPOT bs JOIN PARKING_BLOCK pb ON bs.BLOCK_ID = pb.BLOCK_ID JOIN FLOOR_LEVEL fl ON pb.FLOOR_ID = fl.FLOOR_ID WHERE fl.FLOOR_NUMBER = 1 AND pb.BLOCK_NAME = "A"'
    ];
    
    let completed = 0;
    
    queries.forEach((query, index) => {
        connection.query(query, (err, results) => {
            if (err) {
                console.error(`Error executing query ${index + 1}:`, err);
            } else {
                console.log(`\nResults for query ${index + 1}:`);
                console.log(results);
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