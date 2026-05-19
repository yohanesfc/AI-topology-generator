'use client';

import { useState, useEffect } from 'react';
import { Share2, CheckCircle, XCircle, Clock, RefreshCw, Shield, Zap, Image as ImageIcon, X } from 'lucide-react';
import TopologyCanvas from '@/components/TopologyCanvas';
import dynamic from 'next/dynamic';
import AttackSimulator from '@/components/AttackSimulator';
import type { VulnData, AttackResult, RemediationResult } from '@/components/AttackSimulator';
const SshTerminal = dynamic(() => import('@/components/SshTerminal'), { ssr: false });

interface Template {
  id: number;
  name: string;
  playbook: string;
  last_task?: { status: string; end: string };
}

interface Task {
  id: number;
  status: string;
  template_id: number;
}

export default function NetworkAutomationPage() {
  const [input, setInput] = useState('');
  const [object, setObject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [runningTasks, setRunningTasks] = useState<Record<number, Task>>({});
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<number>(1);
  const [configs, setConfigs] = useState<any>(null);
  const [isGeneratingConfig, setIsGeneratingConfig] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [protocol, setProtocol] = useState<string>('OSPF');
  const [showConfig, setShowConfig] = useState(false);
  const [activeNode, setActiveNode] = useState<any>(null);
  const [pingOutput, setPingOutput] = useState<string>('');
  const [pingRunning, setPingRunning] = useState(false);
  const [nodeRenameValue, setNodeRenameValue] = useState<string>('');
  const [nodeNames, setNodeNames] = useState<Record<string,string>>({});
  const [sshTarget, setSshTarget] = useState<{ host: string; user: string } | null>(null);
  const [mode, setMode] = useState<string>('Structured');
  const [topologyMode, setTopologyMode] = useState<string>('Structured');
  const [savedTopologies, setSavedTopologies] = useState<any[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('llama-3.3-70b-versatile');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!selectedModel.startsWith('gemini-') && !selectedModel.startsWith('gpt-')) {
         setSelectedModel('gemini-2.5-flash');
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // ── Attack Simulator state ──────────────────────────────────────
  const [appMode, setAppMode] = useState<'design' | 'simulate'>('design');
  const [vulnerabilities, setVulnerabilities] = useState<Record<string, VulnData>>({});
  const [attackerNodeId, setAttackerNodeId] = useState<string | null>(null);
  const [targetNodeId, setTargetNodeId] = useState<string | null>(null);
  const [attackResult, setAttackResult] = useState<AttackResult | null>(null);
  const [remediationResult, setRemediationResult] = useState<RemediationResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isRemediating, setIsRemediating] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/topologies', { headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_SECRET_KEY || '' } })
      .then(r => r.json())
      .then(data => setSavedTopologies(Array.isArray(data) ? data : []))
      .catch(() => {});
    fetch('/api/semaphore')
      .then(r => r.json())
      .then(data => {
        setTemplates(data);
        if (data.length > 0) setSelectedTemplate(data[0].id);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-topology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.NEXT_PUBLIC_API_SECRET_KEY || '' },
        body: JSON.stringify({ prompt: input, mode: topologyMode, modelName: selectedModel, image: uploadedImage }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      setObject(await res.json());
    } catch (err: any) {
      setError(err.message ?? 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!object?.devices?.length) return;
    setDeploying(true);
    setDeployResult(null);
    try {
      const res = await fetch('/api/semaphore/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.NEXT_PUBLIC_API_SECRET_KEY || '' },
        body: JSON.stringify({
          devices: object.devices,
          topologyName: object.topologyName,
          templateId: selectedTemplate,
        }),
      });
      const result = await res.json();
      setDeployResult(result);
    } catch (err: any) {
      setDeployResult({ error: err.message });
    } finally {
      setDeploying(false);
    }
  };

  const handleNodeSelect = (node: any) => {
    setActiveNode(node);
    setPingOutput('');
    setNodeRenameValue(nodeNames[node.id] ?? node.data?.rawName ?? node.id);
  };

  const handlePing = async (host: string) => {
    setPingRunning(true);
    setPingOutput('Pinging ' + host + '...');
    try {
      const res = await fetch('/api/network-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'ping', host }),
      });
      const data = await res.json();
      setPingOutput(data.output || data.error || 'No output');
    } catch {
      setPingOutput('Failed');
    } finally {
      setPingRunning(false);
    }
  };

  const handleSaveTopology = async () => {
    if (!object?.devices?.length) return;
    const payload = { ...object, savedAt: new Date().toISOString(), id: object.id || Date.now() };
    await fetch('/api/topologies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.NEXT_PUBLIC_API_SECRET_KEY || '' },
      body: JSON.stringify(payload),
    });
    setObject(payload);
    const res = await fetch('/api/topologies', { headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_SECRET_KEY || '' } });
    setSavedTopologies(await res.json());
  };

  const handleLoadTopology = (topo: any) => {
    setObject(topo);
    setShowSaved(false);
    setConfigs(null);
    setShowConfig(false);
  };

  const handleDeleteTopology = async (id: number) => {
    await fetch('/api/topologies', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.NEXT_PUBLIC_API_SECRET_KEY || '' },
      body: JSON.stringify({ id }),
    });
    setSavedTopologies(prev => prev.filter(t => t.id !== id));
  };

  const handleGenerateConfig = async () => {
    if (!object?.devices?.length) return;
    setIsGeneratingConfig(true);
    setConfigError(null);
    try {
      const res = await fetch('/api/generate-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.NEXT_PUBLIC_API_SECRET_KEY || '' },
        body: JSON.stringify({ topology: object, protocol, mode, modelName: selectedModel }),
      });
      if (!res.ok) throw new Error(`Config error: ${res.status}`);
      const data = await res.json();
      setConfigs(data);
      if (data.configs?.length > 0) setSelectedDevice(data.configs[0].deviceId);
      setShowConfig(true);
    } catch (err: any) {
      setConfigError(err.message ?? 'Failed to generate config');
    } finally {
      setIsGeneratingConfig(false);
    }
  };

  const runJob = async (templateId: number) => {
    setRunningTasks(prev => ({ ...prev, [templateId]: { id: 0, status: 'running', template_id: templateId } }));
    try {
      const res = await fetch('/api/semaphore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.NEXT_PUBLIC_API_SECRET_KEY || '' },
        body: JSON.stringify({ template_id: templateId }),
      });
      const task = await res.json();
      setRunningTasks(prev => ({ ...prev, [templateId]: task }));
      const poll = setInterval(async () => {
        const r = await fetch(`/api/semaphore/task?id=${task.id}`).catch(() => null);
        if (!r) return;
        const t = await r.json();
        setRunningTasks(prev => ({ ...prev, [templateId]: t }));
        if (['success', 'error', 'failed'].includes(t.status)) clearInterval(poll);
      }, 3000);
    } catch {
      setRunningTasks(prev => ({ ...prev, [templateId]: { id: 0, status: 'error', template_id: templateId } }));
    }
  };

  const statusIcon = (status?: string) => {
    if (status === 'success') return <CheckCircle size={12} className="text-green-400 flex-shrink-0" />;
    if (status === 'error' || status === 'failed') return <XCircle size={12} className="text-red-400 flex-shrink-0" />;
    if (status === 'running') return <RefreshCw size={12} className="text-blue-400 animate-spin flex-shrink-0" />;
    return <Clock size={12} className="text-slate-500 flex-shrink-0" />;
  };

  // ── Attack Simulator handlers ────────────────────────────────────
  const handleAnalyze = async () => {
    if (!object?.devices?.length) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/analyze-attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.NEXT_PUBLIC_API_SECRET_KEY || '' },
        body: JSON.stringify({ topology: object, modelName: selectedModel }),
      });
      const data = await res.json();
      setVulnerabilities(data.vulnerabilities || {});
    } catch (e: any) {
      console.error('analyze-attack error', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSimulate = async () => {
    if (!object || !attackerNodeId || !targetNodeId) return;
    setIsSimulating(true);
    setAttackResult(null);
    setSimError(null);
    try {
      const res = await fetch('/api/simulate-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.NEXT_PUBLIC_API_SECRET_KEY || '' },
        body: JSON.stringify({ topology: object, attackerNodeId, targetNodeId, vulnerabilities, modelName: selectedModel }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAttackResult(data);
    } catch (e: any) {
      console.error('simulate-path error', e);
      setSimError(e.message ?? 'Simulation failed');
    } finally {
      setIsSimulating(false);
    }
  };


  const handleRemediate = async () => {
    if (!attackResult) return;
    setIsRemediating(true);
    try {
      const res = await fetch('/api/remediate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.NEXT_PUBLIC_API_SECRET_KEY || '' },
        body: JSON.stringify({ attackPath: attackResult.attackPath, steps: attackResult.steps, topology: object, vulnerabilities, modelName: selectedModel }),
      });
      const data = await res.json();
      setRemediationResult(data);
    } catch (e: any) {
      console.error('remediate error', e);
    } finally {
      setIsRemediating(false);
    }
  };

  const handleClearAttack = () => {
    setAttackResult(null);
    setRemediationResult(null);
    setAttackerNodeId(null);
    setTargetNodeId(null);
  };

  return (
    <div className="p-4 bg-slate-950 min-h-screen text-slate-200">
      <div className="w-full">
        <header className="mb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Share2 className="text-blue-500" /> Network Automation
            </h1>
            <p className="text-slate-400">Generative AI for Network Architecture (Max 20 Devices)</p>
          </div>

          {/* Top Header Options */}
          <div className="flex items-center gap-3">
            {/* Model Dropdown */}
            <select
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
            >
              <optgroup label="Groq">
                <option value="llama-3.3-70b-versatile">Llama 3.3 70B</option>
                <option value="deepseek-r1-distill-llama-70b">DeepSeek R1 Distill</option>
              </optgroup>
              <optgroup label="Google">
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              </optgroup>
              <optgroup label="OpenAI">
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-4o">GPT-4o</option>
              </optgroup>
              <optgroup label="DeepSeek">
                <option value="deepseek-chat">DeepSeek V3</option>
                <option value="deepseek-reasoner">DeepSeek R1</option>
              </optgroup>
            </select>

            {/* Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-700 rounded-xl">
              <button
                onClick={() => setAppMode('design')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  appMode === 'design'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Share2 size={14} /> Design
              </button>
              <button
                onClick={() => setAppMode('simulate')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  appMode === 'simulate'
                    ? 'bg-red-700 text-white shadow-lg shadow-red-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap size={14} /> Simulate
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-visible" style={{ minHeight: 'calc(100vh - 120px)' }}>

          {/* Left Panel */}
          <div className="lg:col-span-1 flex flex-col gap-3 min-h-0">

            <textarea
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 resize-none focus:outline-none focus:border-blue-500 flex-1 min-h-[120px]"
              placeholder="Contoh: Buat topologi kantor dengan 1 firewall, 2 router, 4 switch, 10 PC..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSubmit(); }}
            />

            {appMode !== 'simulate' && (
            <div className="flex gap-1 flex-shrink-0 items-center">
              <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                <ImageIcon size={14} />
                <span className="text-[11px] font-semibold">Image</span>
                <input type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={handleImageUpload} />
              </label>
              <div className="flex-1 flex gap-1">
                {['Structured', 'Chain of Thought'].map(m => (
                  <button key={m} onClick={() => setTopologyMode(m)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${topologyMode === m ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                    {m === 'Structured' ? '📐 Structured' : '🧠 Chain of Thought'}
                  </button>
                ))}
              </div>
            </div>
            )}
            
            {uploadedImage && (
              <div className="relative w-full h-32 rounded-lg border border-slate-700 overflow-hidden flex-shrink-0">
                <img src={uploadedImage} alt="Uploaded topology" className="w-full h-full object-cover" />
                <button onClick={() => setUploadedImage(null)} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full hover:bg-red-500/80 transition-colors text-white">
                  <X size={14} />
                </button>
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors flex-shrink-0"
            >
              {isLoading ? '⏳ Generating...' : '⚡ Generate Topology'}
            </button>

            {error && (
              <div className="p-3 bg-red-900/30 border border-red-500/40 rounded-lg text-red-400 text-xs flex-shrink-0">
                {error}
              </div>
            )}

            {appMode === 'design' && object?.topologyName && (
              <div className="p-3 bg-slate-900 rounded-lg border border-blue-500/30 flex-shrink-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-blue-400 text-xs font-bold uppercase tracking-wider">Current Project</h3>
                  {object.mode && <span className="text-[10px] text-slate-500">{object.mode === 'Chain of Thought' ? '🧠 CoT' : '📐 Structured'}</span>}
                </div>
                <p className="text-white font-semibold">{object.topologyName}</p>
                <div className="mt-1 text-[10px] text-slate-500">
                  {object.devices?.length || 0} Devices · {object.connections?.length || 0} Links
                </div>
                <div className="flex gap-1 mt-2">
                  <button onClick={handleSaveTopology}
                    className="flex-1 py-1 bg-blue-700 hover:bg-blue-600 rounded text-[10px] font-semibold text-white transition-colors">
                    💾 Save
                  </button>
                  <button onClick={() => setShowSaved(!showSaved)}
                    className="flex-1 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[10px] font-semibold text-slate-200 transition-colors">
                    📂 Load ({savedTopologies.length})
                  </button>
                </div>
                {showSaved && savedTopologies.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {savedTopologies.map(t => (
                      <div key={t.id} className="flex items-center gap-1 p-1.5 bg-slate-800 rounded border border-slate-700">
                        <button onClick={() => handleLoadTopology(t)}
                          className="flex-1 text-left text-[10px] text-slate-300 hover:text-white truncate">
                          📋 {t.topologyName}
                        </button>
                        <span className="text-[9px] text-slate-600 flex-shrink-0">{t.devices?.length}d</span>
                        <button onClick={() => handleDeleteTopology(t.id)}
                          className="text-red-500 hover:text-red-400 text-[10px] flex-shrink-0 ml-1">✕</button>
                      </div>
                    ))}
                  </div>
                )}
                {object.reasoning && (
                  <details className="mt-2">
                    <summary className="text-[10px] text-yellow-400 cursor-pointer hover:text-yellow-300">🧠 View Reasoning</summary>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{object.reasoning}</p>
                  </details>
                )}
              </div>
            )}

            {/* Simulate Mode left panel intentionally empty or hidden. Config & Deploy are hidden. */}

            {/* Generate Config Button — Design mode only */}
            {appMode === 'design' && object?.devices?.length > 0 && (
              <div className="p-3 bg-slate-900 rounded-lg border border-purple-500/30 flex-shrink-0 space-y-2">
                <h3 className="text-purple-400 text-xs font-bold uppercase tracking-wider">⚙️ Generate Config</h3>
                <select
                  className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  value={protocol}
                  onChange={e => setProtocol(e.target.value)}
                >
                  <option value="OSPF">OSPF</option>
                  <option value="BGP">BGP</option>
                  <option value="EIGRP">EIGRP</option>
                  <option value="Static Routing">Static Routing</option>
                  <option value="VLAN">VLAN + Trunking</option>
                  <option value="MPLS">MPLS</option>
                  <option value="SR-TE">SR-TE (Segment Routing)</option>
                  <option value="VXLAN">VXLAN</option>
                </select>
                <button
                  onClick={handleGenerateConfig}
                  disabled={isGeneratingConfig}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg text-xs font-semibold transition-colors"
                >
                  {isGeneratingConfig ? '⏳ Generating...' : '⚙️ Generate Config'}
                </button>
                {configError && <div className="text-red-400 text-[10px]">{configError}</div>}
              </div>
            )}

            {/* Deploy Panel — Design mode only */}
            {appMode === 'design' && object?.devices?.length > 0 && (
              <div className="p-3 bg-slate-900 rounded-lg border border-green-500/30 flex-shrink-0 space-y-2">
                <h3 className="text-green-400 text-xs font-bold uppercase tracking-wider">
                  🚀 Deploy to Ansible
                </h3>
                <select
                  className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-green-500"
                  value={selectedTemplate}
                  onChange={e => setSelectedTemplate(Number(e.target.value))}
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleDeploy}
                  disabled={deploying}
                  className="w-full py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg text-xs font-semibold transition-colors"
                >
                  {deploying ? '⏳ Deploying...' : '🚀 Deploy Topology'}
                </button>
                {deployResult && (
                  <div className={`p-2 rounded text-[10px] font-mono ${deployResult.error ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
                    {deployResult.error
                      ? `Error: ${deployResult.error}`
                      : `✅ Task #${deployResult.task?.id} · ${deployResult.inventory_name}`
                    }
                  </div>
                )}
              </div>
            )}

{/* Ansible Jobs hidden */}

          </div>

          {/* Canvas — col-span-3, full height in simulate, with bottom panel in design */}
          <div className="lg:col-span-3 flex flex-col gap-2" style={{ height: 'calc(100vh - 140px)' }}>

            {/* Canvas — fills all remaining space */}
            <div className="flex-1 min-h-0">
              <TopologyCanvas
                data={object}
                onNodeSelect={handleNodeSelect}
                simMode={appMode === 'simulate'}
                vulnerabilities={vulnerabilities}
                attackPath={attackResult?.attackPath ?? []}
                attackerNodeId={attackerNodeId}
                targetNodeId={targetNodeId}
                onSetAttacker={setAttackerNodeId}
                onSetTarget={setTargetNodeId}
                nodeNames={nodeNames}
                onRenameNode={(id, name) => setNodeNames(prev => ({ ...prev, [id]: name }))}
              />
            </div>

            {/* Bottom Panel — Action (design) or Simulator (simulate) */}
            <div className="flex-shrink-0" style={{ height: appMode === 'simulate' ? '320px' : '220px' }}>
              {appMode === 'simulate' ? (
                /* ── Attack Simulator Panel ── */
                <div className="h-full bg-slate-900 rounded-xl border border-red-500/20 p-3 overflow-auto">
                  <AttackSimulator
                    topology={object}
                    vulnerabilities={vulnerabilities}
                    attackerNodeId={attackerNodeId}
                    targetNodeId={targetNodeId}
                    attackResult={attackResult}
                    remediationResult={remediationResult}
                    isAnalyzing={isAnalyzing}
                    isSimulating={isSimulating}
                    isRemediating={isRemediating}
                    simError={simError}
                    onAnalyze={handleAnalyze}
                    onSimulate={handleSimulate}
                    onRemediate={handleRemediate}
                    onClearAttack={handleClearAttack}
                    onSetAttacker={setAttackerNodeId}
                    onSetTarget={setTargetNodeId}
                  />
                </div>
              ) : (
                /* ── Compact Node Action Panel (Design Mode) ── */
                <div className="h-full bg-slate-900 rounded-xl border border-slate-700 p-2.5 flex flex-col gap-1.5 overflow-auto">
                  {activeNode ? (
                    <>
                      <div className="flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-white font-bold text-xs truncate">{nodeNames[activeNode.id] ?? activeNode.data?.rawName ?? activeNode.id}</span>
                          <span className="text-slate-500 text-[10px] flex-shrink-0">{activeNode.data?.ipAddress ?? 'No IP'}</span>
                        </div>
                        <button onClick={() => { setActiveNode(null); setPingOutput(''); }}
                          className="text-slate-500 hover:text-white text-xs flex-shrink-0 ml-2">✕</button>
                      </div>
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <div className="flex gap-1.5">
                          <input
                            value={nodeRenameValue}
                            onChange={e => setNodeRenameValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && nodeRenameValue.trim()) { setNodeNames(prev => ({ ...prev, [activeNode.id]: nodeRenameValue.trim() })); }}}
                            placeholder="Rename node..."
                            className="flex-1 px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-[11px] text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                          <button onClick={() => nodeRenameValue.trim() && setNodeNames(prev => ({ ...prev, [activeNode.id]: nodeRenameValue.trim() }))}
                            title="Rename" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-[11px] text-white transition-colors">✏️</button>
                          <button onClick={() => activeNode.data?.ipAddress && handlePing(activeNode.data.ipAddress)}
                            disabled={pingRunning} title="Ping"
                            className="px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-40 rounded text-[11px] text-white font-bold transition-colors flex items-center gap-1.5">
                            {pingRunning ? '⏳ Ping...' : '🏓 Ping'}
                          </button>
                        </div>
                        <button onClick={() => activeNode.data?.ipAddress && setSshTarget({ host: activeNode.data.ipAddress, user: 'admin' })}
                          disabled={!activeNode.data?.ipAddress} title="SSH Terminal"
                          className="w-full py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 rounded text-[11px] text-white font-bold transition-colors flex items-center justify-center gap-1.5">
                          🔐 SSH Terminal
                        </button>
                      </div>
                      {pingOutput && (
                        <pre className="flex-1 bg-slate-950 rounded p-1.5 text-[10px] text-green-400 font-mono overflow-auto whitespace-pre-wrap max-h-24 border border-slate-800">{pingOutput}</pre>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-600 text-xs">Click a node to see actions</div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      {/* Config Modal */}
      {showConfig && configs?.configs?.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfig(false)} />
          <div className="relative z-10 bg-slate-900 border border-purple-500/40 rounded-2xl shadow-2xl w-[800px] max-w-[95vw] max-h-[80vh] flex flex-col p-5 gap-3">
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <h3 className="text-purple-400 text-sm font-bold">⚙️ Device Configurations · {protocol}</h3>
              </div>
              <button onClick={() => setShowConfig(false)} className="text-slate-500 hover:text-white text-sm transition-colors">✕ Close</button>
            </div>
            {/* Device tabs */}
            <div className="flex gap-1.5 flex-wrap flex-shrink-0">
              {configs.configs.map((c: any) => (
                <button key={c.deviceId} onClick={() => setSelectedDevice(c.deviceId)}
                  className={`px-3 py-1 rounded text-xs font-mono transition-colors ${selectedDevice === c.deviceId ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                  {c.deviceId}
                </button>
              ))}
            </div>
            {/* Config content */}
            {configs.configs.filter((c: any) => c.deviceId === selectedDevice).map((c: any) => (
              <div key={c.deviceId} className="flex flex-col flex-1 min-h-0 gap-2">
                <div className="flex items-center justify-between flex-shrink-0">
                  <span className="text-xs text-slate-500">{c.deviceName} · {c.type}</span>
                  <button onClick={() => navigator.clipboard.writeText(c.config)}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300 hover:text-white transition-colors">
                    📋 Copy Config
                  </button>
                </div>
                {c.reasoning && (
                  <details className="flex-shrink-0">
                    <summary className="text-xs text-yellow-400 cursor-pointer hover:text-yellow-300">🧠 Chain of Thought Reasoning</summary>
                    <pre className="bg-slate-950 rounded p-3 text-xs text-yellow-300/70 font-mono overflow-auto max-h-32 whitespace-pre-wrap mt-1">{c.reasoning}</pre>
                  </details>
                )}
                <pre className="flex-1 bg-slate-950 rounded-xl p-4 text-xs text-green-400 font-mono overflow-auto whitespace-pre-wrap border border-slate-800">{c.config}</pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {sshTarget && (
        <SshTerminal
          host={sshTarget.host}
          user={sshTarget.user}
          onClose={() => setSshTarget(null)}
        />
      )}
    </div>
  );
}
