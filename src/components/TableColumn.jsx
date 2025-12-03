import React from 'react';
import { motion } from 'framer-motion';

// Componente para columnas de tabla estilo imagen
function TableColumn({ title, subtitle, instructions, maxRows, showLatency, showDeps, showWaiting, highlight = [], color = 'blue', rowLabels, allInsts = [], commitPolicy, stallInIssue = false, highlightId = null, onHighlight }) {
  const rows = Array(maxRows).fill(null);

  const getHeaderColor = () => {
    switch (color) {
      case 'blue': return 'border-blue-500/30 text-blue-400';
      case 'yellow': return 'border-yellow-500/30 text-yellow-400';
      case 'green': return 'border-green-500/30 text-green-400';
      default: return 'border-zinc-700 text-zinc-400';
    }
  };

  return (
    <div className={`bg-zinc-900 rounded-xl border ${getHeaderColor()} overflow-hidden flex flex-col h-full`}>
      <div className="bg-zinc-950/50 p-3 text-center border-b border-zinc-800">
        <h3 className="font-black text-sm tracking-widest">{title}</h3>
        {subtitle && <p className="text-zinc-500 text-[10px] mt-1 font-mono uppercase">{subtitle}</p>}
      </div>
      <div className="flex-1 p-2 space-y-2">
        {rows.map((_, idx) => {
          const inst = instructions[idx];
          const isHighlighted = inst && (highlight && highlight.some(h => h.id === inst.id));
          const isExplicitHighlighted = inst && (highlightId && inst.id === highlightId);
          const isWaiting = inst && inst.stage === 'waiting';
          const isLimbo = inst && inst.stage === 'limbo';

          return (
            <div key={idx} className="flex items-center gap-2 w-full">
              {rowLabels && rowLabels[idx] && (
                <div className="w-10 text-[9px] font-bold text-zinc-600 text-right uppercase tracking-tighter leading-none">
                  {rowLabels[idx]}
                </div>
              )}
              <motion.div
                key={inst ? inst.id : `empty-${idx}`}
                className={`relative rounded-lg p-2 min-h-[64px] flex-1 flex items-center justify-center border transition-colors ${inst
                  ? isLimbo
                    ? 'bg-orange-900/10 border-orange-500/20'
                    : isWaiting
                      ? 'bg-orange-900/20 border-orange-500/30'
                      : isExplicitHighlighted
                        ? 'bg-yellow-900/20 border-yellow-400/40 ring-2 ring-yellow-400/20'
                        : isHighlighted
                          ? 'bg-green-900/20 border-green-500/30'
                          : 'bg-zinc-800 border-zinc-700'
                  : 'bg-zinc-950/30 border-zinc-800/50 border-dashed'
                  }`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => inst && onHighlight && onHighlight(inst.id)}
              >
                {inst ? (
                  <div className="text-center w-full">
                    <span className={`font-mono font-bold text-lg ${isLimbo ? 'text-orange-300 italic' : isWaiting ? 'text-orange-400' : 'text-white'}`}>
                      {inst.id}
                    </span>

                    {/* Latencia */}
                    {showLatency && inst.fuRemaining > 0 && inst.stage === 'fu' && (
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <div className="h-1 w-8 bg-zinc-700 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-500" style={{ width: `${(inst.fuRemaining / inst.latency) * 100}%` }}></div>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono">{inst.fuRemaining}c</span>
                      </div>
                    )}

                    {/* Estado Waiting */}
                    {showWaiting && (inst.stage === 'waiting' || inst.stage === 'limbo') && (
                      <div className="text-[10px] text-orange-400 mt-1 font-bold uppercase tracking-tighter">
                        {inst.stage === 'limbo' ? 'En Limbo' : inst.fuRemaining > 0 ? 'Deps Pendientes' : 'Esperando Escritura'}
                      </div>
                    )}

                    {/* Razón de bloqueo */}
                    {inst.blockReason && (
                      <div className="text-[10px] text-zinc-500 mt-1">
                        {inst.blockReason}
                      </div>
                    )}

                    {/* Stall en decode */}
                    {stallInIssue && inst && inst.stage === 'decoded' && (
                      <div className="text-[10px] text-red-400 mt-1">
                        Stall: Issue bloqueado
                      </div>
                    )}

                    {/* Dependencias */}
                    {showDeps && inst.deps.length > 0 && (
                      <div className="text-[10px] text-zinc-500 mt-1 font-mono">
                        Dep: {inst.deps.join(',')}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-zinc-700 text-xl font-mono">·</span>
                )}
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TableColumn;