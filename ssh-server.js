const { WebSocketServer } = require('ws');
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const PORT = 7501;
const SSH_KEY_PATH = path.join(process.env.HOME, '.ssh', 'id_rsa');

const wss = new WebSocketServer({ port: PORT });
console.log(`SSH WebSocket server on ws://localhost:${PORT}`);

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://localhost`);
  const host     = url.searchParams.get('host');
  const port     = parseInt(url.searchParams.get('port') ?? '22');
  const user     = url.searchParams.get('user') ?? 'admin';
  const mode     = url.searchParams.get('mode') ?? 'key';
  const password = url.searchParams.get('password') ?? '';

  if (!host) { ws.close(); return; }

  const send = (txt) => { if (ws.readyState === ws.OPEN) ws.send(txt); };
  const conn = new Client();

  const authConfig = mode === 'key'
    ? { privateKey: fs.readFileSync(SSH_KEY_PATH) }
    : { password };

  conn.on('ready', () => {
    send(`\x1b[32mConnected to ${user}@${host}:${port}\x1b[0m\r\n`);
    conn.shell({ term: 'xterm-256color', cols: 120, rows: 30 }, (err, stream) => {
      if (err) { send(`\x1b[31mShell error: ${err.message}\x1b[0m\r\n`); return; }
      stream.on('data', d => send(d.toString()));
      stream.stderr.on('data', d => send(d.toString()));
      stream.on('close', () => { send('\r\n\x1b[33m[Session closed]\x1b[0m\r\n'); conn.end(); ws.close(); });
      ws.on('message', d => stream.write(d.toString()));
      ws.on('close', () => { stream.close(); conn.end(); });
    });
  });

  conn.on('error', err => { send(`\r\n\x1b[31mSSH Error: ${err.message}\x1b[0m\r\n`); ws.close(); });
  conn.connect({ host, port, username: user, ...authConfig, readyTimeout: 10000 });
});
