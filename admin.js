document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const loginForm = document.getElementById('login-form');
    const adminNav = document.getElementById('admin-nav');
    const logoutBtn = document.getElementById('logout-btn');

    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // API Base
    const API_URL = '/api';

    // --- Helpers ---
    function applyPhoneMask(input) {
        input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);

            if (value.length > 10) {
                e.target.value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
            } else if (value.length > 6) {
                e.target.value = value.replace(/^(\d{2})(\d{4})(\d{4}).*/, '($1) $2-$3');
            } else if (value.length > 2) {
                e.target.value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
            } else {
                e.target.value = value;
            }
        });
    }

    function formatPhone(phone) {
        const value = phone.replace(/\D/g, '');
        if (value.length === 11) {
            return value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
        } else if (value.length === 10) {
            return value.replace(/^(\d{2})(\d{4})(\d{4}).*/, '($1) $2-$3');
        }
        return phone;
    }

    // Apply mask to client edit phone
    const clientPhoneInput = document.getElementById('client-edit-phone');
    if (clientPhoneInput) applyPhoneMask(clientPhoneInput);

    // --- State ---
    let currentToken = sessionStorage.getItem('adminToken');
    let calendar = null;

    // --- Init ---
    if (currentToken) {
        showDashboard();
    }

    // --- Auth Logic ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (data.success) {
                sessionStorage.setItem('adminToken', data.token);
                currentToken = data.token;
                showDashboard();
            } else {
                alert(data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Erro ao conectar com servidor');
        }
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('adminToken');
        location.reload();
    });

    function showDashboard() {
        loginSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        adminNav.classList.remove('hidden');
        loadDashboardStats();
        loadAppointments();
        loadServices();
    }

    // --- Tabs Logic ---
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.add('hidden'));

            btn.classList.add('active');
            const tab = document.getElementById(`tab-${btn.dataset.tab}`);
            if (tab) tab.classList.remove('hidden');

            // Load data when switching tabs
            if (btn.dataset.tab === 'dashboard') loadDashboardStats();
            if (btn.dataset.tab === 'clients') loadClients();
            if (btn.dataset.tab === 'messages') loadMessages();
            if (btn.dataset.tab === 'users') loadUsers();
            if (btn.dataset.tab === 'backups') loadBackups();
            if (btn.dataset.tab === 'logs') loadAuditLogs();
        });
    });

    // --- View Toggles & Filters ---
    const btnListView = document.getElementById('btn-list-view');
    const btnCalendarView = document.getElementById('btn-calendar-view');
    const listContainer = document.getElementById('appointments-list-container');
    const calendarContainer = document.getElementById('calendar-container');
    const filterService = document.getElementById('filter-service');
    const filterStatus = document.getElementById('filter-status');

    btnListView.addEventListener('click', () => {
        btnListView.classList.add('active');
        btnCalendarView.classList.remove('active');
        listContainer.classList.remove('hidden');
        calendarContainer.classList.add('hidden');
    });

    btnCalendarView.addEventListener('click', () => {
        btnCalendarView.classList.add('active');
        btnListView.classList.remove('active');
        listContainer.classList.add('hidden');
        calendarContainer.classList.remove('hidden');

        if (!calendar) {
            initCalendar();
        } else {
            calendar.render();
            loadCalendarEvents();
        }
    });

    filterService.addEventListener('change', () => {
        loadAppointments();
    });

    filterStatus.addEventListener('change', () => {
        loadAppointments();
    });

    function initCalendar() {
        const calendarEl = document.getElementById('calendar');
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'timeGridWeek',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            locale: 'pt-br',
            buttonText: {
                today: 'Hoje',
                month: 'Mês',
                week: 'Semana',
                day: 'Dia'
            },
            allDaySlot: false,
            slotMinTime: '08:00:00',
            slotMaxTime: '20:00:00',
            height: 'auto',
            editable: true, // Allow drag and drop
            themeSystem: 'standard',
            eventClick: function (info) {
                const app = info.event;
                const { status, phone, amount } = app.extendedProps;

                const action = prompt(
                    `Agendamento: ${app.title}\n` +
                    `Status: ${translateStatus(status)}\n` +
                    `Telefone: ${formatPhone(phone)}\n\n` +
                    `O que deseja fazer?\n` +
                    `1. Marcar como CONCLUÍDO\n` +
                    `2. Marcar como CANCELADO\n` +
                    `3. Registrar PAGAMENTO\n` +
                    `4. Ligar para cliente\n\n` +
                    `Digite o número da opção:`
                );

                if (action === '1') updateStatus(app.id, 'completed');
                else if (action === '2') updateStatus(app.id, 'cancelled');
                else if (action === '3') openPaymentModal(app.id, amount);
                else if (action === '4') window.open(`tel:${phone.replace(/\D/g, '')}`);
            },
            eventDrop: async function (info) {
                const newDate = info.event.start.toISOString().split('T')[0];
                const newTime = info.event.start.toTimeString().split(' ')[0].substring(0, 5);

                if (!confirm(`Deseja reagendar "${info.event.title}" para ${newDate} às ${newTime}?`)) {
                    info.revert();
                    return;
                }

                try {
                    const res = await fetch(`${API_URL}/appointments/${info.event.id}/reschedule`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${currentToken}`
                        },
                        body: JSON.stringify({ date: newDate, time: newTime })
                    });

                    if (res.ok) {
                        alert('Reagendamento realizado com sucesso!');
                        loadAppointments(); // Refresh list view too
                    } else {
                        const data = await res.json();
                        alert('Erro: ' + (data.error || 'Falha ao reagendar'));
                        info.revert();
                    }
                } catch (err) {
                    console.error('Error rescheduling:', err);
                    alert('Erro de conexão ao reagendar');
                    info.revert();
                }
            }
        });
        calendar.render();
        loadCalendarEvents();
    }

    async function loadCalendarEvents() {
        if (!calendar) return;

        const svcFilter = filterService.value;
        const statusFilter = filterStatus.value;

        try {
            const res = await fetch(`${API_URL}/admin/appointments`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            let appointments = await res.json();

            // Apply Filters
            if (svcFilter) appointments = appointments.filter(app => app.service === svcFilter);
            if (statusFilter) appointments = appointments.filter(app => app.status === statusFilter);

            const events = appointments.map(app => ({
                id: app.id,
                title: `${app.name} - ${app.service}`,
                start: `${app.date}T${app.time}`,
                backgroundColor: getStatusColor(app.status),
                borderColor: getStatusColor(app.status),
                extendedProps: {
                    status: app.status,
                    phone: app.phone,
                    amount: app.amount || 0
                }
            }));

            calendar.removeAllEvents();
            calendar.addEventSource(events);
        } catch (err) {
            console.error('Error loading calendar events:', err);
        }
    }

    function getStatusColor(status) {
        switch (status) {
            case 'completed': return '#1b5e20';
            case 'cancelled': return '#b71c1c';
            case 'pending': return '#333';
            default: return 'var(--gold)';
        }
    }

    // --- Dashboard Logic ---
    async function loadDashboardStats() {
        try {
            const res = await fetch(`${API_URL}/stats`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            const stats = await res.json();

            document.getElementById('stat-today').textContent = stats.todayCount || 0;
            document.getElementById('stat-week').textContent = stats.weekCount || 0;
            document.getElementById('stat-month').textContent = stats.monthCount || 0;
            document.getElementById('stat-revenue').textContent = `R$ ${(stats.totalRevenue || 0).toFixed(2)}`;

            const tbody = document.getElementById('top-services-list');
            tbody.innerHTML = '';
            (stats.topServices || []).forEach(svc => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${svc.service}</td><td>${svc.count}</td>`;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error('Error loading stats:', err);
        }
    }

    // --- Appointments Logic ---
    async function loadAppointments() {
        const tbody = document.getElementById('appointments-list');
        tbody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';

        const svcFilter = filterService.value;
        const statusFilter = filterStatus.value;

        try {
            const res = await fetch(`${API_URL}/admin/appointments`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            let appointments = await res.json();

            // Apply Filters
            if (svcFilter) appointments = appointments.filter(app => app.service === svcFilter);
            if (statusFilter) appointments = appointments.filter(app => app.status === statusFilter);

            if (calendar) loadCalendarEvents();

            tbody.innerHTML = '';
            appointments.forEach(app => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${formatDate(app.date)}<br><small>${app.time}</small></td>
                    <td>${app.name}<br><small>${app.phone}</small></td>
                    <td>${app.service}</td>
                    <td><span class="status-badge status-${app.status}">${translateStatus(app.status)}</span></td>
                    <td>
                        <button class="action-btn" onclick="updateStatus(${app.id}, 'completed')">✅</button>
                        <button class="action-btn" onclick="updateStatus(${app.id}, 'cancelled')">❌</button>
                        <button class="action-btn" onclick="openPaymentModal(${app.id}, ${app.amount || 0})">💰</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error(err);
            tbody.innerHTML = '<tr><td colspan="5">Erro ao carregar dados.</td></tr>';
        }
    }

    document.getElementById('refresh-appointments').addEventListener('click', loadAppointments);

    window.updateStatus = async (id, status) => {
        if (!confirm(`Alterar status para ${translateStatus(status)}?`)) return;

        try {
            await fetch(`${API_URL}/appointments/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify({ status })
            });
            loadAppointments();
            loadDashboardStats();
        } catch (err) {
            alert('Erro ao atualizar status');
        }
    };

    // Payment Modal
    window.openPaymentModal = (id, currentAmount) => {
        document.getElementById('payment-appointment-id').value = id;
        document.getElementById('payment-amount').value = currentAmount;
        document.getElementById('payment-modal').classList.remove('hidden');
    };

    document.getElementById('payment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('payment-appointment-id').value;
        const payment_method = document.getElementById('payment-method').value;
        const amount = document.getElementById('payment-amount').value;

        try {
            await fetch(`${API_URL}/appointments/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify({ payment_method, amount: parseFloat(amount) })
            });
            document.getElementById('payment-modal').classList.add('hidden');
            loadAppointments();
            alert('Pagamento registrado!');
        } catch (err) {
            alert('Erro ao salvar pagamento');
        }
    });

    // --- Reports Logic ---
    document.getElementById('generate-report').addEventListener('click', async () => {
        const start = document.getElementById('report-start').value;
        const end = document.getElementById('report-end').value;

        if (!start || !end) {
            alert('Selecione as datas inicial e final');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/reports?start=${start}&end=${end}`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            const data = await res.json();

            document.getElementById('report-total').textContent = `Total: R$ ${data.total.toFixed(2)}`;

            const tbody = document.getElementById('reports-list');
            tbody.innerHTML = '';
            data.appointments.forEach(app => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${formatDate(app.date)}<br><small>${app.time}</small></td>
                    <td>${app.name}</td>
                    <td>${app.service}</td>
                    <td>${app.payment_method || 'N/A'}</td>
                    <td>R$ ${(app.amount || 0).toFixed(2)}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            alert('Erro ao gerar relatório');
        }
    });

    // --- Clients Logic ---
    async function loadClients() {
        try {
            const res = await fetch(`${API_URL}/clients`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            const clients = await res.json();

            const container = document.getElementById('clients-list');
            container.innerHTML = '';

            clients.forEach(client => {
                const card = document.createElement('div');
                card.className = 'client-card';
                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;" onclick="viewClientHistory(${client.id}, '${client.name.replace(/'/g, "\\'")}')">
                            <strong>${client.name}</strong><br>
                            <small>${client.phone} | ${client.appointment_count} agendamento(s) | Total gasto: R$ ${(client.total_spent || 0).toFixed(2)}</small>
                        </div>
                        <div style="display: flex; gap: 5px;">
                            <button class="action-btn" onclick="event.stopPropagation(); editClient(${client.id}, '${client.name.replace(/'/g, "\\'")}', '${client.phone}')" title="Editar">✏️</button>
                            <button class="action-btn" onclick="event.stopPropagation(); deleteClient(${client.id}, '${client.name.replace(/'/g, "\\'")}')" title="Excluir">🗑️</button>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });

            // Search functionality
            document.getElementById('client-search').oninput = (e) => {
                const search = e.target.value.toLowerCase();
                document.querySelectorAll('.client-card').forEach(card => {
                    card.style.display = card.textContent.toLowerCase().includes(search) ? 'block' : 'none';
                });
            };
        } catch (err) {
            console.error('Error loading clients:', err);
        }
    }

    window.editClient = (id, name, phone) => {
        document.getElementById('client-edit-id').value = id;
        document.getElementById('client-edit-name').value = name;
        document.getElementById('client-edit-phone').value = formatPhone(phone);
        document.getElementById('client-edit-modal').classList.remove('hidden');
    };

    window.deleteClient = async (id, name) => {
        if (!confirm(`Tem certeza que deseja excluir o cliente "${name}"?\n\nISTO IRÁ EXCLUIR TODOS OS AGENDAMENTOS DESTE CLIENTE!`)) return;

        try {
            await fetch(`${API_URL}/clients/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            loadClients();
            alert('Cliente excluído com sucesso!');
        } catch (err) {
            alert('Erro ao excluir cliente');
        }
    };

    document.getElementById('client-edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('client-edit-id').value;
        const name = document.getElementById('client-edit-name').value;
        const phone = document.getElementById('client-edit-phone').value;

        try {
            await fetch(`${API_URL}/clients/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify({ name, phone })
            });
            document.getElementById('client-edit-modal').classList.add('hidden');
            loadClients();
            alert('Cliente atualizado com sucesso!');
        } catch (err) {
            alert('Erro ao atualizar cliente');
        }
    });

    window.viewClientHistory = async (clientId, clientName) => {
        try {
            const res = await fetch(`${API_URL}/clients/${clientId}/history`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            const history = await res.json();

            document.getElementById('client-modal-title').textContent = `Histórico: ${clientName}`;
            const tbody = document.getElementById('client-history-list');
            tbody.innerHTML = '';

            history.forEach(app => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${formatDate(app.date)}<br><small>${app.time}</small></td>
                    <td>${app.service}</td>
                    <td><span class="status-badge status-${app.status}">${translateStatus(app.status)}</span></td>
                    <td>R$ ${(app.amount || 0).toFixed(2)}</td>
                `;
                tbody.appendChild(tr);
            });

            document.getElementById('client-modal').classList.remove('hidden');
        } catch (err) {
            alert('Erro ao carregar histórico');
        }
    };

    // --- Messages Logic ---
    async function loadMessages() {
        try {
            const res = await fetch(`${API_URL}/messages`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            const messages = await res.json();

            const tbody = document.getElementById('messages-list');
            tbody.innerHTML = '';

            messages.forEach(msg => {
                const tr = document.createElement('tr');
                const date = new Date(msg.sent_at);
                tr.innerHTML = `
                    <td>${date.toLocaleString('pt-BR')}</td>
                    <td>${msg.content.substring(0, 50)}...</td>
                    <td>${msg.recipient_count}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error('Error loading messages:', err);
        }
    }

    document.getElementById('send-bulk-message').addEventListener('click', async () => {
        const message = document.getElementById('message-content').value.trim();
        if (!message) {
            alert('Digite uma mensagem');
            return;
        }

        if (!confirm('Enviar mensagem para todos os clientes?')) return;

        try {
            // Get all clients
            const res = await fetch(`${API_URL}/clients`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            const clients = await res.json();

            // Log message
            await fetch(`${API_URL}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify({ content: message, recipient_count: clients.length })
            });

            // Open WhatsApp for each client
            clients.forEach((client, index) => {
                setTimeout(() => {
                    const phone = client.phone.replace(/\D/g, '');
                    const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, '_blank');
                }, index * 1000); // 1 second delay between each
            });

            document.getElementById('message-content').value = '';
            loadMessages();
            alert(`Abrindo WhatsApp para ${clients.length} cliente(s)...`);
        } catch (err) {
            alert('Erro ao enviar mensagens');
        }
    });

    // --- Services Logic ---
    const serviceModal = document.getElementById('service-modal');
    const serviceForm = document.getElementById('service-form');

    async function loadServices() {
        const tbody = document.getElementById('services-list');
        if (!tbody) return;

        try {
            const res = await fetch(`${API_URL}/services`);
            const services = await res.json();

            tbody.innerHTML = ''; // Clear previous items
            if (!Array.isArray(services)) return;

            services.forEach(svc => {
                const tr = document.createElement('tr');
                const photo = svc.image_url
                    ? `<img src="${svc.image_url}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border);">`
                    : `<div style="width: 40px; height: 40px; background: #222; display: flex; align-items: center; justify-content: center; border-radius: 4px; border: 1px solid var(--border);">🖼️</div>`;

                tr.innerHTML = `
                    <td>${photo}</td>
                    <td>${svc.name}</td>
                    <td>R$ ${parseFloat(svc.price || 0).toFixed(2)}</td>
                    <td>
                        <button class="action-btn" onclick='editService(${JSON.stringify(svc)})'>✏️</button>
                        <button class="action-btn" onclick="deleteService(${svc.id})">🗑️</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error('Error loading services:', err);
            tbody.innerHTML = '<tr><td colspan="4">Erro ao carregar serviços.</td></tr>';
        }
    }

    document.getElementById('add-service-btn').addEventListener('click', () => {
        document.getElementById('service-form').reset();
        document.getElementById('service-id').value = '';
        document.getElementById('svc-image').value = '';
        document.getElementById('image-preview').innerHTML = '🖼️';
        document.getElementById('modal-title').textContent = 'Novo Serviço';
        serviceModal.classList.remove('hidden');
    });

    // Image Preview Logic
    const svcFile = document.getElementById('svc-file');
    const imagePreview = document.getElementById('image-preview');
    if (svcFile) {
        svcFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                    imagePreview.innerHTML = `<img src="${re.target.result}" style="width: 100%; height: 100%; object-fit: cover;">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    document.querySelector('.close-modal').addEventListener('click', () => {
        serviceModal.classList.add('hidden');
    });

    serviceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = serviceForm.querySelector('button[type="submit"]');
        const fileInput = document.getElementById('svc-file');
        const id = document.getElementById('service-id').value;

        const data = {
            name: document.getElementById('svc-name').value.trim(),
            description: document.getElementById('svc-desc').value.trim(),
            price: document.getElementById('svc-price').value,
            image_url: document.getElementById('svc-image').value
        };

        if (!data.name || !data.price) {
            alert('Nome e preço são obrigatórios');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Salvando...';

        try {
            // Upload file if selected
            if (fileInput.files.length > 0) {
                submitBtn.textContent = 'Subindo imagem...';
                const formData = new FormData();
                formData.append('file', fileInput.files[0]);

                const uploadRes = await fetch(`${API_URL}/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${currentToken}` },
                    body: formData
                });
                const uploadData = await uploadRes.json();
                if (uploadRes.ok) {
                    data.image_url = uploadData.url;
                } else {
                    throw new Error(uploadData.error || 'Erro no upload');
                }
            }

            const method = id ? 'PUT' : 'POST';
            const url = id ? `${API_URL}/services/${id}` : `${API_URL}/services`;

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify(data)
            });
            const result = await res.json();

            if (res.ok) {
                serviceModal.classList.add('hidden');
                loadServices();
                alert(id ? 'Serviço atualizado!' : 'Serviço criado!');
            } else {
                alert('Erro: ' + (result.error || 'Falha ao salvar'));
            }
        } catch (err) {
            console.error('Error saving service:', err);
            alert('Erro: ' + err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Salvar';
        }
    });

    window.editService = (svc) => {
        document.getElementById('service-id').value = svc.id;
        document.getElementById('svc-name').value = svc.name;
        document.getElementById('svc-desc').value = svc.description || '';
        document.getElementById('svc-price').value = svc.price;
        document.getElementById('svc-image').value = svc.image_url || '';

        if (svc.image_url) {
            imagePreview.innerHTML = `<img src="${svc.image_url}" style="width: 100%; height: 100%; object-fit: cover;">`;
        } else {
            imagePreview.innerHTML = '🖼️';
        }

        document.getElementById('modal-title').textContent = 'Editar Serviço';
        serviceModal.classList.remove('hidden');
    };

    window.deleteService = async (id) => {
        if (!confirm('Tem certeza que deseja remover este serviço?')) return;
        try {
            const res = await fetch(`${API_URL}/services/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            if (res.ok) {
                loadServices();
                alert('Serviço removido!');
            } else {
                const data = await res.json();
                alert('Erro: ' + (data.error || 'Falha ao remover'));
            }
        } catch (err) {
            alert('Erro ao conectar com o servidor');
        }
    };

    // --- User Management Logic ---
    async function loadUsers() {
        try {
            const res = await fetch(`${API_URL}/users`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            const users = await res.json();

            const tbody = document.getElementById('users-list');
            tbody.innerHTML = '';

            users.forEach(user => {
                const tr = document.createElement('tr');
                const lastLogin = user.last_login ? new Date(user.last_login).toLocaleString('pt-BR') : 'Nunca';
                tr.innerHTML = `
                    <td>${user.username}</td>
                    <td>${user.full_name || '-'}</td>
                    <td>${user.role === 'admin' ? 'Administrador' : 'Operador'}</td>
                    <td>${lastLogin}</td>
                    <td>
                        <button class="action-btn" onclick="editUser(${user.id}, '${user.username}', '${user.full_name || ''}', '${user.role}')">✏️</button>
                        <button class="action-btn" onclick="deleteUser(${user.id}, '${user.username}')">🗑️</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error('Error loading users:', err);
        }
    }

    document.getElementById('add-user-btn').addEventListener('click', () => {
        document.getElementById('user-form').reset();
        document.getElementById('user-id').value = '';
        document.getElementById('user-modal-title').textContent = 'Novo Usuário';
        document.getElementById('user-password').required = true;
        document.getElementById('user-modal').classList.remove('hidden');
    });

    window.editUser = (id, username, fullname, role) => {
        document.getElementById('user-id').value = id;
        document.getElementById('user-username').value = username;
        document.getElementById('user-fullname').value = fullname;
        document.getElementById('user-role').value = role;
        document.getElementById('user-password').required = false;
        document.getElementById('user-modal-title').textContent = 'Editar Usuário';
        document.getElementById('user-modal').classList.remove('hidden');
    };

    window.deleteUser = async (id, username) => {
        if (!confirm(`Tem certeza que deseja excluir o usuário "${username}"?`)) return;

        try {
            const res = await fetch(`${API_URL}/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            const data = await res.json();

            if (res.ok) {
                loadUsers();
                alert(data.message || 'Usuário excluído com sucesso!');
            } else {
                alert(data.error || 'Erro ao excluir usuário');
            }
        } catch (err) {
            alert('Erro ao excluir usuário');
        }
    };

    document.getElementById('user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('user-id').value;
        const data = {
            username: document.getElementById('user-username').value,
            full_name: document.getElementById('user-fullname').value,
            role: document.getElementById('user-role').value
        };

        const password = document.getElementById('user-password').value;
        if (password) {
            data.password = password;
        }

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/users/${id}` : `${API_URL}/users`;

        try {
            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify(data)
            });
            const result = await res.json();

            if (res.ok) {
                document.getElementById('user-modal').classList.add('hidden');
                loadUsers();
                alert(result.message || 'Usuário salvo com sucesso!');
            } else {
                alert(result.error || 'Erro ao salvar usuário');
            }
        } catch (err) {
            alert('Erro ao salvar usuário');
        }
    });

    // Change Password
    document.getElementById('change-password-btn').addEventListener('click', () => {
        document.getElementById('change-password-form').reset();
        document.getElementById('change-password-modal').classList.remove('hidden');
    });

    document.getElementById('change-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
            alert('As senhas não coincidem!');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });
            const data = await res.json();

            if (res.ok) {
                document.getElementById('change-password-modal').classList.add('hidden');
                alert(data.message || 'Senha alterada com sucesso!');
            } else {
                alert(data.error || 'Erro ao alterar senha');
            }
        } catch (err) {
            alert('Erro ao alterar senha');
        }
    });

    // --- Backup Management Logic ---
    async function loadBackups() {
        try {
            const res = await fetch(`${API_URL}/backup/list`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            const backups = await res.json();

            const tbody = document.getElementById('backups-list');
            tbody.innerHTML = '';

            if (backups.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3">Nenhum backup encontrado</td></tr>';
                return;
            }

            backups.forEach(backup => {
                const tr = document.createElement('tr');
                const size = (backup.size / 1024).toFixed(2); // KB
                const date = new Date(backup.created).toLocaleString('pt-BR');
                tr.innerHTML = `
                    <td>${backup.name}</td>
                    <td>${size} KB</td>
                    <td>${date}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error('Error loading backups:', err);
        }
    }

    async function loadAuditLogs() {
        try {
            const res = await fetch(`${API_URL}/admin/audit-logs`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            const logs = await res.json();

            const tbody = document.getElementById('audit-logs-list');
            tbody.innerHTML = '';

            logs.forEach(log => {
                const tr = document.createElement('tr');
                const date = new Date(log.timestamp).toLocaleString('pt-BR');
                tr.innerHTML = `
                    <td>${date}</td>
                    <td>${log.username || 'System'}</td>
                    <td><small>${log.action}</small></td>
                    <td>${log.details}</td>
                    <td><small>${log.ip_address}</small></td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error('Error loading audit logs:', err);
        }
    }

    document.getElementById('refresh-logs').addEventListener('click', loadAuditLogs);

    document.getElementById('create-backup-btn').addEventListener('click', async () => {
        if (!confirm('Criar um backup manual do banco de dados?')) return;

        try {
            const res = await fetch(`${API_URL}/backup/create`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            const data = await res.json();

            if (res.ok) {
                loadBackups();
                alert(data.message || 'Backup criado com sucesso!');
            } else {
                alert(data.error || 'Erro ao criar backup');
            }
        } catch (err) {
            alert('Erro ao criar backup');
        }
    });

    // Helpers
    function formatDate(dateStr) {
        const parts = dateStr.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    function translateStatus(status) {
        const map = {
            'pending': 'Pendente',
            'completed': 'Concluído',
            'cancelled': 'Cancelado'
        };
        return map[status] || status;
    }

});
