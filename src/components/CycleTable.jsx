// Tabla de ciclos con eventos
function CycleTable({ instructions, currentCycle }) {
  const allInsts = [...instructions].sort((a, b) => a.order - b.order);
  const maxCycles = Math.max(currentCycle + 1, 12);

  // Determinar qué pasó con cada instrucción en cada ciclo
  const getStageAtCycle = (inst, cycle) => {
    if (inst.decodeAt && cycle === inst.decodeAt) return { label: 'D', color: 'text-blue-400 bg-blue-900/20 border-blue-500/30' };

    if (inst.issueAt && cycle >= inst.issueAt) {
      const cyclesInExec = cycle - inst.issueAt;
      if (cyclesInExec < inst.latency) return { label: 'E', color: 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30' };
      if (inst.completeAt && cycle === inst.completeAt) return { label: 'W', color: 'text-green-400 bg-green-900/20 border-green-500/30' };
      if (cyclesInExec >= inst.latency && inst.stage !== 'done') return { label: '—', color: 'text-orange-400 bg-orange-900/20 border-orange-500/30' }; // Stall
    }
    return null;
  };

  return (
    <div className="inline-block min-w-full align-middle">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="p-2 text-left text-zinc-500 font-mono text-xs border-b border-zinc-800 sticky left-0 bg-zinc-900 z-10">INST</th>
            <th className="p-2 text-center text-zinc-500 font-mono text-xs border-b border-zinc-800">LAT</th>
            {Array.from({ length: maxCycles }, (_, i) => (
              <th
                key={i}
                className={`p-2 text-center font-mono text-xs border-b border-zinc-800 min-w-[30px] ${i === currentCycle ? 'text-yellow-400 bg-yellow-500/10' : 'text-zinc-600'
                  }`}
              >
                {i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allInsts.map(inst => (
            <tr key={inst.id} className="hover:bg-zinc-800/30 transition-colors">
              <td className="p-2 font-mono font-bold text-zinc-300 border-b border-zinc-800/50 sticky left-0 bg-zinc-900 z-10 border-r border-zinc-800">
                {inst.id}
              </td>
              <td className="p-2 text-center font-mono text-zinc-500 text-xs border-b border-zinc-800/50 border-r border-zinc-800">
                {inst.latency}
              </td>
              {Array.from({ length: maxCycles }, (_, i) => {
                const stage = getStageAtCycle(inst, i);
                return (
                  <td
                    key={i}
                    className={`p-1 text-center border-b border-zinc-800/50 ${i === currentCycle ? 'bg-yellow-500/5' : ''}`}
                  >
                    {stage ? (
                      <div className={`w-6 h-6 mx-auto flex items-center justify-center rounded text-xs font-bold border ${stage.color}`}>
                        {stage.label}
                      </div>
                    ) : (
                      <span className="text-zinc-800 text-[10px]">·</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CycleTable;