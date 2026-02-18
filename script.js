document.addEventListener('DOMContentLoaded', () => {

    // ===== MOBILE MENU =====
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const navList = document.getElementById('nav-list');
    const navLinks = document.querySelectorAll('#nav-list li a');

    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            mobileBtn.classList.toggle('active');
            navList.classList.toggle('active');
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileBtn.classList.remove('active');
            navList.classList.remove('active');
        });
    });

    // ===== HEADER SCROLL EFFECT =====
    const header = document.getElementById('main-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.padding = '12px 0';
            header.style.backgroundColor = 'rgba(13, 13, 13, 0.99)';
        } else {
            header.style.padding = '18px 0';
            header.style.backgroundColor = 'rgba(13, 13, 13, 0.95)';
        }
    });

    // ===== PHONE MASKING =====
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
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

    // ===== SERVICES LOADING =====
    const servicesContainer = document.getElementById('services-container');
    const serviceSelect = document.getElementById('service');

    // Map service names to emoji icons (fallback)
    const serviceIcons = {
        'manicure': '💅',
        'pedicure': '💅',
        'unhas': '💅',
        'corte': '✂️',
        'estilo': '✂️',
        'coloração': '🎨',
        'coloracao': '🎨',
        'tratamento': '✨',
        'capilar': '✨',
    };

    function getIconForService(name) {
        const lower = name.toLowerCase();
        for (const [key, icon] of Object.entries(serviceIcons)) {
            if (lower.includes(key)) return icon;
        }
        return '💎';
    }

    function loadServices() {
        if (!servicesContainer) return;

        fetch('/api/services')
            .then(res => res.json())
            .then(services => {
                // Clear skeletons
                servicesContainer.innerHTML = '';

                // Clear and reset the select dropdown
                if (serviceSelect) {
                    serviceSelect.innerHTML = '<option value="" disabled selected>Selecione um serviço</option>';
                }

                if (!services || services.length === 0) {
                    servicesContainer.innerHTML = '<p class="text-muted" style="text-align:center;grid-column:1/-1">Nenhum serviço disponível no momento.</p>';
                    return;
                }

                services.forEach(svc => {
                    const icon = svc.icon || getIconForService(svc.name);
                    const price = parseFloat(svc.price || 0).toFixed(2).replace('.', ',');

                    // Service Card
                    const card = document.createElement('div');
                    card.className = 'service-card';
                    card.innerHTML = `
                        <div class="service-card-img-placeholder">${icon}</div>
                        <div class="service-card-body">
                            <h3>${svc.name}</h3>
                            <p>${svc.description || ''}</p>
                            <div class="service-card-footer">
                                <div class="service-price">
                                    <span>A partir de</span>
                                    R$ ${price}
                                </div>
                                <a href="#booking" class="btn-saiba-mais">Saiba Mais →</a>
                            </div>
                        </div>
                    `;
                    servicesContainer.appendChild(card);

                    // Dropdown Option (only added once, no duplicates)
                    if (serviceSelect) {
                        const option = document.createElement('option');
                        option.value = svc.name;
                        option.textContent = svc.name;
                        serviceSelect.appendChild(option);
                    }
                });
            })
            .catch(err => {
                console.error('Erro ao carregar serviços:', err);
                if (servicesContainer) {
                    servicesContainer.innerHTML = '<p class="text-muted" style="text-align:center;grid-column:1/-1">Erro ao carregar serviços. Tente novamente.</p>';
                }
            });
    }

    loadServices();

    // ===== BOOKING FORM =====
    const bookingForm = document.getElementById('booking-form');
    const dateInput = document.getElementById('date');
    const timeSlotsContainer = document.getElementById('time-slots');
    const selectedTimeInput = document.getElementById('selected-time');

    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;

        dateInput.addEventListener('change', () => {
            const date = dateInput.value;
            if (date) {
                fetchAvailability(date);
            } else {
                timeSlotsContainer.innerHTML = '<p class="text-muted">Selecione uma data para ver os horários.</p>';
            }
        });
    }

    function fetchAvailability(date) {
        timeSlotsContainer.innerHTML = '<p class="text-muted">Carregando horários...</p>';

        fetch(`/api/availability?date=${date}`)
            .then(response => response.json())
            .then(data => {
                if (data.availableSlots) {
                    renderTimeSlots(data.availableSlots);
                } else {
                    timeSlotsContainer.innerHTML = '<p class="text-muted">Erro ao carregar horários.</p>';
                }
            })
            .catch(error => {
                console.error('Erro:', error);
                timeSlotsContainer.innerHTML = '<p class="text-muted">Erro de conexão.</p>';
            });
    }

    function renderTimeSlots(availableSlots) {
        timeSlotsContainer.innerHTML = '';
        const allSlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

        if (availableSlots.length === 0) {
            timeSlotsContainer.innerHTML = '<p class="text-muted">Nenhum horário disponível para esta data.</p>';
            return;
        }

        allSlots.forEach(slot => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'time-slot';
            btn.textContent = slot;

            if (!availableSlots.includes(slot)) {
                btn.disabled = true;
                btn.title = "Horário indisponível";
            } else {
                btn.addEventListener('click', () => selectTime(btn, slot));
            }

            timeSlotsContainer.appendChild(btn);
        });
    }

    function selectTime(btn, time) {
        document.querySelectorAll('.time-slot').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedTimeInput.value = time;
    }

    if (bookingForm) {
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('name').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const date = document.getElementById('date').value;
            const svcSelect = document.getElementById('service');
            const service = svcSelect.options[svcSelect.selectedIndex]?.text || '';
            const time = selectedTimeInput.value;

            if (!name || !phone || !date || !service || !time) {
                alert('Por favor, preencha todos os campos e selecione um horário.');
                return;
            }

            const submitBtn = bookingForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';

            fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, service, date, time })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        alert('Erro: ' + data.error);
                        if (data.error.includes('indisponível')) {
                            fetchAvailability(date);
                        }
                    } else {
                        const message = `Olá! Gostaria de confirmar meu agendamento na Tata Nail:\n📅 Data: ${date}\n⏰ Horário: ${time}\n💅 Serviço: ${service}\n👤 Nome: ${name}`;
                        const whatsappUrl = `https://wa.me/5561993602116?text=${encodeURIComponent(message)}`;

                        alert('✅ Agendamento realizado com sucesso! Você será redirecionado para o WhatsApp para confirmar.');
                        window.open(whatsappUrl, '_blank');

                        bookingForm.reset();
                        selectedTimeInput.value = '';
                        timeSlotsContainer.innerHTML = '<p class="text-muted">Selecione uma data para ver os horários.</p>';
                    }
                })
                .catch(error => {
                    console.error('Erro:', error);
                    alert('Ocorreu um erro ao processar seu agendamento. Tente novamente.');
                })
                .finally(() => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Solicitar Agendamento';
                });
        });
    }

    // ===== SMOOTH SCROLL =====
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});
