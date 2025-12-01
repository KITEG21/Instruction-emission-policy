import React, { useState } from 'react';

export default function KidWindow({ show, lines = [], details = [], onClose, onHighlight, onDisableKidMode }) {
  const [expanded, setExpanded] = useState(false);
  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 bg-white/5 border border-yellow-500/20 p-4 rounded-xl shadow-lg">
      <div className="flex items-start gap-3">
        <div className="bg-yellow-500 text-black w-10 h-10 rounded-full flex items-center justify-center font-bold">🙂</div>
        <div className="flex-1">
          <div className="font-bold text-yellow-400 mb-1">Explicación sencilla</div>
          <div className="text-sm text-zinc-200 mb-2">
            {lines.slice(0, 4).map((l, idx) => (
              <div key={idx} className="mb-1">{l}</div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="px-3 py-1 bg-zinc-800/60 text-zinc-200 rounded hover:bg-zinc-800/80 text-xs"
            >
              {expanded ? 'Ocultar detalles' : 'Más detalles'}
            </button>
          </div>

          {expanded && (
            <div className="mt-3 rounded-lg bg-zinc-900/40 p-3 border border-zinc-800 text-xs text-zinc-300">
              {details.map((d, idx) => (
                <div key={idx} className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex-1">{d.text}</div>
                  {d.instId && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onHighlight && onHighlight(d.instId)}
                        className="px-2 py-1 bg-yellow-500 text-black rounded text-xs hover:bg-yellow-400"
                      >
                        Resaltar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-200"
          aria-label="Cerrar explicación sencilla"
        >
          ✕
        </button>
        <div className="absolute right-4 bottom-3 text-right">
          <button
            onClick={() => { onDisableKidMode && onDisableKidMode(); onClose && onClose(); }}
            className="text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800/30 px-2 py-1 rounded"
          >
            Cerrar y desactivar modo
          </button>
        </div>
      </div>
    </div>
  );
}
