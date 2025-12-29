const axios = require('axios');
const fs = require('fs');
const { SEU_COOKIE, SEU_TOKEN_XSRF } = require('./config_headers.js');

// --- Configurações ---
const DATA_INICIO = '2025-11-01';
const DATA_FIM = '2025-12-21';
const NOME_ARQUIVO_SAIDA = 'historico_eventos.csv';
const URL_API = 'https://analytics.google.com/analytics/app/data/v2/venus?reportId=explorer_card_explorerCard&dataset=p151460007&fpn=287695367178&hl=pt_BR&gamonitor=firebase&state=app.reports.reports.explorer';
const TAMANHO_PAGINA = 250; // O payload que você enviou usa um limite de 250
// --------------------

const http = axios.create({
  headers: {
    'Cookie': SEU_COOKIE,
    'x-gafe4-xsrf-token': SEU_TOKEN_XSRF,
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
  },
  timeout: 30000 // 30 segundos de timeout
});

// Função para criar o payload base
function criarPayloadEventos(data, offset = 0) {
  return {
    "entity": { "propertyId": "151460007", "identityBlendingStrategy": 2 },
    "requests": [
      // ... (As duas primeiras requests do seu exemplo, que parecem ser para gráficos) ...
      // Request 1
      { "dimensions": [{ "name": "nth_day", "isSecondary": false }, { "name": "event_name", "isSecondary": true }], "dimensionFilters": [{ "filters": [{ "fieldName": "event_name", "expression": "(not set)|unknown|(other)|", "expressionList": ["(not set)", "unknown", "(other)", ""], "evaluation": 7, "complement": true, "isCaseSensitive": true }] }], "metrics": [{ "name": "event_count", "isInvisible": false, "isSecondary": true }], "metricFilters": [], "cardName": "explorer_top-events", "cardId": "explorerCard", "requestGrandTotal": false, "dateRanges": [{ "startDate": data, "endDate": data }], "rowAxis": { "fieldNames": ["nth_day"], "sorts": [{ "fieldName": "nth_day", "sortType": 1, "isDesc": false, "pivotSortInfos": [] }], "limit": 5000, "offset": 0, "metaAggTypes": [] }, "columnAxis": { "fieldNames": ["event_name"], "offset": 0, "metaAggTypes": [], "limit": 5, "sorts": [{ "fieldName": "event_count", "isDesc": true, "sortType": 1 }] } },
      // Request 2
      { "dimensions": [{ "name": "nth_day", "isSecondary": false }], "dimensionFilters": [], "metrics": [{ "name": "event_count", "isInvisible": false, "isSecondary": false }], "metricFilters": [], "cardName": "explorer_top-events", "cardId": "explorerCard", "requestGrandTotal": false, "dateRanges": [{ "startDate": data, "endDate": data }], "rowAxis": { "fieldNames": ["nth_day"], "sorts": [{ "fieldName": "nth_day", "sortType": 1, "isDesc": false, "pivotSortInfos": [] }, { "fieldName": "event_count", "sortType": 1, "isDesc": false, "pivotSortInfos": [] }], "limit": 5000, "offset": 0, "metaAggTypes": [] } },
      // Request 3 (A principal que vamos paginar)
      { "dimensions": [{ "name": "event_name", "isSecondary": false }, { "name": "filter_partition", "isSecondary": true }], "dimensionFilters": [{ "filters": [{ "fieldName": "event_name", "expression": "(not set)|unknown|(other)|", "expressionList": ["(not set)", "unknown", "(other)", ""], "evaluation": 7, "complement": true, "isCaseSensitive": true }] }], "metrics": [{ "name": "event_count", "isInvisible": false, "isSecondary": false }, { "name": "total_users", "isInvisible": false, "isSecondary": false }, { "name": "eventCountPerUser", "isInvisible": false, "isSecondary": false, "expression": "event_count/active_users" }, { "name": "combinedRevenue", "isInvisible": false, "isSecondary": false, "expression": "total_ad_revenue + revenue - refund_value" }], "metricFilters": [], "cardName": "explorer_top-events", "cardId": "explorerCard", "requestGrandTotal": true, "dateRanges": [{ "startDate": data, "endDate": data }], "rowAxis": { "fieldNames": ["event_name"], "sorts": [{ "fieldName": "event_count", "sortType": 3, "isDesc": true, "pivotSortInfos": [{ "dimensionName": "date_range", "dimensionValue": "date_range_0" }] }, { "fieldName": "event_name", "sortType": 1, "isDesc": false, "pivotSortInfos": [] }, { "fieldName": "total_users", "sortType": 1, "isDesc": false, "pivotSortInfos": [] }, { "fieldName": "eventCountPerUser", "sortType": 1, "isDesc": false, "pivotSortInfos": [] }, { "fieldName": "combinedRevenue", "sortType": 1, "isDesc": false, "pivotSortInfos": [] }], 
        "limit": TAMANHO_PAGINA, // Usamos o tamanho da página aqui
        "offset": offset, // O offset que será incrementado
        "metaAggTypes": [] 
      }, "filterPartitions": [{ "name": "Todos os usuários", "dimensionFilters": [] }], "columnAxis": { "fieldNames": ["filter_partition"], "sorts": [{ "fieldName": "filter_partition", "sortType": 1 }] } }
    ],
    "reportId": "explorer_card_explorerCard",
    "reportTitle": "top-events",
    "guid": "A0AB4BA2-540A-4855-B16F-844441A88FF7", // GUID pode ser qualquer um
    "reportingRequestMetadata": { "isDefault": false, "reportType": 0, "hasNonDefaultFilter": false, "comparisonCount": 1, "isFromFirebase": true }
  };
}

