# Lumière Salon - Sistema de Gestão (Versão Supabase)

Sistema completo para gerenciamento de salão de beleza, agora com integração nativa com Supabase (PostgreSQL), ideal para deploy em produção.

## 🚀 Funcionalidades
- **Banco de Dados Real**: Utiliza Supabase para armazenamento persistente e seguro.
- **Dashboard & Agendamentos**: Todas as funções administrativas sincronizadas na nuvem.
- **Relatórios & Marketing**: Gestão financeira e disparo de WhatsApp integrados.

## 🛠️ Tecnologias
- **Backend**: Node.js, Express
- **Banco de Dados**: Supabase (PostgreSQL)
- **Frontend**: HTML5, CSS3, JS Vanilla

## 📦 Configuração e Instalação

### 1. Preparar o Supabase
1. Crie um projeto no [Supabase](https://supabase.com/).
2. No menu **SQL Editor**, execute o conteúdo do arquivo `supabase_setup.sql` para criar as tabelas.

### 2. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto com as seguintes chaves (obtidas em Project Settings > API no Supabase):
```env
SUPABASE_URL=sua_url_do_supabase
SUPABASE_KEY=sua_anon_ou_service_key
JWT_SECRET=uma_chave_secreta_para_tokens
PORT=3000
```

### 3. Rodar Localmente
1. Instale as dependências: `npm install`
2. Inicie o servidor: `npm start`

### 4. Criar Usuário Admin Inicial
Após iniciar o servidor pela primeira vez, você precisa criar o primeiro usuário:
- Use uma ferramenta como Postman ou cURL para fazer um POST:
`POST http://localhost:3000/api/init-admin`
Com o corpo JSON: `{ "secret": "LUMIERE_INITIAL_SECRET" }`
- Isso criará o usuário `admin` com senha `admin`. **Altere a senha imediatamente no painel!**

## 🌐 Deploy
Para colocar o projeto online, sugerimos:
- **Frontend**: Vercel ou Netlify (apontando o diretório raiz).
- **Backend**: Render ou Railway (configurando as variáveis de ambiente do `.env` no painel da plataforma).

---
Desenvolvido por DKempreendimentos Team.