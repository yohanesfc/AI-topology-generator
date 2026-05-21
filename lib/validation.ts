/**
 * Input validation, sanitization, and security guardrails helper.
 */

// Supported models allow-list
export const APPROVED_MODELS = [
  'llama-3.3-70b-versatile',
  'deepseek-r1-distill-llama-70b',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gpt-4o-mini',
  'gpt-4o',
  'deepseek-chat',
  'deepseek-reasoner'
] as const;

// Supported network routing and switching protocols
export const APPROVED_PROTOCOLS = [
  'OSPF',
  'BGP',
  'EIGRP',
  'Static Routing',
  'VLAN',
  'MPLS',
  'SR-TE',
  'VXLAN'
] as const;

/**
 * Strips dangerous control and non-printable characters.
 * Keeps standard printables, spaces, tabs, and newlines.
 */
export function sanitizePrompt(prompt: string): string {
  if (typeof prompt !== 'string') return '';
  
  // Keep only printable ASCII and typical layout characters (spaces, tabs, newlines)
  // Strips characters below 0x20 except \n, \r, \t, and strips 0x7F
  let sanitized = prompt.replace(/[^\x20-\x7E\n\r\t]/g, '');
  
  return sanitized.trim();
}

/**
 * Scans the prompt case-insensitively for common jailbreak,
 * role-override, or instructions-bypass trigger phrases.
 */
export function detectJailbreak(prompt: string): boolean {
  if (!prompt) return false;
  
  const normalized = prompt.toLowerCase();
  
  const triggers = [
    /ignore\s+(?:previous|all|the)?\s*instructions/i,
    /ignore\s+(?:previous|all|the)?\s*rules/i,
    /system\s*prompt/i,
    /dan\s*mode/i,
    /you\s*are\s*now\s*a/i,
    /ignore\s*security/i,
    /bypass\s*security/i,
    /disregard\s+(?:previous|all|the)?\s*instructions/i,
    /forget\s+(?:previous|all|the)?\s*instructions/i
  ];
  
  return triggers.some(regex => regex.test(normalized));
}

/**
 * Validates if the selected model is allowed.
 */
export function validateModelName(modelName: string): boolean {
  return APPROVED_MODELS.includes(modelName as any);
}

/**
 * Validates if the selected config protocol is allowed.
 */
export function validateProtocol(protocol: string): boolean {
  return APPROVED_PROTOCOLS.includes(protocol as any);
}
