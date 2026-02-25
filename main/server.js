function getTableName(context, baseName) {
    if (context === 'dupe') {
        return `dupe_${baseName}`;
    }
    return baseName;
}
require('dotenv').config();
const db = require('./db');
const { pool } = db;
function getDataPath(context, filename) {
    return path.join(__dirname, '..', 'extrações', filename);
}
function getPreferredHistoricoPath(context) {
    const historicoFiltradoPath = getDataPath(context, 'historico_eventos_filtrado.csv');
    return fs.existsSync(historicoFiltradoPath)
        ? historicoFiltradoPath
        : getDataPath(context, 'historico_eventos.csv');
}
const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const readline = require('readline');
const app = express();
const port = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname)));
function parseDateAsUTC(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
}
function processCSVStream(filePath, onLine, onEnd, onError) {
    if (!fs.existsSync(filePath)) {
        onEnd();
        return;
    }
    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity
    });
    rl.on('line', (line) => {
        if (line.trim() !== '') {
            const matches = line.match(/(".*?"|[^",]+|(?<=,)(?=,)|(?<=,)$|^$)/g);
            if (matches) {
                onLine(matches.map(field => field.replace(/^"|"$/g, '').trim()));
            }
        }
    });
    rl.on('close', onEnd);
    rl.on('error', onError);
    stream.on('error', onError);
}
const ss = require('simple-statistics');
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
function getColumnIndex(header, columnName) {
    return header.findIndex(col => col.toLowerCase() === columnName.toLowerCase());
}
async function processarJornadas(context, startDate, endDate, countryFilter = 'all') {
    return new Promise(async (resolve, reject) => {
        console.log(`Processing data for context: ${context}, Country: ${countryFilter}`);
        const jornadas = await getJornadasFromDB(context);
        const eventoTable = getTableName(context, 'evento');
        const { rows: eventosSelecionados } = await db.query(`SELECT valor, rotulo FROM ${eventoTable}`);
        const eventMap = new Map(eventosSelecionados.map(e => [e.valor, e.rotulo]));
        const eventosPermitidos = new Set(eventosSelecionados.map(e => e.valor));
        const historicoPath = getPreferredHistoricoPath(context);
        const eventosData = [];
        let header;
        let dataIdx, nomeIdx, paisIdx, contagemIdx, usuariosIdx;
        processCSVStream(historicoPath,
            (linha) => {
                if (!header) {
                    header = linha;
                    dataIdx = getColumnIndex(header, 'Data');
                    nomeIdx = getColumnIndex(header, 'NomeDoEvento');
                    paisIdx = getColumnIndex(header, 'Pais');
                    contagemIdx = getColumnIndex(header, 'ContagemDeEventos');
                    usuariosIdx = getColumnIndex(header, 'TotalDeUsuarios');
                    return;
                }
                if (linha.length < 2) return;
                if (!eventosPermitidos.has(linha[nomeIdx])) return;
                const dataCSV = parseDateAsUTC(linha[dataIdx]);
                if (dataCSV < startDate || dataCSV > endDate) return;
                if (countryFilter !== 'all' && paisIdx !== -1 && linha[paisIdx] === countryFilter) {
                    eventosData.push(linha);
                } else if (countryFilter === 'all') {
                    eventosData.push(linha);
                }
            },
            async () => {
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
                const resultadosJornadas = await Promise.all(jornadas.map(async jornada => {
                    const eventosJornadaNomes = jornada.eventos.map(e => e.nome);
                    const ultimoEventoNome = eventosJornadaNomes[eventosJornadaNomes.length - 1];
                    let totalEventos = 0;
                    const funil = {};
                    jornada.eventos.forEach(e => {
                        funil[e.rotulo] = { contagem: 0, usuarios: 0 };
                    });
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
                        totalUsuarios: funil[firstStepRotulo] ? funil[firstStepRotulo].usuarios : 0,
                        eventosPorUsuario: funil[firstStepRotulo] && funil[firstStepRotulo].usuarios > 0 ? (totalEventos / funil[firstStepRotulo].usuarios).toFixed(2) : 0
                    };
                    let skus = {};
                    if (jornada.showSkus) {
                        await new Promise((resolve, reject) => {
                            let sHeader = null;
                            let sDataIdx, sSkuIdx, sPaisIdx, sContagemIdx;
                            processCSVStream(getDataPath(context, `historico_skus_${ultimoEventoNome}.csv`),
                                (linha) => {
                                    if (!sHeader) {
                                        sHeader = linha;
                                        sDataIdx = getColumnIndex(sHeader, 'Data');
                                        sSkuIdx = getColumnIndex(sHeader, 'SKU');
                                        sPaisIdx = getColumnIndex(sHeader, 'Pais'); 
                                        sContagemIdx = getColumnIndex(sHeader, 'ContagemDeEventos');
                                        return;
                                    }
                                    if (linha.length < 3) return;
                                    const dataCSV = parseDateAsUTC(linha[sDataIdx]);
                                    if (dataCSV < startDate || dataCSV > endDate) return;
                                    if (countryFilter !== 'all' && sPaisIdx !== -1) {
                                        if (linha[sPaisIdx] !== countryFilter) return;
                                    }
                                    const sku = linha[sSkuIdx] || '(not set)';
                                    const contagem = parseInt(linha[sContagemIdx], 10);
                                    if (!isNaN(contagem)) {
                                        skus[sku] = (skus[sku] || 0) + contagem;
                                    }
                                },
                                resolve,
                                reject
                            );
                        });
                    }
                    let telas = {};
                    if (jornada.showTelas) {
                        await new Promise((resolve, reject) => {
                            let tHeader = null;
                            let tDataIdx, tTelaIdx, tPaisIdx, tContagemIdx;
                            processCSVStream(getDataPath(context, `historico_telas_${ultimoEventoNome}.csv`),
                                (linha) => {
                                    if (!tHeader) {
                                        tHeader = linha;
                                        tDataIdx = getColumnIndex(tHeader, 'Data');
                                        tTelaIdx = getColumnIndex(tHeader, 'Tela');
                                        tPaisIdx = getColumnIndex(tHeader, 'Pais'); 
                                        tContagemIdx = getColumnIndex(tHeader, 'ContagemDeEventos');
                                        return;
                                    }
                                    if (linha.length < 3) return;
                                    const dataCSV = parseDateAsUTC(linha[tDataIdx]);
                                    if (dataCSV < startDate || dataCSV > endDate) return;
                                    if (countryFilter !== 'all' && tPaisIdx !== -1) {
                                        if (linha[tPaisIdx] !== countryFilter) return;
                                    }
                                    const tela = linha[tTelaIdx] || '(not set)';
                                    const contagem = parseInt(linha[tContagemIdx], 10);
                                    if (!isNaN(contagem)) {
                                        telas[tela] = (telas[tela] || 0) + contagem;
                                    }
                                },
                                resolve,
                                reject
                            );
                        });
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
                }));
                resolve({ jornadas: resultadosJornadas });
            },
            (err) => reject(err)
        );
    });
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
        const mesAno = data.substring(0, 7); 
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
app.get('/api/paises', (req, res) => {
    try {
        const { context } = req.query;
        const historicoPath = getPreferredHistoricoPath(context);
        const paises = new Set();
        let header = true;
        let paisIdx = -1;
        processCSVStream(historicoPath,
            (linha) => {
                if (header) {
                    paisIdx = getColumnIndex(linha, 'Pais');
                    header = false;
                    return;
                }
                if (paisIdx !== -1 && linha[paisIdx]) {
                    paises.add(linha[paisIdx]);
                }
            },
            () => {
                res.json(Array.from(paises).sort());
            },
            (err) => {
                console.error("Error fetching countries:", err.message);
                res.status(500).json({ error: err.message });
            }
        );
    } catch (e) {
        console.error("Error fetching countries:", e.message);
        res.status(500).json({ error: e.message });
    }
});
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
        const payloadIds = novasJornadas.map(j => j.id);
        if (payloadIds.length > 0) {
            const placeholders = payloadIds.map((_, i) => `$${i + 1}`).join(',');
            await client.query(`DELETE FROM ${jornadasTable} WHERE id NOT IN (${placeholders})`, payloadIds);
        } else {
             await client.query(`DELETE FROM ${jornadasTable}`);
        }
        for (const jornada of novasJornadas) {
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
        if (valorOriginal) { 
            await db.query(`UPDATE ${eventoTable} SET rotulo = $1, valor = $2 WHERE valor = $3`, [rotulo, valor, valorOriginal]);
        } else { 
            await db.query(`INSERT INTO ${eventoTable} (valor, rotulo) VALUES ($1, $2)`, [valor, rotulo]);
        }
        res.json({ message: 'Evento salvo com sucesso!' });
    } catch (e) {
        console.error("Error saving evento to db:", e);
        if (e.code === '23505') { 
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
        const historicoPath = getDataPath(context, 'historico_eventos.csv');
        const uniqueEventos = new Set();
        let header = true;
        processCSVStream(historicoPath,
            (line) => {
                if (header) {
                    header = false;
                    return;
                }
                if (line[1]) {
                    uniqueEventos.add(line[1]);
                }
            },
            async () => {
                await client.query('BEGIN');
                await client.query(`CREATE TEMP TABLE temp_eventos (valor TEXT NOT NULL)`);
                for (const evento of uniqueEventos) {
                    await client.query('INSERT INTO temp_eventos (valor) VALUES ($1)', [evento]);
                }
                await client.query(`
                    INSERT INTO ${eventoTable} (valor, rotulo)
                    SELECT t.valor, t.valor
                    FROM temp_eventos t
                    LEFT JOIN ${eventoTable} e ON t.valor = e.valor
                    WHERE e.valor IS NULL
                `);
                await client.query('COMMIT');
                res.json({ message: 'Sincronização de eventos concluída com sucesso!' });
                client.release();
            },
            async (err) => {
                await client.query('ROLLBACK');
                console.error("Error syncing events:", err);
                res.status(500).json({ message: err.message });
                client.release();
            }
        );
    } catch (e) {
        console.error("Error syncing events:", e);
        res.status(500).json({ message: e.message });
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
        const historicoPath = getPreferredHistoricoPath(context);
        const eventAggregates = {};
        let header;
        let dataIdx, nomeIdx, paisIdx, contagemIdx, usuariosIdx;
        processCSVStream(historicoPath,
            (linha) => {
                if (!header) {
                    header = linha;
                    dataIdx = getColumnIndex(header, 'Data');
                    nomeIdx = getColumnIndex(header, 'NomeDoEvento');
                    paisIdx = getColumnIndex(header, 'Pais');
                    contagemIdx = getColumnIndex(header, 'ContagemDeEventos');
                    usuariosIdx = getColumnIndex(header, 'TotalDeUsuarios');
                    return;
                }
                const nomeEvento = linha[nomeIdx];
                if (!eventMap.has(nomeEvento)) return;
                const data = linha[dataIdx];
                const dataCSV = parseDateAsUTC(data);
                if (dataCSV < startDate || dataCSV > endDate) return;
                if (countryFilter && countryFilter !== 'all' && paisIdx !== -1) {
                    if (linha[paisIdx] !== countryFilter) return;
                }
                const contagem = parseInt(linha[contagemIdx], 10);
                const usuarios = parseInt(linha[usuariosIdx], 10);
                if (isNaN(contagem) || isNaN(usuarios)) return;
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
            },
            () => {
                const topEvents = Object.values(eventAggregates)
                    .sort((a, b) => b.contagem - a.contagem);
                res.json(topEvents);

            },
            (err) => {
                console.error("Error in /api/top-events endpoint:", err.message);
                res.status(500).json({ error: err.message });
            }
        );
    } catch (e) {
        console.error("Error in /api/top-events endpoint:", e.message);
        res.status(500).json({ error: e.message });
    }
});
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