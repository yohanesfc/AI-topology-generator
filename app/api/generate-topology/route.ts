import { generateText } from 'ai';
import { topologySchema } from '@/lib/schema';
import { getModel } from '@/lib/ai';
import { sanitizePrompt, detectJailbreak, validateModelName } from '@/lib/validation';

export async function POST(req: Request) {
  const apiKey = req.headers.get('x-api-key');
  if (apiKey !== process.env.API_SECRET_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { prompt, mode, modelName, image } = await req.json();

  // 1. Validate prompt
  if (prompt && typeof prompt !== 'string') {
    return Response.json({ error: 'Invalid prompt type' }, { status: 400 });
  }
  
  if (!prompt && !image) {
    return Response.json({ error: 'Prompt or image is required' }, { status: 400 });
  }

  let finalPrompt = '';
  if (prompt) {
    if (prompt.length > 1500) {
      return Response.json({ error: 'Prompt length exceeds 1500 characters limit' }, { status: 400 });
    }
    
    if (detectJailbreak(prompt)) {
      return Response.json({ error: 'Input validation failed: System instruction override or jailbreak detected.' }, { status: 400 });
    }
    
    finalPrompt = sanitizePrompt(prompt);
  }

  // 2. Validate mode
  if (mode !== 'Structured' && mode !== 'Chain of Thought') {
    return Response.json({ error: 'Invalid generation mode' }, { status: 400 });
  }

  // 3. Validate modelName
  if (!modelName || !validateModelName(modelName)) {
    return Response.json({ error: 'Model not supported or invalid' }, { status: 400 });
  }

  const isCoT = mode === 'Chain of Thought';

  const systemPrompt = isCoT
    ? `You are a Senior Network Architect. Think step by step before designing the topology.
Reasoning steps:
1. Understand what the user needs
2. Decide device types and count
3. Plan IP addressing scheme
4. Design connections logically
5. Output the final JSON

Output ONLY valid JSON, no markdown:
{
  "topologyName": "string",
  "reasoning": "your step by step thinking here",
  "devices": [{"id":"FW1","name":"Firewall 1","type":"Firewall","ipAddress":"192.168.1.1"}],
  "connections": [{"from":"FW1","to":"R1","interface":"G0/0"}]
}`
    : `You are a Senior Network Architect. Design a secure network topology based on user request.
Max 20 devices. Use realistic interface names (G0/0, eth1, etc).
STRICTLY follow the user's device list - DO NOT add extra devices not mentioned by the user.
STRICT RULES:
1. Every device MUST have an "ipAddress" field
2. Use these IP ranges:
   - Firewall: 192.168.1.1, 192.168.1.2
   - Router: 192.168.1.10, 192.168.1.11
   - Switch: 192.168.1.20, 192.168.1.21
   - Server: 192.168.10.1, 192.168.10.2
   - PC/Workstation: 192.168.20.1+ (increment per device)
3. Response MUST be valid JSON only - no markdown
{
  "topologyName": "string",
  "devices": [{"id":"FW1","name":"Firewall 1","type":"Firewall","ipAddress":"192.168.1.1"}],
  "connections": [{"from":"FW1","to":"R1","interface":"G0/0"}]
}`;

  const messageContent: any[] = [];
  messageContent.push({ type: 'text', text: finalPrompt || 'Convert this network diagram into a topology according to the rules.' });
  if (image) {
    // Extract base64 data ignoring the data URL prefix (e.g., data:image/png;base64,...)
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    messageContent.push({ type: 'image', image: base64Data });
  }

  const { text } = await generateText({
    model: getModel(modelName),
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: messageContent,
      }
    ]
  });

  const clean = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);

  parsed.devices = parsed.devices.map((d: any, i: number) => ({
    ...d,
    ipAddress: d.ipAddress || d.ip || d.ip_address || `192.168.99.${i + 1}`,
  }));
  parsed.devices = parsed.devices.slice(0, 20);

  const object = topologySchema.parse(parsed);
  return Response.json({ ...object, reasoning: parsed.reasoning, mode });
}
