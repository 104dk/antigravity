-- Habilita RLS (caso não esteja) para garantir que as policies funcionem
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Cria policies para permitir acesso total para a role 'anon' e 'service_role'
-- Isso é necessário pois o backend está usando a chave anon/public para conectar
-- ATENÇÃO: Em produção real, idealmente o backend usaria a service_role key.

CREATE POLICY "Enable access to all users" ON "public"."users"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable access to all clients" ON "public"."clients"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable access to all services" ON "public"."services"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable access to all appointments" ON "public"."appointments"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable access to all messages" ON "public"."messages"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable access to all audit_logs" ON "public"."audit_logs"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Inserir usuário Admin inicial (senha: admin)
-- Hash gerado: $2b$10$3NTUE/CF9c0pLIItL5uVY.X6tvUepwSdBk4xNfN66.aLhfGvEIaJm
INSERT INTO users (username, password_hash, full_name, role)
VALUES ('admin', '$2b$10$3NTUE/CF9c0pLIItL5uVY.X6tvUepwSdBk4xNfN66.aLhfGvEIaJm', 'Administrador', 'admin')
ON CONFLICT (username) DO NOTHING;
