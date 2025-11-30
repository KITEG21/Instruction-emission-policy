import React from 'react';

export default function QuickExplanation() {
  return (
    <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800 text-xs text-zinc-400 leading-relaxed">
      <strong className="text-zinc-200 block mb-1">💡 Nota:</strong>
      Las instrucciones fluyen de izquierda a derecha. El color amarillo indica actividad reciente.
      Observa cómo las dependencias (bloqueos) afectan el rendimiento total.
    </div>
  );
}