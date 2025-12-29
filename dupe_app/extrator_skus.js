const axios = require('axios');
const fs = require('fs');
const { SEU_COOKIE, SEU_TOKEN_XSRF } = require('./config_headers.js');

// --- Configurações ---
const DATA_INICIO = process.argv[3] || '2025-11-01';
const DATA_FIM = '2025-12-21';
const URL_API = 'https://analytics.google.com/analytics/app/data/v2/venus?reportId=dashboard_card_35q584nmIt&dataset=p151460007&fpn=287695367178&hl=pt_BR&gamonitor=firebase&state=app.reports.reports.dashboard';
// --------------------

// Pega o nome do evento da linha de comando
const NOME_EVENTO = process.argv[2];
if (!NOME_EVENTO) {
  console.error("ERRO: Por favor, forneça o nome do evento como um argumento da linha de comando.");
  console.error("Exemplo: node extrator_skus.js event_14000");
  process.exit(1);
}

const NOME_ARQUIVO_SAIDA = `historico_skus_${NOME_EVENTO}.csv`;

const http = axios.create({
  headers: {
    'Cookie': SEU_COOKIE,
    'x-gafe4-xsrf-token': SEU_TOKEN_XSRF,
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
  },
  timeout: 30000 
});

// Função para criar o payload
function criarPayloadSKUs(data, nomeEvento) {
  return {
    "entity": { "propertyId": "151460007", "identityBlendingStrategy": 2 },
    "requests": [
      {
        "dimensions": [{ "name": "custom_dimensions_group2_slot_12", "isSecondary": false }, { "name": "event_name", "isSecondary": true }],
        "dimensionFilters": [{ "filters": [{ "fieldName": "event_name", "expression": nomeEvento, "expressionList": [nomeEvento], "evaluation": 1, "complement": false, "isCaseSensitive": true }] }],
        "metrics": [{ "name": "event_count", "isInvisible": false, "isSecondary": false }, { "name": "total_users", "isInvisible": false, "isSecondary": false }],
        "metricFilters": [],
        "cardName": "custom-param-dimension_events-overview",
        "cardId": "35q584nmIt",
        "requestGrandTotal": true,
        "dateRanges": [{ "startDate": data, "endDate": data }], // Data dinâmica
        "rowAxis": { "fieldNames": ["custom_dimensions_group2_slot_12"], "sorts": [{ "fieldName": "event_count", "sortType": 1, "isDesc": true, "pivotSortInfos": [] }, { "fieldName": "custom_dimensions_group2_slot_12", "sortType": 1, "isDesc": false, "pivotSortInfos": [] }, { "fieldName": "total_users", "sortType": 1, "isDesc": false, "pivotSortInfos": [] }], "limit": 200, "offset": 0, "metaAggTypes": [] },
        "hasCustomParams": true
      }
    ],
    "reportId": "dashboard_card_35q584nmIt",
    "reportTitle": "events-overview",
    "guid": "952C2293-FEDE-4DE4-9263-76F6066FF825", // GUID pode ser qualquer um
    "reportingRequestMetadata": { "isDefault": false, "reportType": 1, "hasNonDefaultFilter": false, "comparisonCount": 1, "isFromFirebase": true }
  };
}

// Função para extrair dados da resposta da API
function extrairDados(responseData, data) {
  const linhasCSV = [];
  try {
    const jsonString = responseData.substring(responseData.indexOf('{'), responseData.lastIndexOf('}') + 1);
    const dados = JSON.parse(jsonString);

    const resposta = dados.default.responses[0];
    const linhas = resposta.responseRows;

    linhas.forEach(linha => {
      // O valor [ { "value": "" } ] ou [ { "value": "com.psafe.msuite.ultra_12mo_59.90" } ]
      let sku = linha.dimensionCompoundValues[0].value;
      if (sku === "") {
        sku = "(not set)"; // Define um valor padrão para SKU vazio
      }
      
      const contagemEventos = linha.metricCompoundValues[0].value;
      const totalUsuarios = linha.metricCompoundValues[1].value;

      linhasCSV.push(`"${data}","${sku}",${contagemEventos},${totalUsuarios}`);
    });
    
    return linhasCSV;

  } catch (e) {
    console.error(`Erro ao processar JSON para data ${data}: ${e.message}`);
    console.error('Resposta recebida:', responseData.substring(0, 500) + '...');
    return [];
  }
}

// Função para pausar a execução
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Função principal
async function buscarHistorico(nomeEvento) {
  console.log(`Iniciando extração de SKUs para o evento: ${nomeEvento}...`);
  const stream = fs.createWriteStream(NOME_ARQUIVO_SAIDA);
  stream.write("Data,SKU,ContagemDeEventos,TotalDeUsuarios\n");

  let dataAtual = new Date(DATA_INICIO + 'T12:00:00Z');
  const dataFim = new Date(DATA_FIM + 'T12:00:00Z');

  while (dataAtual <= dataFim) {
    const dataFormatada = dataAtual.toISOString().split('T')[0];
    console.log(`Buscando SKUs para ${dataFormatada}...`);
    
    const payload = criarPayloadSKUs(dataFormatada, nomeEvento);

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
    
    await sleep(1500); // Pausa de 1.5 segundo entre as requisições

    // Avança para o próximo dia
    dataAtual.setDate(dataAtual.getDate() + 1);
  }

  stream.end();
  console.log(`Extração de SKUs concluída! Arquivo salvo em: ${NOME_ARQUIVO_SAIDA}`);
}

// Verifica se os headers foram preenchidos
if (SEU_COOKIE === "COLE_O_VALOR_DO_HEADER_COOKIE_AQUI" || SEU_TOKEN_XSRF === "COLE_O_VALOR_DO_HEADER_XSRF_TOKEN_AQUI") {
  console.error("ERRO: Por favor, atualize os valores de 'SEU_COOKIE' e 'SEU_TOKEN_XSRF' no arquivo 'config_headers.js' antes de executar.");
} else {
  buscarHistorico(NOME_EVENTO);
}
