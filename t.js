const http = require('http');

const data = JSON.stringify({ text: 'Hola mundo' });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/tts',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', body.slice(0, 100)));
});

req.on('error', console.error);
req.write(data);
req.end();
