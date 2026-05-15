'use client';

import React from 'react';
import { Zap, ShieldCheck, Server, Network, Loader2 } from 'lucide-react';

interface PromptInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
}

export default function PromptInput({ input, setInput, onSubmit, isLoading }: PromptInputProps) {
  
  // Shortcut untuk skenario jaringan umum
  const presets = [
    { label: 'Standard Enterprise', icon: <Network size={14} />, prompt: 'Buat topologi enterprise standar dengan 1 Firewall, 2 Core Switch, 4 Distribution Switch, dan 10 PC.' },
    { label: 'DMZ Setup', icon: <ShieldCheck size={14} />, prompt: 'Rancang arsitektur DMZ dengan Web Server, Database Server di zona private, dan Firewall yang memisahkan mereka.' },
    { label: 'Cloud Hybrid', icon: <Server size={14} />, prompt: 'Buat koneksi hybrid cloud antara On-Premise Router ke AWS Virtual Private Gateway lewat VPN.' },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Area Textarea */}
      <div className="relative">
        <textarea
          className="w-full h-44 bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-500 shadow-inner"
          placeholder="Jelaskan kebutuhan jaringan Anda secara detail..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px] rounded-xl flex items-center justify-center">
            <Loader2 className="text-blue-500 animate-spin" size={32} />
          </div>
        )}
      </div>

      {/* Tombol Utama */}
      <button
        onClick={() => onSubmit(input)}
        disabled={isLoading || !input.trim()}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
      >
        {isLoading ? (
          <>Menganalisis Arsitektur...</>
        ) : (
          <>
            <Zap size={18} fill="currentColor" />
            Generate Infrastructure
          </>
        )}
      </button>

      {/* Quick Presets */}
      <div className="space-y-2 mt-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Quick Scenarios</p>
        <div className="flex flex-col gap-2">
          {presets.map((preset, index) => (
            <button
              key={index}
              onClick={() => {
                setInput(preset.prompt);
                onSubmit(preset.prompt);
              }}
              disabled={isLoading}
              className="flex items-center gap-3 p-3 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 rounded-lg text-left text-xs text-slate-400 hover:text-slate-200 transition-colors group"
            >
              <span className="text-slate-500 group-hover:text-blue-400 transition-colors">
                {preset.icon}
              </span>
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Info Limit */}
      <div className="mt-4 p-3 bg-blue-500/5 rounded-lg border border-blue-500/10 text-[11px] text-blue-400/80 leading-relaxed">
        <strong>Tip:</strong> Anda bisa menyebutkan model spesifik (Cisco, Fortigate) atau range IP untuk hasil yang lebih akurat.
      </div>
    </div>
  );
}