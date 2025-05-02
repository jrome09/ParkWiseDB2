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
    
    const alterTableQuery = `
        ALTER TABLE reservation 
        ADD COLUMN BLOCK_SPOT_ID INT(11) NOT NULL AFTER DISCOUNT_ID,
        ADD CONSTRAINT fk_reservation_block_spot 
        FOREIGN KEY (BLOCK_SPOT_ID) 
        REFERENCES block_spot(BLOCK_SPOT_ID)
    `;
    
    connection.query(alterTableQuery, (err, results) => {
        if (err) {
            console.error('Error altering table:', err);
        } else {
            console.log('Successfully added BLOCK_SPOT_ID column to reservation table');
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