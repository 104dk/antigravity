-- Tabela de Configurações Globais
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserir ícone padrão se não existir
INSERT INTO settings (key, value) 
VALUES ('site_logo', '💅') 
ON CONFLICT (key) DO NOTHING;
