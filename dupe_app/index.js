// Referências globais dos gráficos para que possam ser destruídos
let skuChartInstance = null;
let telaChartInstance = null;

// Define a paleta de cores PSafe para os gráficos
const PSafeColors = [
    '#009CDE', // psafe-light-blue
    '#003B5C', // psafe-dark-blue
    '#96BE00', // psafe-green
    '#7f8c8d', // gray 1
    '#bdc3c7', // gray 2
    '#34495e', // dark gray
    '#1abc9c', // teal
    '#f1c40f', // yellow
    '#e67e22', // orange
    '#e74c3c'  // red
];


document.addEventListener('DOMContentLoaded', () => {
    // Carrega os dados assim que a página é aberta
    fetchData();

    // Adiciona o listener ao botão de filtro
    document.getElementById('filterButton').addEventListener('click', fetchData);
});

async function fetchData() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    const loadingSpinner = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const kpiContainer = document.getElementById('kpi-container');
    const funnelContainer = document.getElementById('funil-container');
    const skuContainer = document.getElementById('pizza-sku-container');
    const telaContainer = document.getElementById('pizza-tela-container');

    // Mostra o loading e esconde conteúdo e erros
    loadingSpinner.style.display = 'block';
    errorDiv.style.display = 'none';
    kpiContainer.style.display = 'none';
    funnelContainer.style.display = 'none';
    skuContainer.style.display = 'none';
    telaContainer.style.display = 'none';

    try {
        // Busca os dados do nosso servidor Node.js
        const response = await fetch(`/data?start=${startDate}&end=${endDate}`);
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `Erro ${response.status}: Não foi possível buscar os dados`);
        }

        const data = await response.json();

        // 1. Atualiza os Big Numbers (KPIs)
        updateBigNumbers(data.bigNumbers);

        // 2. Renderiza o Funil
        renderFunnel(data.funil);
        
        // 3. Renderiza o Gráfico de Pizza de SKUs
        renderPieChart(
            'skuChart', 
            skuChartInstance, 
            data.skus, 
            'SKUs',
            (chart) => { skuChartInstance = chart; } // Callback para atualizar a instância
        );

        // 4. Renderiza o Gráfico de Pizza de Telas
        renderPieChart(
            'telaChart', 
            telaChartInstance, 
            data.telas, 
            'Telas',
            (chart) => { telaChartInstance = chart; } // Callback para atualizar a instância
        );

        // Mostra o conteúdo
        kpiContainer.style.display = 'grid';
        funnelContainer.style.display = 'block';
        skuContainer.style.display = 'block';
        telaContainer.style.display = 'block';

    } catch (error) {
        console.error('Erro ao buscar ou processar dados:', error);
        errorDiv.textContent = `Erro: ${error.message}. Verifique o console do servidor.`;
        errorDiv.style.display = 'block';
    } finally {
        // Esconde o loading
        loadingSpinner.style.display = 'none';
    }
}

function updateBigNumbers(bigNumbers) {
    document.getElementById('totalEventos').textContent = bigNumbers.totalEventos.toLocaleString('pt-BR');
    document.getElementById('totalUsuarios').textContent = bigNumbers.totalUsuarios.toLocaleString('pt-BR');
    document.getElementById('eventosPorUsuario').textContent = bigNumbers.eventosPorUsuario;
}

function renderFunnel(funilData) {
    const funnelDiv = document.querySelector('.funnel');
    funnelDiv.innerHTML = ''; // Limpa o funil anterior

    const labels = Object.keys(funilData);
    let contagemAnterior = 0;

    labels.forEach((label, index) => {
        const { contagem, usuarios } = funilData[label];

        if (contagem === 0 && usuarios === 0) return; // Não renderiza etapa se não houver dados

        const stepDiv = document.createElement('div');
        stepDiv.className = 'funnel-step';

        const labelP = document.createElement('p');
        labelP.className = 'step-label';
        labelP.textContent = label;

        const valuesP = document.createElement('p');
        valuesP.className = 'step-values';
        valuesP.textContent = `${contagem.toLocaleString('pt-BR')} eventos | ${usuarios.toLocaleString('pt-BR')} usuários`;

        stepDiv.appendChild(labelP);
        stepDiv.appendChild(valuesP);

        // Adiciona taxa de conversão (do passo anterior para este)
        if (index > 0 && contagemAnterior > 0) {
            const conversao = (contagem / contagemAnterior * 100).toFixed(1);
            const conversionP = document.createElement('p');
            conversionP.className = 'step-conversion';
            conversionP.textContent = `${conversao}%`;
            stepDiv.appendChild(conversionP);
        }

        funnelDiv.appendChild(stepDiv);
        contagemAnterior = contagem;
    });
}

function renderPieChart(canvasId, chartInstance, data, label, setInstanceCallback) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    // Prepara os dados para o Chart.js
    const labels = Object.keys(data);
    const values = Object.values(data);

    // Se a instância do gráfico anterior existir, destrói ela
    if (chartInstance) {
        chartInstance.destroy();
    }

    // Cria o novo gráfico
    const newChartInstance = new Chart(ctx, {
        type: 'pie', // Tipo pizza
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: values,
                backgroundColor: PSafeColors, // Usa a paleta de cores PSafe
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top', // Posição da legenda
                }
            }
        }
    });
    
    // Armazena a nova instância
    setInstanceCallback(newChartInstance);
}