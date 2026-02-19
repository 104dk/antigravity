// Guard: prevent any double-initialization
if (window.__tataNailInit) {
    console.warn('script.js already initialized, skipping.');
} else {
    window.__tataNailInit = true;

    document.addEventListener('DOMContentLoaded', init);

    function init() {

        // ── MOBILE MENU ──
        const mobileBtn = document.getElementById('mobile-menu-btn');
        const navList = document.getElementById('nav-list');

        if (mobileBtn && navList) {
            mobileBtn.addEventListener('click', () => {
                mobileBtn.classList.toggle('active');
                navList.classList.toggle('active');
            });
            navList.querySelectorAll('a').forEach(a => {
                a.addEventListener('click', () => {
                    mobileBtn.classList.remove('active');
                    navList.classList.remove('active');
                });
            });
        }

        // ── HEADER SHRINK ON SCROLL ──
        const header = document.getElementById('main-header');
        if (header) {
            window.addEventListener('scroll', () => {
                header.style.padding = window.scrollY > 50 ? '10px 0' : '16px 0';
            });
        }

        // ── PHONE MASK ──
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', e => {
                let v = e.target.value.replace(/\D/g, '').slice(0, 11);
                if (v.length > 10) e.target.value = v.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
                else if (v.length > 6) e.target.value = v.replace(/^(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
                else if (v.length > 2) e.target.value = v.replace(/^(\d{2})(\d+)/, '($1) $2');
                else e.target.value = v;
            });
        }

        // ── SERVICES ──
        // Use a single flag so this can NEVER run twice
        let servicesLoaded = false;

        const container = document.getElementById('services-container');
        const svcSelect = document.getElementById('service');

        function loadServices() {
            if (servicesLoaded) return;   // hard guard
            servicesLoaded = true;

            if (!container) return;

            fetch('/api/services')
                .then(r => r.json())
                .then(list => {
                    // Wipe everything (loading message + any stale content)
                    container.innerHTML = '';

                    // Reset select to only the placeholder
                    if (svcSelect) {
                        svcSelect.innerHTML = '<option value="" disabled selected>Selecione um serviço</option>';
                    }

                    if (!Array.isArray(list) || list.length === 0) {
                        container.innerHTML = '<p class="loading-msg">Nenhum serviço disponível no momento.</p>';
                        return;
                    }

                    list.forEach(svc => {
                        const price = parseFloat(svc.price || 0)
                            .toFixed(2)
                            .replace('.', ',');

                        // Card
                        const card = document.createElement('div');
                        card.className = 'service-card';

                        const photoContent = svc.image_url
                            ? `<img src="${svc.image_url}" alt="${svc.name}">`
                            : `<div class="service-photo-inner">💅</div>`;

                        card.innerHTML = `
                            <div class="service-photo">
                                ${photoContent}
                            </div>
                            <div class="service-body">
                                <h3>${svc.name}</h3>
                                <p>${svc.description || ''}</p>
                                <div class="service-footer">
                                    <div class="service-price">
                                        <small>A partir de</small>
                                        <strong>R$ ${price}</strong>
                                    </div>
                                    <a href="#booking" class="btn-saiba">Saiba Mais →</a>
                                </div>
                            </div>
                        `;
                        container.appendChild(card);

                        // Select option (added once per service)
                        if (svcSelect) {
                            const opt = document.createElement('option');
                            opt.value = svc.name;
                            opt.textContent = svc.name;
                            svcSelect.appendChild(opt);
                        }
                    });
                })
                .catch(err => {
                    console.error('Erro ao carregar serviços:', err);
                    if (container) {
                        container.innerHTML = '<p class="loading-msg">Erro ao carregar serviços. Tente novamente.</p>';
                    }
                });
        }

        loadServices();   // called exactly once

        // ── BOOKING ──
        const bookingForm = document.getElementById('booking-form');
        const dateInput = document.getElementById('date');
        const timeSlotsEl = document.getElementById('time-slots');
        const selectedTimeInput = document.getElementById('selected-time');

        if (dateInput) {
            dateInput.min = new Date().toISOString().split('T')[0];
            dateInput.addEventListener('change', () => {
                if (dateInput.value) fetchSlots(dateInput.value);
                else timeSlotsEl.innerHTML = '<p class="text-muted">Selecione uma data para ver os horários.</p>';
            });
        }

        function fetchSlots(date) {
            timeSlotsEl.innerHTML = '<p class="text-muted">Carregando horários...</p>';
            fetch(`/api/availability?date=${date}`)
                .then(r => r.json())
                .then(data => {
                    if (data.availableSlots) renderSlots(data.availableSlots);
                    else timeSlotsEl.innerHTML = '<p class="text-muted">Erro ao carregar horários.</p>';
                })
                .catch(() => {
                    timeSlotsEl.innerHTML = '<p class="text-muted">Erro de conexão.</p>';
                });
        }

        function renderSlots(available) {
            timeSlotsEl.innerHTML = '';
            const all = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

            if (!available.length) {
                timeSlotsEl.innerHTML = '<p class="text-muted">Nenhum horário disponível para esta data.</p>';
                return;
            }

            all.forEach(slot => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'time-slot';
                btn.textContent = slot;

                if (!available.includes(slot)) {
                    btn.disabled = true;
                    btn.title = 'Horário indisponível';
                } else {
                    btn.addEventListener('click', () => {
                        document.querySelectorAll('.time-slot').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                        selectedTimeInput.value = slot;
                    });
                }
                timeSlotsEl.appendChild(btn);
            });
        }

        if (bookingForm) {
            bookingForm.addEventListener('submit', e => {
                e.preventDefault();

                const name = document.getElementById('name').value.trim();
                const phone = document.getElementById('phone').value.trim();
                const date = document.getElementById('date').value;
                const sel = document.getElementById('service');
                const service = sel.options[sel.selectedIndex]?.text || '';
                const time = selectedTimeInput.value;

                if (!name || !phone || !date || !service || !time) {
                    alert('Por favor, preencha todos os campos e selecione um horário.');
                    return;
                }

                const submitBtn = document.getElementById('submit-btn');
                submitBtn.disabled = true;
                submitBtn.textContent = 'Enviando...';

                fetch('/api/appointments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, phone, service, date, time })
                })
                    .then(r => r.json())
                    .then(data => {
                        if (data.error) {
                            alert('Erro: ' + data.error);
                            if (data.error.includes('indisponível')) fetchSlots(date);
                        } else {
                            const msg = `Olá! Gostaria de confirmar meu agendamento na Tata Nail:\n📅 Data: ${date}\n⏰ Horário: ${time}\n💅 Serviço: ${service}\n👤 Nome: ${name}`;
                            alert('✅ Agendamento realizado! Você será redirecionado para o WhatsApp.');
                            window.open(`https://wa.me/5561993602116?text=${encodeURIComponent(msg)}`, '_blank');
                            bookingForm.reset();
                            selectedTimeInput.value = '';
                            timeSlotsEl.innerHTML = '<p class="text-muted">Selecione uma data para ver os horários.</p>';
                        }
                    })
                    .catch(() => alert('Erro ao processar agendamento. Tente novamente.'))
                    .finally(() => {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Solicitar Agendamento';
                    });
            });
        }

        // ── SMOOTH SCROLL ──
        document.querySelectorAll('a[href^="#"]').forEach(a => {
            a.addEventListener('click', function (e) {
                const id = this.getAttribute('href');
                if (id === '#') return;
                const el = document.querySelector(id);
                if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth' }); }
            });
        });

        // ── SCROLL ANIMATIONS ──
        const observerOptions = {
            threshold: 0.15
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);

        document.querySelectorAll('section').forEach(section => {
            observer.observe(section);
        });
    }
}
