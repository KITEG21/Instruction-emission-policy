import React from 'react';

export default function QuickExplanation() {
  return (
    <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800 text-xs text-zinc-400 leading-relaxed">
      <strong className="text-zinc-200 block mb-1">💡 Nota:</strong>
      <div>
        <div className="text-xs text-zinc-400">Las instrucciones fluyen de izquierda a derecha. El color amarillo indica actividad reciente.</div>
        <div className="text-xs text-zinc-400 mt-2">Usa <strong>Paso</strong> para avanzar un ciclo a la vez. Observa las columnas y la ventana (si está activa).</div>
      </div>
    </div>
  );
}