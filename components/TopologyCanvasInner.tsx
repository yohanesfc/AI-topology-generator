'use client';
import React, { useMemo, useCallback, useState } from 'react';
import { ReactFlow, Background, Controls, MiniMap, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dynamic from 'next/dynamic';
import { Topology } from '@/lib/schema';

const SshTerminal = dynamic(() => import('./SshTerminal'), { ssr: false });

const TYPE_META: Record<string, { color: string; emoji: string; tier: number }> = {
  // Tier 0 - Security/Edge
  Firewall:       { color: '#ef4444', emoji: '🛡️', tier: 0 },
  IDS:            { color: '#dc2626', emoji: '🔍', tier: 0 },
  IPS:            { color: '#b91c1c', emoji: '🚨', tier: 0 },
  Cloud:          { color: '#7dd3fc', emoji: '☁️', tier: 0 },
  Internet:       { color: '#93c5fd', emoji: '🌐', tier: 0 },
  // Tier 1 - Routing
  Router:         { color: '#f97316', emoji: '🔀', tier: 1 },
  'Core Router':  { color: '#ea580c', emoji: '🔁', tier: 1 },
  'Cisco Router': { color: '#c2410c', emoji: '🔀', tier: 1 },
  'Layer 3 Switch': { color: '#16a34a', emoji: '🔃', tier: 1 },
  // Tier 2 - Switching
  Switch:         { color: '#22c55e', emoji: '🔌', tier: 2 },
  'Core Switch':  { color: '#15803d', emoji: '🔌', tier: 2 },
  'Access Point': { color: '#06b6d4', emoji: '📡', tier: 2 },
  WAP:            { color: '#0891b2', emoji: '📶', tier: 2 },
  // Tier 3 - Servers
  Server:         { color: '#a855f7', emoji: '🖥️', tier: 3 },
  'Core Server':  { color: '#9333ea', emoji: '🗄️', tier: 3 },
  'Web Server':   { color: '#7c3aed', emoji: '🌍', tier: 3 },
  'DNS Server':   { color: '#6d28d9', emoji: '📖', tier: 3 },
  'DHCP Server':  { color: '#5b21b6', emoji: '📋', tier: 3 },
  'Mail Server':  { color: '#4c1d95', emoji: '📧', tier: 3 },
  NAS:            { color: '#8b5cf6', emoji: '💾', tier: 3 },
  // Tier 4 - End Devices
  PC:             { color: '#3b82f6', emoji: '💻', tier: 4 },
  Workstation:    { color: '#60a5fa', emoji: '🖱️', tier: 4 },
  Laptop:         { color: '#2563eb', emoji: '💻', tier: 4 },
  Printer:        { color: '#1d4ed8', emoji: '🖨️', tier: 4 },
  Phone:          { color: '#1e40af', emoji: '📱', tier: 4 },
};

const NODE_W = 130;
const NODE_H = 44;
const TIER_GAP = 120;
const NODE_GAP = 160;

function normalizeType(type: string): string {
  const t = type.toLowerCase();
  // Security
  if (t.includes('ids') || t.includes('intrusion detect')) return 'IDS';
  if (t.includes('ips') || t.includes('intrusion prevent')) return 'IPS';
  if (t.includes('fire') || t.includes('fw')) return 'Firewall';
  // Cloud/Internet
  if (t.includes('cloud')) return 'Cloud';
  if (t.includes('internet') || t.includes('wan') || t.includes('isp')) return 'Internet';
  // Routing
  if (t.includes('core router') || t.includes('core-router')) return 'Core Router';
  if (t.includes('cisco') && t.includes('router')) return 'Cisco Router';
  if (t.includes('layer 3') || t.includes('l3 switch') || t.includes('multilayer')) return 'Layer 3 Switch';
  if (t.includes('router') || t.includes('rtr') || t.includes('gw') || t.includes('gateway')) return 'Router';
  // Switching
  if (t.includes('core switch') || t.includes('core-switch')) return 'Core Switch';
  if (t.includes('access point') || t.includes('wap') || t.includes('wifi') || t.includes('wireless')) return 'Access Point';
  if (t.includes('switch') || t.includes('sw')) return 'Switch';
  // Servers
  if (t.includes('web server') || t.includes('http')) return 'Web Server';
  if (t.includes('dns')) return 'DNS Server';
  if (t.includes('dhcp')) return 'DHCP Server';
  if (t.includes('mail') || t.includes('smtp')) return 'Mail Server';
  if (t.includes('core server') || t.includes('core-server')) return 'Core Server';
  if (t.includes('nas') || t.includes('storage')) return 'NAS';
  if (t.includes('server') || t.includes('srv')) return 'Server';
  // End devices
  if (t.includes('laptop') || t.includes('notebook')) return 'Laptop';
  if (t.includes('printer')) return 'Printer';
  if (t.includes('phone') || t.includes('mobile') || t.includes('voip')) return 'Phone';
  if (t.includes('pc') || t.includes('work') || t.includes('host') || t.includes('client') || t.includes('desktop')) return 'PC';
  return type;
}

function getMeta(type: string) {
  return TYPE_META[normalizeType(type)] ?? { color: '#64748b', emoji: '📦', tier: 3 };
}

function computeLayout(devices: Topology['devices']) {
  const tiers = new Map<number, typeof devices>();
  devices.forEach(d => {
    const tier = getMeta(d.type).tier;
    if (!tiers.has(tier)) tiers.set(tier, []);
    tiers.get(tier)!.push(d);
  });

  const sortedTiers = [...tiers.entries()].sort((a, b) => a[0] - b[0]);
  const maxCount = Math.max(...sortedTiers.map(([, devs]) => devs.length));
  const canvasWidth = maxCount * NODE_GAP;

  const posMap = new Map<string, { x: number; y: number }>();
  sortedTiers.forEach(([, devs], tierIdx) => {
    const y = tierIdx * TIER_GAP + 40;
    const totalW = (devs.length - 1) * NODE_GAP;
    const startX = (canvasWidth - totalW) / 2;
    devs.forEach((d, i) => {
      posMap.set(d.id, { x: startX + i * NODE_GAP, y });
    });
  });

  return posMap;
}

export default function TopologyCanvasInner({ data, onNodeSelect }: { data: Partial<Topology> | undefined; onNodeSelect?: (node: any) => void }) {
  const [sshTarget, setSshTarget] = useState<{ host: string; user: string } | null>(null);
  const [nodeNames, setNodeNames] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [toolOutput, setToolOutput] = useState<string>('');
  const [toolRunning, setToolRunning] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const runTool = useCallback(async (tool: string, host: string) => {
    setToolRunning(true);
    setToolOutput('Running ' + tool + ' to ' + host + '...');
    try {
      const res = await fetch('/api/network-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, host }),
      });
      const data = await res.json();
      setToolOutput(data.output || data.error || 'No output');
    } catch {
      setToolOutput('Failed to run tool');
    } finally {
      setToolRunning(false);
    }
  }, []);

  const commitRename = useCallback(() => {
    if (selectedNode && renameValue.trim()) {
      setNodeNames(prev => ({ ...prev, [selectedNode.id]: renameValue.trim() }));
    }
  }, [selectedNode, renameValue]);

  const onNodeClick = useCallback((_: any, node: any) => {
    setSelectedNode(node);
    setToolOutput('');
    setRenameValue(nodeNames[node.id] ?? node.data?.rawName ?? node.id);
    onNodeSelect?.(node);
  }, [nodeNames, onNodeSelect]);

  const onNodeDoubleClick = useCallback((_: any, node: any) => {
    setEditingId(node.id);
    setEditValue(nodeNames[node.id] ?? node.data?.rawName ?? node.id);
  }, [nodeNames]);

  const commitEdit = useCallback(() => {
    if (editingId && editValue.trim()) {
      setNodeNames(prev => ({ ...prev, [editingId]: editValue.trim() }));
    }
    setEditingId(null);
    setEditValue('');
  }, [editingId, editValue]);

  const { nodes, edges } = useMemo(() => {
    if (!data?.devices?.length) return { nodes: [], edges: [] };

    const posMap = computeLayout(data.devices);

    const rfNodes = data.devices.map(device => {
      const meta = getMeta(device.type);
      const pos = posMap.get(device.id) ?? { x: 0, y: 0 };
      const displayName = nodeNames[device.id] ?? device.name;
      const isEditing = editingId === device.id;

      return {
        id: device.id,
        data: {
          rawName: device.name,
          ipAddress: device.ipAddress,
          label: isEditing ? (
            <input
              autoFocus
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitEdit();
                if (e.key === 'Escape') { setEditingId(null); setEditValue(''); }
              }}
              onBlur={commitEdit}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid #38bdf8',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 700,
                textAlign: 'center',
                width: '100px',
                outline: 'none',
              }}
            />
          ) : (
            <span style={{ whiteSpace: 'pre-line', fontSize: '11px', fontWeight: 700 }}>
              {`${meta.emoji} ${displayName}\n(${device.type})`}
            </span>
          ),
        },
        position: pos,
        style: {
          background: `linear-gradient(145deg, ${meta.color}ee, ${meta.color}88)`,
          color: '#fff',
          borderRadius: '10px',
          border: isEditing ? '2px solid #38bdf8' : `2px solid ${meta.color}`,
          boxShadow: isEditing ? '0 0 20px #38bdf888' : `0 0 14px ${meta.color}44`,
          width: NODE_W,
          height: NODE_H,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center' as const,
          cursor: 'pointer',
        },
      };
    });

    const deviceIds = new Set(data.devices.map(d => d.id));
    const rfEdges = (data.connections ?? [])
      .filter(c => c.from && c.to && deviceIds.has(c.from) && deviceIds.has(c.to))
      .map((conn, i) => ({
        id: `e-${i}`,
        source: conn.from ?? '',
        target: conn.to ?? '',
        label: conn.interface ?? '',
        labelStyle: { fill: '#94a3b8', fontSize: 9, fontWeight: 600 },
        labelBgStyle: { fill: '#0f172a', fillOpacity: 0.85 },
        labelBgPadding: [3, 5] as [number, number],
        labelBgBorderRadius: 4,
        animated: true,
        type: 'smoothstep',
        style: { stroke: '#38bdf8', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8', width: 12, height: 12 },
      }));

    return { nodes: rfNodes, edges: rfEdges };
  }, [data, nodeNames, editingId, editValue, commitEdit]);

  return (
    <>
      <div className="w-full bg-slate-900 rounded-xl border border-slate-700 overflow-hidden relative"
           style={{ height: '100%' }}>
        {/* Hint */}
        <div className="absolute top-2 right-3 z-10 text-[10px] text-slate-500 pointer-events-none">
          Click node for actions · Double-click to rename inline
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.1}
          maxZoom={2.5}
          nodesFocusable={false}
          elementsSelectable={true}
          selectNodesOnDrag={false}
        >
          <Background color="#1e3a5f" gap={28} variant={'dots' as any} />
          <Controls />
          <MiniMap
            nodeColor={(n) => {
              const bg = n.style?.background as string ?? '';
              const match = bg.match(/#[0-9a-f]{6}/i);
              return match ? match[0] : '#3b82f6';
            }}
          />
        </ReactFlow>
      </div>

      {sshTarget && (
        <SshTerminal
          host={sshTarget.host}
          user={sshTarget.user}
          onClose={() => setSshTarget(null)}
        />
      )}
    </>
  );
}
