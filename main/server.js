function getTableName(context, baseName) {
    if (context === 'dupe') {
        return `dupe_${baseName}`;
    }
    return baseName;
}

// Function to determine the correct data path based on context
require('dotenv').config();
function getDataPath(context, filename) {
    if (context === 'dupe') {
        return path.join(__dirname, '..', 'dupe_app', filename);
    }
    return path.join(__dirname, filename);
}

const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const app = express();
const port = process.env.PORT || 3000;



// Serve static files
app.use(express.static(path.join(__dirname)));

// Function to parse date from CSV (YYYY-MM-DD) to a UTC Date object
function parseDateAsUTC(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
}

// Function to read and parse a CSV file
function readCSV(filePath) {
    try {
        if (!fs.existsSync(filePath)) return [];
        const data = fs.readFileSync(filePath, 'utf8');
        return data.split('\n').filter(line => line.trim() !== '').map(line => {
            const matches = line.match(/(".*?"|[^",]+|(?<=,)(?=,)|(?<=,)$|^$)/g);
            return matches ? matches.map(field => field.replace(/^"|"$/g, '').trim()) : [];
        });
    } catch (e) {
        console.error(`Error reading ${filePath}:`, e.message);
        return [];
    }
}

const ss = require('simple-statistics');

// Helper to get journeys from DB
async function getJornadasFromDB(context) {
    const jornadasTable = getTableName(context, 'jornadas');
    const eventosTable = getTableName(context, 'jornada_eventos');

    const jornadasQuery = await db.query(`SELECT * FROM ${jornadasTable}`);
    const eventosQuery = await db.query(`SELECT * FROM ${eventosTable} ORDER BY jornada_id, ordem`);
    
    const jornadasMap = new Map();
    
    jornadasQuery.rows.forEach(j => {
        jornadasMap.set(j.id, {
            id: j.id,
            nome: j.nome,
            eventos: [],
            showFunil: j.show_funil,
            showSkus: j.show_skus,
            showTelas: j.show_telas,
            showCorrelacoes: j.show_correlacoes,
            showEventPeriodicFunnel: j.show_event_periodic_funnel,
            showUserPeriodicFunnel: j.show_user_periodic_funnel
        });
    });
    
    eventosQuery.rows.forEach(e => {
        if (jornadasMap.has(e.jornada_id)) {
            jornadasMap.get(e.jornada_id).eventos.push({
                nome: e.evento_valor,
                rotulo: e.rotulo
            });
        }
    });
    
    return Array.from(jornadasMap.values());
}

// Helper to get column index by name
function getColumnIndex(header, columnName) {
    return header.findIndex(col => col.toLowerCase() === columnName.toLowerCase());
}

// Main function to process data for all journeys
async function processarJornadas(context, startDate, endDate, countryFilter = 'all') {
    console.log(`Processing data for context: ${context}, Country: ${countryFilter}`);
    
    const jornadas = await getJornadasFromDB(context);
    const eventoTable = getTableName(context, 'evento');
    const { rows: eventosSelecionados } = await db.query(`SELECT valor, rotulo FROM ${eventoTable}`);
    const eventMap = new Map(eventosSelecionados.map(e => [e.valor, e.rotulo]));
    const eventosPermitidos = new Set(eventosSelecionados.map(e => e.valor));

    const historicoFiltradoPath = getDataPath(context, 'historico_eventos_filtrado.csv');
    const historicoPath = fs.existsSync(historicoFiltradoPath)
        ? historicoFiltradoPath
        : getDataPath(context, 'historico_eventos.csv');

    const csvData = readCSV(historicoPath);
    if (csvData.length < 1) return { jornadas: [] };

    const header = csvData[0];
    const dataIdx = getColumnIndex(header, 'Data');
    const nomeIdx = getColumnIndex(header, 'NomeDoEvento');
    const paisIdx = getColumnIndex(header, 'Pais');
    const contagemIdx = getColumnIndex(header, 'ContagemDeEventos');
    const usuariosIdx = getColumnIndex(header, 'TotalDeUsuarios');

    // Filter by allowed events and date range first
    const eventosData = csvData.slice(1).filter(linha => {
        if (linha.length < 2) return false;
        if (!eventosPermitidos.has(linha[nomeIdx])) return false;
        
        const dataCSV = parseDateAsUTC(linha[dataIdx]);
        if (dataCSV < startDate || dataCSV > endDate) return false;

        // Country filter
        if (countryFilter !== 'all' && paisIdx !== -1) {
            return linha[paisIdx] === countryFilter;
        }
        return true;
    });

    const eventosPorData = {};
    const allDates = new Set();
    
    for (const linha of eventosData) {
        const data = linha[dataIdx];
        const nomeEvento = linha[nomeIdx];
        const contagem = parseInt(linha[contagemIdx], 10);

        if (!data || !nomeEvento || isNaN(contagem)) continue;

        if (!eventosPorData[data]) eventosPorData[data] = {};
        if (!eventosPorData[data][nomeEvento]) eventosPorData[data][nomeEvento] = 0;
        
        eventosPorData[data][nomeEvento] += contagem;
        allDates.add(data);
    }
    
    const sortedDates = Array.from(allDates).sort();
    const eventosSelecionadosNomes = eventosSelecionados.map(e => e.valor);

    const resultadosJornadas = jornadas.map(jornada => {
        const eventosJornadaNomes = jornada.eventos.map(e => e.nome);
        const ultimoEventoNome = eventosJornadaNomes[eventosJornadaNomes.length - 1];
        
        let totalEventos = 0;
        const funil = {};
        jornada.eventos.forEach(e => {
            funil[e.rotulo] = { contagem: 0, usuarios: 0 };
        });

        // Process funnel data from already filtered eventosData
        for (const linha of eventosData) {
            const nomeEvento = linha[nomeIdx];
            if (eventosJornadaNomes.includes(nomeEvento)) {
                const contagem = parseInt(linha[contagemIdx], 10);
                const usuarios = parseInt(linha[usuariosIdx], 10);
                const rotulo = jornada.eventos.find(e => e.nome === nomeEvento).rotulo;
                
                funil[rotulo].contagem += contagem;
                funil[rotulo].usuarios += usuarios;
                totalEventos += contagem;
            }
        }

        const firstStepRotulo = jornada.eventos[0].rotulo;
        const bigNumbers = {
            totalEventos: totalEventos,
            totalUsuarios: funil[firstStepRotulo].usuarios,
            eventosPorUsuario: funil[firstStepRotulo].usuarios > 0 ? (totalEventos / funil[firstStepRotulo].usuarios).toFixed(2) : 0
        };

        // Process SKUs for the last event
        let skus = {};
        if (jornada.showSkus) {
            const skusData = readCSV(getDataPath(context, `historico_skus_${ultimoEventoNome}.csv`));
            if (skusData.length > 0) {
                const sHeader = skusData[0];
                const sDataIdx = getColumnIndex(sHeader, 'Data');
                const sSkuIdx = getColumnIndex(sHeader, 'SKU');
                const sPaisIdx = getColumnIndex(sHeader, 'Pais'); // Nova coluna
                const sContagemIdx = getColumnIndex(sHeader, 'ContagemDeEventos');
                
                for (const linha of skusData.slice(1)) {
                    if (linha.length < 3) continue;
                    
                    // Filtro de Data
                    const dataCSV = parseDateAsUTC(linha[sDataIdx]);
                    if (dataCSV < startDate || dataCSV > endDate) continue;

                    // Filtro de País (se a coluna existir no CSV)
                    if (countryFilter !== 'all' && sPaisIdx !== -1) {
                        if (linha[sPaisIdx] !== countryFilter) continue;
                    }

                    const sku = linha[sSkuIdx] || '(not set)';
                    const contagem = parseInt(linha[sContagemIdx], 10);
                    if (!isNaN(contagem)) {
                        skus[sku] = (skus[sku] || 0) + contagem;
                    }
                }
            }
        }

        let telas = {};
        if (jornada.showTelas) {
            const telasData = readCSV(getDataPath(context, `historico_telas_${ultimoEventoNome}.csv`));
            if (telasData.length > 0) {
                const tHeader = telasData[0];
                const tDataIdx = getColumnIndex(tHeader, 'Data');
                const tTelaIdx = getColumnIndex(tHeader, 'Tela');
                const tPaisIdx = getColumnIndex(tHeader, 'Pais'); // Nova coluna
                const tContagemIdx = getColumnIndex(tHeader, 'ContagemDeEventos');

                for (const linha of telasData.slice(1)) {
                    if (linha.length < 3) continue;
                    
                    // Filtro de Data
                    const dataCSV = parseDateAsUTC(linha[tDataIdx]);
                    if (dataCSV < startDate || dataCSV > endDate) continue;

                    // Filtro de País (se a coluna existir no CSV)
                    if (countryFilter !== 'all' && tPaisIdx !== -1) {
                        if (linha[tPaisIdx] !== countryFilter) continue;
                    }

                    const tela = linha[tTelaIdx] || '(not set)';
                    const contagem = parseInt(linha[tContagemIdx], 10);
                    if (!isNaN(contagem)) {
                        telas[tela] = (telas[tela] || 0) + contagem;
                    }
                }
            }
        }
        
        const correlacoesTabela = calcularCorrelacoes(eventosJornadaNomes, eventosSelecionadosNomes, eventosPorData, sortedDates, eventMap);
        const eventFunilPeriodico = calcularFunilPeriodico(jornada.eventos, eventosData, 'contagem', dataIdx, nomeIdx, contagemIdx);
        const userFunilPeriodico = calcularFunilPeriodico(jornada.eventos, eventosData, 'usuarios', dataIdx, nomeIdx, usuariosIdx);

        const result = {
            id: jornada.id,
            nome: jornada.nome,
            bigNumbers,
            eventos: jornada.eventos,
            pizzas: {},
            correlacoesTabela: correlacoesTabela
        };

        if (jornada.showFunil) result.funil = funil;
        if (jornada.showSkus) result.pizzas.skus = getTop5(skus);
        if (jornada.showTelas) result.pizzas.telas = getTop5(telas);
        if (jornada.showEventPeriodicFunnel) result.eventFunilPeriodico = eventFunilPeriodico;
        if (jornada.showUserPeriodicFunnel) result.userFunilPeriodico = userFunilPeriodico;

        return result;
    });

    return { jornadas: resultadosJornadas };
}

function calcularFunilPeriodico(eventosJornada, eventosData, metric, dataIdx, nomeIdx, valIdx) {
    const funilPeriodico = {};
    const eventosJornadaNomes = new Set(eventosJornada.map(e => e.nome));
    const rotuloPorNome = new Map(eventosJornada.map(e => [e.nome, e.rotulo]));

    for (const linha of eventosData) {
        const nomeEvento = linha[nomeIdx];
        if (!eventosJornadaNomes.has(nomeEvento)) continue;

        const data = linha[dataIdx];
        const valor = parseInt(linha[valIdx], 10);
        if (!data || isNaN(valor)) continue;

        const mesAno = data.substring(0, 7); // "YYYY-MM"
        const rotulo = rotuloPorNome.get(nomeEvento);

        if (!funilPeriodico[mesAno]) {
            funilPeriodico[mesAno] = {};
            for (const evento of eventosJornada) {
                funilPeriodico[mesAno][evento.rotulo] = 0;
            }
        }
        funilPeriodico[mesAno][rotulo] += valor;
    }
    return funilPeriodico;
}

function calcularCorrelacoes(eventosJornadaNomes, eventosSelecionadosNomes, eventosPorData, sortedDates, eventMap) {
    const journeyTimeSeries = sortedDates.map(date => {
        let sum = 0;
        for (const nomeEvento of eventosJornadaNomes) {
            if (eventosPorData[date] && eventosPorData[date][nomeEvento]) {
                sum += eventosPorData[date][nomeEvento];
            }
        }
        return sum;
    });

    const correlations = [];
    for (const nomeEvento of eventosSelecionadosNomes) {
        if (eventosJornadaNomes.includes(nomeEvento)) continue;

        const eventTimeSeries = sortedDates.map(date => {
            return (eventosPorData[date] && eventosPorData[date][nomeEvento]) ? eventosPorData[date][nomeEvento] : 0;
        });

        if (journeyTimeSeries.length > 1 && eventTimeSeries.length > 1 && eventTimeSeries.some(v => v > 0)) {
            const correlation = ss.sampleCorrelation(journeyTimeSeries, eventTimeSeries);
            if (!isNaN(correlation)) {
                correlations.push({ name: eventMap.get(nomeEvento) || nomeEvento, count: correlation });
            }
        }
    }

    return correlations.sort((a, b) => b.count - a.count);
}

function getTop5(data) {
    return Object.entries(data)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
}

// API endpoint for the frontend
app.get('/data', async (req, res) => {
    try {
        const { start, end, context, pais } = req.query;

        if (!start || !end) {
            return res.status(400).json({ error: "Please provide start and end dates." });
        }

        const startDate = parseDateAsUTC(start);
        const endDate = parseDateAsUTC(end);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
        }

        const dados = await processarJornadas(context, startDate, endDate, pais || 'all');
        res.json(dados);
    } catch (e) {
        console.error("Error in /data endpoint:", e.message);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/paises', async (req, res) => {
    try {
        const { context } = req.query;
        const historicoPath = getDataPath(context, 'historico_eventos.csv');
        const csvData = readCSV(historicoPath);
        
        if (csvData.length < 1) return res.json([]);

        const header = csvData[0];
        const paisIdx = getColumnIndex(header, 'Pais');

        if (paisIdx === -1) return res.json([]);

        const paises = [...new Set(csvData.slice(1).map(linha => linha[paisIdx]).filter(Boolean))].sort();
        res.json(paises);
    } catch (e) {
        console.error("Error fetching countries:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// Main route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(express.json());

app.get('/config.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'config.html'));
});

app.get('/api/jornadas', async (req, res) => {
    try {
        const context = req.query.context;
        const jornadas = await getJornadasFromDB(context);
        res.json(jornadas);
    } catch (e) {
        console.error("Error fetching jornadas from DB:", e.message);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/jornadas', async (req, res) => {
    const client = await pool.connect();
    try {
        const context = req.query.context;
        const novasJornadas = req.body;
        
        const jornadasTable = getTableName(context, 'jornadas');
        const jornadaEventosTable = getTableName(context, 'jornada_eventos');

        await client.query('BEGIN');

        // 1. Sync Journeys: Delete those not in the payload
        const payloadIds = novasJornadas.map(j => j.id);
        
        if (payloadIds.length > 0) {
            // Create placeholders $1, $2, ... for the NOT IN clause
            const placeholders = payloadIds.map((_, i) => `$${i + 1}`).join(',');
            await client.query(`DELETE FROM ${jornadasTable} WHERE id NOT IN (${placeholders})`, payloadIds);
        } else {
            // If payload is empty, user deleted all journeys
             await client.query(`DELETE FROM ${jornadasTable}`);
        }

        // 2. Upsert Journeys and Replace Events
        for (const jornada of novasJornadas) {
            // Upsert Journey
            await client.query(
                `INSERT INTO ${jornadasTable} (id, nome, show_funil, show_skus, show_telas, show_correlacoes, show_event_periodic_funnel, show_user_periodic_funnel)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (id) DO UPDATE SET
                    nome = EXCLUDED.nome,
                    show_funil = EXCLUDED.show_funil,
                    show_skus = EXCLUDED.show_skus,
                    show_telas = EXCLUDED.show_telas,
                    show_correlacoes = EXCLUDED.show_correlacoes,
                    show_event_periodic_funnel = EXCLUDED.show_event_periodic_funnel,
                    show_user_periodic_funnel = EXCLUDED.show_user_periodic_funnel`,
                [
                    jornada.id,
                    jornada.nome,
                    jornada.showFunil,
                    jornada.showSkus,
                    jornada.showTelas,
                    jornada.showCorrelacoes,
                    jornada.showEventPeriodicFunnel,
                    jornada.showUserPeriodicFunnel
                ]
            );

            // Replace Events for this Journey
            // We wipe events only for this specific journey ID to ensure the new list is exact
            await client.query(`DELETE FROM ${jornadaEventosTable} WHERE jornada_id = $1`, [jornada.id]);

            if (jornada.eventos && jornada.eventos.length > 0) {
                let ordem = 1;
                for (const evento of jornada.eventos) {
                    await client.query(
                        `INSERT INTO ${jornadaEventosTable} (jornada_id, evento_valor, rotulo, ordem)
                         VALUES ($1, $2, $3, $4)`,
                        [jornada.id, evento.nome, evento.rotulo, ordem++]
                    );
                }
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Jornadas salvas com sucesso no banco de dados!' });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Error saving jornadas to DB:", e.message);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});





app.get('/config_eventos.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'config_eventos.html'));
});

app.get('/api/eventos_selecionados', async (req, res) => {
    try {
        const context = req.query.context;
        const eventoTable = getTableName(context, 'evento');
        const { rows } = await db.query(`SELECT valor, rotulo FROM ${eventoTable} ORDER BY rotulo`);
        res.json(rows);
    } catch (e) {
        console.error("Error fetching eventos from db:", e.message);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/eventos_selecionados', async (req, res) => {
    const { rotulo, valor, valorOriginal, context } = req.body;
    const eventoTable = getTableName(context, 'evento');

    if (!rotulo || !valor) {
        return res.status(400).json({ message: 'Rótulo and Valor are required.' });
    }

    try {
        if (valorOriginal) { // UPDATE
            await db.query(`UPDATE ${eventoTable} SET rotulo = $1, valor = $2 WHERE valor = $3`, [rotulo, valor, valorOriginal]);
        } else { // INSERT
            await db.query(`INSERT INTO ${eventoTable} (valor, rotulo) VALUES ($1, $2)`, [valor, rotulo]);
        }
        res.json({ message: 'Evento salvo com sucesso!' });
    } catch (e) {
        console.error("Error saving evento to db:", e);
        if (e.code === '23505') { // unique_violation
            return res.status(409).json({ message: `O valor '${valor}' já existe.` });
        }
        res.status(500).json({ message: e.message });
    }
});

app.delete('/api/eventos_selecionados/:valor', async (req, res) => {
    const { valor } = req.params;
    const { context } = req.query;
    const eventoTable = getTableName(context, 'evento');
    try {
        await db.query(`DELETE FROM ${eventoTable} WHERE valor = $1`, [valor]);
        res.json({ message: 'Evento excluído com sucesso!' });
    } catch (e) {
        console.error("Error deleting event from db:", e);
        res.status(500).json({ message: e.message });
    }
});

app.post('/api/sync-events', async (req, res) => {
    const { context } = req.body;
    const eventoTable = getTableName(context, 'evento');
    const client = await pool.connect();

    try {
        // Read unique event names from the CSV
        const historicoPath = getDataPath(context, 'historico_eventos.csv');
        const eventosData = readCSV(historicoPath);
        const uniqueEventos = [...new Set(eventosData.map(line => line[1]).filter(Boolean))];

        await client.query('BEGIN');

        // Create a temporary table to hold the new event values
        await client.query(`CREATE TEMP TABLE temp_eventos (valor TEXT NOT NULL)`);

        // Insert unique events from CSV into the temporary table
        for (const evento of uniqueEventos) {
            await client.query('INSERT INTO temp_eventos (valor) VALUES ($1)', [evento]);
        }

        // Insert only new events from the temp table into the main event table
        // We use the `rotulo` as the `valor` for simplicity, as requested
        await client.query(`
            INSERT INTO ${eventoTable} (valor, rotulo)
            SELECT t.valor, t.valor
            FROM temp_eventos t
            LEFT JOIN ${eventoTable} e ON t.valor = e.valor
            WHERE e.valor IS NULL
        `);

        await client.query('COMMIT');
        res.json({ message: 'Sincronização de eventos concluída com sucesso!' });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Error syncing events:", e);
        res.status(500).json({ message: e.message });
    } finally {
        client.release();
    }
});


app.get('/api/top-events', async (req, res) => {
    try {
        const { start, end, context, pais: countryFilter } = req.query;
        const eventoTable = getTableName(context, 'evento');

        if (!start || !end) {
            return res.status(400).json({ error: "Please provide start and end dates." });
        }

        const startDate = parseDateAsUTC(start);
        const endDate = parseDateAsUTC(end);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
        }

        const { rows: eventosSelecionados } = await db.query(`SELECT valor, rotulo FROM ${eventoTable}`);
        const eventMap = new Map(eventosSelecionados.map(e => [e.valor, e.rotulo]));

        const historicoPath = getDataPath(context, 'historico_eventos.csv');
        const csvData = readCSV(historicoPath);
        
        if (csvData.length < 2) return res.json([]);

        const header = csvData[0];
        const dataIdx = getColumnIndex(header, 'Data');
        const nomeIdx = getColumnIndex(header, 'NomeDoEvento');
        const paisIdx = getColumnIndex(header, 'Pais');
        const contagemIdx = getColumnIndex(header, 'ContagemDeEventos');
        const usuariosIdx = getColumnIndex(header, 'TotalDeUsuarios');

        const eventAggregates = {};

        for (const linha of csvData.slice(1)) {
            const nomeEvento = linha[nomeIdx];
            if (!eventMap.has(nomeEvento)) continue;

            const data = linha[dataIdx];
            const dataCSV = parseDateAsUTC(data);
            if (dataCSV < startDate || dataCSV > endDate) continue;

            // Country Filter
            if (countryFilter && countryFilter !== 'all' && paisIdx !== -1) {
                if (linha[paisIdx] !== countryFilter) continue;
            }

            const contagem = parseInt(linha[contagemIdx], 10);
            const usuarios = parseInt(linha[usuariosIdx], 10);

            if (isNaN(contagem) || isNaN(usuarios)) continue;

            if (!eventAggregates[nomeEvento]) {
                eventAggregates[nomeEvento] = {
                    nome: nomeEvento,
                    rotulo: eventMap.get(nomeEvento) || nomeEvento,
                    contagem: 0,
                    usuarios: 0
                };
            }
            eventAggregates[nomeEvento].contagem += contagem;
            eventAggregates[nomeEvento].usuarios += usuarios;
        }
        
        const topEvents = Object.values(eventAggregates)
            .sort((a, b) => b.contagem - a.contagem);

        res.json(topEvents);

    } catch (e) {
        console.error("Error in /api/top-events endpoint:", e.message);
        res.status(500).json({ error: e.message });
    }
});

const db = require('./db');
const { pool } = db;
app.get('/db-test', async (req, res) => {
    try {
        const result = await db.query('SELECT 1 + 1 AS solution;');
        res.json({
            message: 'Database connection successful!',
            solution: result.rows[0].solution
        });
    } catch (err) {
        console.error('Database connection error:', err);
        res.status(500).json({
            message: 'Database connection failed.',
            error: err.message
        });
    }
});

app.listen(port, () => {
    console.log(`Dashboard server running on port ${port}`);
});