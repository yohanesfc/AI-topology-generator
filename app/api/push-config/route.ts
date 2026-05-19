import { Client } from 'ssh2';
import type { ClientChannel } from 'ssh2';
import fs from 'fs';
import path from 'path';

const SSH_KEY_PATH = path.join(process.env.HOME ?? '/root', '.ssh', 'id_rsa');

// Delay helper
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * Execute a command on a shell stream and collect output until the prompt
 * settles (no data for `quietMs`).
 */
function runOnShell(
  stream: ClientChannel,
  command: string,
  quietMs = 600
): Promise<string> {
  return new Promise((resolve) => {
    let output = '';
    let timer: ReturnType<typeof setTimeout>;

    const settle = () => {
      timer = setTimeout(() => {
        stream.removeListener('data', onData);
        resolve(output);
      }, quietMs);
    };

    const onData = (chunk: Buffer) => {
      output += chunk.toString();
      clearTimeout(timer);
      settle();
    };

    stream.on('data', onData);
    stream.write(command + '\n');
    settle();
  });
}

export async function POST(req: Request) {
  const apiKey = req.headers.get('x-api-key');
  if (apiKey !== process.env.API_SECRET_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { host, port = 22, user, password, authMode, config, deviceMode } =
    await req.json();

  if (!host || !user || !config) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const authConfig =
    authMode === 'key'
      ? { privateKey: fs.readFileSync(SSH_KEY_PATH) }
      : { password };

  return new Promise<Response>((resolve) => {
    const conn = new Client();
    const log: string[] = [];
    const push = (line: string) => log.push(line);

    const finish = (success: boolean) =>
      resolve(Response.json({ output: log.join('\n'), success }));

    conn.on('error', (err: Error) => {
      push(`❌ SSH Error: ${err.message}`);
      finish(false);
    });

    conn.on('ready', () => {
      push(`✅ Connected to ${user}@${host}:${port}`);

      conn.shell({ term: 'vt100', cols: 200, rows: 40 }, async (err: Error | undefined, stream: ClientChannel) => {
        if (err) {
          push(`❌ Shell error: ${err.message}`);
          conn.end();
          return finish(false);
        }

        stream.stderr.on('data', (d: Buffer) => push(`[stderr] ${d.toString().trim()}`));
        stream.on('close', () => conn.end());

        try {
          // Give the shell a moment to print its banner
          await delay(800);

          if (deviceMode === 'ios') {
            // ── Cisco IOS flow ────────────────────────────────────────
            push('→ Entering enable mode...');
            let out = await runOnShell(stream, 'enable', 800);
            push(out.trim());

            // Handle enable password prompt if present
            if (out.toLowerCase().includes('password')) {
              out = await runOnShell(stream, password ?? '', 800);
              push(out.trim());
            }

            push('→ Entering configuration terminal...');
            out = await runOnShell(stream, 'configure terminal', 800);
            push(out.trim());

            push('→ Pasting config lines...');
            const lines = config.split('\n');
            for (const line of lines) {
              if (line.trim() === '') continue;
              out = await runOnShell(stream, line, 300);
              if (out.trim()) push(out.trim());
            }

            push('→ Exiting config mode...');
            out = await runOnShell(stream, 'end', 800);
            push(out.trim());

            push('→ Saving config (wr mem)...');
            out = await runOnShell(stream, 'write memory', 1500);
            push(out.trim());

          } else {
            // ── Raw / Linux flow ─────────────────────────────────────
            push('→ Pasting config as raw commands...');
            const lines = config.split('\n');
            for (const line of lines) {
              if (line.trim() === '' || line.trim().startsWith('!')) continue;
              const out = await runOnShell(stream, line, 400);
              if (out.trim()) push(out.trim());
            }
          }

          push('\n✅ Config push complete.');
          stream.end('exit\n');
          finish(true);
        } catch (e: any) {
          push(`❌ Error during push: ${e.message}`);
          stream.end('exit\n');
          finish(false);
        }
      });
    });

    conn.connect({
      host,
      port: Number(port),
      username: user,
      ...authConfig,
      readyTimeout: 15000,
      algorithms: {
        kex: [
          'diffie-hellman-group14-sha1',
          'diffie-hellman-group1-sha1',
          'ecdh-sha2-nistp256',
          'ecdh-sha2-nistp384',
          'ecdh-sha2-nistp521',
        ],
      },
    });
  });
}
