document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const navList = document.getElementById('nav-list');
    const navLinks = document.querySelectorAll('#nav-list li a');

    // Phone Masking
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);

            if (value.length > 10) {
                // Mobile: (XX) 9XXXX-XXXX
                e.target.value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
            } else if (value.length > 6) {
                // Fixed: (XX) XXXX-XXXX
                e.target.value = value.replace(/^(\d{2})(\d{4})(\d{4}).*/, '($1) $2-$3');
            } else if (value.length > 2) {
                e.target.value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
            } else {
                e.target.value = value;
            }
        });
    }

    mobileBtn.addEventListener('click', () => {
        mobileBtn.classList.toggle('active');
        navList.classList.toggle('active');
    });

    // Close menu when clicking a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileBtn.classList.remove('active');
            navList.classList.remove('active');
        });
    });

    // Header Scroll Effect
    const header = document.getElementById('main-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.padding = '10px 0';
            header.style.backgroundColor = 'rgba(18, 18, 18, 0.98)';
        } else {
            header.style.padding = '20px 0';
            header.style.backgroundColor = 'rgba(18, 18, 18, 0.95)';
        }
    });

    // --- Dynamic Services Fetch ---
    const servicesContainer = document.getElementById('services-container');
    const serviceSelect = document.getElementById('service');

    function loadServices() {
        if (!servicesContainer) return; // Guard clause if not on main page

        fetch('/api/services')
            .then(res => res.json())
            .then(services => {
                // Render Grid
                servicesContainer.innerHTML = '';
                serviceSelect.innerHTML = '<option value="" disabled selected>Selecione um serviço</option>';

                services.forEach(svc => {
                    // Grid Item
                    const card = document.createElement('div');
                    card.className = 'service-card';
                    card.innerHTML = `
                        <div class="icon">${svc.icon || ''}</div>
                        <h3>${svc.name}</h3>
                        <p>${svc.description}</p>
                        <span class="price">R$ ${svc.price.toFixed(2)}</span>
                    `;
                    servicesContainer.appendChild(card);

                    // Dropdown Option
                    const option = document.createElement('option');
                    option.value = svc.name; // Keeping name as value for now as backend expects text
                    option.textContent = svc.name;
                    serviceSelect.appendChild(option);
                });
            })
            .catch(err => {
                console.error('Error loading services:', err);
                servicesContainer.innerHTML = '<p>Erro ao carregar serviços.</p>';
            });
    }

    // Load services on init
    loadServices();

    // Booking Form Handling
    const bookingForm = document.getElementById('booking-form');
    const dateInput = document.getElementById('date');
    const timeSlotsContainer = document.getElementById('time-slots');
    const selectedTimeInput = document.getElementById('selected-time');

    // Set min date to today
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
                console.error('Error:', error);
                timeSlotsContainer.innerHTML = '<p class="text-muted">Erro de conexão.</p>';
            });
    }

    function renderTimeSlots(availableSlots) {
        timeSlotsContainer.innerHTML = '';
        const allSlots = [
            "09:00", "10:00", "11:00", "12:00",
            "13:00", "14:00", "15:00", "16:00",
            "17:00", "18:00"
        ];

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
        // Remove selected class from all
        document.querySelectorAll('.time-slot').forEach(b => b.classList.remove('selected'));
        // Add to clicked
        btn.classList.add('selected');
        // Update hidden input
        selectedTimeInput.value = time;
    }

    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Validation
        const name = document.getElementById('name').value;
        const phone = document.getElementById('phone').value;
        const date = document.getElementById('date').value;
        const serviceSelect = document.getElementById('service');
        const service = serviceSelect.options[serviceSelect.selectedIndex].text;
        const time = selectedTimeInput.value;

        if (name && phone && date && service && time) {
            // Send data to backend API
            fetch('/api/appointments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, phone, service, date, time })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        alert('Erro: ' + data.error);
                        // Refresh slots if there was a conflict
                        if (data.error.includes('indisponível')) {
                            fetchAvailability(date);
                        }
                    } else {
                        // Success - Redirect to WhatsApp
                        const message = `Olá, gostaria de confirmar meu agendamento: ${date} às ${time} - ${service} (${name})`;
                        const whatsappUrl = `https://wa.me/5561993602116?text=${encodeURIComponent(message)}`;

                        alert('Agendamento realizado com sucesso! Você será redirecionado para o WhatsApp.');
                        window.open(whatsappUrl, '_blank');

                        bookingForm.reset();
                        selectedTimeInput.value = '';
                        timeSlotsContainer.innerHTML = '<p class="text-muted">Selecione uma data para ver os horários.</p>';
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Ocorreu um erro ao processar seu agendamento. Tente novamente.');
                });
        } else {
            alert('Por favor, preencha todos os campos e selecione um horário.');
        }
    });

    // Smooth Scroll for Safari/older browsers (optional, as CSS scroll-behavior usually handles this)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});
