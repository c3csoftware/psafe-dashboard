document.addEventListener('DOMContentLoaded', () => {
    
    // --- ESTADO DA APLICAÇÃO ---
    let jornadas = [];
    const currentContext = localStorage.getItem('appContext') || 'main'; // 'main' or 'dupe'

    // --- ELEMENTOS DA DOM ---
    const jornadasList = document.getElementById('jornadas-list');
    const addJourneyBtn = document.getElementById('add-journey-btn');
    
    // Modal Principal
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');
    const modalTitle = document.getElementById('modal-title');
    const modalForm = document.getElementById('modal-form');
    const modalFields = document.getElementById('modal-fields');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    
    // Modal de Exclusão
    const deleteModal = document.getElementById('delete-modal');
    const deleteModalMessage = document.getElementById('delete-modal-message');
    const deleteModalCancelBtn = document.getElementById('delete-modal-cancel-btn');
    const deleteModalConfirmBtn = document.getElementById('delete-modal-confirm-btn');

    // --- FUNÇÕES DE API ---
    function fetchJornadas() {
        fetch(`/api/jornadas?context=${currentContext}`)
            .then(response => response.json())
            .then(data => {
                jornadas = data;
                renderJornadas();
            })
            .catch(error => console.error('Erro ao carregar jornadas:', error));
    }

    function saveJornadas() {
        fetch(`/api/jornadas?context=${currentContext}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jornadas)
        })
        .then(response => response.json())
        .then(data => {
            console.log(data.message);
        })
        .catch(error => console.error('Erro ao salvar jornadas:', error));
    }


    // --- FUNÇÕES DE RENDERIZAÇÃO ---

    /**
     * Renderiza a lista completa de jornadas e seus eventos.
     */
    function renderJornadas() {
        jornadasList.innerHTML = ''; // Limpa a lista
        
        if (jornadas.length === 0) {
             jornadasList.innerHTML = `<div class="text-center text-gray-500 py-10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 mx-auto mb-4 text-gray-400">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125V6a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                Nenhuma jornada encontrada. Clique em "Nova Jornada" para começar.
            </div>`;
            return;
        }

        jornadas.forEach((jornada, journeyIndex) => {
            const journeyCard = document.createElement('div');
            journeyCard.className = 'bg-white shadow-lg rounded-lg p-6 mb-6 transition-all hover:shadow-xl';
            journeyCard.dataset.journeyId = jornada.id;

            // Renderiza a lista de eventos para este card
            const eventosHtml = jornada.eventos.map((evento, eventIndex) => `
                <li class="flex justify-between items-center p-3 bg-gray-50 rounded-md mb-2" data-event-nome="${evento.nome}">
                    <div>
                        <p class="font-medium text-gray-800">${evento.rotulo}</p>
                        <p class="text-sm text-gray-500">${evento.nome}</p>
                    </div>
                    <div class="flex-shrink-0 space-x-2">
                        <button class="move-event-up-btn p-1 text-gray-500 hover:text-blue-600" title="Mover para Cima" data-journey-index="${journeyIndex}" data-event-index="${eventIndex}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                        </button>
                        <button class="move-event-down-btn p-1 text-gray-500 hover:text-blue-600" title="Mover para Baixo" data-journey-index="${journeyIndex}" data-event-index="${eventIndex}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                        </button>
                        <button class="edit-event-btn p-1 text-gray-500 hover:text-blue-600" title="Editar Evento">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.932Z" /></svg>
                        </button>
                        <button class="delete-event-btn p-1 text-gray-500 hover:text-red-600" title="Excluir Evento">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12.54 0c.342.052.682.107 1.022.166m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.144-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.057-2.09.9-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                        </button>
                    </div>
                </li>
            `).join('');

            // Monta o card completo da jornada
            journeyCard.innerHTML = `
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h2 class="text-xl font-semibold text-blue-700">${jornada.nome}</h2>
                        <p class="text-sm text-gray-500">ID: ${jornada.id}</p>
                    </div>
                    <div class="flex-shrink-0 space-x-2">
                        <button class="move-journey-up-btn p-1 text-gray-600 hover:text-blue-700" title="Mover para Cima" data-journey-index="${journeyIndex}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                        </button>
                        <button class="move-journey-down-btn p-1 text-gray-600 hover:text-blue-700" title="Mover para Baixo" data-journey-index="${journeyIndex}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                        </button>
                        <button class="edit-journey-btn p-1 text-gray-600 hover:text-blue-700" title="Editar Jornada">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.932Z" /></svg>
                        </button>
                        <button class="delete-journey-btn p-1 text-gray-600 hover:text-red-700" title="Excluir Jornada">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12.54 0c.342.052.682.107 1.022.166m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.144-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.057-2.09.9-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                        </button>
                    </div>
                </div>
                
                <!-- Lista de Eventos -->
                <div class="mt-4 pt-4 border-t border-gray-200">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="text-md font-semibold text-gray-700">Eventos (${jornada.eventos.length})</h3>
                        <button class="add-event-btn flex items-center gap-1 text-sm bg-green-500 text-white px-3 py-1 rounded-full hover:bg-green-600 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                            Adicionar
                        </button>
                    </div>
                    <ul class="space-y-2">
                        ${jornada.eventos.length > 0 ? eventosHtml : '<li class="text-sm text-gray-500">Nenhum evento cadastrado.</li>'}
                    </ul>
                </div>
            `;
            
            jornadasList.appendChild(journeyCard);
        });
    }

    // --- FUNÇÕES DE MODAL (ABRIR/FECHAR) ---
    
    /**
     * Abre o modal principal e configura o formulário.
     * @param {string} title - Título do modal.
     * @param {string} fieldsHtml - HTML para os campos do formulário.
     * @param {function} submitCallback - Função a ser chamada no submit.
     */
    function openModal(title, fieldsHtml, submitCallback) {
        modalTitle.textContent = title;
        modalFields.innerHTML = fieldsHtml;
        modal.classList.remove('hidden');
        modalContent.classList.add('modal-enter');

        // Remove listener antigo para evitar duplicatas e adiciona o novo
        modalForm.onsubmit = (e) => {
            e.preventDefault();
            submitCallback(e);
            closeModal();
        };
    }

    function closeModal() {
        modal.classList.add('hidden');
        modalContent.classList.remove('modal-enter');
    }

    function openDeleteModal(message, confirmCallback) {
        deleteModalMessage.textContent = message;
        deleteModal.classList.remove('hidden');

        // Remove listener antigo e adiciona o novo
        deleteModalConfirmBtn.onclick = () => {
            confirmCallback();
            closeDeleteModal();
        };
    }

    function closeDeleteModal() {
        deleteModal.classList.add('hidden');
    }

    // --- FUNÇÕES DE CRUD (JORNADA) ---

    function moveJourney(index, direction) {
        if (direction === 'up' && index > 0) {
            [jornadas[index], jornadas[index - 1]] = [jornadas[index - 1], jornadas[index]];
        } else if (direction === 'down' && index < jornadas.length - 1) {
            [jornadas[index], jornadas[index + 1]] = [jornadas[index + 1], jornadas[index]];
        }
        renderJornadas();
        saveJornadas();
    }

    function moveEvent(journeyIndex, eventIndex, direction) {
        const events = jornadas[journeyIndex].eventos;
        if (direction === 'up' && eventIndex > 0) {
            [events[eventIndex], events[eventIndex - 1]] = [events[eventIndex - 1], events[eventIndex]];
        } else if (direction === 'down' && eventIndex < events.length - 1) {
            [events[eventIndex], events[eventIndex + 1]] = [events[eventIndex + 1], events[eventIndex]];
        }
        renderJornadas();
        saveJornadas();
    }

    /**
     * Gera o HTML do formulário para um campo de input.
     */
    function createField(id, label, value = '', readonly = false) {
        return `
            <div class="mb-4">
                <label for="${id}" class="block text-sm font-medium text-gray-700 mb-1">${label}</label>
                <input type="text" id="${id}" name="${id}" value="${value}" ${readonly ? 'readonly' : ''} 
                       class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${readonly ? 'bg-gray-100 cursor-not-allowed' : ''}" required>
            </div>
        `;
    }

    /**
     * Gera o HTML do formulário para um campo de checkbox.
     */
    function createCheckboxField(id, label, checked = false) {
        return `
            <div class="flex items-center mb-2">
                <input type="checkbox" id="${id}" name="${id}" ${checked ? 'checked' : ''} class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                <label for="${id}" class="ml-2 block text-sm text-gray-900">${label}</label>
            </div>
        `;
    }

    /**
     * Abre o modal para criar ou editar uma Jornada.
     * @param {object | null} jornada - A jornada a ser editada, ou null para criar.
     */
    function showJourneyModal(jornada = null) {
        const isEdit = jornada !== null;
        const title = isEdit ? 'Editar Jornada' : 'Nova Jornada';
        
        // O ID só pode ser editado se for uma *nova* jornada.
        // Se for edição, o ID é fixo para manter a integridade.
        const fieldsHtml = `
            ${createField('jornada-id', 'ID da Jornada', isEdit ? jornada.id : '', isEdit)}
            ${createField('jornada-nome', 'Nome da Jornada', isEdit ? jornada.nome : '')}
            <div class="mt-6 pt-4 border-t border-gray-200">
                <h3 class="text-md font-semibold text-gray-700 mb-2">Gráficos a Exibir</h3>
                ${createCheckboxField('jornada-showFunil', 'Funil da Jornada', isEdit ? jornada.showFunil !== false : true)}
                ${createCheckboxField('jornada-showEventPeriodicFunnel', 'Funil Periódico (Eventos)', isEdit ? jornada.showEventPeriodicFunnel !== false : true)}
                ${createCheckboxField('jornada-showUserPeriodicFunnel', 'Funil Periódico (Usuários)', isEdit ? jornada.showUserPeriodicFunnel !== false : true)}
                ${createCheckboxField('jornada-showSkus', 'Top 5 SKUs', isEdit ? jornada.showSkus !== false : true)}
                ${createCheckboxField('jornada-showTelas', 'Top 5 Telas', isEdit ? jornada.showTelas !== false : true)}
                ${createCheckboxField('jornada-showCorrelacoes', 'Correlações', isEdit ? jornada.showCorrelacoes !== false : true)}
            </div>
        `;

        const submitCallback = (e) => {
            const formData = new FormData(e.target);
            const id = formData.get('jornada-id').trim();
            const nome = formData.get('jornada-nome').trim();
            
            if (!id || !nome) return; // Validação simples

            const showFunil = document.getElementById('jornada-showFunil').checked;
            const showEventPeriodicFunnel = document.getElementById('jornada-showEventPeriodicFunnel').checked;
            const showUserPeriodicFunnel = document.getElementById('jornada-showUserPeriodicFunnel').checked;
            const showSkus = document.getElementById('jornada-showSkus').checked;
            const showTelas = document.getElementById('jornada-showTelas').checked;
            const showCorrelacoes = document.getElementById('jornada-showCorrelacoes').checked;

            if (isEdit) {
                // Atualizar (Update)
                const j = jornadas.find(j => j.id === jornada.id);
                if (j) {
                    j.nome = nome;
                    j.showFunil = showFunil;
                    j.showEventPeriodicFunnel = showEventPeriodicFunnel;
                    j.showUserPeriodicFunnel = showUserPeriodicFunnel;
                    j.showSkus = showSkus;
                    j.showTelas = showTelas;
                    j.showCorrelacoes = showCorrelacoes;
                }
            } else {
                // Criar (Create)
                // Verifica se o ID já existe
                if (jornadas.some(j => j.id === id)) {
                    // (Em um app real, mostraríamos um erro ao usuário)
                    console.error("ID da jornada já existe!");
                    return; 
                }
                jornadas.push({ id, nome, eventos: [], showFunil, showEventPeriodicFunnel, showUserPeriodicFunnel, showSkus, showTelas, showCorrelacoes });
            }
            renderJornadas();
            saveJornadas();
        };

        openModal(title, fieldsHtml, submitCallback);
    }

    /**
     * Abre o modal de confirmação para deletar uma Jornada.
     * @param {string} journeyId - ID da jornada a ser deletada.
     */
    function showDeleteJourneyModal(journeyId) {
        const jornada = jornadas.find(j => j.id === journeyId);
        if (!jornada) return;

        const message = `Tem certeza de que deseja excluir a jornada "${jornada.nome}"? Todos os seus eventos também serão removidos.`;
        
        const confirmCallback = () => {
            // Deletar (Delete)
            jornadas = jornadas.filter(j => j.id !== journeyId);
            renderJornadas();
            saveJornadas();
        };

        openDeleteModal(message, confirmCallback);
    }

    // --- FUNÇÕES DE CRUD (EVENTO) ---

    /**
     * Abre o modal para criar ou editar um Evento.
     * @param {string} journeyId - ID da jornada pai.
     * @param {object | null} evento - O evento a ser editado, ou null para criar.
     */
    function showEventModal(journeyId, evento = null) {
        const isEdit = evento !== null;
        const title = isEdit ? 'Editar Evento' : 'Novo Evento';
        
        // O 'nome' do evento (seu ID) só pode ser editado se for novo.
        const fieldsHtml = `
            ${createField('evento-nome', 'Nome do Evento (ID)', isEdit ? evento.nome : '', isEdit)}
            ${createField('evento-rotulo', 'Rótulo (Label)', isEdit ? evento.rotulo : '')}
        `;
        
        const submitCallback = (e) => {
            const formData = new FormData(e.target);
            const nome = formData.get('evento-nome').trim();
            const rotulo = formData.get('evento-rotulo').trim();

            if (!nome || !rotulo) return;

            const jornada = jornadas.find(j => j.id === journeyId);
            if (!jornada) return;

            if (isEdit) {
                // Atualizar (Update)
                const ev = jornada.eventos.find(ev => ev.nome === evento.nome);
                if (ev) {
                    ev.rotulo = rotulo;
                    // Não alteramos o 'nome' (ID)
                }
            } else {
                // Criar (Create)
                // Verifica se o 'nome' (ID) do evento já existe *nesta* jornada
                if (jornada.eventos.some(ev => ev.nome === nome)) {
                    console.error("Nome do evento já existe nesta jornada!");
                    return;
                }
                jornada.eventos.push({ nome, rotulo });
            }
            renderJornadas();
            saveJornadas();
        };

        openModal(title, fieldsHtml, submitCallback);
    }

    /**
     * Abre o modal de confirmação para deletar um Evento.
     * @param {string} journeyId - ID da jornada pai.
     * @param {string} eventNome - 'nome' (ID) do evento a ser deletado.
     */
    function showDeleteEventModal(journeyId, eventNome) {
        const jornada = jornadas.find(j => j.id === journeyId);
        const evento = jornada?.eventos.find(ev => ev.nome === eventNome);
        if (!evento) return;

        const message = `Tem certeza de que deseja excluir o evento "${evento.rotulo}" (${evento.nome})?`;
        
        const confirmCallback = () => {
            // Deletar (Delete)
            jornada.eventos = jornada.eventos.filter(ev => ev.nome !== eventNome);
            renderJornadas();
            saveJornadas();
        };

        openDeleteModal(message, confirmCallback);
    }


    // --- EVENT LISTENERS GLOBAIS ---

    // Botão principal para adicionar nova jornada
    addJourneyBtn.addEventListener('click', () => {
        showJourneyModal(null); // Passa null para indicar "criação"
    });

    // Listeners dos modais (para fechar)
    modalCancelBtn.addEventListener('click', closeModal);
    deleteModalCancelBtn.addEventListener('click', closeDeleteModal);
    
    // Fecha os modais ao clicar fora do conteúdo
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) closeDeleteModal();
    });

    // Delegação de eventos para botões dentro da lista de jornadas
    jornadasList.addEventListener('click', (e) => {
        const target = e.target;
        
        // Encontra o card da jornada pai
        const journeyCard = target.closest('[data-journey-id]');
        if (!journeyCard) return;
        const journeyId = journeyCard.dataset.journeyId;
        const journeyIndex = jornadas.findIndex(j => j.id === journeyId);

        // --- Ações da Jornada ---
        if (target.closest('.edit-journey-btn')) {
            const jornada = jornadas.find(j => j.id === journeyId);
            if (jornada) showJourneyModal(jornada); // Passa o objeto para "edição"
        } 
        else if (target.closest('.delete-journey-btn')) {
            showDeleteJourneyModal(journeyId);
        }
        else if (target.closest('.move-journey-up-btn')) {
            moveJourney(journeyIndex, 'up');
        }
        else if (target.closest('.move-journey-down-btn')) {
            moveJourney(journeyIndex, 'down');
        }
        // --- Ações do Evento ---
        else if (target.closest('.add-event-btn')) {
            showEventModal(journeyId, null); // Passa null para "criação"
        } 
        else {
            // Verifica se o clique foi em um item de evento
            const eventItem = target.closest('[data-event-nome]');
            if (!eventItem) return;
            const eventNome = eventItem.dataset.eventNome;
            const eventIndex = jornadas[journeyIndex].eventos.findIndex(ev => ev.nome === eventNome);

            if (target.closest('.edit-event-btn')) {
                const jornada = jornadas.find(j => j.id === journeyId);
                const evento = jornada?.eventos.find(ev => ev.nome === eventNome);
                if (evento) showEventModal(journeyId, evento); // Passa o objeto para "edição"
            }
            else if (target.closest('.delete-event-btn')) {
                showDeleteEventModal(journeyId, eventNome);
            }
            else if (target.closest('.move-event-up-btn')) {
                moveEvent(journeyIndex, eventIndex, 'up');
            }
            else if (target.closest('.move-event-down-btn')) {
                moveEvent(journeyIndex, eventIndex, 'down');
            }
        }
    });

    // --- INICIALIZAÇÃO ---
    fetchJornadas();
});
