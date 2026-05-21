import { generateText } from 'ai';
import { getModel } from '@/lib/ai';
import { topologySchema } from '@/lib/schema';
import { validateModelName, validateProtocol } from '@/lib/validation';

function safeParseJSON(text: string) {
  let clean = text.replace(/```json|```/g, '').trim();
  
  try {
    return JSON.parse(clean);
  } catch {
    clean = clean.replace(/[\x00-\x1F\x7F]/g, (char: string) => {
      const escapes: Record<string, string> = {
        '\n': '\\n', '\r': '\\r', '\t': '\\t',
        '\b': '\\b', '\f': '\\f',
      };
      return escapes[char] || '';
    });

    try {
      return JSON.parse(clean);
    } catch {
      const configs: any[] = [];
      const deviceBlocks = clean.match(/"deviceId"\s*:\s*"([^"]+)"[\s\S]*?"config"\s*:\s*"([\s\S]*?)"\s*}/g);
      if (deviceBlocks) {
        for (const block of deviceBlocks) {
          try {
            const idMatch = block.match(/"deviceId"\s*:\s*"([^"]+)"/);
            const nameMatch = block.match(/"deviceName"\s*:\s*"([^"]+)"/);
            const typeMatch = block.match(/"type"\s*:\s*"([^"]+)"/);
            const configMatch = block.match(/"config"\s*:\s*"([\s\S]*?)"\s*}/);
            if (idMatch && configMatch) {
              configs.push({
                deviceId: idMatch[1],
                deviceName: nameMatch?.[1] || idMatch[1],
                type: typeMatch?.[1] || 'Device',
                config: configMatch[1].replace(/\\n/g, '\n').replace(/\\t/g, '\t'),
              });
            }
          } catch { continue; }
        }
      }
      if (configs.length > 0) return { configs };
      throw new Error('Failed to parse LLM response as JSON');
    }
  }
}

export async function POST(req: Request) {
  const apiKey = req.headers.get('x-api-key');
  if (apiKey !== process.env.API_SECRET_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { topology, protocol, mode, modelName } = await req.json();

  // 1. Validate topology payload
  const parseResult = topologySchema.safeParse(topology);
  if (!parseResult.success) {
    return Response.json({ error: 'Invalid topology data structure' }, { status: 400 });
  }

  // 2. Validate protocol
  if (!protocol || !validateProtocol(protocol)) {
    return Response.json({ error: 'Invalid or unsupported routing/switching protocol' }, { status: 400 });
  }

  // 3. Validate mode
  if (mode !== 'Structured' && mode !== 'Chain of Thought') {
    return Response.json({ error: 'Invalid generation mode' }, { status: 400 });
  }

  // 4. Validate modelName
  if (!modelName || !validateModelName(modelName)) {
    return Response.json({ error: 'Model not supported or invalid' }, { status: 400 });
  }

  const isCoT = mode === 'Chain of Thought';

  const protocolGuide: Record<string, string> = {
    'OSPF': 'Include router ospf 1, network statements with wildcard masks, area assignments, passive-interface for end devices',
    'BGP': 'Include router bgp with AS number, neighbor statements, network advertisements, route-reflector if needed',
    'EIGRP': 'Include router eigrp with AS number, network statements, no auto-summary',
    'Static Routing': 'Include ip route statements for each destination, default routes where needed',
    'VLAN': 'Include vlan database, switchport mode trunk/access, allowed vlans, SVI interfaces',
    'MPLS': 'Include mpls ip, mpls label protocol ldp, LDP router-id, mpls traffic-eng on interfaces',
    'SR-TE': 'Include segment-routing mpls, prefix-sid assignments, IS-IS or OSPF with SR extension, traffic-eng policy with explicit paths',
    'VXLAN': 'Include nve interface, vni mappings, BGP EVPN address-family l2vpn evpn, vtep configuration, vlan-vni mapping',
  };

  const guide = protocolGuide[protocol] || 'Generate appropriate configuration';

  const deviceList = topology.devices.map((d: any) =>
    `- ${d.id} (${d.type}): IP ${d.ipAddress || 'unassigned'}`
  ).join('\n');

  const connectionList = topology.connections.map((c: any) =>
    `- ${c.from} to ${c.to} via ${c.interface || 'eth0'}`
  ).join('\n');

  const jsonExample = '{"configs":[{"deviceId":"R1","deviceName":"Router 1","type":"Router","config":"! config\\ninterface G0/0\\n ip address 1.1.1.1 255.255.255.0\\n no shutdown"}]}';

  const systemPrompt = isCoT
    ? `You are a Senior Network Engineer. Think step by step for ${protocol} config. CRITICAL: Output ONLY valid JSON. Escape ALL newlines in config strings as \\n. Example: ${jsonExample}`
    : `You are a Senior Network Engineer. Generate ${protocol} config. CRITICAL: Output ONLY valid JSON. Escape ALL newlines in config strings as \\n. No literal newlines inside JSON strings. Protocol guide: ${guide}. Example: ${jsonExample}`;

  const { text } = await generateText({
    model: getModel(modelName),
    system: systemPrompt,
    prompt: `Topology: ${topology.topologyName}\nProtocol: ${protocol}\n\nDevices:\n${deviceList}\n\nConnections:\n${connectionList}\n\nIMPORTANT: Escape newlines as \\n in all config strings. Generate complete ${protocol} config for ALL devices.`,
  });

  try {
    const parsed = safeParseJSON(text);
    return Response.json({ ...parsed, mode });
  } catch (err: any) {
    return Response.json({ error: 'Parse failed: ' + err.message }, { status: 500 });
  }
}
