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
        loadSettings();
    }

    // --- Tabs Logic ---
    function switchTab(tabId) {
        tabBtns.forEach(b => {
            if (b.dataset.tab === tabId) b.classList.add('active');
            else b.classList.remove('active');
        });
        tabContents.forEach(c => {
            if (c.id === `tab-${tabId}`) c.classList.remove('hidden');
            else c.classList.add('hidden');
        });

        // Load data specific to the tab
        if (tabId === 'dashboard') loadDashboardStats();
        if (tabId === 'appointments') loadAppointments();
        if (tabId === 'services') loadServices();
        if (tabId === 'clients') loadClients();
        if (tabId === 'gallery') loadGallery();
        if (tabId === 'messages') loadMessages();
        if (tabId === 'users') loadUsers();
        if (tabId === 'backups') loadBackups();
        if (tabId === 'logs') loadAuditLogs();
    }

    // --- Tabs Logic ---
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // --- Gallery Logic ---
    function loadGallery() {
        // For now, it's placeholders, but we could fetch from /img folder or an API
        console.log('Gallery tab activated');
    }

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
            case 'completed': return '#48BB78'; // Suceso
            case 'cancelled': return '#F56565'; // Falha
            case 'pending': return '#718096'; // Pendente
            default: return '#B76E79'; // Rose Copper (Padrão)
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
        const grid = document.getElementById('services-grid');
        if (!grid) return;

        try {
            const res = await fetch(`${API_URL}/services`);
            const services = await res.json();

            grid.innerHTML = ''; // Clear previous items
            if (!Array.isArray(services)) return;

            services.forEach(svc => {
                const card = document.createElement('div');
                card.className = 'stat-card';
                card.style.padding = '15px';
                card.style.display = 'flex';
                card.style.flexDirection = 'column';
                card.style.gap = '15px';

                const photoContainer = document.createElement('div');
                photoContainer.style.width = '100%';
                photoContainer.style.aspectRatio = '16/9';
                photoContainer.style.borderRadius = '6px';
                photoContainer.style.overflow = 'hidden';
                photoContainer.style.background = '#222';
                photoContainer.style.display = 'flex';
                photoContainer.style.alignItems = 'center';
                photoContainer.style.justifyContent = 'center';
                photoContainer.style.border = '1px solid var(--border)';

                if (svc.image_url) {
                    photoContainer.innerHTML = `<img src="${svc.image_url}" style="width: 100%; height: 100%; object-fit: cover;">`;
                } else {
                    photoContainer.innerHTML = `<span style="font-size: 2rem;">🖼️</span>`;
                }

                const content = document.createElement('div');
                content.innerHTML = `
                    <h4 style="margin: 0; font-size: 1rem; color: var(--rose);">${svc.name}</h4>
                    <p style="font-size: 0.8rem; color: var(--muted); margin: 5px 0 10px; min-height: 2.4em; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${svc.description || 'Sem descrição'}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 700; color: var(--cloud);">R$ ${parseFloat(svc.price || 0).toFixed(2)}</span>
                        <div class="actions" style="display: flex; gap: 8px;"></div>
                    </div>
                `;

                const editBtn = document.createElement('button');
                editBtn.className = 'action-btn';
                editBtn.innerHTML = '✏️';
                editBtn.onclick = () => editService(svc);

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'action-btn';
                deleteBtn.innerHTML = '🗑️';
                deleteBtn.onclick = () => deleteService(svc.id);

                content.querySelector('.actions').appendChild(editBtn);
                content.querySelector('.actions').appendChild(deleteBtn);

                card.appendChild(photoContainer);
                card.appendChild(content);
                grid.appendChild(card);
            });
        } catch (err) {
            console.error('Error loading services:', err);
            grid.innerHTML = '<p>Erro ao carregar serviços.</p>';
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

    // URL input logic
    const svcImageInput = document.getElementById('svc-image');
    if (svcImageInput) {
        svcImageInput.addEventListener('input', (e) => {
            const url = e.target.value.trim();
            if (url && (url.startsWith('http') || url.startsWith('/img/'))) {
                imagePreview.innerHTML = `<img src="${url}" style="width: 100%; height: 100%; object-fit: cover;">`;
            } else if (!url) {
                imagePreview.innerHTML = '🖼️';
            }
        });
    }

    // Auto-link logic
    document.getElementById('auto-link-btn').addEventListener('click', async () => {
        if (!confirm('Deseja vincular fotos da pasta /img aos serviços automaticamente baseado nos nomes?')) return;

        const btn = document.getElementById('auto-link-btn');
        btn.disabled = true;
        btn.textContent = 'Processando...';

        try {
            // Get all local images
            const imgRes = await fetch(`${API_URL}/admin/images`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            const images = await imgRes.json();

            // Get all services
            const svcRes = await fetch(`${API_URL}/services`);
            const services = await svcRes.json();

            let count = 0;
            for (const svc of services) {
                if (!svc.image_url) {
                    // Try to find a matching image
                    const match = images.find(img => {
                        const name = svc.name.toLowerCase();
                        const imgName = img.name.toLowerCase();
                        return imgName.includes(name) || name.includes(imgName.split('.')[0]);
                    });

                    if (match) {
                        await fetch(`${API_URL}/services/${svc.id}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${currentToken}`
                            },
                            body: JSON.stringify({ ...svc, image_url: match.url })
                        });
                        count++;
                    }
                }
            }
            alert(`${count} serviços foram vinculados a fotos com sucesso!`);
            loadServices();
        } catch (err) {
            console.error(err);
            alert('Erro ao processar vínculo automático');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Vincular Fotos Auto';
        }
    });

    // Modals are closed via inline onclick for consistency in HTML

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

    // Library Selector for Services
    document.getElementById('btn-open-gallery').onclick = () => {
        openImageSelector((url) => {
            document.getElementById('svc-image').value = url;
            imagePreview.innerHTML = `<img src="${url}" style="width: 100%; height: 100%; object-fit: cover;">`;
            // Clear file input if gallery is used
            document.getElementById('svc-file').value = '';
        });
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

    // --- Settings Logic ---
    // --- Layout & System Manager Logic ---
    async function loadSettings() {
        try {
            // Priority: Local (unsaved changes/demo) > Server API
            let settings = {};
            const localSaved = localStorage.getItem('tata_settings');

            if (localSaved) {
                settings = JSON.parse(localSaved);
            } else {
                const res = await fetch(`${API_URL}/settings`);
                const data = await res.json();
                settings = data.settings || {};
            }

            // Map fields to UI
            if (document.getElementById('set-site-title')) document.getElementById('set-site-title').value = settings.site_title || 'Tata Nail | Especialista em Unhas Premium';
            if (document.getElementById('set-about-text')) document.getElementById('set-about-text').value = settings.about_text || '';
            if (document.getElementById('set-contact-phone')) document.getElementById('set-contact-phone').value = settings.contact_phone || '(11) 99999-9999';
            if (document.getElementById('set-opening')) document.getElementById('set-opening').value = settings.opening_time || '09:00';
            if (document.getElementById('set-closing')) document.getElementById('set-closing').value = settings.closing_time || '19:00';

            // CMS v3: Notices & Policies
            if (document.getElementById('set-site-notice')) document.getElementById('set-site-notice').value = settings.site_notice || '';
            if (document.getElementById('set-cancel-policy')) document.getElementById('set-cancel-policy').value = settings.cancel_policy || '';
            if (document.getElementById('set-show-policy')) document.getElementById('set-show-policy').checked = !!settings.show_policy;

            if (document.getElementById('set-primary-color')) {
                const color = settings.primary_color || '#B76E79';
                document.getElementById('set-primary-color').value = color;
                document.getElementById('set-primary-color-text').value = color.toUpperCase();
            }

            if (document.getElementById('set-font-style')) document.getElementById('set-font-style').value = settings.font_style || 'default';
            if (document.getElementById('site-logo-url')) {
                document.getElementById('site-logo-url').value = settings.site_logo || '✨';
                updateLogoPreview(settings.site_logo || '✨');
            }

            // CMS v3: Dynamic Tabs UI Sync
            if (settings.tabs_config) {
                settings.tabs_config.forEach(tab => {
                    const input = document.querySelector(`#tabs-manager input[type="text"][data-id="${tab.id}"]`);
                    const checkbox = document.querySelector(`#tabs-manager input[type="checkbox"][data-id="${tab.id}"]`);
                    if (input) input.value = tab.label;
                    if (checkbox) checkbox.checked = tab.visible;
                });
            }
            renderDynamicTabs(settings.tabs_config);

            // CMS v3: Dashboard Cards Sync
            if (settings.dash_cards) {
                const cards = settings.dash_cards;
                if (document.getElementById('dash-card-today-title')) document.getElementById('dash-card-today-title').value = cards.today_title || 'Agendamentos Hoje';
                if (document.getElementById('dash-card-today-icon')) document.getElementById('dash-card-today-icon').value = cards.today_icon || '📅';
                if (document.getElementById('dash-card-week-title')) document.getElementById('dash-card-week-title').value = cards.week_title || 'Esta Semana';
                if (document.getElementById('dash-card-week-icon')) document.getElementById('dash-card-week-icon').value = cards.week_icon || '📊';
                if (document.getElementById('dash-card-month-title')) document.getElementById('dash-card-month-title').value = cards.month_title || 'Este Mês';
                if (document.getElementById('dash-card-month-icon')) document.getElementById('dash-card-month-icon').value = cards.month_icon || '📈';
                if (document.getElementById('dash-card-revenue-title')) document.getElementById('dash-card-revenue-title').value = cards.revenue_title || 'Receita Total';
                if (document.getElementById('dash-card-revenue-icon')) document.getElementById('dash-card-revenue-icon').value = cards.revenue_icon || '💰';

                // Apply titles to Dashboard Tab
                const dTabs = document.getElementById('tab-dashboard');
                if (dTabs) {
                    const titles = dTabs.querySelectorAll('.stat-card h3');
                    if (titles.length >= 4) {
                        titles[0].innerHTML = `${cards.today_icon || '📅'} ${cards.today_title || 'Agendamentos Hoje'}`;
                        titles[1].innerHTML = `${cards.week_icon || '📊'} ${cards.week_title || 'Esta Semana'}`;
                        titles[2].innerHTML = `${cards.month_icon || '📈'} ${cards.month_title || 'Este Mês'}`;
                        titles[3].innerHTML = `${cards.revenue_icon || '💰'} ${cards.revenue_title || 'Receita Total'}`;
                    }
                }
            }

            // Sync color picker text
            const pcol = document.getElementById('set-primary-color');
            const ptat = document.getElementById('set-primary-color-text');
            if (pcol && ptat) {
                pcol.oninput = (e) => ptat.value = e.target.value.toUpperCase();
                ptat.onchange = (e) => pcol.value = e.target.value;
            }

        } catch (err) {
            console.error('Error loading settings:', err);
        }
    }

    function renderDynamicTabs(config) {
        if (!config || config.length === 0) return;
        const tabContainer = document.querySelector('.tabs');
        if (!tabContainer) return;

        tabContainer.innerHTML = '';
        config.forEach(tab => {
            if (tab.visible) {
                const btn = document.createElement('button');
                btn.className = 'tab-btn';
                btn.dataset.tab = tab.id;
                btn.innerText = tab.label;
                btn.onclick = () => switchTab(tab.id);
                tabContainer.appendChild(btn);
            }
        });

        // Set Dashboard active by default if visible
        const dashBtn = tabContainer.querySelector('[data-tab="dashboard"]');
        if (dashBtn) dashBtn.click();
        else if (config.length > 0 && config[0].visible) {
            // If dashboard not visible, click first visible tab
            const firstVisible = tabContainer.querySelector('.tab-btn');
            if (firstVisible) firstVisible.click();
        }
    }

    document.getElementById('save-settings-btn').addEventListener('click', async () => {
        const btn = document.getElementById('save-settings-btn');
        const settings = {
            site_title: document.getElementById('set-site-title').value,
            about_text: document.getElementById('set-about-text').value,
            contact_phone: document.getElementById('set-contact-phone').value,
            opening_time: document.getElementById('set-opening').value,
            closing_time: document.getElementById('set-closing').value,
            primary_color: document.getElementById('set-primary-color').value,
            font_style: document.getElementById('set-font-style').value,
            site_logo: document.getElementById('site-logo-url').value,
            site_notice: document.getElementById('set-site-notice').value,
            cancel_policy: document.getElementById('set-cancel-policy').value,
            show_policy: document.getElementById('set-show-policy').checked,
            off_days: Array.from(document.getElementById('set-off-days').selectedOptions).map(o => o.value),
            tabs_config: Array.from(document.querySelectorAll('#tabs-manager .action-btn')).map(row => {
                const input = row.querySelector('input[type="text"]');
                const checkbox = row.querySelector('input[type="checkbox"]');
                return {
                    id: input.dataset.id,
                    label: input.value,
                    visible: checkbox.checked
                };
            }),
            dash_cards: {
                today_title: document.getElementById('dash-card-today-title').value,
                today_icon: document.getElementById('dash-card-today-icon').value,
                week_title: document.getElementById('dash-card-week-title').value,
                week_icon: document.getElementById('dash-card-week-icon').value,
                month_title: document.getElementById('dash-card-month-title').value,
                month_icon: document.getElementById('dash-card-month-icon').value,
                revenue_title: document.getElementById('dash-card-revenue-title').value,
                revenue_icon: document.getElementById('dash-card-revenue-icon').value
            }
        };

        btn.disabled = true;
        btn.textContent = 'Publicando...';

        try {
            // Save to LocalStorage for immediate demo effect
            localStorage.setItem('tata_settings', JSON.stringify(settings));
            renderDynamicTabs(settings.tabs_config);

            // Sync with Server if currentToken exists
            if (currentToken) {
                await fetch(`${API_URL}/settings`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentToken}`
                    },
                    body: JSON.stringify({ settings })
                });
            }

            showToast('Alterações publicadas com sucesso! ✨');
        } catch (err) {
            console.error(err);
            showToast('Salvo localmente, erro ao sincronizar com servidor.', 'warning');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Publicar Alterações';
        }
    });

    function showToast(msg, type = 'success') {
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.padding = '12px 25px';
        toast.style.borderRadius = '8px';
        toast.style.background = type === 'success' ? '#48BB78' : '#F56565';
        toast.style.color = 'white';
        toast.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
        toast.style.zIndex = '10000';
        toast.style.fontWeight = '600';
        toast.innerText = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    window.openImageSelector = async (onSelect) => {
        const modal = document.getElementById('image-selector-modal');
        const grid = document.getElementById('image-selector-grid');
        grid.innerHTML = 'Carregando...';
        modal.classList.remove('hidden');

        try {
            const res = await fetch(`${API_URL}/admin/images`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            const images = await res.json();

            grid.innerHTML = '';
            images.forEach(img => {
                const div = document.createElement('div');
                div.style.cursor = 'pointer';
                div.style.border = '1px solid #333';
                div.style.borderRadius = '4px';
                div.style.padding = '5px';
                div.style.textAlign = 'center';
                div.innerHTML = `
                    <img src="${img.url}" style="width: 100%; aspect-ratio: 1; object-fit: cover; display: block; margin-bottom: 5px;">
                    <small style="font-size: 0.6rem; word-break: break-all;">${img.name}</small>
                `;
                div.onclick = () => {
                    if (onSelect) onSelect(img.url);
                    else {
                        // Default behavior for logo
                        document.getElementById('site-logo-url').value = img.url;
                        updateLogoPreview(img.url);
                    }
                    modal.classList.add('hidden');
                };
                grid.appendChild(div);
            });

            if (images.length === 0) {
                grid.innerHTML = '<p style="grid-column: 1/-1;">Nenhuma imagem encontrada na pasta /img</p>';
            }
        } catch (err) {
            grid.innerHTML = 'Erro ao carregar imagens';
        }
    };

    window.removeLogo = () => {
        document.getElementById('site-logo-url').value = '';
        updateLogoPreview('');
    };

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
