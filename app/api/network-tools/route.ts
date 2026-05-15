import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  const { tool, host } = await req.json();

  // Rate limit: only allow private IP ranges as targets
  const privateIP = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.)/.test(host);
  const publicAllowed = ['8.8.8.8', '8.8.4.4', '1.1.1.1'];
  if (!privateIP && !publicAllowed.includes(host)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
  }

  if (!host || !/^[\d.]+$/.test(host)) {
    return NextResponse.json({ error: 'Invalid host' }, { status: 400 });
  }

  try {
    let output = '';
    if (tool === 'ping') {
      const { stdout } = await execAsync(`ping -c 4 -W 2 ${host}`);
      output = stdout;
    } else if (tool === 'traceroute') {
      const { stdout } = await execAsync(`traceroute -m 15 -w 2 ${host}`);
      output = stdout;
    } else {
      return NextResponse.json({ error: 'Unknown tool' }, { status: 400 });
    }
    return NextResponse.json({ output });
  } catch (err: any) {
    return NextResponse.json({ output: err.stdout || err.message || 'Failed' });
  }
}
