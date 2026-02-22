-- Tabela de Configurações do Site
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir valores padrão (opcional, para garantir que o site carregue algo)
INSERT INTO settings (key, value) VALUES 
('site_title', 'Tata Nail | Especialista em Unhas Premium'),
('gallery_hero_title', 'Sua beleza em primeiro plano.'),
('gallery_hero_subtitle', 'Confira nossos trabalhos mais recentes e inspire-se para sua próxima visita.'),
('about_title', 'Excelência em Cada Detalhe'),
('about_text', 'Na Tata Nail, transformamos o cuidado com as unhas em uma experiência de autoestima. Combinamos técnica de ponta com um ambiente acolhedor para entregar resultados que encantam.'),
('contact_phone', '(61) 98285-3421'),
('contact_address', 'Luziânia - GO'),
('instagram_url', 'https://www.instagram.com/tata_nail_luziania/')
ON CONFLICT (key) DO NOTHING;
