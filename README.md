# Lumière Salon - Sistema de Gestão

Sistema completo para gerenciamento de salão de beleza, incluindo agendamento online para clientes e painel administrativo para os donos do salão.

## 🚀 Funcionalidades

### Para Clientes
- **Agendamento Online**: Interface intuitiva para escolher serviços, datas e horários.
- **Integração WhatsApp**: Redirecionamento automático para confirmar agendamento via WhatsApp.

### Para Administradores
- **Dashboard**: Visão geral de atendimentos hoje, na semana, no mês e receita total.
- **Gestão de Agendamentos**: Visualização em lista ou calendário (FullCalendar), com opção de reagendamento via arraste.
- **Relatórios**: Filtro por data de atendimentos concluídos e receita gerada.
- **Gestão de Clientes**: Histórico completo de cada cliente e total gasto.
- **Marketing**: Envio de mensagens em massa para clientes via WhatsApp.
- **Gestão de Serviços**: Cadastro, edição e remoção de serviços oferecidos.
- **Segurança**: Auditoria de logs, gestão de usuários (Admin/Operador) e backups automáticos.

## 🛠️ Tecnologias
- **Backend**: Node.js, Express
- **Banco de Dados**: SQLite3
- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript
- **Segurança**: JWT, Bcrypt, Helmet, Rate Limiting

## 📦 Instalação

1.  **Clone o projeto** e navegue até a pasta:
    ```bash
    cd Anti
    ```

2.  **Instale as dependências**:
    ```bash
    npm install
    ```

3.  **Inicie o servidor**:
    ```bash
    npm start
    ```
    O servidor estará rodando em `http://localhost:3000`.

## 🔐 Acesso Administrativo
- **URL**: `http://localhost:3000/admin.html`
- **Usuário Padrão**: `admin`
- **Senha Padrão**: `admin`
*(Lembre-se de alterar a senha no primeiro acesso)*

## 💾 Backups
O sistema realiza backups automáticos do banco de dados diariamente às 03:00 AM na pasta `/backups`. Você também pode criar backups manuais na aba de Backups do Painel Admin.

---
Desenvolvido por DKempreendimentos Team.