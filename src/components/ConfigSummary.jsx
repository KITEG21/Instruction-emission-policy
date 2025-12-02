import React from 'react';

export default function ConfigSummary({ config = {} }) {
  const { instructions = [] } = config;

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-2">
      <h3 className="text-sm font-bold text-yellow-400 mb-2">Restricciones de Instrucciones</h3>
      <div className="grid grid-cols-3 gap-1">
        {instructions.map(inst => (
          <div key={inst.id} className="bg-zinc-800 p-1 rounded border border-zinc-700">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-white text-xs">{inst.id}</span>
              <span className="text-xs text-zinc-400 uppercase">{inst.type}</span>
            </div>
            <div className="text-xs text-zinc-300 mt-1">
              <strong>Deps:</strong> {inst.deps.length > 0 ? inst.deps.join(', ') : 'Ninguna'}
            </div>
            <div className="text-xs text-zinc-300">
              <strong>FU:</strong> {inst.type}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
