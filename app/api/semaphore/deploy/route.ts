const SEMAPHORE_URL = process.env.SEMAPHORE_URL!;
const SEMAPHORE_TOKEN = process.env.SEMAPHORE_TOKEN!;
const HEADERS = {
  Authorization: `Bearer ${SEMAPHORE_TOKEN}`,
  'Content-Type': 'application/json',
};

// Pakai array join agar Tailwind tidak scan sebagai class
const INV_SECTIONS = {
  allVars:          ['[', 'all' + ':' + 'vars', ']'].join(''),
  networkChildren:  ['[', 'network' + ':' + 'children', ']'].join(''),
};

function generateInventory(devices: any[]): string {
  const groups: Record<string, any[]> = {
    firewalls: [], routers: [], switches: [], servers: [], pcs: [],
  };

  devices.forEach(d => {
    const t = d.type?.toLowerCase() ?? '';
    if (t.includes('fire') || t.includes('fw')) groups.firewalls.push(d);
    else if (t.includes('router') || t.includes('rtr')) groups.routers.push(d);
    else if (t.includes('switch') || t.includes('sw')) groups.switches.push(d);
    else if (t.includes('server') || t.includes('srv')) groups.servers.push(d);
    else groups.pcs.push(d);
  });

  let inv = '';

  Object.entries(groups).forEach(([group, devs]) => {
    if (devs.length === 0) return;
    inv += `[${group}]\n`;
    devs.forEach(d => {
      const ip = d.ipAddress ?? '127.0.0.1';
      const name = (d.id ?? 'device').toLowerCase().replace(/\s+/g, '_');
      inv += `${name} ansible_host=${ip} ansible_port=22\n`;
    });
    inv += '\n';
  });

  const activeGroups = Object.entries(groups)
    .filter(([, devs]) => devs.length > 0)
    .map(([g]) => g);

  inv += INV_SECTIONS.networkChildren + '\n';
  activeGroups.forEach(g => { inv += `${g}\n`; });
  inv += '\n';

  inv += INV_SECTIONS.allVars + '\n';
  inv += 'ansible_user=root\n';
  inv += 'ansible_connection=ssh\n';
  inv += "ansible_ssh_common_args='-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null'\n";
  inv += 'ansible_python_interpreter=/usr/bin/python3.12\n';

  return inv;
}

export async function POST(req: Request) {
  const { devices, topologyName, templateId } = await req.json();

  if (!devices?.length) {
    return Response.json({ error: 'No devices provided' }, { status: 400 });
  }

  const inventoryContent = generateInventory(devices);
  const invName = `AutoNet-${topologyName ?? 'Topology'}-${Date.now()}`;

  const invRes = await fetch(`${SEMAPHORE_URL}/api/project/1/inventory`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      name: invName,
      project_id: 1,
      inventory: inventoryContent,
      ssh_key_id: 3,
      type: 'static',
    }),
  });

  const inventory = await invRes.json();
  if (!inventory.id) {
    return Response.json({ error: 'Failed to create inventory', detail: inventory }, { status: 500 });
  }

  const taskRes = await fetch(`${SEMAPHORE_URL}/api/project/1/tasks`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      template_id: templateId ?? 1,
      debug: false,
      dry_run: false,
      inventory_id: inventory.id,
    }),
  });

  const task = await taskRes.json();

  return Response.json({
    success: true,
    inventory_id: inventory.id,
    inventory_name: invName,
    inventory_content: inventoryContent,
    task,
  });
}
