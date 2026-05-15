import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const apiKey = req.headers.get('x-api-key');
  if (apiKey !== process.env.API_SECRET_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { topology } = await req.json();

  const deviceList = topology.devices
    .map((d: any) => `- ID: ${d.id}, Name: ${d.name}, Type: ${d.type}, IP: ${d.ipAddress || 'N/A'}`)
    .join('\n');

  const systemPrompt = `You are a senior cybersecurity penetration tester and vulnerability analyst (CEH, OSCP certified).
Analyze the given network topology and identify realistic vulnerabilities for each device.

For each device, assign:
- riskLevel: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
- cves: array of real CVE IDs relevant to the device type (max 3)
- openPorts: array of commonly open/misconfigured ports for this device type
- notes: one-line description of the main vulnerability

Base your assessment on device TYPE:
- Internet/Cloud: Entry point, no vulnerability itself but acts as attacker origin
- Firewall: Misconfigured ACL, weak ruleset, CVE firmware bugs
- Router: SSH/Telnet open, default credentials, routing protocol attacks
- Switch: VLAN hopping, STP manipulation, MAC flooding
- Server/Web Server: Unpatched OS, SQLi, RCE, exposed services
- DNS Server: DNS cache poisoning, zone transfer
- DHCP Server: Rogue DHCP, starvation attacks
- PC/Workstation: Phishing target, unpatched OS, lateral movement pivot
- Access Point/WAP: WPA2 cracking, Evil Twin, deauth attacks

Output ONLY valid JSON, no markdown, no explanation:
{
  "vulnerabilities": {
    "<deviceId>": {
      "riskLevel": "HIGH",
      "cves": ["CVE-2023-20198"],
      "openPorts": [22, 23, 80],
      "notes": "Telnet enabled with default credentials"
    }
  }
}`;

  const prompt = `Analyze this network topology for vulnerabilities:\n\n${deviceList}`;

  const { text } = await generateText({
    model: groq('llama-3.3-70b-versatile'),
    system: systemPrompt,
    prompt,
  });

  const clean = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);

  return Response.json(parsed);
}
