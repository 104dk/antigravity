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
                if (window.scrollY > 50) {
                    header.classList.add('scrolled');
                } else {
                    header.classList.remove('scrolled');
                }
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

        const defaultServices = [
            { name: 'Pé e Mão', price: 60, duration: '90min', description: 'Cuidado completo para suas unhas com acabamento impecável.' },
            { name: 'Alongamento em Gel', price: 150, duration: '120min', description: 'Unhas longas, resistentes e com brilho duradouro.' },
            { name: 'Banho de Cristal', price: 120, duration: '60min', description: 'Proteção e brilho extra para suas unhas naturais.' },
            { name: 'Esmaltação em Gel', price: 80, duration: '45min', description: 'Cor vibrante que não descasca por até 15 dias.' }
        ];

        function renderList(list) {
            container.innerHTML = '';
            if (svcSelect) svcSelect.innerHTML = '<option value="" disabled selected>Selecione um serviço</option>';

            if (!Array.isArray(list) || list.length === 0) {
                container.innerHTML = '<p class="loading-msg">Nenhum serviço disponível no momento.</p>';
                return;
            }

            list.forEach((svc, index) => {
                const price = parseFloat(svc.price || 0).toFixed(2).replace('.', ',');
                const card = document.createElement('div');
                card.className = 'service-card';

                const icons = ['💅', '👣', '✨', '👑', '🌸', '🎨', '🌟', '💎'];
                const defaultIcon = icons[index % icons.length];

                const photo = svc.image_url
                    ? `<div class="service-photo"><img src="${svc.image_url}" alt="${svc.name}"></div>`
                    : `<div class="service-icon">${defaultIcon}</div>`;

                card.innerHTML = `
                    ${photo}
                    <h3>${svc.name}</h3>
                    <p>${svc.description || 'Tratamento exclusivo personalizado para você.'}</p>
                    <div class="service-footer">
                        <span class="price">R$ ${price}</span>
                        <span class="time">⏱ ${svc.duration || '60min'}</span>
                    </div>
                `;
                container.appendChild(card);

                if (svcSelect) {
                    const opt = document.createElement('option');
                    opt.value = svc.name;
                    opt.textContent = svc.name;
                    svcSelect.appendChild(opt);
                }
            });
        }

        // ── GALLERY ──
        const galleryContainer = document.getElementById('gallery-container');

        function renderGallery(items) {
            if (!galleryContainer) return;
            galleryContainer.innerHTML = '';

            if (!Array.isArray(items) || items.length === 0) {
                // Fallback to empty or placeholder if preferred
                galleryContainer.innerHTML = '<p class="loading-msg">Nenhuma foto disponível na galeria.</p>';
                return;
            }

            items.forEach(item => {
                const div = document.createElement('div');
                div.className = 'gallery-item';
                div.innerHTML = `<img src="${item.image_url}" alt="${item.alt_text || item.title || 'Unhas trabalhadas'}">`;
                galleryContainer.appendChild(div);
            });
        }

        function loadGallery() {
            if (!galleryContainer) return;
            fetch('/api/gallery')
                .then(r => r.json())
                .then(data => renderGallery(data))
                .catch(err => {
                    console.error('Gallery API fail:', err);
                    galleryContainer.innerHTML = '<p class="loading-msg">Erro ao carregar galeria.</p>';
                });
        }

        loadServices();
        loadGallery();

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

        // ── SITE SETTINGS (LOGOS & TEXTS) ──
        function loadSiteSettings() {
            fetch('/api/settings')
                .then(r => r.json())
                .then(settings => {
                    // 1. Branding & Header
                    const titles = document.querySelectorAll('.logo-text');
                    if (settings.site_title) {
                        document.title = settings.site_title;
                        titles.forEach(el => {
                            // Preserva a estrutura Tata<span class="text-rose">Nail</span> se for o padrão
                            // Mas se o usuário mudou, injeta o novo
                            const parts = settings.site_title.split('|')[0].trim().split(' ');
                            if (parts.length >= 2) {
                                el.innerHTML = `${parts[0]}<span class="text-rose">${parts[1]}</span>`;
                            } else {
                                el.textContent = settings.site_title.split('|')[0].trim();
                            }
                        });
                    }

                    // 2. Hero / Gallery Intro
                    const galleryTitle = document.querySelector('#gallery h1');
                    const gallerySubtitle = document.querySelector('#gallery p');
                    if (settings.gallery_hero_title && galleryTitle) {
                        // Tratar <span class="text-rose"> se estiver no texto? 
                        // Por segurança, vamos usar innerHTML se o usuário quiser formatar
                        galleryTitle.innerHTML = settings.gallery_hero_title.replace('primeiro plano', '<span class="text-rose">primeiro plano</span>');
                    }
                    if (settings.gallery_hero_subtitle && gallerySubtitle) {
                        gallerySubtitle.textContent = settings.gallery_hero_subtitle;
                    }

                    // 3. About Section
                    const aboutTitle = document.querySelector('#about h2');
                    const aboutText = document.querySelector('#about p');
                    if (settings.about_title && aboutTitle) {
                        aboutTitle.innerHTML = settings.about_title.replace('Cada Detalhe', '<span class="text-rose">Cada Detalhe</span>');
                    }
                    if (settings.about_text && aboutText) {
                        aboutText.textContent = settings.about_text;
                    }

                    // 4. Contact & Footer
                    const footerContact = document.querySelector('.footer-contact');
                    if (footerContact && settings.contact_address && settings.contact_phone) {
                        footerContact.innerHTML = `
                            <h4>Contato</h4>
                            <p>📍 ${settings.contact_address}</p>
                            <p>📞 ${settings.contact_phone}</p>
                        `;
                    }

                    // 5. Instagram & WhatsApp Links
                    const instaLinks = document.querySelectorAll('a[href*="instagram.com"]');
                    if (settings.instagram_url) {
                        instaLinks.forEach(a => a.href = settings.instagram_url);
                    }

                    if (settings.contact_phone) {
                        const waLinks = document.querySelectorAll('a[href*="wa.me"]');
                        const cleanPhone = settings.contact_phone.replace(/\D/g, '');
                        waLinks.forEach(a => {
                            const currentHref = a.href;
                            if (currentHref.includes('wa.me')) {
                                // Se for o link principal do footer, atualiza
                                a.href = `https://wa.me/55${cleanPhone}`;
                            }
                        });
                    }

                    // 6. Navigation (Tab Names)
                    const navA = document.querySelectorAll('#nav-list a');
                    navA.forEach(a => {
                        const id = a.getAttribute('href').replace('#', '');
                        if (settings[`tab_name_${id}`]) a.textContent = settings[`tab_name_${id}`];
                        // if (settings[`tab_show_${id}`] === 'false') a.parentElement.style.display = 'none';
                    });

                    // 7. Site Notice (Banner opcional)
                    if (settings.site_notice) {
                        let noticeEl = document.getElementById('site-notice-banner');
                        if (!noticeEl) {
                            noticeEl = document.createElement('div');
                            noticeEl.id = 'site-notice-banner';
                            noticeEl.style = "background: var(--rose); color: white; text-align: center; padding: 10px; font-size: 0.8rem; font-weight: 600; position: sticky; top: 0; z-index: 1001;";
                            document.body.prepend(noticeEl);
                        }
                        noticeEl.textContent = settings.site_notice;
                    }
                })
                .catch(err => console.error('Erro ao carregar configurações:', err));
        }

        loadSiteSettings();
    }
}
