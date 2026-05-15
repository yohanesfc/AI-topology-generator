import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'topologies.json');

function load() {
  if (!fs.existsSync(FILE)) {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, '[]');
  }
  return JSON.parse(fs.readFileSync(FILE, 'utf-8'));
}

function save(data: any) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// GET - load all topologies
export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key');
  if (apiKey !== process.env.API_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(load());
}

// POST - save topology
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key');
  if (apiKey !== process.env.API_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const topology = await req.json();
  const list = load();
  const existing = list.findIndex((t: any) => t.id === topology.id);
  if (existing >= 0) {
    list[existing] = topology;
  } else {
    list.push({ ...topology, id: Date.now(), savedAt: new Date().toISOString() });
  }
  save(list);
  return NextResponse.json({ ok: true });
}

// DELETE - delete topology
export async function DELETE(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key');
  if (apiKey !== process.env.API_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await req.json();
  const list = load().filter((t: any) => t.id !== id);
  save(list);
  return NextResponse.json({ ok: true });
}
