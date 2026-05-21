import { generateText } from 'ai';
import { getModel } from '@/lib/ai';
import { topologySchema } from '@/lib/schema';
import { validateModelName } from '@/lib/validation';

export async function POST(req: Request) {
  const apiKey = req.headers.get('x-api-key');
  if (apiKey !== process.env.API_SECRET_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { topology, attackerNodeId, targetNodeId, vulnerabilities, modelName } = await req.json();

  // 1. Validate topology payload
  const parseResult = topologySchema.safeParse(topology);
  if (!parseResult.success) {
    return Response.json({ error: 'Invalid topology data structure' }, { status: 400 });
  }

  // 2. Validate attacker and target node IDs
  if (!attackerNodeId || typeof attackerNodeId !== 'string' || !targetNodeId || typeof targetNodeId !== 'string') {
    return Response.json({ error: 'Attacker and Target node IDs are required strings' }, { status: 400 });
  }

  const deviceExists = (id: string) => parseResult.data.devices.some(d => d.id === id);
  if (!deviceExists(attackerNodeId) || !deviceExists(targetNodeId)) {
    return Response.json({ error: 'Attacker or Target node does not exist in topology' }, { status: 400 });
  }

  // 3. Validate modelName
  if (!modelName || !validateModelName(modelName)) {
    return Response.json({ error: 'Model not supported or invalid' }, { status: 400 });
  }

  const deviceList = topology.devices
    .map((d: any) => {
      const vuln = vulnerabilities?.[d.id];
      return `- ID: ${d.id}, Name: ${d.name}, Type: ${d.type}, IP: ${d.ipAddress || 'N/A'}, Risk: ${vuln?.riskLevel || 'UNKNOWN'}, Ports: [${vuln?.openPorts?.join(', ') || 'unknown'}], Notes: ${vuln?.notes || 'none'}`;
    })
    .join('\n');

  const connList = topology.connections
    .map((c: any) => `${c.from} ↔ ${c.to}${c.interface ? ` (${c.interface})` : ''}`)
    .join('\n');

  const attackerDevice = topology.devices.find((d: any) => d.id === attackerNodeId);
  const targetDevice = topology.devices.find((d: any) => d.id === targetNodeId);

  const systemPrompt = `You are an expert ethical hacker and red team operator (OSCP, CEH certified).
Your task: find the MOST LIKELY attack path from attacker to target through the network.

Rules:
1. Only traverse devices that are DIRECTLY connected (edges in the topology)
2. Prefer paths through HIGH/CRITICAL risk nodes (easier to compromise)
3. Each hop must have a realistic attack technique
4. Output the attackPath as an array of device IDs from attacker to target
5. Each step must include: from, to, technique, cve (if applicable), severity

Output ONLY valid JSON, no markdown:
{
  "attackPath": ["node-id-1", "node-id-2", "node-id-3"],
  "steps": [
    {
      "from": "node-id-1",
      "to": "node-id-2",
      "technique": "SSH Brute Force",
      "cve": "CVE-2023-20198",
      "severity": "HIGH",
      "description": "Exploit default SSH credentials on router"
    }
  ],
  "totalRisk": "CRITICAL",
  "attackLog": "Multi-line narrative attack log describing each step like a real penetration test report"
}`;

  const prompt = `
Network Topology:
Devices:
${deviceList}

Connections:
${connList}

ATTACKER ORIGIN: ${attackerDevice?.name || attackerNodeId} (ID: ${attackerNodeId})
TARGET: ${targetDevice?.name || targetNodeId} (ID: ${targetNodeId})

Find the most realistic attack path from attacker to target.`;

  const { text } = await generateText({
    model: getModel(modelName),
    system: systemPrompt,
    prompt,
  });

  // Strip think tags (deepseek / reasoning models), then extract JSON
  let clean = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  clean = clean.replace(/```json|```/g, '').trim();

  // Find the outermost JSON object in case there's extra prose
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return Response.json({ error: 'LLM returned no valid JSON', raw: text.slice(0, 500) }, { status: 500 });
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return Response.json(parsed);
}
