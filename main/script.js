// Instâncias dos gráficos, agora armazenadas em um objeto para suportar múltiplas jornadas
let chartInstances = {};
let currentContext = localStorage.getItem('appContext') || 'main'; // 'main' or 'dupe'

document.addEventListener('DOMContentLoaded', () => {
    const endDateInput = document.getElementById('end-date');
    const startDateInput = document.getElementById('start-date');
    const appContextSelector = document.getElementById('app-context-selector');

    // Set initial context selector value
    if (appContextSelector) {
        appContextSelector.value = currentContext;
        appContextSelector.addEventListener('change', (event) => {
            currentContext = event.target.value;
            localStorage.setItem('appContext', currentContext);
            fetchData();
        });
    }
    
    const hoje = new Date('2025-11-30T00:00:00');
    endDateInput.value = formataDataParaInput(hoje);
    const dataInicioPadrao = new Date('2025-11-01T00:00:00');
    startDateInput.value = formataDataParaInput(dataInicioPadrao);

    document.getElementById('filter-button').addEventListener('click', fetchData);
    fetchData();
});

function formataDataParaInput(date) {
    const ano = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const dia = String(date.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

async function fetchData() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    const loadingMsg = document.getElementById('loading-message');
    const errorMsg = document.getElementById('error-message');
    const filterButton = document.getElementById('filter-button');
    const dashboardContainer = document.getElementById('dashboard-container');

    loadingMsg.style.display = 'block';
    errorMsg.style.display = 'none';
    filterButton.disabled = true;
    dashboardContainer.innerHTML = ''; // Limpa o dashboard antigo

    try {
        const response = await fetch(`/data?start=${startDate}&end=${endDate}&context=${currentContext}`);
        if (!response.ok) throw new Error(`Erro na requisição: ${response.statusText}`);
        
        const data = await response.json();

        // Itera sobre cada jornada recebida e a renderiza
        data.jornadas.forEach(jornada => {
            const journeyHtml = createJourneyTemplate(jornada);
            dashboardContainer.insertAdjacentHTML('beforeend', journeyHtml);
            
            // Renderiza os componentes da jornada, se existirem
            if (jornada.funil) {
                renderFunnel(jornada.funil, `funnel-${jornada.id}`);
            }
            if (jornada.eventFunilPeriodico) {
                renderPeriodicFunnelChart(jornada.eventFunilPeriodico, `event-funil-periodico-chart-${jornada.id}`, 'Contagem de Eventos');
            }
            if (jornada.userFunilPeriodico) {
                renderPeriodicFunnelChart(jornada.userFunilPeriodico, `user-funil-periodico-chart-${jornada.id}`, 'Contagem de Usuários');
            }
            if (jornada.pizzas && jornada.pizzas.skus) {
                renderPieChart(jornada.pizzas.skus, `skus-chart-${jornada.id}`, 'Top 5 SKUs');
            }
            if (jornada.pizzas && jornada.pizzas.telas) {
                renderPieChart(jornada.pizzas.telas, `telas-chart-${jornada.id}`, 'Top 5 Telas');
            }
            if (jornada.correlacoesTabela) {
                renderCorrelationTable(jornada.correlacoesTabela, `correlation-table-${jornada.id}`);
            }
        });

        // Fetch and render top events table
        const topEventsResponse = await fetch(`/api/top-events?start=${startDate}&end=${endDate}&context=${currentContext}`);
        if (!topEventsResponse.ok) throw new Error(`Erro na requisição dos top events: ${topEventsResponse.statusText}`);
        const topEventsData = await topEventsResponse.json();
        renderTopEventsTable(topEventsData);


    } catch (error) {
        console.error('Falha ao buscar ou renderizar dados:', error);
        errorMsg.textContent = `Erro: ${error.message}. Verifique o console.`;
        errorMsg.style.display = 'block';
    } finally {
        loadingMsg.style.display = 'none';
        filterButton.disabled = false;
    }
}

function renderTopEventsTable(events) {
    const table = document.getElementById('top-events-table');
    if (!table) return;
    const tableBody = table.querySelector('tbody');
    if (!tableBody) return;

    let sortState = { key: 'contagem', order: 'desc' }; // Estado de ordenação inicial

    function populateTable(sortedEvents) {
        tableBody.innerHTML = '';

        if (!sortedEvents || sortedEvents.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 4;
            td.textContent = 'Nenhum evento encontrado para o período selecionado.';
            td.style.textAlign = 'center';
            tr.appendChild(td);
            tableBody.appendChild(tr);
            return;
        }

        sortedEvents.forEach(event => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${event.nome}</td>
                <td>${event.rotulo}</td>
                <td>${event.contagem.toLocaleString('pt-BR')}</td>
                <td>${event.usuarios.toLocaleString('pt-BR')}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    function sortData() {
        const sortedEvents = [...events].sort((a, b) => {
            const valA = a[sortState.key];
            const valB = b[sortState.key];
            
            let comparison = 0;
            if (typeof valA === 'string') {
                comparison = valA.localeCompare(valB);
            } else {
                if (valA > valB) comparison = 1;
                else if (valA < valB) comparison = -1;
            }
            return sortState.order === 'asc' ? comparison : -comparison;
        });
        populateTable(sortedEvents);
    }

    table.querySelectorAll('thead th').forEach(header => {
        header.addEventListener('click', () => {
            const sortKey = header.dataset.sort;
            if (sortState.key === sortKey) {
                sortState.order = sortState.order === 'asc' ? 'desc' : 'asc';
            } else {
                sortState.key = sortKey;
                sortState.order = 'desc'; // Padrão para descendente
            }

            table.querySelectorAll('thead th').forEach(th => th.classList.remove('sort-asc', 'sort-desc'));
            header.classList.add(sortState.order === 'asc' ? 'sort-asc' : 'sort-desc');

            sortData();
        });
    });
    
    // Ordenação inicial
    sortData();
    table.querySelector(`thead th[data-sort="${sortState.key}"]`).classList.add(`sort-${sortState.order}`);
}

function createJourneyTemplate(jornada) {
    const { id, nome, bigNumbers, eventos, correlacoesTabela } = jornada;
    const ultimoEventoRotulo = eventos.length > 0 ? eventos[eventos.length - 1].rotulo : 'Último Evento';

    const funnelHtml = jornada.funil 
        ? `<div class="funnel-container" id="funnel-${id}"></div>`
        : '';

    const eventFunilPeriodicoHtml = jornada.eventFunilPeriodico
        ? `<section class="card">
                <h2 class="section-title">Funil Periódico (Eventos)</h2>
                <div class="chart-container" style="height: 500px; max-width: none;">
                    <canvas id="event-funil-periodico-chart-${id}"></canvas>
                </div>
           </section>`
        : '';

    const userFunilPeriodicoHtml = jornada.userFunilPeriodico
        ? `<section class="card">
                <h2 class="section-title">Funil Periódico (Usuários)</h2>
                <div class="chart-container" style="height: 500px; max-width: none;">
                    <canvas id="user-funil-periodico-chart-${id}"></canvas>
                </div>
           </section>`
        : '';

    const skusHtml = (jornada.pizzas && jornada.pizzas.skus)
        ? `<section class="card">
                <h2 class="section-title">Top 5 SKUs (${ultimoEventoRotulo})</h2>
                <div class="chart-container">
                    <canvas id="skus-chart-${id}"></canvas>
                </div>
                <div class="not-set-info" id="skus-chart-${id}-not-set" style="display: none;"></div>
           </section>`
        : '';

    const telasHtml = (jornada.pizzas && jornada.pizzas.telas)
        ? `<section class="card">
                <h2 class="section-title">Top 5 Telas (${ultimoEventoRotulo})</h2>
                <div class="chart-container">
                    <canvas id="telas-chart-${id}"></canvas>
                </div>
                <div class="not-set-info" id="telas-chart-${id}-not-set" style="display: none;"></div>
           </section>`
        : '';

    const correlationTableHtml = (correlacoesTabela && correlacoesTabela.length > 0)
        ? `<section class="card">
            <h2 class="section-title">Correlação de "${nome}" com Outros Eventos (Pearson)</h2>
            <div class="table-container fixed-height-table">
                <table id="correlation-table-${id}" class="sortable-table">
                    <thead>
                        <tr>
                            <th data-sort="name">Nome do Evento</th>
                            <th data-sort="count">Correlação de Pearson</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- As linhas serão inseridas aqui -->
                    </tbody>
                </table>
            </div>
        </section>`
        : '';

    return `
        <section class="card">
            <h2 class="section-title">${nome}</h2>
            
            <div class="big-numbers-grid">
                <div class="big-number-card">
                    <span class="big-number-title">Eventos Totais</span>
                    <span class="big-number-value">${parseInt(bigNumbers.totalEventos).toLocaleString('pt-BR')}</span>
                </div>
                <div class="big-number-card">
                    <span class="big-number-title">Usuários</span>
                    <span class="big-number-value">${parseInt(bigNumbers.totalUsuarios).toLocaleString('pt-BR')}</span>
                </div>
                <div class="big-number-card">
                    <span class="big-number-title">Eventos / Usuário</span>
                    <span class="big-number-value">${parseFloat(bigNumbers.eventosPorUsuario).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
            </div>
            ${funnelHtml}
        </section>
        ${eventFunilPeriodicoHtml}
        ${userFunilPeriodicoHtml}
        <div class="pizza-grid-container">
            ${skusHtml}
            ${telasHtml}
        </div>
        ${correlationTableHtml}
    `;
}

function renderFunnel(funilData, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const labels = Object.keys(funilData);
    if (labels.length === 0) {
        container.innerHTML = '<p>Nenhum dado para o funil.</p>';
        return;
    }

    const initialWidth = 95; // Largura inicial em porcentagem
    const widthDecrement = 15; // Decremento para cada passo

    labels.forEach((label, index) => {
        const { contagem, usuarios } = funilData[label];
        
        const stepWidth = initialWidth - (index * widthDecrement);

        let conversaoPercentual = '';
        if (index > 0) {
            const contagemAnterior = funilData[labels[index - 1]].contagem;
            const taxa = contagemAnterior > 0 ? (contagem / contagemAnterior) * 100 : 0;
            conversaoPercentual = `<span class="funnel-percentage">${taxa.toFixed(1)}%</span>`;
        }

        const stepEl = document.createElement('div');
        stepEl.className = 'funnel-step';
        stepEl.style.width = `${Math.max(stepWidth, 20)}%`;
        stepEl.innerHTML = `
            <span class="funnel-label">${index + 1}. ${label}</span>
            <div class="funnel-values">
                <span class="funnel-value">${contagem.toLocaleString('pt-BR')}</span>
                <span class="funnel-users">(${usuarios.toLocaleString('pt-BR')} usuários)</span>
                ${conversaoPercentual}
            </div>
        `;
        container.appendChild(stepEl);
    });
}

function renderPieChart(data, canvasId, chartLabel) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    
    const labels = Object.keys(data);
    const counts = Object.values(data);

    if (labels.length === 0) {
        canvas.parentElement.innerHTML = '<p style="text-align: center; padding: 20px;">Nenhum dado encontrado.</p>';
    } else {
        const backgroundColors = ['#440bbd', '#000000', '#5cb85c', '#5bc0de', '#f0ad4e'];

        chartInstances[canvasId] = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{ label: chartLabel, data: counts, backgroundColor: backgroundColors, borderWidth: 2 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }


}

function renderCorrelationTable(data, tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const tableBody = table.querySelector('tbody');
    if (!tableBody) return;

    let sortState = { key: 'count', order: 'desc' }; // Estado de ordenação inicial

    function populateTable(sortedData) {
        tableBody.innerHTML = '';

        if (!sortedData || sortedData.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 2;
            td.textContent = 'Nenhum dado de correlação encontrado.';
            td.style.textAlign = 'center';
            tr.appendChild(td);
            tableBody.appendChild(tr);
            return;
        }

        sortedData.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.name}</td>
                <td>${item.count.toFixed(4)}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    function sortData() {
        const sortedData = [...data].sort((a, b) => {
            const valA = a[sortState.key];
            const valB = b[sortState.key];

            let comparison = 0;
            if (valA > valB) {
                comparison = 1;
            } else if (valA < valB) {
                comparison = -1;
            }
            return sortState.order === 'asc' ? comparison : -comparison;
        });
        populateTable(sortedData);
    }
    
    table.querySelectorAll('thead th').forEach(header => {
        header.addEventListener('click', () => {
            const sortKey = header.dataset.sort;
            if (sortState.key === sortKey) {
                sortState.order = sortState.order === 'asc' ? 'desc' : 'asc';
            } else {
                sortState.key = sortKey;
                sortState.order = 'desc'; // Padrão para descendente em nova coluna
            }
            
            // Remove as classes de ordenação de outros cabeçalhos
            table.querySelectorAll('thead th').forEach(th => th.classList.remove('sort-asc', 'sort-desc'));
            // Adiciona a classe de ordenação ao cabeçalho atual
            header.classList.add(sortState.order === 'asc' ? 'sort-asc' : 'sort-desc');

            sortData();
        });
    });

    // Ordenação inicial
    sortData();
    // Marca o header inicial
    table.querySelector(`thead th[data-sort="${sortState.key}"]`).classList.add(`sort-${sortState.order}`);
}

function renderPeriodicFunnelChart(data, canvasId, yAxisTitle) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();

    const months = Object.keys(data).sort();
    if (months.length === 0) {
        canvas.parentElement.innerHTML = '<p style="text-align: center; padding: 20px;">Nenhum dado encontrado para o funil periódico.</p>';
        return;
    }

    const eventLabels = Object.keys(data[months[0]]);
    const backgroundColors = ['#440bbd', '#000000', '#5cb85c', '#5bc0de', '#f0ad4e', '#d9534f'];

    const datasets = eventLabels.map((label, index) => {
        return {
            label: label,
            data: months.map(month => data[month][label] || 0),
            backgroundColor: backgroundColors[index % backgroundColors.length],
        };
    });

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            },
            scales: {
                x: {
                    stacked: false,
                    title: {
                        display: true,
                        text: 'Mês'
                    }
                },
                y: {
                    stacked: false,
                    title: {
                        display: true,
                        text: yAxisTitle
                    }
                }
            }
        }
    });
}