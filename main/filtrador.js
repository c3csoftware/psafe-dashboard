const fs = require('fs');
const path = require('path');

// Determine context from command line arguments
const scriptContext = process.argv[2] || 'main'; // Default to 'main'

function getFiltradorDataPath(filename) {
    if (scriptContext === 'dupe') {
        // When filtrador is run from `main/` but needs to access `dupe_app` data
        // `__dirname` here is `.../psafe/main`
        return path.join(__dirname, '..', 'dupe_app', filename);
    }
    return path.join(__dirname, filename);
}

async function readCSV(filePath) {
    const { createInterface } = require('readline');
    const fileStream = fs.createReadStream(filePath);
    const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const records = [];
    let isFirstLine = true;

    for await (const line of rl) {
        if (line.trim() === '') continue; // Skip empty lines

        if (isFirstLine) {
            records.push(line.split(',').map(field => field.trim())); // Assuming header is simple CSV
            isFirstLine = false;
        } else {
            const matches = line.match(/(".*?"|[^",]+|(?<=,)(?=,)|(?<=,)$|^$)/g);
            records.push(matches ? matches.map(field => field.replace(/^"|"$/g, '').trim()) : []);
        }
    }
    return records;
}

function writeCSV(filePath, data) {
    try {
        const csvContent = data.map(row => row.join(',')).join('\n');
        fs.writeFileSync(filePath, csvContent, 'utf8');
        console.log(`${filePath} created successfully.`);
    } catch (e) {
        console.error(`Error writing to ${filePath}:`, e.message);
    }
}

async function filterEvents() {
    const eventosSelecionadosPath = getFiltradorDataPath('eventos_selecionados.json');
    const historicoEventosPath = getFiltradorDataPath('historico_eventos.csv');
    const historicoFiltradoPath = getFiltradorDataPath('historico_eventos_filtrado.csv');

    if (!fs.existsSync(eventosSelecionadosPath)) {
        console.error('Error: eventos_selecionados.json not found.');
        return;
    }

    if (!fs.existsSync(historicoEventosPath)) {
        console.error('Error: historico_eventos.csv not found.');
        return;
    }

    const eventosSelecionados = JSON.parse(fs.readFileSync(eventosSelecionadosPath, 'utf8'));
    const allowedEventValues = new Set(eventosSelecionados.map(e => e.valor));

    const historicoEventos = await readCSV(historicoEventosPath);
    const header = historicoEventos[0];
    const filteredData = historicoEventos.slice(1).filter(row => row.length > 1 && allowedEventValues.has(row[1]));

    writeCSV(historicoFiltradoPath, [header, ...filteredData]);
}

filterEvents();