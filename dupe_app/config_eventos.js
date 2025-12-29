document.addEventListener('DOMContentLoaded', () => {
    
    // --- ESTADO DA APLICAÇÃO ---
    let eventos = [];

    // --- ELEMENTOS DA DOM ---
    const eventosList = document.getElementById('eventos-list');
    const addEventBtn = document.getElementById('add-event-btn');
    
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

    const messageArea = document.getElementById('message-area');

    // --- FUNÇÕES DE API ---
    function fetchEventos() {
        fetch('/api/eventos_selecionados')
            .then(response => response.json())
            .then(data => {
                eventos = data;
                renderEventos();
            })
            .catch(error => console.error('Erro ao carregar eventos:', error));
    }

    function saveEventos() {
        fetch('/api/eventos_selecionados', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventos, null, 2)
        })
        .then(response => response.json())
        .then(data => {
            console.log(data.message);
        })
        .catch(error => console.error('Erro ao salvar eventos:', error));
    }

    function filtrarEventos() {
        messageArea.textContent = 'Filtrando...';
        messageArea.className = 'text-blue-600';

        fetch('/api/filtrar_eventos', { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                messageArea.textContent = data.message;
                messageArea.className = 'text-green-600';
            })
            .catch(error => {
                messageArea.textContent = 'Erro ao filtrar eventos.';
                messageArea.className = 'text-red-600';
                console.error('Erro ao filtrar eventos:', error)
            });
    }

    // --- FUNÇÕES DE RENDERIZAÇÃO ---
    function renderEventos() {
        eventosList.innerHTML = '';
        
        if (eventos.length === 0) {
            eventosList.innerHTML = `<div class="text-center text-gray-500 py-10">Nenhum evento encontrado.</div>`;
            return;
        }

        eventos.forEach((evento, index) => {
            const eventoCard = document.createElement('div');
            eventoCard.className = 'bg-white shadow-lg rounded-lg p-6 mb-6 transition-all hover:shadow-xl';
            eventoCard.dataset.index = index;

            eventoCard.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <p class="font-medium text-gray-800">${evento.rotulo}</p>
                        <p class="text-sm text-gray-500">${evento.valor}</p>
                    </div>
                    <div class="flex-shrink-0 space-x-2">
                        <button class="edit-event-btn p-1 text-gray-600 hover:text-blue-700" title="Editar Evento">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.932Z" /></svg>
                        </button>
                        <button class="delete-event-btn p-1 text-gray-600 hover:text-red-700" title="Excluir Evento">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12.54 0c.342.052.682.107 1.022.166m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.144-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.057-2.09.9-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                        </button>
                    </div>
                </div>
            `;
            
            eventosList.appendChild(eventoCard);
        });
    }

    // --- FUNÇÕES DE MODAL (ABRIR/FECHAR) ---
    function openModal(title, fieldsHtml, submitCallback) {
        modalTitle.textContent = title;
        modalFields.innerHTML = fieldsHtml;
        modal.classList.remove('hidden');
        modalContent.classList.add('modal-enter');

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

        deleteModalConfirmBtn.onclick = () => {
            confirmCallback();
            closeDeleteModal();
        };
    }

    function closeDeleteModal() {
        deleteModal.classList.add('hidden');
    }

    // --- FUNÇÕES DE CRUD (EVENTO) ---
    function createField(id, label, value = '', readonly = false) {
        return `
            <div class="mb-4">
                <label for="${id}" class="block text-sm font-medium text-gray-700 mb-1">${label}</label>
                <input type="text" id="${id}" name="${id}" value="${value}" ${readonly ? 'readonly' : ''} 
                       class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${readonly ? 'bg-gray-100 cursor-not-allowed' : ''}" required>
            </div>
        `;
    }

    function showEventModal(evento = null) {
        const isEdit = evento !== null;
        const title = isEdit ? 'Editar Evento' : 'Novo Evento';
        
        const fieldsHtml = `
            ${createField('evento-rotulo', 'Rótulo (Label)', isEdit ? evento.rotulo : '')}
            ${createField('evento-valor', 'Valor (ID do Evento)', isEdit ? evento.valor : '')}
        `;

        const submitCallback = (e) => {
            const formData = new FormData(e.target);
            const rotulo = formData.get('evento-rotulo').trim();
            const valor = formData.get('evento-valor').trim();
            
            if (!rotulo || !valor) return;

            if (isEdit) {
                const index = eventos.indexOf(evento);
                if (index > -1) {
                    eventos[index] = { rotulo, valor };
                }
            } else {
                eventos.push({ rotulo, valor });
            }
            renderEventos();
            saveEventos();
        };

        openModal(title, fieldsHtml, submitCallback);
    }

    function showDeleteEventModal(evento) {
        const message = `Tem certeza de que deseja excluir o evento "${evento.rotulo}"?`;
        
        const confirmCallback = () => {
            const index = eventos.indexOf(evento);
            if (index > -1) {
                eventos.splice(index, 1);
                renderEventos();
                saveEventos();
            }
        };

        openDeleteModal(message, confirmCallback);
    }

    // --- EVENT LISTENERS GLOBAIS ---
    const filterBtn = document.getElementById('filter-btn');

    addEventBtn.addEventListener('click', () => {
        showEventModal(null);
    });

    filterBtn.addEventListener('click', filtrarEventos);

    modalCancelBtn.addEventListener('click', closeModal);
    deleteModalCancelBtn.addEventListener('click', closeDeleteModal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) closeDeleteModal();
    });

    eventosList.addEventListener('click', (e) => {
        const target = e.target;
        const eventCard = target.closest('[data-index]');
        if (!eventCard) return;
        
        const index = parseInt(eventCard.dataset.index, 10);
        const evento = eventos[index];

        if (target.closest('.edit-event-btn')) {
            showEventModal(evento);
        } 
        else if (target.closest('.delete-event-btn')) {
            showDeleteEventModal(evento);
        }
    });

    // --- INICIALIZAÇÃO ---
    fetchEventos();
});
