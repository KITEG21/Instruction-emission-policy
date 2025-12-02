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
  return (
    <div className="grid grid-cols-3 gap-4">
      <TableColumn
        title="DECODIFICAR"
        subtitle="Buffer (2 posiciones)"
        instructions={decodedQueue}
        maxRows={2}
        showDeps
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
        instructions={UNITS.map(u => executingInsts.find(i => i.unitId === u.id))}
        maxRows={3}
        rowLabels={UNITS.map(u => u.label)}
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
        instructions={doneInsts.filter(i => i.completeAt === cycle)}
        maxRows={2}
        highlight={doneInsts}
        color="green"
        allInsts={instructions}
        highlightId={highlightId}
        onHighlight={onHighlight}
        commitPolicy={commitPolicy}
      />
    </div>
  );
}