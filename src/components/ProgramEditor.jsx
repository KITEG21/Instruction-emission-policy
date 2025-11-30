import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProgramEditor({
  showEditor,
  setShowEditor,
  instructions,
  setInstructions,
  setCycle,
  setIsPlaying
}) {
  return (
    <AnimatePresence>
      {showEditor && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-zinc-900 border border-yellow-500/30 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
              <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2">
                <span>🛠️</span> Configurar Programa
              </h2>
              <button onClick={() => setShowEditor(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <p className="text-sm text-zinc-400 mb-4">
                Edita las latencias y dependencias de cada instrucción.
                <br /><span className="text-yellow-500/70 text-xs">Nota: Una instrucción solo puede depender de instrucciones anteriores (con menor ID).</span>
              </p>

              {instructions.map((inst, idx) => (
                <div key={inst.id} className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700 flex flex-wrap gap-4 items-center">
                  <div className="w-16 font-mono font-bold text-white text-lg">{inst.id}</div>

                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-xs text-zinc-500 mb-1 uppercase font-bold">Tipo</label>
                    <select
                      value={inst.type || 'ALU'}
                      onChange={(e) => {
                        const newInsts = [...instructions];
                        newInsts[idx] = { ...inst, type: e.target.value };
                        setInstructions(newInsts);
                      }}
                      className="bg-zinc-900 border border-zinc-600 rounded px-3 py-1 text-white w-full focus:border-yellow-500 outline-none text-sm"
                    >
                      <option value="ALU">ALU (Entero)</option>
                      <option value="FPU">FPU (Flotante)</option>
                      <option value="MEM">MEM (Carga/Almacenamiento)</option>
                    </select>
                  </div>

                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-xs text-zinc-500 mb-1 uppercase font-bold">Latencia</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={inst.latency}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        const newInsts = [...instructions];
                        newInsts[idx] = { ...inst, latency: val };
                        setInstructions(newInsts);
                      }}
                      className="bg-zinc-900 border border-zinc-600 rounded px-3 py-1 text-white w-full focus:border-yellow-500 outline-none"
                    />
                  </div>

                  <div className="flex-[2] min-w-[200px]">
                    <label className="block text-xs text-zinc-500 mb-1 uppercase font-bold">Dependencias</label>
                    <div className="flex flex-wrap gap-2">
                      {instructions.slice(0, idx).map(prevInst => (
                        <label key={prevInst.id} className={`cursor-pointer px-2 py-1 rounded text-xs font-mono border transition-colors ${inst.deps.includes(prevInst.id)
                          ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500'
                          }`}>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={inst.deps.includes(prevInst.id)}
                            onChange={(e) => {
                              const newInsts = [...instructions];
                              let newDeps = [...inst.deps];
                              if (e.target.checked) {
                                newDeps.push(prevInst.id);
                              } else {
                                newDeps = newDeps.filter(d => d !== prevInst.id);
                              }
                              newInsts[idx] = { ...inst, deps: newDeps };
                              setInstructions(newInsts);
                            }}
                          />
                          {prevInst.id}
                        </label>
                      ))}
                      {idx === 0 && <span className="text-zinc-600 text-xs italic">Sin dependencias posibles</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-zinc-800 bg-zinc-950/50 flex justify-end gap-3">
              <button
                onClick={() => setShowEditor(false)}
                className="px-4 py-2 text-zinc-400 hover:text-white font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  // Resetear estado de simulación al guardar
                  const resetInsts = instructions.map(i => ({
                    ...i,
                    stage: 'decode',
                    fuRemaining: 0,
                    issueAt: null,
                    completeAt: null,
                    decodeAt: null
                  }));
                  setInstructions(resetInsts);
                  setCycle(0);
                  setIsPlaying(false);
                  setShowEditor(false);
                }}
                className="px-6 py-2 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 shadow-lg shadow-yellow-500/20"
              >
                Guardar y Reiniciar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}