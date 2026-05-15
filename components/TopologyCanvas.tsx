'use client';
import dynamic from 'next/dynamic';
import type { VulnData } from './AttackSimulator';

const TopologyCanvasInner = dynamic(
  () => import('./TopologyCanvasInner'),
  { ssr: false, loading: () => (
    <div className="w-full h-full bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-center">
      <span className="text-slate-500 text-sm">Loading canvas...</span>
    </div>
  )}
);

interface TopologyCanvasProps {
  data: any;
  onNodeSelect?: (node: any) => void;
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

export default function TopologyCanvas({
  data,
  onNodeSelect,
  simMode,
  vulnerabilities,
  attackPath,
  attackerNodeId,
  targetNodeId,
  onSetAttacker,
  onSetTarget,
  nodeNames,
  onRenameNode,
}: TopologyCanvasProps) {
  return (
    <TopologyCanvasInner
      data={data}
      onNodeSelect={onNodeSelect}
      simMode={simMode}
      vulnerabilities={vulnerabilities}
      attackPath={attackPath}
      attackerNodeId={attackerNodeId}
      targetNodeId={targetNodeId}
      onSetAttacker={onSetAttacker}
      onSetTarget={onSetTarget}
      nodeNames={nodeNames}
      onRenameNode={onRenameNode}
    />
  );
}