// Função para extrair dados da resposta da API
function extrairDados(responseData, data) {
  const linhasCSV = [];
  try {
    // A resposta do JSON que você colou está dentro de uma string
    // Primeiro, removemos os caracteres de escape
    const jsonString = responseData.substring(responseData.indexOf('{'), responseData.lastIndexOf('}') + 1);
    const dados = JSON.parse(jsonString);

    // Navegamos até a lista de eventos (requests[2] -> responseRows)
    const respostaEventos = dados.default.responses[2];
    const linhas = respostaEventos.responseRows;

    linhas.forEach(linha => {
      // [ { "value": "event_17015" } ]
      const nomeEvento = linha.dimensionCompoundValues[0].value;
      
      // [ { "value": 10020459 }, { "value": 70088 }, ... ]
      const contagemEventos = linha.metricCompoundValues[0].value;
      const totalUsuarios = linha.metricCompoundValues[1].value;
      const eventosPorUsuario = linha.metricCompoundValues[2].value;
      const receitaCombinada = linha.metricCompoundValues[3].value;

      linhasCSV.push(`"${data}","${nomeEvento}",${contagemEventos},${totalUsuarios},${eventosPorUsuario},${receitaCombinada}`);
    });

    const totalLinhas = respostaEventos.overallRowCount || 0;
    return { linhasCSV, totalLinhas };

  } catch (e) {
    console.error(`Erro ao processar JSON para data ${data}: ${e.message}`);
    console.error('Resposta recebida:', responseData.substring(0, 500) + '...'); // Loga o início da resposta problemática
    return { linhasCSV: [], totalLinhas: 0 };
  }
}

// Função para pausar a execução
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Função principal
async function buscarHistorico() {
  console.log('Iniciando extração de EVENTOS...');
  const stream = fs.createWriteStream(NOME_ARQUIVO_SAIDA);
  stream.write("Data,NomeDoEvento,ContagemDeEventos,TotalDeUsuarios,EventosPorUsuario,ReceitaCombinada\n");

  let dataAtual = new Date(DATA_INICIO + 'T12:00:00Z'); // Usar T12:00:00Z para evitar problemas de fuso
  const dataFim = new Date(DATA_FIM + 'T12:00:00Z');

  while (dataAtual <= dataFim) {
    const dataFormatada = dataAtual.toISOString().split('T')[0];
    let offset = 0;
    let totalLinhasNaqueleDia = 0;
    let linhasProcessadas = 0;
    let temMaisPaginas = true;

    console.log(`Buscando dados para ${dataFormatada}...`);

    while (temMaisPaginas) {
      console.log(`  -> Página com offset: ${offset}`);
      const payload = criarPayloadEventos(dataFormatada, offset);

      try {
        const resposta = await http.post(URL_API, JSON.stringify(payload));
        const { linhasCSV, totalLinhas } = extrairDados(resposta.data, dataFormatada);

        if (linhasCSV.length > 0) {
          stream.write(linhasCSV.join('\n') + '\n');
        }

        // Atualiza os contadores de paginação
        if (totalLinhasNaqueleDia === 0) {
            totalLinhasNaqueleDia = totalLinhas;
        }
        linhasProcessadas += linhasCSV.length;
        offset += TAMANHO_PAGINA;

        if (linhasProcessadas >= totalLinhasNaqueleDia) {
          temMaisPaginas = false;
        }

      } catch (err) {
        console.error(`ERRO FATAL ao buscar ${dataFormatada} (offset ${offset}). Verifique seus tokens no config_headers.js.`);
        console.error('Mensagem:', err.message);
        temMaisPaginas = false; // Pula para o próximo dia
      }
      await sleep(1000); // Pausa de 1 segundo entre as páginas
    }

    // Avança para o próximo dia
    dataAtual.setDate(dataAtual.getDate() + 1);
  }

  stream.end();
  console.log(`Extração de EVENTOS concluída! Arquivo salvo em: ${NOME_ARQUIVO_SAIDA}`);
}

// Verifica se os headers foram preenchidos
if (SEU_COOKIE === "COLE_O_VALOR_DO_HEADER_COOKIE_AQUI" || SEU_TOKEN_XSRF === "COLE_O_VALOR_DO_HEADER_XSRF_TOKEN_AQUI") {
  console.error("ERRO: Por favor, atualize os valores de 'SEU_COOKIE' e 'SEU_TOKEN_XSRF' no arquivo 'config_headers.js' antes de executar.");
} else {
  buscarHistorico();
}