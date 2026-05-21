const { WebSocketServer } = require('ws');
const { Client, utils: sshUtils } = require('ssh2');

const PORT = 7501;

const wss = new WebSocketServer({ port: PORT });
console.log(`SSH WebSocket server on ws://localhost:${PORT}`);

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://localhost`);
  const host       = url.searchParams.get('host');
  const port       = parseInt(url.searchParams.get('port') ?? '22');
  const user       = url.searchParams.get('user') ?? 'admin';
  const mode       = url.searchParams.get('mode') ?? 'key';
  const password   = url.searchParams.get('password') ?? '';
  const clientKey  = url.searchParams.get('privateKey') ?? '';
  // Reject if key mode but no key supplied
  if (mode === 'key' && !clientKey) {
    ws.send('\x1b[31mNo private key provided. Please paste your key in the browser UI.\x1b[0m\r\n');
    ws.close();
    return;
  }

  if (!host) { ws.close(); return; }

  const send = (txt) => { if (ws.readyState === ws.OPEN) ws.send(txt); };
  const conn = new Client();

  // ── Key mode: validate PEM format before touching the network ──────────
  if (mode === 'key') {
    const parsed = sshUtils.parseKey(clientKey);
    if (parsed instanceof Error || !parsed) {
      send(`\x1b[31m✖ Invalid private key: ${parsed?.message ?? 'could not parse PEM'}\x1b[0m\r\n`);
      send('\x1b[33mMake sure you pasted the full key including the BEGIN/END header lines.\x1b[0m\r\n');
      ws.close();
      return;
    }
  }

  const authConfig = mode === 'key'
    ? { privateKey: clientKey }
    : { password };

  // Lock to exactly one auth method — no silent fallback allowed
  const authHandler = mode === 'key' ? ['publickey'] : ['password'];

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
  const connectOptions = mode === 'key'
    ? { host, port, username: user, privateKey: clientKey, authMethods: ['publickey'], readyTimeout: 10000 }
    : { host, port, username: user, password, authMethods: ['password'], readyTimeout: 10000 };
  conn.connect(connectOptions);
});
