import React from 'react';

export default function ConfigurationPanel({
  showConfigPanel,
  setShowConfigPanel,
  policy,
  setPolicy,
  isPlaying,
  setShowEditor,
  speed,
  setSpeed,
  cycle,
  getCurrentCycleInfo,
  issuePolicy,
  commitPolicy
}) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-yellow-500/20 p-6 shadow-lg">
      <h2 className="text-xl font-bold text-yellow-400 mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span>⚙️</span> Configuración
        </span>
        <button
          onClick={() => setShowConfigPanel(!showConfigPanel)}
          className="text-yellow-400 hover:text-yellow-300 transition-colors text-lg"
          title={showConfigPanel ? "Ocultar configuración" : "Mostrar configuración"}
        >
          {showConfigPanel ? '▲' : '▼'}
        </button>
      </h2>

      {showConfigPanel ? (
        <>
          {/* Selección de Política */}
          <div className="mb-6">
            <label className="block text-zinc-300 text-sm font-bold mb-3 uppercase tracking-wider">
              Política de Pipeline
            </label>
            <div className="space-y-3">
              {[
                { id: 'in-in', label: 'Emisión en orden / Finalización en orden', icon: '', desc: 'Estricto y secuencial. Lento ante latencias altas.' },
                { id: 'in-out', label: 'Emisión en orden / Finalización desordenada', icon: '', desc: 'Emisión ordenada, pero termina cuando puede.' },
                { id: 'out-out', label: 'Emisión desordenada / Finalización desordenada', icon: '', desc: 'Máximo paralelismo y eficiencia.' }
              ].map((p) => (
                <label
                  key={p.id}
                  className={`block relative p-4 rounded-lg cursor-pointer transition-all duration-200 border ${policy === p.id
                    ? 'bg-yellow-500/10 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.1)]'
                    : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-500'
                    }`}
                >
                  <input
                    type="radio"
                    name="policy"
                    value={p.id}
                    checked={policy === p.id}
                    onChange={(e) => setPolicy(e.target.value)}
                    disabled={isPlaying}
                    className="absolute opacity-0 w-0 h-0"
                  />
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{p.icon}</span>
                    <div>
                      <div className={`font-bold text-sm ${policy === p.id ? 'text-yellow-400' : 'text-zinc-300'}`}>
                        {p.label}
                      </div>
                      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                        {p.desc}
                      </p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-5 border-t border-zinc-800 pt-5">
            <button
              onClick={() => setShowEditor(true)}
              className="w-full py-3 bg-zinc-800 text-yellow-400 border border-yellow-500/30 font-bold text-sm rounded-lg hover:bg-zinc-700 hover:border-yellow-500 transition-all flex items-center justify-center gap-2"
              disabled={isPlaying}
            >
              <span>🛠️</span> Configurar Programa
            </button>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-zinc-400 text-xs font-bold uppercase">Velocidad de Simulación</label>
                <span className="text-yellow-400 font-mono font-bold">{(1000 / speed).toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="200"
                max="2000"
                step="200"
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
            </div>
          </div>
        </>
      ) : (
        <div className="text-sm text-zinc-400 leading-relaxed">
          <strong className="text-zinc-200 block mb-2">🔍 Ciclo Actual ({cycle}):</strong>
          <div className="space-y-1">
            {getCurrentCycleInfo().map((line, idx) => (
              <p key={idx} className="text-xs">{line}</p>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t border-zinc-700">
            <p className="text-xs text-zinc-500">
              <strong>Política:</strong> {issuePolicy === 'in-order' ? 'In-Order' : 'Out-of-Order'} Issue / {commitPolicy === 'in-order' ? 'In-Order' : 'Out-of-Order'} Commit
            </p>
          </div>
        </div>
      )}
    </div>
  );
}