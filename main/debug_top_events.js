const fs = require('fs');
const path = require('path');
function readCSV(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return data.split('\n').slice(1).map(line => {
            const matches = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
            return matches ? matches.map(field => field.replace(/"/g, '')) : [];
        });
    } catch (e) {
        console.error(`Error reading ${filePath}:`, e.message);
        return [];
    }
}
function parseDateAsUTC(dateString) {
    if (!dateString) return new Date('Invalid');
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
}
const startDate = new Date(Date.UTC(2025, 10, 1)); 
const endDate = new Date(Date.UTC(2025, 10, 30)); 
const HARDCODED_EVENT_LIST = [
    'event_10350', 
    'event_10351', 
    'event_10352', 
    'event_10353', 
    'event_10363', 
    'event_10354', 
    'event_10364'
];
async function run() {
    console.log("Reading CSV...");
    const historicoPath = path.join(__dirname, '..', 'extrações', 'historico_eventos.csv');
    const eventosData = readCSV(historicoPath);
    console.log(`Read ${eventosData.length} lines.`);
    const eventAggregates = {};
    for (const linha of eventosData) {
        if (linha.length < 4) continue;
        const data = linha[0];
        const nomeEvento = linha[1];
        const contagem = parseInt(linha[2], 10);
        const usuarios = parseInt(linha[3], 10);
        if (!data || !nomeEvento || isNaN(contagem) || isNaN(usuarios)) continue;
        const dataCSV = parseDateAsUTC(data);
        if (dataCSV >= startDate && dataCSV <= endDate) {
            if (!eventAggregates[nomeEvento]) {
                eventAggregates[nomeEvento] = {
                    nome: nomeEvento,
                    contagem: 0,
                    usuarios: 0
                };
            }
            eventAggregates[nomeEvento].contagem += contagem;
            eventAggregates[nomeEvento].usuarios += usuarios;
        }
    }
    const allEvents = Object.values(eventAggregates);
    console.log(`Total unique events found in range: ${allEvents.length}`);
    console.log("\nChecking for Hardcoded Events:");
    HARDCODED_EVENT_LIST.forEach(target => {
        const found = allEvents.find(e => e.nome === target);
        if (found) {
            console.log(`[FOUND] '${target}': Count=${found.contagem}`);
        } else {
            console.log(`[MISSING] '${target}'`);
            const fuzzy = allEvents.find(e => e.nome.includes(target) || target.includes(e.nome));
            if (fuzzy) {
                console.log(`   -> Did you mean '${fuzzy.nome}'?`);
            }
        }
    });
    console.log("\nTop 5 events found:");
    allEvents.sort((a,b) => b.contagem - a.contagem).slice(0, 5).forEach(e => console.log(`'${e.nome}'`));
}
run();