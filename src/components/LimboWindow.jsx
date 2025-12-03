import React from 'react';

export default function LimboWindow({ limboInsts = [], cycle, onHighlight }) {
  if (!limboInsts || limboInsts.length === 0) return null;

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
      <h3 className="text-zinc-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
        <span>🕳️</span> Limbo
      </h3>
      <div className="space-y-2">
        {limboInsts.map(inst => (
          <div key={inst.id} className="bg-zinc-800 p-2 rounded border border-zinc-700 flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-white">{inst.id}</div>
              <div className="text-[10px] text-zinc-400">{inst.blockReason || 'En espera'}</div>
              <div className="text-[10px] text-zinc-400 mt-1">Tiempo en limbo: {inst.limboCycles ?? 0}c</div>
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => onHighlight && onHighlight(inst.id)}
                className="text-xs bg-yellow-500 text-black px-2 py-1 rounded"
              >
                Resaltar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
