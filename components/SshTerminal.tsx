'use client';
import { useEffect, useRef, useState } from 'react';

interface Props {
  host: string;
  user?: string;
  onClose: () => void;
}

export default function SshTerminal({ host: initialHost, user = 'admin', onClose }: Props) {
  const termRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [authMode, setAuthMode] = useState<'choose' | 'connected'>('choose');
  const [password, setPassword] = useState('');
  const [customUser, setCustomUser] = useState(user);
  const [customHost, setCustomHost] = useState(initialHost);
  const [customPort, setCustomPort] = useState('22');

  const connect = (mode: 'password' | 'key') => {
    setAuthMode('connected');

    async function init() {
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');
      await import('@xterm/xterm/css/xterm.css');

      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: 'JetBrains Mono, Fira Code, monospace',
        theme: {
          background: '#0f172a', foreground: '#e2e8f0', cursor: '#38bdf8',
          selectionBackground: '#38bdf844',
          green: '#22c55e', red: '#ef4444', yellow: '#f97316',
          cyan: '#06b6d4', blue: '#3b82f6', magenta: '#a855f7',
          white: '#cbd5e1', brightWhite: '#f1f5f9',
          black: '#1e293b', brightBlack: '#475569',
        },
        cols: 120, rows: 30,
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      if (termRef.current) {
        terminal.open(termRef.current);
        fitAddon.fit();
      }

      const params = new URLSearchParams({
        host: customHost,
        port: customPort,
        user: customUser,
        mode,
        ...(mode === 'password' ? { password } : {}),
      });

      const ws = new WebSocket(`ws://localhost:7501?${params}`);
      wsRef.current = ws;

      ws.onopen = () => terminal.write(`\x1b[32mConnecting to ${customUser}@${customHost}:${customPort} [${mode}]...\x1b[0m\r\n`);
      ws.onmessage = e => terminal.write(e.data);
      ws.onerror = () => terminal.write('\r\n\x1b[31mWebSocket connection error\x1b[0m\r\n');
      ws.onclose = () => terminal.write('\r\n\x1b[33m[Disconnected]\x1b[0m\r\n');
      terminal.onData((d: string) => { if (ws.readyState === WebSocket.OPEN) ws.send(d); });

      const observer = new ResizeObserver(() => fitAddon.fit());
      if (termRef.current) observer.observe(termRef.current);
    }

    init();
  };

  useEffect(() => () => wsRef.current?.close(), []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[900px] max-w-[95vw] bg-slate-950 rounded-xl border border-slate-700 shadow-2xl overflow-hidden">

        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 cursor-pointer" onClick={onClose} />
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-3 text-xs text-slate-400 font-mono">
              ssh {customUser}@{customHost}:{customPort}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xs">✕ Close</button>
        </div>

        {/* Auth chooser */}
        {authMode === 'choose' && (
          <div className="p-6 space-y-5">

            {/* Connection info */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <p className="text-slate-400 text-xs mb-1">IP Address</p>
                <input
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  value={customHost}
                  onChange={e => setCustomHost(e.target.value)}
                  placeholder="192.168.1.1"
                />
              </div>
              <div className="col-span-1">
                <p className="text-slate-400 text-xs mb-1">Port</p>
                <input
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  value={customPort}
                  onChange={e => setCustomPort(e.target.value)}
                  placeholder="22"
                />
              </div>
              <div className="col-span-1">
                <p className="text-slate-400 text-xs mb-1">Username</p>
                <input
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  value={customUser}
                  onChange={e => setCustomUser(e.target.value)}
                  placeholder="admin"
                />
              </div>
            </div>

            <p className="text-slate-300 text-sm font-semibold">Pilih metode autentikasi:</p>

            <div className="grid grid-cols-2 gap-4">
              {/* Password */}
              <div className="p-4 bg-slate-800 rounded-xl border border-slate-600 hover:border-blue-500 transition-colors space-y-3">
                <p className="text-white font-semibold text-sm">🔑 Password</p>
                <p className="text-slate-400 text-xs">Masukkan password SSH manual</p>
                <input
                  type="password"
                  placeholder="Password..."
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && password) connect('password'); }}
                />
                <button
                  onClick={() => connect('password')}
                  disabled={!password}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg text-sm font-semibold transition-colors"
                >
                  Connect
                </button>
              </div>

              {/* Public Key */}
              <div className="p-4 bg-slate-800 rounded-xl border border-slate-600 hover:border-green-500 transition-colors space-y-3">
                <p className="text-white font-semibold text-sm">🔐 Public Key</p>
                <p className="text-slate-400 text-xs">
                  Gunakan <code className="text-green-400">~/.ssh/id_rsa</code> dari server
                </p>
                <p className="text-slate-500 text-[10px]">
                  Pastikan public key sudah terdaftar di device target
                </p>
                <button
                  onClick={() => connect('key')}
                  className="w-full py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-semibold transition-colors"
                >
                  Connect with Key
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Terminal */}
        {authMode === 'connected' && (
          <div ref={termRef} className="p-2" style={{ height: '500px' }} />
        )}
      </div>
    </div>
  );
}
