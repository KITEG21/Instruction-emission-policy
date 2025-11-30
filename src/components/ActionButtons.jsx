import React from 'react';

export default function ActionButtons({ isPlaying, setIsPlaying, runCycle, handleReset, doneInsts, instructions }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className={`col-span-1 py-3 rounded-lg font-bold text-sm transition-all shadow-lg flex flex-col items-center justify-center gap-1 ${isPlaying
          ? 'bg-zinc-800 text-yellow-400 border border-yellow-500/50'
          : 'bg-yellow-500 text-black hover:bg-yellow-400'
          }`}
        disabled={doneInsts.length === instructions.length}
      >
        <span className="text-xl">{isPlaying ? '⏸' : '▶'}</span>
        {isPlaying ? 'Pausar' : 'Iniciar'}
      </button>

      <button
        onClick={runCycle}
        className="col-span-1 py-3 bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold text-sm rounded-lg hover:bg-zinc-700 hover:border-zinc-500 transition-all flex flex-col items-center justify-center gap-1"
        disabled={isPlaying || doneInsts.length === instructions.length}
      >
        <span className="text-xl">⏭</span>
        Paso
      </button>

      <button
        onClick={handleReset}
        className="col-span-1 py-3 bg-zinc-800 text-red-400 border border-zinc-700 font-bold text-sm rounded-lg hover:bg-red-900/20 hover:border-red-500/50 transition-all flex flex-col items-center justify-center gap-1"
      >
        <span className="text-xl">🔄</span>
        Reiniciar
      </button>
    </div>
  );
}