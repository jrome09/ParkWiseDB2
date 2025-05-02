const mysql = require('mysql2');
const fs = require('fs');

const connection = mysql.createConnection({
    host: 'localhost',
    port: 4306,
    user: 'root',
    password: '',
    database: 'parkwise2'
});

console.log('Attempting to connect to database...');

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }

    console.log('Connected to database successfully');
    
    // Read the SQL file
    console.log('Reading SQL file...');
    const sql = fs.readFileSync('create_reservation_table.sql', 'utf8');
    console.log('SQL file content:', sql);

    // Execute the SQL
    console.log('Executing SQL...');
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error creating table:', err);
        } else {
            console.log('RESERVATION table created successfully!');
        }

        // Close the connection
        connection.end((err) => {
            if (err) {
                console.error('Error closing connection:', err);
            } else {
                console.log('Database connection closed');
            }
        });
    });
}); 