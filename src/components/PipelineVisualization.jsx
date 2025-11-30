import React from 'react';
import TableColumn from './TableColumn';

export default function PipelineVisualization({
  decodedQueue,
  UNITS,
  executingInsts,
  doneInsts,
  instructions,
  commitPolicy,
  stallInIssue
}) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <TableColumn
        title="DECODE"
        subtitle="Buffer (2 slots)"
        instructions={decodedQueue}
        maxRows={2}
        showDeps
        color="blue"
        allInsts={instructions}
        commitPolicy={commitPolicy}
        stallInIssue={stallInIssue}
      />
      <TableColumn
        title="EXECUTE"
        subtitle="Unidades Funcionales"
        instructions={UNITS.map(u => executingInsts.find(i => i.unitId === u.id))}
        maxRows={3}
        rowLabels={UNITS.map(u => u.label)}
        showLatency
        showWaiting
        color="yellow"
        allInsts={instructions}
        commitPolicy={commitPolicy}
      />
      <TableColumn
        title="WRITE BACK"
        subtitle="Bus (2 slots)"
        instructions={[...doneInsts].sort((a, b) => b.completeAt - a.completeAt)}
        maxRows={2}
        highlight={doneInsts}
        color="green"
        allInsts={instructions}
        commitPolicy={commitPolicy}
      />
    </div>
  );
}