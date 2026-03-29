const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key) env[key] = vals.join('=').replace(/^"/,'').replace(/"$/,'');
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
  const [res] = await client.listVoices({});
  res.voices.filter(v => v.languageCodes[0].startsWith('es')).forEach(v => {
    if(v.name.includes('Neural') || v.name.includes('Studio') || v.name.includes('Journey')) {
      console.log(v.name, '->', v.ssmlGender);
    }
  });    
}
run();
