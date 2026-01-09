const fs = require('fs');
const path = require('path');
const db = require('../main/db');

async function setupDatabase() {
    const client = await db.pool.connect();
    try {
        const dupeJornadasSchema = fs.readFileSync(path.join(__dirname, 'dupe_jornadas_schema.sql'), 'utf8');
        const dupeEventoSchema = fs.readFileSync(path.join(__dirname, 'dupe_evento_schema.sql'), 'utf8');

        await client.query(dupeJornadasSchema);
        console.log('Dupe jornadas schema created successfully.');

        await client.query(dupeEventoSchema);
        console.log('Dupe evento schema created successfully.');
    } catch (e) {
        console.error('Error setting up dupe database:', e.message);
    } finally {
        client.release();
        db.pool.end();
    }
}

setupDatabase();
