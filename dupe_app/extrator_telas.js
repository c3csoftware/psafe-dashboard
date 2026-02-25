const axios = require('axios');
const fs = require('fs');
const { SEU_COOKIE, SEU_TOKEN_XSRF } = require('./config_headers.js');
const DATA_INICIO = process.argv[3] || '2024-10-01';
const DATA_FIM = '2026-02-12';
const URL_API = 'https://analytics.google.com/analytics/app/data/v2/venus?accessmode=read&dataset=p151460007&fpn=287695367178&authuser=5&hl=pt_BR&gamonitor=firebase&state=app.reports.reports.dashboard';
const NOME_EVENTO = process.argv[2];
if (!NOME_EVENTO) {
  console.error("ERRO: Por favor, forneça o nome do evento como um argumento da linha de comando.");
  console.error("Exemplo: node extrator_telas.js event_14000");
  process.exit(1);
}
const path = require('path');
const NOME_ARQUIVO_SAIDA = path.join(__dirname, '..', 'extrações', `historico_telas_${NOME_EVENTO}.csv`);
const http = axios.create({
  headers: {
    'Cookie': SEU_COOKIE,
    'x-gafe4-xsrf-token': SEU_TOKEN_XSRF,
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
  },
  timeout: 30000
});
function criarPayloadTelas(data, nomeEvento) {
  return {
    "entity": { "propertyId": "151460007", "identityBlendingStrategy": 2 },
    "requests": [
      {
        "dimensions": [
          { "name": "country", "isSecondary": false },
          { "name": "custom_dimensions_group2_slot_15", "isSecondary": true }, 
          { "name": "event_name", "isSecondary": true }
        ],
        "dimensionFilters": [{ "filters": [{ "fieldName": "event_name", "expression": nomeEvento, "expressionList": [nomeEvento], "evaluation": 1, "complement": false, "isCaseSensitive": true }] }],
        "metrics": [{ "name": "event_count", "isInvisible": false, "isSecondary": false }, { "name": "total_users", "isInvisible": false, "isSecondary": false }],
        "metricFilters": [],
        "cardName": "custom-param-dimension_events-overview",
        "cardId": "35q584nmIw",
        "requestGrandTotal": true,
        "dateRanges": [{ "startDate": data, "endDate": data }], 
        "rowAxis": { "fieldNames": ["country", "custom_dimensions_group2_slot_15"], "sorts": [{ "fieldName": "event_count", "sortType": 1, "isDesc": true, "pivotSortInfos": [] }], "limit": 500, "offset": 0, "metaAggTypes": [] },
        "hasCustomParams": true
      }
    ],
    "reportId": "dashboard_card_35q584nmIw",
    "reportTitle": "events-overview",
    "guid": "7F138709-86FA-4260-95C2-6411108D5D92", 
    "reportingRequestMetadata": { "isDefault": false, "reportType": 1, "hasNonDefaultFilter": false, "comparisonCount": 1, "isFromFirebase": true }
  };
}
function extrairDados(responseData, data) {
  const linhasCSV = [];
  try {
    const jsonString = responseData.substring(responseData.indexOf('{'), responseData.lastIndexOf('}') + 1);
    const dados = JSON.parse(jsonString);
    const resposta = dados.default.responses[0];
    const linhas = resposta.responseRows;
    linhas.forEach(linha => {
      let pais = linha.dimensionCompoundValues[0].value || "(not set)";
      let tela = linha.dimensionCompoundValues[1].value || "(not set)";
      const contagemEventos = linha.metricCompoundValues[0].value;
      const totalUsuarios = linha.metricCompoundValues[1].value;
      linhasCSV.push(`"${data}","${pais}","${tela}",${contagemEventos},${totalUsuarios}`);
    });
    return linhasCSV;
  } catch (e) {
    console.error(`Erro ao processar JSON para data ${data}: ${e.message}`);
    return [];
  }
}
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function buscarHistorico(nomeEvento) {
  console.log(`Iniciando extração de TELAS por País para o evento: ${nomeEvento}...`);
  const stream = fs.createWriteStream(NOME_ARQUIVO_SAIDA);
  stream.write("Data,Pais,Tela,ContagemDeEventos,TotalDeUsuarios\n");
  let dataAtual = new Date(DATA_INICIO + 'T12:00:00Z');
  const dataFim = new Date(DATA_FIM + 'T12:00:00Z');
  while (dataAtual <= dataFim) {
    const dataFormatada = dataAtual.toISOString().split('T')[0];
    console.log(`Buscando Telas para ${dataFormatada}...`);
    const payload = criarPayloadTelas(dataFormatada, nomeEvento);
    try {
      const resposta = await http.post(URL_API, JSON.stringify(payload));
      const linhasCSV = extrairDados(resposta.data, dataFormatada);
      if (linhasCSV.length > 0) {
        stream.write(linhasCSV.join('\n') + '\n');
      }
    } catch (err) {
      console.error(`ERRO FATAL ao buscar ${dataFormatada}. Verifique seus tokens no config_headers.js.`);
      console.error('Mensagem:', err.message);
    }
    await sleep(1500); 
    dataAtual.setDate(dataAtual.getDate() + 1);
  }
  stream.end();
  console.log(`Extração de TELAS concluída! Arquivo salvo em: ${NOME_ARQUIVO_SAIDA}`);
}
if (SEU_COOKIE === "COLE_O_VALOR_DO_HEADER_COOKIE_AQUI" || SEU_TOKEN_XSRF === "COLE_O_VALOR_DO_HEADER_XSRF_TOKEN_AQUI") {
  console.error("ERRO: Por favor, atualize os valores de 'SEU_COOKIE' e 'SEU_TOKEN_XSRF' no arquivo 'config_headers.js' antes de executar.");
} else {
  buscarHistorico(NOME_EVENTO);
}