import React from 'react';
import CycleTable from './CycleTable';

export default function Timeline({ instructions, cycle }) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 overflow-hidden">
      <h3 className="text-zinc-400 text-xs font-bold uppercase mb-4 flex items-center gap-2">
        <span>📊</span> Diagrama de Tiempo
      </h3>
      <div className="overflow-x-auto pb-2">
        <CycleTable instructions={instructions} currentCycle={cycle} />
      </div>
    </div>
  );
}