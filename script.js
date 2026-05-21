document.addEventListener('DOMContentLoaded', async () => {
    // --- Auth Check ---
    const currentUser = await requireAuth();
    if (!currentUser) return; // Parar se não tiver logado

    // --- Elements ---
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskDueDate = document.getElementById('task-due-date');
    const taskList = document.getElementById('task-list');
    const emptyState = document.getElementById('empty-state');
    const createdCountEl = document.getElementById('created-count');
    const completedCountEl = document.getElementById('completed-count');
    const totalCountEl = document.getElementById('total-count');
    const toastContainer = document.getElementById('toast-container');

    // --- State ---
    let allTasks = JSON.parse(localStorage.getItem('taskflow_tasks')) || [];
    let tasks = allTasks.filter(t => t.userId === currentUser.id);

    // --- Initialization ---
    renderTasks();

    // --- Event Listeners ---
    if (taskForm) {
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = taskInput.value.trim();
            const dueDate = taskDueDate ? taskDueDate.value : null;
            if (text) {
                addTask(text, dueDate);
                taskInput.value = '';
                if(taskDueDate) taskDueDate.value = '';
                taskInput.focus();
            }
        });
    }

    // --- CRUD Functions ---

    // CREATE
    function addTask(text, dueDate) {
        const newTask = {
            id: Date.now().toString(),
            userId: currentUser.id, // Vínculo com o usuário logado
            text: text,
            dueDate: dueDate,
            completed: false,
            createdAt: new Date().toISOString()
        };
        tasks.unshift(newTask); // Adiciona na lista filtrada
        allTasks.unshift(newTask); // Adiciona na lista geral
        saveAndRender();
        showToast('Tarefa adicionada com sucesso!', 'success');
    }

    // UPDATE - Toggle Status
    window.toggleTask = function(id) {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            saveAndRender();
            if (task.completed) {
                showToast('Tarefa concluída! 🎉', 'success');
            }
        }
    };

    // UPDATE - Edit Text
    window.editTask = function(id) {
        const taskItem = document.querySelector(`.task-item[data-id="${id}"]`);
        const textEl = taskItem.querySelector('.task-text');
        const task = tasks.find(t => t.id === id);
        
        if (!task || task.completed) return; // Don't edit if completed

        // Replace text with input
        const inputEl = document.createElement('input');
        inputEl.type = 'text';
        inputEl.value = task.text;
        inputEl.className = 'edit-input';
        
        textEl.replaceWith(inputEl);
        inputEl.focus();

        // Handle save
        const saveEdit = () => {
            const newText = inputEl.value.trim();
            if (newText && newText !== task.text) {
                task.text = newText;
                showToast('Tarefa atualizada!', 'success');
            }
            saveAndRender();
        };

        inputEl.addEventListener('blur', saveEdit);
        inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveEdit();
            }
        });
    };

    // DELETE
    window.deleteTask = function(id) {
        const taskItem = document.querySelector(`.task-item[data-id="${id}"]`);
        taskItem.style.animation = 'fadeOut 0.3s ease forwards';
        
        setTimeout(() => {
            // Remove das duas listas
            tasks = tasks.filter(t => t.id !== id);
            allTasks = allTasks.filter(t => t.id !== id);
            saveAndRender();
            showToast('Tarefa removida.', 'error');
        }, 300);
    };

    // --- Helper Functions ---

    function saveAndRender() {
        localStorage.setItem('taskflow_tasks', JSON.stringify(allTasks));
        renderTasks();
    }

    function renderTasks() {
        if (!taskList) return; // Evita erro em páginas que não têm a task list (como Dashboard)
        
        // Clear current list
        taskList.innerHTML = '';

        // Update stats
        const completedTasks = tasks.filter(t => t.completed).length;
        if(createdCountEl) createdCountEl.textContent = tasks.length;
        if(completedCountEl) completedCountEl.textContent = completedTasks;
        if(totalCountEl) totalCountEl.textContent = tasks.length;

        // Toggle empty state
        if (tasks.length === 0) {
            if(emptyState) emptyState.classList.remove('hidden');
        } else {
            if(emptyState) emptyState.classList.add('hidden');

            // Render items
            tasks.forEach(task => {
                const li = document.createElement('li');
                li.className = `task-item ${task.completed ? 'completed' : ''}`;
                li.setAttribute('data-id', task.id);

                let dueHtml = '';
                if (task.dueDate && !task.completed) {
                    const dueTime = new Date(task.dueDate).getTime();
                    const now = new Date().getTime();
                    const isOverdue = dueTime < now;
                    
                    const formattedDate = new Date(task.dueDate).toLocaleString('pt-BR', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit'
                    });
                    
                    const badgeClass = isOverdue ? 'due-badge overdue' : 'due-badge';
                    const iconClass = isOverdue ? 'ph-warning' : 'ph-clock';
                    
                    dueHtml = `<div class="${badgeClass}"><i class="ph ${iconClass}"></i> ${formattedDate}</div>`;
                }

                li.innerHTML = `
                    <div class="task-content">
                        <div class="checkbox-container" onclick="toggleTask('${task.id}')" aria-label="Marcar como concluída">
                            <i class="ph-bold ph-check check-icon"></i>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.35rem; margin-top: 2px;">
                            <span class="task-text ${task.completed ? '' : 'cursor-pointer'}" 
                                  ${!task.completed ? `ondblclick="editTask('${task.id}')"` : ''}>
                                ${escapeHTML(task.text)}
                            </span>
                            ${dueHtml}
                        </div>
                    </div>
                    <div class="task-actions">
                        ${!task.completed ? `
                            <button class="action-btn edit" onclick="editTask('${task.id}')" aria-label="Editar">
                                <i class="ph ph-pencil-simple"></i>
                            </button>
                        ` : ''}
                        <button class="action-btn delete" onclick="deleteTask('${task.id}')" aria-label="Excluir">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                `;
                taskList.appendChild(li);
            });
        }
    }

    function showToast(message, type = 'success') {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconClass = type === 'success' ? 'ph-check-circle' : 'ph-warning-circle';
        
        toast.innerHTML = `
            <i class="ph-fill ${iconClass} toast-icon"></i>
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }
});
