import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
const url = urlMatch ? urlMatch[1].trim() : '';
const key = keyMatch ? keyMatch[1].trim() : '';

async function testFetch() {
    console.log('Fetching phrases via REST...');
    const res = await fetch(`${url}/rest/v1/recipe_phrases?select=*&limit=5`, {
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`
        }
    });

    const data = await res.json();
    console.log('Result:', JSON.stringify(data, null, 2));
}

testFetch();
