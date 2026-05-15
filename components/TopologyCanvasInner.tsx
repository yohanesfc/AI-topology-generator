'use client';
import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { ReactFlow, Background, Controls, MiniMap, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dynamic from 'next/dynamic';
import { Topology } from '@/lib/schema';
import type { VulnData } from './AttackSimulator';

const SshTerminal = dynamic(() => import('./SshTerminal'), { ssr: false });

// ─── Device Type Metadata ─────────────────────────────────────────────────────

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

const RISK_BORDER: Record<string, { border: string; glow: string; badge: string }> = {
  NONE:     { border: '', glow: '', badge: '' },
  LOW:      { border: '#22c55e', glow: '0 0 10px 2px #22c55e55', badge: '🟢' },
  MEDIUM:   { border: '#eab308', glow: '0 0 10px 2px #eab30855', badge: '🟡' },
  HIGH:     { border: '#f97316', glow: '0 0 14px 4px #f9731666', badge: '🟠' },
  CRITICAL: { border: '#ef4444', glow: '0 0 18px 6px #ef444477', badge: '🔴' },
};

const NODE_W = 130;
const NODE_H = 44;
const TIER_GAP = 120;
const NODE_GAP = 160;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeType(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('ids') || t.includes('intrusion detect')) return 'IDS';
  if (t.includes('ips') || t.includes('intrusion prevent')) return 'IPS';
  if (t.includes('fire') || t.includes('fw')) return 'Firewall';
  if (t.includes('cloud')) return 'Cloud';
  if (t.includes('internet') || t.includes('wan') || t.includes('isp')) return 'Internet';
  if (t.includes('core router') || t.includes('core-router')) return 'Core Router';
  if (t.includes('cisco') && t.includes('router')) return 'Cisco Router';
  if (t.includes('layer 3') || t.includes('l3 switch') || t.includes('multilayer')) return 'Layer 3 Switch';
  if (t.includes('router') || t.includes('rtr') || t.includes('gw') || t.includes('gateway')) return 'Router';
  if (t.includes('core switch') || t.includes('core-switch')) return 'Core Switch';
  if (t.includes('access point') || t.includes('wap') || t.includes('wifi') || t.includes('wireless')) return 'Access Point';
  if (t.includes('switch') || t.includes('sw')) return 'Switch';
  if (t.includes('web server') || t.includes('http')) return 'Web Server';
  if (t.includes('dns')) return 'DNS Server';
  if (t.includes('dhcp')) return 'DHCP Server';
  if (t.includes('mail') || t.includes('smtp')) return 'Mail Server';
  if (t.includes('core server') || t.includes('core-server')) return 'Core Server';
  if (t.includes('nas') || t.includes('storage')) return 'NAS';
  if (t.includes('server') || t.includes('srv')) return 'Server';
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

// ─── Context Menu ─────────────────────────────────────────────────────────────

interface ContextMenuProps {
  x: number;
  y: number;
  node: any;
  simMode: boolean;
  onSetAttacker: (id: string) => void;
  onSetTarget: (id: string) => void;
  onClose: () => void;
}

function ContextMenu({ x, y, node, simMode, onSetAttacker, onSetTarget, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="attack-context-menu"
      style={{ left: x, top: y }}
    >
      <div className="px-3 py-1.5 border-b border-slate-800 mb-1">
        <p className="text-[10px] text-slate-400 font-semibold truncate">{node?.data?.rawName || node?.id}</p>
        <p className="text-[9px] text-slate-600">{node?.data?.ipAddress || 'No IP'}</p>
      </div>

      {simMode && (
        <>
          <button
            onClick={() => { onSetAttacker(node.id); onClose(); }}
            className="text-red-400 hover:bg-red-950/40"
          >
            🔴 Set as Attacker Origin
          </button>
          <button
            onClick={() => { onSetTarget(node.id); onClose(); }}
            className="text-yellow-400 hover:bg-yellow-950/40"
          >
            🎯 Set as Target
          </button>
          <div className="border-t border-slate-800 my-1" />
        </>
      )}

      <button
        onClick={() => { onClose(); }}
        className="text-slate-400"
      >
        ✕ Close
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  data: Partial<Topology> | undefined;
  onNodeSelect?: (node: any) => void;
  // Simulate mode props
  simMode?: boolean;
  vulnerabilities?: Record<string, VulnData>;
  attackPath?: string[];
  attackerNodeId?: string | null;
  targetNodeId?: string | null;
  onSetAttacker?: (id: string) => void;
  onSetTarget?: (id: string) => void;
  nodeNames?: Record<string, string>;
  onRenameNode?: (id: string, newName: string) => void;
}

export default function TopologyCanvasInner({
  data,
  onNodeSelect,
  simMode = false,
  vulnerabilities = {},
  attackPath = [],
  attackerNodeId = null,
  targetNodeId = null,
  onSetAttacker,
  onSetTarget,
  nodeNames = {},
  onRenameNode,
}: Props) {
  const [sshTarget, setSshTarget] = useState<{ host: string; user: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [toolOutput, setToolOutput] = useState<string>('');
  const [toolRunning, setToolRunning] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: any } | null>(null);

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
      onRenameNode?.(selectedNode.id, renameValue.trim());
    }
  }, [selectedNode, renameValue, onRenameNode]);

  const onNodeClick = useCallback((_: any, node: any) => {
    setSelectedNode(node);
    setToolOutput('');
    setRenameValue(nodeNames[node.id] ?? node.data?.rawName ?? node.id);
    setContextMenu(null);
    onNodeSelect?.(node);
  }, [nodeNames, onNodeSelect]);

  const onNodeDoubleClick = useCallback((_: any, node: any) => {
    if (simMode) return; // disable rename in sim mode
    setEditingId(node.id);
    setEditValue(nodeNames[node.id] ?? node.data?.rawName ?? node.id);
  }, [nodeNames, simMode]);

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: any) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, node });
  }, []);

  const commitEdit = useCallback(() => {
    if (editingId && editValue.trim()) {
      onRenameNode?.(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  }, [editingId, editValue, onRenameNode]);

  // Build attack path edge set for quick lookup
  const attackPathEdges = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < attackPath.length - 1; i++) {
      set.add(`${attackPath[i]}|${attackPath[i + 1]}`);
    }
    return set;
  }, [attackPath]);

  const { nodes, edges } = useMemo(() => {
    if (!data?.devices?.length) return { nodes: [], edges: [] };

    const posMap = computeLayout(data.devices);

    const rfNodes = data.devices.map(device => {
      const meta = getMeta(device.type);
      const pos = posMap.get(device.id) ?? { x: 0, y: 0 };
      const displayName = nodeNames[device.id] ?? device.name;
      const isEditing = editingId === device.id;
      const isAttacker = simMode && device.id === attackerNodeId;
      const isTarget = simMode && device.id === targetNodeId;
      const isOnPath = simMode && attackPath.includes(device.id) && !isAttacker && !isTarget;
      const vuln = simMode ? vulnerabilities[device.id] : undefined;
      const riskCfg = vuln ? RISK_BORDER[vuln.riskLevel] : null;

      // Determine border & box-shadow override in sim mode
      let nodeBorder = isEditing ? '2px solid #38bdf8' : `2px solid ${meta.color}`;
      let nodeGlow = isEditing ? '0 0 20px #38bdf888' : `0 0 14px ${meta.color}44`;
      let nodeBackground = `linear-gradient(145deg, ${meta.color}ee, ${meta.color}88)`;

      if (simMode) {
        if (isAttacker) {
          nodeBorder = '3px solid #ef4444';
          nodeGlow = '0 0 24px 8px #ef444499';
          nodeBackground = 'linear-gradient(145deg, #7f1d1dee, #991b1baa)';
        } else if (isTarget) {
          nodeBorder = '3px solid #eab308';
          nodeGlow = '0 0 24px 8px #eab30899';
          nodeBackground = 'linear-gradient(145deg, #78350fee, #92400eaa)';
        } else if (isOnPath) {
          nodeBorder = '2px solid #f97316';
          nodeGlow = '0 0 16px 4px #f9731666';
        } else if (riskCfg?.border) {
          nodeBorder = `2px solid ${riskCfg.border}`;
          nodeGlow = riskCfg.glow;
        }
      }

      // Risk badge overlay label suffix
      const riskBadge = simMode && vuln?.riskLevel && vuln.riskLevel !== 'NONE'
        ? ` ${RISK_BORDER[vuln.riskLevel]?.badge || ''}`
        : '';

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
              {isAttacker
                ? `🔴 ${displayName}\n(ATTACKER)`
                : isTarget
                  ? `🎯 ${displayName}\n(TARGET)`
                  : `${meta.emoji}${riskBadge} ${displayName}\n(${device.type})`}
            </span>
          ),
        },
        position: pos,
        style: {
          background: nodeBackground,
          color: '#fff',
          borderRadius: '10px',
          border: nodeBorder,
          boxShadow: nodeGlow,
          width: NODE_W,
          height: NODE_H,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center' as const,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
        },
      };
    });

    const deviceIds = new Set(data.devices.map(d => d.id));
    const rfEdges = (data.connections ?? [])
      .filter(c => c.from && c.to && deviceIds.has(c.from) && deviceIds.has(c.to))
      .map((conn, i) => {
        const isAttackEdgeForward = simMode && attackPathEdges.has(`${conn.from}|${conn.to}`);
        const isAttackEdgeBackward = simMode && attackPathEdges.has(`${conn.to}|${conn.from}`);
        const isAttackEdge = isAttackEdgeForward || isAttackEdgeBackward;

        let source = conn.from ?? '';
        let target = conn.to ?? '';

        if (isAttackEdgeBackward) {
          source = conn.to ?? '';
          target = conn.from ?? '';
        }

        if (isAttackEdge) {
          return {
            id: `e-${i}`,
            source,
            target,
            label: conn.interface ?? '',
            labelStyle: { fill: '#ef4444', fontSize: 9, fontWeight: 700 },
            labelBgStyle: { fill: '#1a0000', fillOpacity: 0.9 },
            labelBgPadding: [3, 5] as [number, number],
            labelBgBorderRadius: 4,
            animated: true,
            type: 'smoothstep',
            style: {
              stroke: '#ef4444',
              strokeWidth: 3,
              strokeDasharray: '8 4',
              filter: 'drop-shadow(0 0 6px #ef4444)',
            },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444', width: 14, height: 14 },
          };
        }

        return {
          id: `e-${i}`,
          source: conn.from ?? '',
          target: conn.to ?? '',
          label: conn.interface ?? '',
          labelStyle: { fill: '#94a3b8', fontSize: 9, fontWeight: 600 },
          labelBgStyle: { fill: '#0f172a', fillOpacity: 0.85 },
          labelBgPadding: [3, 5] as [number, number],
          labelBgBorderRadius: 4,
          animated: !simMode, // disable default animation in sim mode to keep red ones prominent
          type: 'smoothstep',
          style: { stroke: simMode ? '#334155' : '#38bdf8', strokeWidth: simMode ? 1.5 : 2, opacity: simMode ? 0.4 : 1 },
          markerEnd: { type: MarkerType.ArrowClosed, color: simMode ? '#334155' : '#38bdf8', width: 12, height: 12 },
        };
      });

    return { nodes: rfNodes, edges: rfEdges };
  }, [data, nodeNames, editingId, editValue, commitEdit, simMode, vulnerabilities, attackPath, attackPathEdges, attackerNodeId, targetNodeId]);

  return (
    <>
      <div className="w-full bg-slate-900 rounded-xl border border-slate-700 overflow-hidden relative"
           style={{ height: '100%' }}>

        {/* Mode badge */}
        <div className="absolute top-2 right-3 z-10 flex items-center gap-2 pointer-events-none">
          {simMode ? (
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-950/80 border border-red-500/40 text-[10px] text-red-400 font-bold backdrop-blur-sm">
              ⚔️ SIMULATE MODE — Right-click node for options
            </span>
          ) : (
            <span className="text-[10px] text-slate-500">
              Click node for actions · Double-click to rename inline
            </span>
          )}
        </div>

        {/* Simulate mode legend */}
        {simMode && (
          <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 pointer-events-none">
            {[
              { color: '#ef4444', label: 'CRITICAL' },
              { color: '#f97316', label: 'HIGH' },
              { color: '#eab308', label: 'MEDIUM' },
              { color: '#22c55e', label: 'LOW' },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: `${color}22`, border: `1px solid ${color}55`, color }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onNodeContextMenu={onNodeContextMenu}
          onPaneClick={() => setContextMenu(null)}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.1}
          maxZoom={2.5}
          nodesFocusable={false}
          elementsSelectable={true}
          selectNodesOnDrag={false}
        >
          <Background color={simMode ? '#3f0a0a' : '#1e3a5f'} gap={28} variant={'dots' as any} />
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

      {/* Right-click context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          simMode={simMode}
          onSetAttacker={(id) => onSetAttacker?.(id)}
          onSetTarget={(id) => onSetTarget?.(id)}
          onClose={() => setContextMenu(null)}
        />
      )}

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
