const fs = require('fs');
const path = require('path');

function readCSV(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return data.split('\n').map(line => {
            const matches = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
            return matches ? matches.map(field => field.replace(/"/g, '')) : [];
        });
    } catch (e) {
        console.error(`Error reading ${filePath}:`, e.message);
        return [];
    }
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

function filterEvents() {
    const eventosSelecionadosPath = path.join(__dirname, 'eventos_selecionados.json');
    const historicoEventosPath = path.join(__dirname, 'historico_eventos.csv');
    const historicoFiltradoPath = path.join(__dirname, 'historico_eventos_filtrado.csv');

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

    const historicoEventos = readCSV(historicoEventosPath);
    const header = historicoEventos[0];
    const filteredData = historicoEventos.slice(1).filter(row => row.length > 1 && allowedEventValues.has(row[1]));

    writeCSV(historicoFiltradoPath, [header, ...filteredData]);
}

filterEvents();
