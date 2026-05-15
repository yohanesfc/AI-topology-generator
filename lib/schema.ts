import { z } from 'zod';

export const topologySchema = z.object({
  topologyName: z.string(),
  devices: z.array(z.object({
    id: z.string(),
    type: z.string(), // bebas string, tidak strict enum
    name: z.string(),
    ipAddress: z.string().optional(),
    icon: z.string().optional(),
  })).max(20),
  connections: z.array(z.object({
    from: z.string(),
    to: z.string(),
    interface: z.string().optional(),
    bandwidth: z.string().optional(),
  }))
});

export type Topology = z.infer<typeof topologySchema>;
