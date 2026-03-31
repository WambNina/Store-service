const path = require('path');
const fs = require('fs').promises;
const { pool } = require('./database'); // Use destructuring

const initDatabase = async () => {
    try {
        const sqlPath = path.join(__dirname, '..', 'init.sql');
        let sqlFile = await fs.readFile(sqlPath, 'utf8');
        
        // Remove DELIMITER statements and normalize
        sqlFile = sqlFile.replace(/DELIMITER\s+(\$\$|;;|;)/gi, '');
        
        // Split by $$ (trigger delimiter) first, then by semicolon
        const blocks = sqlFile.split('$$').map(b => b.trim()).filter(b => b);
        
        for (let block of blocks) {
            // Split each block by semicolon for individual statements
            const statements = block
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'));
            
            for (let statement of statements) {
                const upperStatement = statement.toUpperCase();
                
                // Skip CREATE DATABASE and USE
                if (upperStatement.includes('CREATE DATABASE') || 
                    upperStatement.startsWith('USE ')) {
                    continue;
                }
                
                try {
                    await pool.query(statement);
                } catch (err) {
                    if (err.code === 'ER_TABLE_EXISTS_ERROR') {
                        console.log(`⚠️  Table already exists, skipping`);
                    } else if (err.message.includes('Trigger already exists')) {
                        console.log(`⚠️  Trigger already exists, skipping`);
                    } else {
                        console.error(`❌ Error: ${err.message}`);
                        console.error(`   SQL: ${statement.substring(0, 100)}...`);
                    }
                }
            }
        }
        
        console.log('✅ Database initialization completed');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
};

module.exports = initDatabase;