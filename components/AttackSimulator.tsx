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

// ─── Named Component: Controls ────────────────────────────────────────────────

interface AttackSimulatorControlsProps {
  topology: any;
  vulnerabilities: Record<string, VulnData>;
  attackerNodeId: string | null;
  targetNodeId: string | null;
  attackResult: AttackResult | null;
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

export function AttackSimulatorControls({
  topology,
  vulnerabilities,
  attackerNodeId,
  targetNodeId,
  attackResult,
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
}: AttackSimulatorControlsProps) {
  const hasTopology = topology?.devices?.length > 0;
  const hasVulns = Object.keys(vulnerabilities).length > 0;
  const canSimulate = hasVulns && attackerNodeId && targetNodeId;
  const hasAttackResult = !!attackResult;

  const vulnCounts = Object.values(vulnerabilities).reduce((acc, v) => {
    acc[v.riskLevel] = (acc[v.riskLevel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getDeviceName = useCallback((id: string) => {
    return topology?.devices?.find((d: any) => d.id === id)?.name || id;
  }, [topology]);

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto pr-1">
      {/* Status Bar */}
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
          <button onClick={onClearAttack} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] text-slate-400 hover:text-white transition-colors ml-auto cursor-pointer">
            <X size={9} /> Clear
          </button>
        )}
      </div>

      {/* Step 1: Analyze */}
      <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/60 space-y-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1.5"><Shield size={11} className="text-blue-400" /> Step 1 — Vulnerabilities</span>
        </div>
        {hasVulns && (
          <div className="grid grid-cols-5 gap-1.5">
            {(['CRITICAL','HIGH','MEDIUM','LOW','NONE'] as const).map(level => (
              <div key={level} className="flex flex-col items-center gap-1.5 py-2 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RISK_CONFIG[level].color }} />
                <span className="text-xs font-bold text-slate-200">{vulnCounts[level] || 0}</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={onAnalyze} disabled={!hasTopology || isAnalyzing}
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow">
          {isAnalyzing ? <><Loader2 size={11} className="animate-spin" /> Analyzing...</> : <><Shield size={11} /> Analyze Vulnerabilities</>}
        </button>
      </div>

      {/* Step 2: Set Points */}
      {hasVulns && (
        <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/60 space-y-2 flex-shrink-0">
          <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1.5"><Target size={11} className="text-yellow-400" /> Step 2 — Set Attack Points</span>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={attackerNodeId || ''}
              onChange={e => onSetAttacker(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-[10px] text-red-400 font-semibold focus:outline-none focus:border-red-500"
            >
              <option value="" disabled>🔴 Attacker Node</option>
              {topology?.devices?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select
              value={targetNodeId || ''}
              onChange={e => onSetTarget(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-[10px] text-yellow-400 font-semibold focus:outline-none focus:border-yellow-500"
            >
              <option value="" disabled>🎯 Target Node</option>
              {topology?.devices?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Step 3: Simulate */}
      {hasVulns && (
        <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/60 space-y-2 flex-shrink-0">
          <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1.5"><Zap size={11} className="text-red-400" /> Step 3 — Simulate</span>
          {!canSimulate && <p className="text-[9px] text-slate-500">Select Attacker + Target first.</p>}
          <button onClick={onSimulate} disabled={!canSimulate || isSimulating}
            className="w-full py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow shadow-red-950/40">
            {isSimulating ? <><Loader2 size={11} className="animate-spin" /> Simulating...</> : <><Zap size={11} /> Simulate Attack Path</>}
          </button>
          {simError && (
            <div className="p-2 bg-red-950/50 border border-red-500/40 rounded-lg text-[9px] text-red-400 font-mono break-all leading-normal">
              ⚠️ {simError}
            </div>
          )}
        </div>
      )}

      {/* Step 4: Remediate */}
      {hasAttackResult && (
        <div className="p-3 bg-slate-800/40 rounded-xl border border-green-500/20 space-y-2 flex-shrink-0">
          <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1.5"><ShieldCheck size={11} className="text-green-400" /> Step 4 — Remediate</span>
          <button onClick={onRemediate} disabled={isRemediating}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow shadow-emerald-950/40">
            {isRemediating ? <><Loader2 size={11} className="animate-spin" /> Generating...</> : <><ShieldCheck size={11} /> Generate Remediation</>}
          </button>
        </div>
      )}

      {/* Empty State */}
      {!hasTopology && (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-8">
          <Shield size={24} className="text-slate-700" />
          <p className="text-slate-500 text-[10px]">No topology active.</p>
        </div>
      )}
    </div>
  );
}

// ─── Named Component: Results ─────────────────────────────────────────────────

interface AttackSimulatorResultsProps {
  topology: any;
  vulnerabilities: Record<string, VulnData>;
  attackResult: AttackResult | null;
  remediationResult: RemediationResult | null;
  isAnalyzing: boolean;
  isSimulating: boolean;
  isRemediating: boolean;
}

export function AttackSimulatorResults({
  topology,
  vulnerabilities,
  attackResult,
  remediationResult,
  isAnalyzing,
  isSimulating,
  isRemediating,
}: AttackSimulatorResultsProps) {
  const [expandedRemediation, setExpandedRemediation] = useState<string | null>(null);

  const hasVulns = Object.keys(vulnerabilities).length > 0;
  const hasAttackResult = !!attackResult;
  const hasRemediationResult = !!remediationResult;

  const getDeviceName = useCallback((id: string) => {
    return topology?.devices?.find((d: any) => d.id === id)?.name || id;
  }, [topology]);

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1">
      {hasAttackResult ? (
        <>
          {/* Attack Path Breadcrumb */}
          <div className="flex-shrink-0 flex items-center gap-1.5 flex-wrap p-2.5 bg-red-950/20 border border-red-500/20 rounded-xl">
            <span className="text-[10px] text-slate-500 font-bold mr-1 tracking-wider">ATTACK PATH:</span>
            <RiskBadge level={attackResult.totalRisk as keyof typeof RISK_CONFIG} />
            <span className="mx-1.5 text-slate-750">·</span>
            {attackResult.attackPath.map((id, idx) => (
              <React.Fragment key={id}>
                <span className="px-2 py-0.5 bg-red-950/50 border border-red-500/30 rounded text-[10px] font-mono text-red-300 font-semibold">{getDeviceName(id)}</span>
                {idx < attackResult.attackPath.length - 1 && <span className="text-red-700 text-xs mx-0.5">→</span>}
              </React.Fragment>
            ))}
          </div>

          {/* Attack Narrative Log */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity size={12} className="text-red-400" />
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Attack Narrative Log</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {attackResult.steps.map((step, i) => (
                <div key={i} className="flex gap-2.5 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 leading-normal">
                  <span className="text-[10px] text-slate-600 font-mono flex-shrink-0 w-4">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono text-slate-200 font-bold">{getDeviceName(step.from)}</span>
                      <span className="text-red-500 text-[10px]">→</span>
                      <span className="text-[10px] font-mono text-slate-200 font-bold">{getDeviceName(step.to)}</span>
                      <span className={`text-[9px] font-bold ${SEVERITY_COLOR[step.severity] || 'text-slate-400'}`}>[{step.severity}]</span>
                      {step.cve && <span className="text-[9px] text-slate-500 font-mono font-semibold">{step.cve}</span>}
                    </div>
                    <p className="text-[11px] text-orange-300/90 font-bold mt-0.5">{step.technique}</p>
                    {step.description && <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{step.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-8">
          {isSimulating ? (
            <>
              <Loader2 className="animate-spin text-red-500/80" size={24} />
              <p className="text-[10px] text-slate-500 animate-pulse">Running penetration graph calculations...</p>
            </>
          ) : hasVulns ? (
            <>
              <Zap size={22} className="text-slate-700" />
              <p className="text-[10px] text-slate-500">Set attacker + target, then click "Simulate Attack Path".</p>
            </>
          ) : (
            <>
              <Shield size={22} className="text-slate-700" />
              <p className="text-[10px] text-slate-500">Run "Analyze Vulnerabilities" first.</p>
            </>
          )}
        </div>
      )}

      {/* Remediation Panel */}
      {hasRemediationResult && (
        <div className="space-y-2 border-t border-slate-800/60 pt-3">
          <p className="text-[10px] text-green-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><ShieldCheck size={12} /> Remediation Mitigation Plan</p>
          <p className="text-[11px] text-slate-300 leading-relaxed bg-green-950/10 border border-green-500/10 rounded-lg p-2.5 font-medium">{remediationResult.summary}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {remediationResult.remediations.map((r, i) => (
              <div key={i} className="bg-slate-950/60 rounded-xl border border-slate-800/80 overflow-hidden">
                <button onClick={() => setExpandedRemediation(expandedRemediation === `${i}` ? null : `${i}`)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-900/50 transition-colors text-left cursor-pointer">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle size={10} className={r.priority === 'CRITICAL' ? 'text-red-400 flex-shrink-0' : r.priority === 'HIGH' ? 'text-orange-400 flex-shrink-0' : 'text-yellow-400 flex-shrink-0'} />
                    <span className="text-[10px] font-mono text-slate-200 font-bold truncate">{r.nodeName || r.node}</span>
                    <RiskBadge level={r.priority as keyof typeof RISK_CONFIG} />
                  </div>
                  {expandedRemediation === `${i}` ? <ChevronUp size={10} className="text-slate-500" /> : <ChevronDown size={10} className="text-slate-500" />}
                </button>
                {expandedRemediation === `${i}` && (
                  <div className="px-3 pb-3 pt-1 space-y-2 border-t border-slate-900">
                    <p className="text-[10px] text-slate-300 leading-relaxed">{r.action}</p>
                    {r.patchAction && <p className="text-[9px] text-cyan-400 font-semibold bg-cyan-950/20 border border-cyan-500/10 rounded px-2 py-1">🔧 Patch: {r.patchAction}</p>}
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">📋 Device Configuration Patch</p>
                      <CopyButton text={r.aclRule} />
                    </div>
                    <pre className="text-[9px] text-green-400 font-mono bg-black/60 rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap border border-slate-800 max-h-40">{r.aclRule}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isRemediating && (
        <div className="flex flex-col items-center justify-center text-center gap-2 py-6 border-t border-slate-800/60 pt-3">
          <Loader2 className="animate-spin text-green-500/80" size={24} />
          <p className="text-[10px] text-slate-500 animate-pulse">Generating configuration patch files...</p>
        </div>
      )}
    </div>
  );
}
