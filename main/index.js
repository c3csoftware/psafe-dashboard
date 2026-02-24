let skuChartInstance = null;
let telaChartInstance = null;
const PSafeColors = [
    '#009CDE', 
    '#003B5C', 
    '#96BE00', 
    '#7f8c8d', 
    '#bdc3c7', 
    '#34495e', 
    '#1abc9c', 
    '#f1c40f', 
    '#e67e22', 
    '#e74c3c'  
];
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
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
    loadingSpinner.style.display = 'block';
    errorDiv.style.display = 'none';
    kpiContainer.style.display = 'none';
    funnelContainer.style.display = 'none';
    skuContainer.style.display = 'none';
    telaContainer.style.display = 'none';
    try {
        const response = await fetch(`/data?start=${startDate}&end=${endDate}`);
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `Erro ${response.status}: Não foi possível buscar os dados`);
        }
        const data = await response.json();
        updateBigNumbers(data.bigNumbers);
        renderFunnel(data.funil);
        renderPieChart(
            'skuChart', 
            skuChartInstance, 
            data.skus, 
            'SKUs',
            (chart) => { skuChartInstance = chart; } 
        );
        renderPieChart(
            'telaChart', 
            telaChartInstance, 
            data.telas, 
            'Telas',
            (chart) => { telaChartInstance = chart; } 
        );
        kpiContainer.style.display = 'grid';
        funnelContainer.style.display = 'block';
        skuContainer.style.display = 'block';
        telaContainer.style.display = 'block';
    } catch (error) {
        console.error('Erro ao buscar ou processar dados:', error);
        errorDiv.textContent = `Erro: ${error.message}. Verifique o console do servidor.`;
        errorDiv.style.display = 'block';
    } finally {
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
    funnelDiv.innerHTML = ''; 
    const labels = Object.keys(funilData);
    let contagemAnterior = 0;
    labels.forEach((label, index) => {
        const { contagem, usuarios } = funilData[label];
        if (contagem === 0 && usuarios === 0) return; 
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
    const labels = Object.keys(data);
    const values = Object.values(data);
    if (chartInstance) {
        chartInstance.destroy();
    }
    const newChartInstance = new Chart(ctx, {
        type: 'pie', 
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: values,
                backgroundColor: PSafeColors, 
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top', 
                }
            }
        }
    });
    setInstanceCallback(newChartInstance);
}