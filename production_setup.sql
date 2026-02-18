-- ==========================================
-- SCRIPT DE PREPARAÇÃO PARA PRODUÇÃO
-- ==========================================

-- 1. CRIAÇÃO DE TABELAS (Estrutura)
-- ==========================================

CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    icon TEXT
);

CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    service TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    payment_method TEXT,
    amount DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recipient_count INTEGER
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'operator')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);


-- 2. SEGURANÇA (Row Level Security - RLS)
-- ==========================================

-- Habilita RLS em todas as tabelas
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Cria policies permissivas para acesso via API (Anon/Public Key)
-- Nota: Removemos policies antigas antes de criar novas para evitar erros de duplicidade
DROP POLICY IF EXISTS "Enable access to all users" ON "users";
CREATE POLICY "Enable access to all users" ON "users" FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable access to all clients" ON "clients";
CREATE POLICY "Enable access to all clients" ON "clients" FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable access to all services" ON "services";
CREATE POLICY "Enable access to all services" ON "services" FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable access to all appointments" ON "appointments";
CREATE POLICY "Enable access to all appointments" ON "appointments" FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable access to all messages" ON "messages";
CREATE POLICY "Enable access to all messages" ON "messages" FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable access to all audit_logs" ON "audit_logs";
CREATE POLICY "Enable access to all audit_logs" ON "audit_logs" FOR ALL TO public USING (true) WITH CHECK (true);


-- 3. DADOS INICIAIS (Inserts)
-- ==========================================

-- Inserir Serviços Padrão
INSERT INTO services (name, description, price, icon) VALUES 
('Corte & Estilo', 'Cortes personalizados que valorizam seu rosto e estilo de vida.', 120.00, '✂️'),
('Coloração Premium', 'Técnicas avançadas de coloração para um visual vibrante e saudável.', 250.00, '🎨'),
('Manicure & Pedicure', 'Cuidado completo para suas mãos e pés com produtos de alta qualidade.', 60.00, '💅'),
('Tratamentos Capilares', 'Hidratação, reconstrução e tratamentos para revigorar seus fios.', 150.00, '✨')
ON CONFLICT DO NOTHING; -- Evita duplicar se ja existirem

-- Inserir Usuário Admin (Senha: admin)
-- Hash: $2b$10$3NTUE/CF9c0pLIItL5uVY.X6tvUepwSdBk4xNfN66.aLhfGvEIaJm
INSERT INTO users (username, password_hash, full_name, role)
VALUES ('admin', '$2b$10$3NTUE/CF9c0pLIItL5uVY.X6tvUepwSdBk4xNfN66.aLhfGvEIaJm', 'Administrador', 'admin')
ON CONFLICT (username) DO NOTHING; -- Evita erro se o admin ja existir
