import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstructionWindow({ showWindow, windowInsts, highlightId, onHighlight }) {
  return (
    <AnimatePresence>
      {showWindow && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-zinc-900 border border-zinc-700 rounded-xl p-4"
        >
          <h3 className="text-zinc-400 text-xs font-bold uppercase mb-3 flex items-center gap-2">
            <span>🪟</span> Ventana de Instrucciones (Reorder Buffer)
          </h3>
          <div className="flex flex-wrap gap-2">
            {windowInsts.map(inst => (
              <div
                key={inst.id}
                onClick={() => onHighlight && onHighlight(inst.id)}
                className={`cursor-pointer ${inst.id === highlightId ? 'ring-2 ring-yellow-400 bg-yellow-500/10' : 'bg-zinc-800'} text-zinc-300 px-3 py-2 rounded border border-zinc-700 font-mono text-sm`}
              >
                {inst.id}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}