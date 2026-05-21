import { generateText } from 'ai';
import { getModel } from '@/lib/ai';
import { topologySchema } from '@/lib/schema';
import { validateModelName } from '@/lib/validation';

export async function POST(req: Request) {
  const apiKey = req.headers.get('x-api-key');
  if (apiKey !== process.env.API_SECRET_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { attackPath, steps, topology, vulnerabilities, modelName } = await req.json();

  // 1. Validate topology payload
  const parseResult = topologySchema.safeParse(topology);
  if (!parseResult.success) {
    return Response.json({ error: 'Invalid topology data structure' }, { status: 400 });
  }

  // 2. Validate attackPath
  if (!attackPath || !Array.isArray(attackPath) || attackPath.some(id => typeof id !== 'string')) {
    return Response.json({ error: 'Invalid or missing attackPath array' }, { status: 400 });
  }

  // 3. Validate modelName
  if (!modelName || !validateModelName(modelName)) {
    return Response.json({ error: 'Model not supported or invalid' }, { status: 400 });
  }

  const pathDevices = (attackPath as string[]).map((id: string) => {
    const device = topology.devices.find((d: any) => d.id === id);
    const vuln = vulnerabilities?.[id];
    return `- ${device?.name || id} (${device?.type || 'unknown'}, IP: ${device?.ipAddress || 'N/A'}) — Risk: ${vuln?.riskLevel || 'UNKNOWN'}`;
  });

  const stepsDesc = (steps || []).map((s: any) =>
    `  ${s.from} → ${s.to}: ${s.technique}${s.cve ? ` [${s.cve}]` : ''}`
  ).join('\n');

  const systemPrompt = `You are a senior network security engineer and hardening specialist (CISSP, CCNP Security).
Generate specific, actionable remediation recommendations to break the identified attack path.

For each hop in the attack path, provide:
- node: the device ID being remediated
- action: human-readable description of what to do
- aclRule: specific ACL/firewall rule syntax (Cisco IOS or iptables style)
- patchAction: patch/config change needed
- priority: "CRITICAL" | "HIGH" | "MEDIUM"

Also provide an overall topology change suggestion if applicable.

Output ONLY valid JSON, no markdown:
{
  "remediations": [
    {
      "node": "device-id",
      "nodeName": "Router 1",
      "action": "Block inbound SSH from untrusted zones",
      "aclRule": "ip access-list extended BLOCK_SSH\\n deny tcp any host 192.168.1.1 eq 22\\n permit ip any any",
      "patchAction": "Disable Telnet: no service telnet. Enable SSHv2 only: ip ssh version 2",
      "priority": "CRITICAL"
    }
  ],
  "topologyChanges": "Consider adding IDS/IPS between Internet and Router 1. Segment database into isolated VLAN.",
  "summary": "3-sentence executive summary of remediation plan"
}`;

  const prompt = `
Attack Path Identified:
${pathDevices.join('\n')}

Attack Steps:
${stepsDesc}

Generate remediation rules to break each hop in this attack path.`;

  const { text } = await generateText({
    model: getModel(modelName),
    system: systemPrompt,
    prompt,
  });

  const clean = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);

  return Response.json(parsed);
}
