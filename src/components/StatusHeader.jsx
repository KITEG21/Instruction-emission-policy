import React from 'react';
import { motion } from 'framer-motion';

export default function StatusHeader({ cycle, doneInsts, instructions }) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-yellow-500/20 p-6 flex flex-wrap items-center justify-between gap-6">
      <div>
        <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Ciclo Actual</div>
        <div className="text-5xl font-mono font-bold text-white">{cycle}</div>
      </div>

      <div className="flex-1 min-w-[200px]">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-zinc-400">Progreso del Programa</span>
          <span className="text-yellow-400 font-bold">{doneInsts.length} / {instructions.length} inst</span>
        </div>
        <div className="h-4 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
          <motion.div
            className="h-full bg-yellow-500"
            initial={{ width: 0 }}
            animate={{ width: `${(doneInsts.length / instructions.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {doneInsts.length === instructions.length && instructions.length > 0 && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-green-900/30 text-green-400 border border-green-500/50 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
        >
          <span>🎉</span> Completado
        </motion.div>
      )}
    </div>
  );
}