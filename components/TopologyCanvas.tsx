'use client';
import dynamic from 'next/dynamic';
const TopologyCanvasInner = dynamic(
  () => import('./TopologyCanvasInner'),
  { ssr: false, loading: () => (
    <div className="w-full h-full bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-center">
      <span className="text-slate-500 text-sm">Loading canvas...</span>
    </div>
  )}
);
export default function TopologyCanvas({ data, onNodeSelect }: { data: any; onNodeSelect?: (node: any) => void }) {
  return <TopologyCanvasInner data={data} onNodeSelect={onNodeSelect} />;
}
