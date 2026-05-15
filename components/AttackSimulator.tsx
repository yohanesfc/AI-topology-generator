'use client';
import React, { useState, useCallback } from 'react';
import {
  Shield, Zap, AlertTriangle, ShieldCheck, Copy, ChevronDown,
  ChevronUp, Activity, Target, Crosshair, Loader2, X
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VulnData {
  riskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  cves: string[];
  openPorts: number[];
  notes: string;
}

export interface AttackStep {
  from: string;
  to: string;
  technique: string;
  cve?: string;
  severity: string;
  description?: string;
}

export interface AttackResult {
  attackPath: string[];
  steps: AttackStep[];
  totalRisk: string;
  attackLog: string;
}

export interface Remediation {
  node: string;
  nodeName: string;
  action: string;
  aclRule: string;
  patchAction?: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export interface RemediationResult {
  remediations: Remediation[];
  topologyChanges?: string;
  summary: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RISK_CONFIG = {
  NONE:     { color: '#64748b', bg: 'bg-slate-700',   text: 'text-slate-400', label: 'NONE',     emoji: '⚪' },
  LOW:      { color: '#22c55e', bg: 'bg-green-900/50', text: 'text-green-400', label: 'LOW',      emoji: '🟢' },
  MEDIUM:   { color: '#eab308', bg: 'bg-yellow-900/50',text: 'text-yellow-400',label: 'MEDIUM',   emoji: '🟡' },
  HIGH:     { color: '#f97316', bg: 'bg-orange-900/50',text: 'text-orange-400',label: 'HIGH',     emoji: '🟠' },
  CRITICAL: { color: '#ef4444', bg: 'bg-red-900/50',   text: 'text-red-400',   label: 'CRITICAL', emoji: '🔴' },
} as const;

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: 'text-red-400',
  HIGH: 'text-orange-400',
  MEDIUM: 'text-yellow-400',
  LOW: 'text-green-400',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: keyof typeof RISK_CONFIG }) {
  const cfg = RISK_CONFIG[level] ?? RISK_CONFIG.NONE;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text} ${level === 'CRITICAL' ? 'risk-badge-critical' : ''}`}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[10px] text-slate-300 hover:text-white transition-colors"
    >
      <Copy size={10} />
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface AttackSimulatorProps {
  topology: any;
  vulnerabilities: Record<string, VulnData>;
  attackerNodeId: string | null;
  targetNodeId: string | null;
  attackResult: AttackResult | null;
  remediationResult: RemediationResult | null;
  isAnalyzing: boolean;
  isSimulating: boolean;
  isRemediating: boolean;
  simError?: string | null;
  onAnalyze: () => void;
  onSimulate: () => void;
  onRemediate: () => void;
  onClearAttack: () => void;
  onSetAttacker: (id: string) => void;
  onSetTarget: (id: string) => void;
}

export default function AttackSimulator({
  topology,
  vulnerabilities,
  attackerNodeId,
  targetNodeId,
  attackResult,
  remediationResult,
  isAnalyzing,
  isSimulating,
  isRemediating,
  simError,
  onAnalyze,
  onSimulate,
  onRemediate,
  onClearAttack,
  onSetAttacker,
  onSetTarget,
}: AttackSimulatorProps) {
  const [showLog, setShowLog] = useState(true);
  const [showRemediation, setShowRemediation] = useState(false);
  const [expandedRemediation, setExpandedRemediation] = useState<string | null>(null);

  const hasTopology = topology?.devices?.length > 0;
  const hasVulns = Object.keys(vulnerabilities).length > 0;
  const canSimulate = hasVulns && attackerNodeId && targetNodeId;
  const hasAttackResult = !!attackResult;
  const hasRemediationResult = !!remediationResult;

  const vulnCounts = Object.values(vulnerabilities).reduce((acc, v) => {
    acc[v.riskLevel] = (acc[v.riskLevel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Resolve names
  const getDeviceName = useCallback((id: string) => {
    return topology?.devices?.find((d: any) => d.id === id)?.name || id;
  }, [topology]);

  return (
    <div className="flex gap-3 h-full overflow-hidden">

      {/* ── LEFT COLUMN: Controls ─────────────────────────────── */}
      <div className="flex flex-col gap-2 w-72 flex-shrink-0 overflow-auto">

        {/* Status bar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-400">
            <Activity size={10} className="text-red-400" /> SIMULATE
          </div>
          {attackerNodeId && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/50 border border-red-500/30 text-[10px] text-red-400">
              <Crosshair size={9} /> <span className="font-mono truncate max-w-[80px]">{getDeviceName(attackerNodeId)}</span>
            </div>
          )}
          {targetNodeId && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-950/50 border border-yellow-500/30 text-[10px] text-yellow-400">
              <Target size={9} /> <span className="font-mono truncate max-w-[80px]">{getDeviceName(targetNodeId)}</span>
            </div>
          )}
          {hasAttackResult && (
            <button onClick={onClearAttack} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] text-slate-400 hover:text-white transition-colors ml-auto">
              <X size={9} /> Clear
            </button>
          )}
        </div>

        {/* Step 1: Analyze */}
        <div className="p-2 bg-slate-800/60 rounded-lg border border-slate-700 space-y-1.5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1"><Shield size={10} className="text-blue-400" /> Step 1 — Vulnerabilities</span>
          </div>
          {hasVulns && (
            <div className="flex gap-1">
              {(['CRITICAL','HIGH','MEDIUM','LOW','NONE'] as const).map(level => (
                <div key={level} className={`flex-1 flex flex-col items-center py-1 rounded ${RISK_CONFIG[level].bg} border border-white/5`}>
                  <span className="text-xs leading-none">{RISK_CONFIG[level].emoji}</span>
                  <span className={`text-[10px] font-bold ${RISK_CONFIG[level].text}`}>{vulnCounts[level] || 0}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={onAnalyze} disabled={!hasTopology || isAnalyzing}
            className="w-full py-1 bg-blue-700 hover:bg-blue-600 disabled:opacity-40 rounded text-[10px] font-bold transition-colors flex items-center justify-center gap-1">
            {isAnalyzing ? <><Loader2 size={10} className="animate-spin" /> Analyzing...</> : <><Shield size={10} /> Analyze Vulnerabilities</>}
          </button>
        </div>

        {/* Step 2: Set Points */}
        {hasVulns && (
          <div className="p-2 bg-slate-800/60 rounded-lg border border-slate-700 space-y-2 flex-shrink-0">
            <span className="text-[10px] font-bold text-slate-300">Step 2 — Set Attack Points:</span>
            <div className="flex gap-2">
              <select
                value={attackerNodeId || ''}
                onChange={e => onSetAttacker(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-600 rounded px-1 py-1 text-[9px] text-red-400 font-semibold focus:outline-none focus:border-red-500 min-w-0"
              >
                <option value="" disabled>🔴 Select Attacker</option>
                {topology?.devices?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select
                value={targetNodeId || ''}
                onChange={e => onSetTarget(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-600 rounded px-1 py-1 text-[9px] text-yellow-400 font-semibold focus:outline-none focus:border-yellow-500 min-w-0"
              >
                <option value="" disabled>🎯 Select Target</option>
                {topology?.devices?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Step 3: Simulate */}
        {hasVulns && (
          <div className="p-2 bg-slate-800/60 rounded-lg border border-slate-700 space-y-1.5 flex-shrink-0">
            <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1"><Zap size={10} className="text-red-400" /> Step 3 — Simulate</span>
            {!canSimulate && <p className="text-[9px] text-slate-500">Set Attacker + Target first.</p>}
            <button onClick={onSimulate} disabled={!canSimulate || isSimulating}
              className="w-full py-1 bg-red-700 hover:bg-red-600 disabled:opacity-40 rounded text-[10px] font-bold transition-colors flex items-center justify-center gap-1">
              {isSimulating ? <><Loader2 size={10} className="animate-spin" /> Simulating...</> : <><Zap size={10} /> ⚔️ Simulate Attack Path</>}
            </button>
            {simError && (
              <div className="p-1.5 bg-red-950/50 border border-red-500/40 rounded text-[9px] text-red-400 font-mono break-all">
                ⚠️ {simError}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Remediate */}
        {hasAttackResult && (
          <div className="p-2 bg-slate-800/60 rounded-lg border border-green-500/20 space-y-1.5 flex-shrink-0">
            <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1"><ShieldCheck size={10} className="text-green-400" /> Step 4 — Remediate</span>
            <button onClick={onRemediate} disabled={isRemediating}
              className="w-full py-1 bg-green-700 hover:bg-green-600 disabled:opacity-40 rounded text-[10px] font-bold transition-colors flex items-center justify-center gap-1">
              {isRemediating ? <><Loader2 size={10} className="animate-spin" /> Generating...</> : <><ShieldCheck size={10} /> 🛡️ Generate Remediation</>}
            </button>
          </div>
        )}

        {/* Empty state */}
        {!hasTopology && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
            <Shield size={24} className="text-slate-700" />
            <p className="text-slate-600 text-[10px]">Generate or load a topology first.</p>
          </div>
        )}
      </div>

      {/* ── RIGHT COLUMN: Results ─────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-auto flex flex-col gap-2">

        {/* Attack Path breadcrumb */}
        {hasAttackResult && (
          <div className="flex-shrink-0 flex items-center gap-1 flex-wrap p-2 bg-red-950/20 border border-red-500/20 rounded-lg">
            <span className="text-[9px] text-slate-500 font-bold mr-1">PATH:</span>
            <RiskBadge level={attackResult!.totalRisk as keyof typeof RISK_CONFIG} />
            <span className="mx-1 text-slate-700">·</span>
            {attackResult!.attackPath.map((id, idx) => (
              <React.Fragment key={id}>
                <span className="px-1.5 py-0.5 bg-red-950/50 border border-red-500/30 rounded text-[9px] font-mono text-red-300">{getDeviceName(id)}</span>
                {idx < attackResult!.attackPath.length - 1 && <span className="text-red-700 text-xs">→</span>}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Attack Steps + Log */}
        {hasAttackResult && (
          <div className="flex-1 overflow-auto space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <Activity size={10} className="text-red-400" />
              <span className="text-[10px] font-bold text-red-400">Attack Log</span>
            </div>
            {attackResult!.steps.map((step, i) => (
              <div key={i} className="flex gap-2 p-1.5 bg-slate-950/80 rounded border border-slate-800">
                <span className="text-[9px] text-slate-600 font-mono flex-shrink-0 w-4">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[9px] font-mono text-slate-300">{getDeviceName(step.from)}</span>
                    <span className="text-red-600 text-[9px]">→</span>
                    <span className="text-[9px] font-mono text-slate-300">{getDeviceName(step.to)}</span>
                    <span className={`text-[8px] font-bold ${SEVERITY_COLOR[step.severity] || 'text-slate-400'}`}>[{step.severity}]</span>
                    {step.cve && <span className="text-[8px] text-slate-600 font-mono">{step.cve}</span>}
                  </div>
                  <p className="text-[9px] text-orange-300 font-semibold">{step.technique}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Remediation results */}
        {hasRemediationResult && (
          <div className="flex-shrink-0 space-y-1.5 border-t border-slate-800 pt-2">
            <p className="text-[9px] text-green-400 font-bold flex items-center gap-1"><ShieldCheck size={9} /> Remediation</p>
            <p className="text-[9px] text-green-300/80 leading-relaxed">{remediationResult!.summary}</p>
            {remediationResult!.remediations.map((r, i) => (
              <div key={i} className="bg-slate-950 rounded border border-slate-800 overflow-hidden">
                <button onClick={() => setExpandedRemediation(expandedRemediation === `${i}` ? null : `${i}`)}
                  className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-slate-900 transition-colors text-left">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={9} className={r.priority === 'CRITICAL' ? 'text-red-400' : r.priority === 'HIGH' ? 'text-orange-400' : 'text-yellow-400'} />
                    <span className="text-[9px] font-mono text-slate-300">{r.nodeName || r.node}</span>
                    <RiskBadge level={r.priority as keyof typeof RISK_CONFIG} />
                  </div>
                  {expandedRemediation === `${i}` ? <ChevronUp size={9} className="text-slate-500" /> : <ChevronDown size={9} className="text-slate-500" />}
                </button>
                {expandedRemediation === `${i}` && (
                  <div className="px-2 pb-2 space-y-1.5">
                    <p className="text-[9px] text-slate-400">{r.action}</p>
                    {r.patchAction && <p className="text-[9px] text-blue-300">🔧 {r.patchAction}</p>}
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-[8px] text-slate-500">📋 ACL Rule</p>
                      <CopyButton text={r.aclRule} />
                    </div>
                    <pre className="text-[9px] text-green-400 font-mono bg-black/50 rounded p-1.5 overflow-auto whitespace-pre-wrap border border-slate-800">{r.aclRule}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Idle state in right column */}
        {!hasAttackResult && hasVulns && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
            <Zap size={22} className="text-slate-700" />
            <p className="text-[10px] text-slate-600">Set attacker + target, then simulate.</p>
          </div>
        )}
        {!hasVulns && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
            <Shield size={22} className="text-slate-700" />
            <p className="text-[10px] text-slate-600">Analyze vulnerabilities first.</p>
          </div>
        )}
      </div>
    </div>
  );
}

