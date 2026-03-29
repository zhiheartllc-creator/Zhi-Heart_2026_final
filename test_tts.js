const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key) env[key] = vals.join('=').replace(/^"/,'').replace(/"$/,'').replace(/\r/g,'');
});

const textToSpeech = require('@google-cloud/text-to-speech');
const client = new textToSpeech.TextToSpeechClient({
  credentials: {
    client_email: env.GOOGLE_CLIENT_EMAIL,
    private_key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
  },
  projectId: env.GOOGLE_PROJECT_ID
});

async function run() {
  const [res] = await client.listVoices({ languageCode: 'es-US' });
  const names = res.voices.map(v => v.name);
  console.log(names);
}
run();
