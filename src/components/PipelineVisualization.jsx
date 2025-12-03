import React from 'react';
import TableColumn from './TableColumn';

export default function PipelineVisualization({
  decodedQueue,
  UNITS,
  executingInsts,
  doneInsts,
  instructions,
  commitPolicy,
  stallInIssue,
  highlightId,
  onHighlight,
  cycle
}) {
  // Build cycle-specific views (same logic used in timeline)
  const decodeAtCycle = instructions.filter(i => i.decodeAt === cycle).sort((a, b) => a.order - b.order);
  // Mostrar instrucciones que están ejecutando en este ciclo (tanto las que comenzaron ahora como las que aún tienen latencia)
  const execAtCycleRaw = instructions.filter(i =>
    i.issueAt === cycle || (i.issueAt !== null && cycle >= i.issueAt && (cycle - i.issueAt) < i.latency)
  );
  // Map execAtCycle into UNITS slots so each unit shows the instruction that started execution in this cycle
  const execAtCycle = UNITS.map(u => execAtCycleRaw.find(inst => (inst.unitId === u.id) || (inst.executedUnitId === u.id)) || null);

  const writeAttempts = instructions.filter(i => i.commitAttemptAt === cycle && i.stage !== 'limbo' && i.fuRemaining === 0).sort((a,b) => a.order - b.order);
  const writeAtCycle = doneInsts.filter(i => i.completeAt === cycle).sort((a,b) => a.order - b.order);
  // Merge attempts and actual writes, deduplicate by id, limit to 2 (bus width)
  const mergeUnique = (arr) => {
    const seen = new Set();
    const out = [];
    for (const inst of arr) {
      if (!inst) continue;
      if (!seen.has(inst.id)) {
        seen.add(inst.id);
        out.push(inst);
      }
    }
    return out;
  };
  const writeInsts = mergeUnique([...writeAttempts, ...writeAtCycle]).slice(0, 2);

  return (
    <div className="grid grid-cols-3 gap-4">
      <TableColumn
        title="DECODIFICAR"
        subtitle="Buffer (2 posiciones)"
        instructions={decodeAtCycle}
        maxRows={2}
        color="blue"
        allInsts={instructions}
        highlightId={highlightId}
        onHighlight={onHighlight}
        commitPolicy={commitPolicy}
        stallInIssue={stallInIssue}
      />
      <TableColumn
        title="EJECUCIÓN"
        subtitle="Unidades Funcionales"
        instructions={execAtCycle}
        maxRows={3}
        showLatency
        showWaiting
        color="yellow"
        allInsts={instructions}
        highlightId={highlightId}
        onHighlight={onHighlight}
        commitPolicy={commitPolicy}
      />
      <TableColumn
        title="ESCRITURA"
        subtitle="Bus (2 posiciones)"
        instructions={writeInsts}
        maxRows={2}
        showWaiting
        color="green"
        allInsts={instructions}
        highlightId={highlightId}
        onHighlight={onHighlight}
        commitPolicy={commitPolicy}
      />
    </div>
  );
}