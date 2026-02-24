const axios = require('axios');
const fs = require('fs');
const { SEU_COOKIE, SEU_TOKEN_XSRF } = require('./config_headers.js');
const DATA_INICIO = '2025-10-11';
const DATA_FIM = '2026-02-12';
const path = require('path');
const NOME_ARQUIVO_SAIDA = path.join(__dirname, '..', 'extrações', 'historico_eventos.csv');
const URL_API = 'https://analytics.google.com/analytics/app/data/v2/venus?accessmode=read&dataset=p151460007&fpn=287695367178&authuser=5&hl=pt_BR&gamonitor=firebase&state=app.reports.reports.dashboard';
const TAMANHO_PAGINA = 250; 
const http = axios.create({
  headers: {
    'Cookie': SEU_COOKIE,
    'x-gafe4-xsrf-token': SEU_TOKEN_XSRF,
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
  },
  timeout: 30000 
});
function criarPayloadEventos(data, offset = 0) {
  return {
    "entity": { "propertyId": "151460007", "identityBlendingStrategy": 2 },
    "requests": [
      { "dimensions": [{ "name": "nth_day", "isSecondary": false }, { "name": "event_name", "isSecondary": true }], "dimensionFilters": [{ "filters": [{ "fieldName": "event_name", "expression": "(not set)|unknown|(other)|", "expressionList": ["(not set)", "unknown", "(other)", ""], "evaluation": 7, "complement": true, "isCaseSensitive": true }] }], "metrics": [{ "name": "event_count", "isInvisible": false, "isSecondary": true }], "metricFilters": [], "cardName": "explorer_top-events", "cardId": "explorerCard", "requestGrandTotal": false, "dateRanges": [{ "startDate": data, "endDate": data }], "rowAxis": { "fieldNames": ["nth_day"], "sorts": [{ "fieldName": "nth_day", "sortType": 1, "isDesc": false, "pivotSortInfos": [] }], "limit": 5000, "offset": 0, "metaAggTypes": [] }, "columnAxis": { "fieldNames": ["event_name"], "offset": 0, "metaAggTypes": [], "limit": 5, "sorts": [{ "fieldName": "event_count", "isDesc": true, "sortType": 1 }] } },
      { "dimensions": [{ "name": "nth_day", "isSecondary": false }], "dimensionFilters": [], "metrics": [{ "name": "event_count", "isInvisible": false, "isSecondary": false }], "metricFilters": [], "cardName": "explorer_top-events", "cardId": "explorerCard", "requestGrandTotal": false, "dateRanges": [{ "startDate": data, "endDate": data }], "rowAxis": { "fieldNames": ["nth_day"], "sorts": [{ "fieldName": "nth_day", "sortType": 1, "isDesc": false, "pivotSortInfos": [] }, { "fieldName": "event_count", "sortType": 1, "isDesc": false, "pivotSortInfos": [] }], "limit": 5000, "offset": 0, "metaAggTypes": [] } },
      { "dimensions": [{ "name": "event_name", "isSecondary": false }, { "name": "country", "isSecondary": true }, { "name": "filter_partition", "isSecondary": true }], "dimensionFilters": [{ "filters": [{ "fieldName": "event_name", "expression": "(not set)|unknown|(other)|", "expressionList": ["(not set)", "unknown", "(other)", ""], "evaluation": 7, "complement": true, "isCaseSensitive": true }] }], "metrics": [{ "name": "event_count", "isInvisible": false, "isSecondary": false }, { "name": "total_users", "isInvisible": false, "isSecondary": false }, { "name": "eventCountPerUser", "isInvisible": false, "isSecondary": false, "expression": "event_count/active_users" }, { "name": "combinedRevenue", "isInvisible": false, "isSecondary": false, "expression": "total_ad_revenue + revenue - refund_value" }], "metricFilters": [], "cardName": "explorer_top-events", "cardId": "explorerCard", "requestGrandTotal": true, "dateRanges": [{ "startDate": data, "endDate": data }], "rowAxis": { "fieldNames": ["event_name", "country"], "sorts": [{ "fieldName": "event_count", "sortType": 3, "isDesc": true, "pivotSortInfos": [{ "dimensionName": "date_range", "dimensionValue": "date_range_0" }] }, { "fieldName": "event_name", "sortType": 1, "isDesc": false, "pivotSortInfos": [] }, { "fieldName": "total_users", "sortType": 1, "isDesc": false, "pivotSortInfos": [] }, { "fieldName": "eventCountPerUser", "sortType": 1, "isDesc": false, "pivotSortInfos": [] }, { "fieldName": "combinedRevenue", "sortType": 1, "isDesc": false, "pivotSortInfos": [] }], 
        "limit": TAMANHO_PAGINA, 
        "offset": offset, 
        "metaAggTypes": [] 
      }, "filterPartitions": [{ "name": "Todos os usuários", "dimensionFilters": [] }], "columnAxis": { "fieldNames": ["filter_partition"], "sorts": [{ "fieldName": "filter_partition", "sortType": 1 }] } }
    ],
    "reportId": "explorer_card_explorerCard",
    "reportTitle": "top-events",
    "guid": "A0AB4BA2-540A-4855-B16F-844441A88FF7", 
    "reportingRequestMetadata": { "isDefault": false, "reportType": 0, "hasNonDefaultFilter": false, "comparisonCount": 1, "isFromFirebase": true }
  };
}
function extrairDados(responseData, data) {
  const linhasCSV = [];
  try {
    const jsonString = responseData.substring(responseData.indexOf('{'), responseData.lastIndexOf('}') + 1);
    const dados = JSON.parse(jsonString);
    const respostaEventos = dados.default.responses[2];
    const linhas = respostaEventos.responseRows;
    linhas.forEach(linha => {
      let nomeEvento = linha.dimensionCompoundValues[0].value;
      let pais = linha.dimensionCompoundValues[1].value;
      if (pais === "") {
        pais = "(not set)";
      }
      switch (nomeEvento) {
        case 'event_14000':
          nomeEvento = 'subscription_screen_open';
          break;
        case 'event_14001':
          nomeEvento = 'subscription_subscribe_click';
          break;
          case 'event_14002':
          nomeEvento = 'subscription_cancel_click';
          break;
        case 'event_14003':
          nomeEvento = 'subscription_purchase_complete';
          break;
      }
      const contagemEventos = linha.metricCompoundValues[0].value;
      const totalUsuarios = linha.metricCompoundValues[1].value;
      const eventosPorUsuario = linha.metricCompoundValues[2].value;
      const receitaCombinada = linha.metricCompoundValues[3].value;
      linhasCSV.push(`"${data}","${nomeEvento}","${pais}",${contagemEventos},${totalUsuarios},${eventosPorUsuario},${receitaCombinada}`);
    });
    const totalLinhas = respostaEventos.overallRowCount || 0;
    return { linhasCSV, totalLinhas };
  } catch (e) {
    console.error(`Erro ao processar JSON para data ${data}: ${e.message}`);
    console.error('Resposta recebida:', responseData.substring(0, 500) + '...'); 
    return { linhasCSV: [], totalLinhas: 0 };
  }
}
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function buscarHistorico() {
  console.log('Iniciando extração de EVENTOS...');
  const stream = fs.createWriteStream(NOME_ARQUIVO_SAIDA);
  stream.write("Data,NomeDoEvento,Pais,ContagemDeEventos,TotalDeUsuarios,EventosPorUsuario,ReceitaCombinada\n");
  let dataAtual = new Date(DATA_INICIO + 'T12:00:00Z'); 
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
        temMaisPaginas = false; 
      }
      await sleep(1000); 
    }
    dataAtual.setDate(dataAtual.getDate() + 1);
  }
  stream.end();
  console.log(`Extração de EVENTOS concluída! Arquivo salvo em: ${NOME_ARQUIVO_SAIDA}`);
}
if (SEU_COOKIE === "COLE_O_VALOR_DO_HEADER_COOKIE_AQUI" || SEU_TOKEN_XSRF === "COLE_O_VALOR_DO_HEADER_XSRF_TOKEN_AQUI") {
  console.error("ERRO: Por favor, atualize os valores de 'SEU_COOKIE' e 'SEU_TOKEN_XSRF' no arquivo 'config_headers.js' antes de executar.");
} else {
  buscarHistorico();
}