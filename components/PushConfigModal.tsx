'use client';
import { useState } from 'react';
import { Upload, Terminal, Key, Lock, ChevronDown } from 'lucide-react';

interface Props {
  device: {
    deviceId: string;
    deviceName: string;
    type: string;
    config: string;
    ipAddress?: string;
  };
  onClose: () => void;
}

export default function PushConfigModal({ device, onClose }: Props) {
  const [host, setHost] = useState(device.ipAddress ?? '');
  const [port, setPort] = useState('22');
  const [user, setUser] = useState('admin');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'password' | 'key'>('password');
  const [deviceMode, setDeviceMode] = useState<'ios' | 'raw'>('ios');
  const [pushing, setPushing] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean | null>(null);

  const handlePush = async () => {
    if (!host || !user) return;
    if (authMode === 'password' && !password) return;

    setPushing(true);
    setOutput(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/push-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_SECRET_KEY ?? '',
        },
        body: JSON.stringify({ host, port, user, password, authMode, config: device.config, deviceMode }),
      });
      const data = await res.json();
      setOutput(data.output ?? data.error ?? 'No output');
      setSuccess(data.success ?? false);
    } catch (e: any) {
      setOutput('❌ Request failed: ' + e.message);
      setSuccess(false);
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl w-[680px] max-w-[95vw] flex flex-col overflow-hidden"
           style={{ boxShadow: '0 0 40px rgba(6,182,212,0.12)' }}>

        {/* Title bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500 cursor-pointer" onClick={onClose} />
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="flex items-center gap-2">
              <Upload size={14} className="text-cyan-400" />
              <span className="text-cyan-400 text-sm font-bold">Push Config</span>
              <span className="text-slate-500 text-xs">·</span>
              <span className="text-slate-400 text-xs font-mono">{device.deviceName}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">{device.type}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xs transition-colors">✕ Close</button>
        </div>

        <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[80vh]">

          {/* Connection info */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider mb-1.5 block">IP Address</label>
              <input
                value={host}
                onChange={e => setHost(e.target.value)}
                placeholder="192.168.1.1"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider mb-1.5 block">Port</label>
              <input
                value={port}
                onChange={e => setPort(e.target.value)}
                placeholder="22"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider mb-1.5 block">Username</label>
              <input
                value={user}
                onChange={e => setUser(e.target.value)}
                placeholder="admin"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* Auth + Device mode row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Auth mode */}
            <div>
              <label className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider mb-1.5 block">Auth Method</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setAuthMode('password')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    authMode === 'password'
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <Lock size={12} /> Password
                </button>
                <button
                  onClick={() => setAuthMode('key')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    authMode === 'key'
                      ? 'bg-green-700 border-green-500 text-white'
                      : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <Key size={12} /> SSH Key
                </button>
              </div>
            </div>

            {/* Device mode */}
            <div>
              <label className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider mb-1.5 block">Device Mode</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeviceMode('ios')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    deviceMode === 'ios'
                      ? 'bg-orange-700 border-orange-500 text-white'
                      : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  🖧 Cisco IOS
                </button>
                <button
                  onClick={() => setDeviceMode('raw')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    deviceMode === 'raw'
                      ? 'bg-purple-700 border-purple-500 text-white'
                      : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <Terminal size={12} /> Raw / Linux
                </button>
              </div>
            </div>
          </div>

          {/* Password field — only for password auth */}
          {authMode === 'password' && (
            <div>
              <label className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider mb-1.5 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handlePush(); }}
                placeholder="SSH password..."
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          )}

          {authMode === 'key' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-950/30 border border-green-500/30 rounded-lg text-xs text-green-400">
              <Key size={12} />
              Using <code className="text-green-300">~/.ssh/id_rsa</code> from server — ensure public key is authorized on the device.
            </div>
          )}

          {/* Config preview */}
          <details className="group">
            <summary className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer select-none transition-colors">
              <ChevronDown size={12} className="group-open:rotate-180 transition-transform" />
              Preview config ({device.config.split('\n').length} lines)
            </summary>
            <pre className="mt-2 bg-slate-950 rounded-lg p-3 text-[10px] text-green-400 font-mono overflow-auto max-h-40 border border-slate-800 whitespace-pre-wrap">
              {device.config}
            </pre>
          </details>

          {/* Push button */}
          <button
            onClick={handlePush}
            disabled={pushing || !host || !user || (authMode === 'password' && !password)}
            className="w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            style={{
              background: pushing ? '#1e293b' : 'linear-gradient(135deg, #0891b2, #06b6d4)',
              boxShadow: pushing ? 'none' : '0 0 20px rgba(6,182,212,0.3)',
            }}
          >
            {pushing ? (
              <>
                <span className="animate-spin text-base">⚙️</span> Pushing config...
              </>
            ) : (
              <>
                <Upload size={14} /> Push Config to {device.deviceName}
              </>
            )}
          </button>

          {/* Output log */}
          {output !== null && (
            <div className={`rounded-xl border overflow-hidden transition-all ${
              success ? 'border-green-500/40 bg-green-950/20' : 'border-red-500/40 bg-red-950/20'
            }`}>
              <div className={`px-3 py-1.5 text-[11px] font-bold border-b flex items-center gap-2 ${
                success ? 'text-green-400 border-green-500/20' : 'text-red-400 border-red-500/20'
              }`}>
                {success ? '✅ Push successful' : '❌ Push failed'}
              </div>
              <pre className="p-3 text-[11px] font-mono text-slate-300 overflow-auto max-h-56 whitespace-pre-wrap">
                {output}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
