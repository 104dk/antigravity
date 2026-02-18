# Guia de Deploy (Como colocar online)

Para acessar seu sistema de outros lugares (celular, outros computadores), você precisa hospedar o servidor Node.js. O banco de dados (Supabase) já está online.

Recomendamos usar o **Render.com** pois possui um plano gratuito para serviços web.

## Pré-requisitos
1.  Ter o código do projeto no **GitHub**.
2.  Ter uma conta no [Render.com](https://render.com).

## Passo a Passo no Render

1.  **Criar Novo Web Service**
    - No painel do Render, clique em "New" -> "Web Service".
    - Conecte seu repositório do GitHub.

2.  **Configurações**
    - **Name**: `lumiere-salon` (ou o nome que preferir)
    - **Region**: Escolha a mais próxima (ex: Ohio ou Frankfurt)
    - **Branch**: `main` (ou a branch que estiver usando)
    - **Runtime**: `Node`
    - **Build Command**: `npm install`
    - **Start Command**: `node server.js`
    - **Plan Type**: Free

3.  **Variáveis de Ambiente (Environment Variables)**
    - Clique em "Advanced" ou role até a seção "Environment Variables".
    - Adicione as seguintes chaves (copie do seu arquivo `.env`):
        - `SUPABASE_URL`: (Sua URL do Supabase)
        - `SUPABASE_KEY`: (Sua chave do Supabase)
        - `JWT_SECRET`: (Crie uma senha segura ou use a do .env)
        - `PORT`: `3000` (O Render ignora isso e injeta a porta, mas é bom ter)

4.  **Finalizar**
    - Clique em "Create Web Service".
    - Aguarde o deploy finalizar. O Render te dará uma URL (ex: `https://lumiere-salon.onrender.com`).

## Acessando o Sistema
Agora você pode acessar essa URL de qualquer dispositivo!

**Nota:** No plano gratuito do Render, o servidor "dorme" após inatividade. O primeiro acesso pode demorar cerca de 50 segundos para carregar.
