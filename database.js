require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('ERRO: Variáveis de ambiente SUPABASE_URL e SUPABASE_KEY não configuradas!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Conectado ao Supabase.');

module.exports = supabase;
