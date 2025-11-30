import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfigurationPanel from './ConfigurationPanel';
import ActionButtons from './ActionButtons';
import QuickExplanation from './QuickExplanation';
import StatusHeader from './StatusHeader';
import PipelineVisualization from './PipelineVisualization';
import InstructionWindow from './InstructionWindow';
import ProgramEditor from './ProgramEditor';
import Timeline from './Timeline';

// Generar programa de ejemplo similar a Figura 14.4
const generateProgram = () => {
  return [
    { id: 'I1', type: 'FPU', deps: [], latency: 2, stage: 'decode', fuRemaining: 0, order: 0, issueAt: null, completeAt: null, decodeAt: null, blockReason: null },
    { id: 'I2', type: 'ALU', deps: [], latency: 1, stage: 'decode', fuRemaining: 0, order: 1, issueAt: null, completeAt: null, decodeAt: null, blockReason: null },
    { id: 'I3', type: 'ALU', deps: [], latency: 1, stage: 'decode', fuRemaining: 0, order: 2, issueAt: null, completeAt: null, decodeAt: null, blockReason: null },
    { id: 'I4', type: 'ALU', deps: [], latency: 1, stage: 'decode', fuRemaining: 0, order: 3, issueAt: null, completeAt: null, decodeAt: null, blockReason: null },
    { id: 'I5', type: 'MEM', deps: ['I4'], latency: 1, stage: 'decode', fuRemaining: 0, order: 4, issueAt: null, completeAt: null, decodeAt: null, blockReason: null },
    { id: 'I6', type: 'MEM', deps: [], latency: 1, stage: 'decode', fuRemaining: 0, order: 5, issueAt: null, completeAt: null, decodeAt: null, blockReason: null },
  ];
};

// Unidades Funcionales (Slots fijos)
const UNITS = [
  { id: 0, type: 'ALU', label: 'ALU 1' },
  { id: 1, type: 'FPU', label: 'FPU 1' },
  { id: 2, type: 'MEM', label: 'MEM 1' }
];

export default function SuperscalarSimulator() {
  const [instructions, setInstructions] = useState(generateProgram());
  const [cycle, setCycle] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [policy, setPolicy] = useState('in-in'); // 'in-in', 'in-out', 'out-out'
  const [speed, setSpeed] = useState(1000);
  const [showEditor, setShowEditor] = useState(false);
  const [stallInIssue, setStallInIssue] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(true);
  const intervalRef = useRef(null);
  // Debug toggle
  const DEBUG = true;

  // Derivar políticas de emisión y commit
  const issuePolicy = policy === 'out-out' ? 'out-of-order' : 'in-order';
  const commitPolicy = policy === 'in-in' ? 'in-order' : 'out-of-order';

  // Ancho de emisión (Issue Width)
  const ISSUE_WIDTH = 2;

  // Instrucciones en decodificación (no mostradas, en buffer)
  const decodeQueue = instructions.filter(i => i.stage === 'decode');

  // Instrucciones en tabla de decodificación (ya decodificadas, esperando ir a ejecución)
  const decodedQueue = instructions.filter(i =>
  i.stage === 'decoded' &&
  (policy !== 'out-out' || (i.stage === 'decoded' && !i.blockReason))
);

  // Functional Units (ejecutando o esperando dependencias)
  const executingInsts = instructions.filter(i => i.stage === 'fu' || i.stage === 'waiting');

  // Instrucciones completadas (escritura)
  const doneInsts = instructions.filter(i => i.stage === 'done');

  // Window (solo para emisión desordenada)
  const showWindow = issuePolicy === 'out-of-order';


  // IDs de instrucciones que están en la ventana este ciclo
  const windowInstIds = [
    ...instructions.filter(i => i.stage === 'decoded' && i.decodeAt !== null && i.decodeAt < cycle).map(i => i.id),
    ...instructions.filter(i => i.stage === 'fu' && i.issueAt === cycle).map(i => i.id),
    ...instructions.filter(i => i.stage === 'waiting' && i.issueAt === cycle).map(i => i.id),
  ];

  // Lista de instrucciones para mostrar en la ventana
  const windowInsts = instructions.filter(i => windowInstIds.includes(i.id));


  // Reset
  const handleReset = () => {
    setIsPlaying(false);
    setCycle(0);
    setInstructions(generateProgram());
    setStallInIssue(false);
  };

  // Verificar si una instrucción puede ejecutarse (dependencias satisfechas)
  const canExecute = (inst, instList) => {
    return inst.deps.every(depId => {
      const dep = instList.find(i => i.id === depId);
      // Dependencia satisfecha si la instrucción ya finalizó (escribió resultado)
      return dep && dep.stage === 'done';
    });
  };

  // Fase 1: Decodificar (máximo 2 instrucciones por ciclo)
  const decode = (instList, currentCycle) => {
    const newInsts = [...instList];
    const toDecode = newInsts.filter(i => i.stage === 'decode').sort((a, b) => a.order - b.order);
    if (toDecode.length > 0) {
      const toMove = toDecode.slice(0, 2);
      toMove.forEach(inst => {
        const idx = newInsts.findIndex(i => i.id === inst.id);
        if (idx !== -1) {
          newInsts[idx] = { ...newInsts[idx], stage: 'decoded', decodeAt: currentCycle };
        }
      });
    }
    return newInsts;
  };

  // Fase 2: Emitir a ejecución
  const issue = (instList, currentCycle) => {
    const newInsts = [...instList];
    const decodedInsts = newInsts.filter(i => i.stage === 'decoded').sort((a, b) => a.order - b.order);
    const executing = newInsts.filter(i => i.stage === 'fu' || i.stage === 'waiting');

    // Identificar unidades ocupadas
    const occupiedUnitIds = executing.map(i => i.unitId).filter(id => id !== undefined);

    // Helper para encontrar unidad libre
    const getFreeUnit = (type, currentOccupied) => {
      return UNITS.find(u => u.type === type && !currentOccupied.includes(u.id));
    };

    // Limitar por ancho de emisión (Issue Width)
    const slotsAvailable = ISSUE_WIDTH;

    let stallDetected = false;

    if (slotsAvailable > 0 && decodedInsts.length > 0) {
      let candidates = [];
      let currentOccupied = [...occupiedUnitIds];

      // Solo considerar instrucciones decodificadas en ciclos ANTERIORES
      const readyToIssue = decodedInsts.filter(inst => inst.decodeAt < currentCycle);

      if (issuePolicy === 'out-of-order') {
        // EMISIÓN DESORDENADA
        for (let inst of readyToIssue) {
          const unit = getFreeUnit(inst.type, currentOccupied);

          if (canExecute(inst, newInsts) && unit) {
            candidates.push({ ...inst, unitId: unit.id });
            currentOccupied.push(unit.id);
          } else if (canExecute(inst, newInsts) && !unit) {
            // Stall por FU ocupada
            const idx = newInsts.findIndex(i => i.id === inst.id);
            if (idx !== -1) {
              newInsts[idx] = { ...newInsts[idx], blockReason: 'FU ocupada' };
            }
            stallDetected = true;
            if (DEBUG) console.log(`Cycle ${currentCycle}: Issue stall - ${inst.id} cannot be issued (FU ocupada)`);
          }
        }
      } else {
        // EMISIÓN EN ORDEN
        for (let inst of readyToIssue) {
          const unit = getFreeUnit(inst.type, currentOccupied);
          const depsOk = canExecute(inst, newInsts);

          if (depsOk && unit && candidates.length < slotsAvailable) {
            candidates.push({ ...inst, unitId: unit.id });
            currentOccupied.push(unit.id);
          } else if (!depsOk) {
            // Stall por dependencias
            const idx = newInsts.findIndex(i => i.id === inst.id);
            if (idx !== -1) {
              newInsts[idx] = { ...newInsts[idx], blockReason: 'Dependencias' };
            }
            stallDetected = true;
            break; // Stall por dependencias
          } else if (!unit) {
            // Stall por conflicto estructural
            const idx = newInsts.findIndex(i => i.id === inst.id);
            if (idx !== -1) {
              newInsts[idx] = { ...newInsts[idx], blockReason: 'FU ocupada' };
            }
            stallDetected = true;
            if (DEBUG) console.log(`Cycle ${currentCycle}: Issue stall - ${inst.id} cannot be issued (FU ocupada)`);
            break; // Stall por conflicto estructural
          }
        }
      }
      if (DEBUG) console.log(`Cycle ${currentCycle}: Issue candidates = ${candidates.map(c => c.id).join(', ')}, toIssue = ${candidates.slice(0, slotsAvailable).map(c => c.id).join(', ')}`);
      const toIssue = candidates.slice(0, slotsAvailable);

      toIssue.forEach(inst => {
        const idx = newInsts.findIndex(i => i.id === inst.id);
        if (idx !== -1) {
          newInsts[idx] = {
            ...newInsts[idx],
            stage: 'fu',
            fuRemaining: inst.latency,
            issueAt: currentCycle,
            unitId: inst.unitId,
            blockReason: null // Limpiar razón al emitir
          };
        }
      });
    }

    setStallInIssue(stallDetected);
    return newInsts;
  };

  // Fase 3: Ejecutar y verificar dependencias
  const execute = (instList, currentCycle) => {
    const newInsts = [...instList];

    newInsts.forEach((inst, idx) => {
      if (inst.stage === 'fu') {
        // Ejecutar (decrementar latencia)
        // Nota: Se ejecuta en el mismo ciclo de emisión si acaba de llegar
        const remaining = inst.fuRemaining - 1;
        if (remaining <= 0) {
          // Terminó ejecución, pasar a waiting para Write Back en el SIGUIENTE ciclo
          newInsts[idx] = { ...inst, stage: 'waiting', fuRemaining: 0 };
        } else {
          newInsts[idx] = { ...inst, fuRemaining: remaining };
        }
      }
    });

    return newInsts;
  };

  // Fase 4: Commit (escribir resultados)
  const commit = (instList, currentCycle) => {
    const newInsts = [...instList];
    const waitingInsts = newInsts.filter(i => i.stage === 'waiting' && i.fuRemaining === 0)
      .sort((a, b) => a.order - b.order);

    // Clear any previous blockReason by default (we will set if still blocked)
    for (const wi of waitingInsts) {
      const idx = newInsts.findIndex(i => i.id === wi.id);
      if (idx !== -1) newInsts[idx] = { ...newInsts[idx], blockReason: null };
    }

    if (waitingInsts.length > 0) {
      let toCommit = [];

      if (commitPolicy === 'in-order') {
        // En orden: solo escribir si no hay anteriores pendientes
        for (let inst of waitingInsts) {
          const hasEarlierNotDone = newInsts.some(i =>
            i.order < inst.order &&
            i.stage !== 'done' &&
            !toCommit.find(c => c.id === i.id)
          );

          if (!hasEarlierNotDone && toCommit.length < 2) {
            toCommit.push(inst);
          } else if (hasEarlierNotDone) {
            // marca razón: bloqueada por instrucción anterior
            const idx = newInsts.findIndex(i => i.id === inst.id);
            if (idx !== -1) {
              const earlier = newInsts.find(i => i.order < inst.order && i.stage !== 'done' && !toCommit.find(c => c.id === i.id));
              newInsts[idx] = { ...newInsts[idx], blockReason: earlier ? `Bloqueada por ${earlier.id}` : 'Orden' };
            }
            break; // ordenar obliga a parar
          } else if (toCommit.length >= 2) {
            // marca razón: bus de escritura lleno
            const idx = newInsts.findIndex(i => i.id === inst.id);
            if (idx !== -1) {
              newInsts[idx] = { ...newInsts[idx], blockReason: 'Bus escritura lleno' };
            }
          }
        }
      } else {
        // Fuera de orden: escribir hasta 2 instrucciones
        toCommit = waitingInsts.slice(0, 2);
      }

      toCommit.forEach(inst => {
        const idx = newInsts.findIndex(i => i.id === inst.id);
        if (idx !== -1) {
          newInsts[idx] = { ...newInsts[idx], stage: 'done', completeAt: currentCycle, blockReason: null };
        }
      });
    }

    return newInsts;
  };

  // Ejecutar un ciclo completo
  // Ejecutar un ciclo completo
  const runCycle = () => {
    const nextCycle = cycle + 1;
    setInstructions(prevInsts => {
      let newInsts = [...prevInsts];

      // Flags por política
      const isOutOut = policy === 'out-out';  // emisión y finalización desordenadas
      const isInOut = policy === 'in-out';   // emisión en orden / finalización desordenada
      const isInIn = policy === 'in-in';    // emisión y finalización en orden

      // Conteo inicial de decodificadas (por si quieres usarlo)
      const decodedBefore = newInsts.filter(i => i.stage === 'decoded').length;

      if (isOutOut) {
        // Out-of-order flow:
        // - Ciclo 1: solo DECODIFICAR (para simular la ventana)
        // - Ciclos siguientes: Commit -> Issue -> Execute -> Decode (decode al final para que aparezca en ventana el ciclo siguiente)
        if (cycle === 0) {
          newInsts = decode(newInsts, nextCycle);
        } else {
          newInsts = commit(newInsts, nextCycle);
          newInsts = issue(newInsts, nextCycle);
          newInsts = execute(newInsts, nextCycle);
          newInsts = decode(newInsts, nextCycle);
        }
      } else if (isInIn) {
        // In-Order Issue / In-Order Completion
        // Commit -> Issue -> Execute -> (Decode solo si el buffer decode quedó vacío tras issue)
        newInsts = commit(newInsts, nextCycle);
        newInsts = issue(newInsts, nextCycle);
        newInsts = execute(newInsts, nextCycle);

        // Solo decodificar si no hay ninguna instrucción en 'decoded' (es decir, ambas salieron a ejecución)
        const decodedAfter = newInsts.filter(i => i.stage === 'decoded').length;
        if (decodedAfter === 0) {
          newInsts = decode(newInsts, nextCycle);
        }
      } else {
        // In-Order Issue / Out-of-Order Completion (o fallback)
        // Commit -> Issue -> Execute -> (Decode si buffer decode quedó vacío)
        newInsts = commit(newInsts, nextCycle);
        newInsts = issue(newInsts, nextCycle);
        newInsts = execute(newInsts, nextCycle);

        const decodedAfter = newInsts.filter(i => i.stage === 'decoded').length;
        if (decodedAfter === 0) {
          newInsts = decode(newInsts, nextCycle);
        }
      }

      return newInsts;
    });

    setCycle(nextCycle);
  };

  // Play/Pause automation
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        runCycle();
      }, speed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, speed, instructions, issuePolicy, commitPolicy]);

  // Detener si todas las instrucciones están completas
  useEffect(() => {
    if (doneInsts.length === instructions.length && instructions.length > 0) {
      setIsPlaying(false);
    }
  }, [doneInsts.length, instructions.length]);

  // Generar información dinámica del ciclo actual
  const getCurrentCycleInfo = () => {
    const decodingNow = instructions.filter(i => i.decodeAt === cycle).map(i => i.id);
    const issuingNow = instructions.filter(i => i.issueAt === cycle).map(i => i.id);
    const completingNow = instructions.filter(i => i.completeAt === cycle).map(i => i.id);
    const readyToCommit = instructions.filter(i => i.stage === 'waiting' && !i.blockReason).map(i => i.id);  // <-- Cambia nombre
    const waitingDeps = instructions.filter(i => i.stage === 'waiting' && i.blockReason).map(i => i.id);
    const stalledInsts = instructions.filter(i => i.blockReason).map(i => i.id + ` (${i.blockReason})`);
    const busyUnits = executingInsts.filter(i => i.stage === 'fu').map(i => `${i.id} en ${UNITS.find(u => u.id === i.unitId)?.label || 'unidad'}`);

    let info = [];

    if (cycle === 0) {
      info.push("Simulación lista para comenzar");
    } else {
      if (decodingNow.length > 0) {
        info.push(`Decodificando: ${decodingNow.join(', ')}`);
      }
      if (issuingNow.length > 0) {
        info.push(`Emitiendo: ${issuingNow.join(', ')}`);
      }
      if (completingNow.length > 0) {
        info.push(`Completando: ${completingNow.join(', ')}`);
      }
      if (readyToCommit.length > 0) {  // <-- Usa el nuevo nombre
        info.push(`Listas para commit: ${readyToCommit.join(', ')}`);  // <-- Mensaje correcto
      }
      if (waitingDeps.length > 0) {
        info.push(`Esperando dependencias: ${waitingDeps.join(', ')}`);
      }
      if (busyUnits.length > 0) {
        info.push(`Unidades ocupadas: ${busyUnits.join(', ')}`);
      }
      if (stalledInsts.length > 0) {
        info.push(`Stall detectado: ${stalledInsts.join(', ')}`);
      }
      if (info.length === 0) {
        info.push("Esperando siguiente acción...");
      }
    }

    return info;
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8 font-sans text-gray-100">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 text-center border-b border-yellow-500/30 pb-6">
          <h1 className="text-5xl font-extrabold text-yellow-400 tracking-tight mb-2">
            Simulador Superescalar
          </h1>
          <p className="text-zinc-400 text-lg">Visualización de Políticas de Emisión y Ejecución</p>
          <a href="/tutorial" className="inline-block mt-4 text-sm font-bold text-yellow-500 hover:text-yellow-300 border-b border-yellow-500/50 hover:border-yellow-300 transition-colors">
            📖 Ver Tutorial y Conceptos
          </a>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Columna Izquierda: Controles y Configuración */}
          <div className="lg:col-span-4 space-y-6">

            {/* Panel de Control Principal */}
            <ConfigurationPanel
              showConfigPanel={showConfigPanel}
              setShowConfigPanel={setShowConfigPanel}
              policy={policy}
              setPolicy={setPolicy}
              isPlaying={isPlaying}
              setShowEditor={setShowEditor}
              speed={speed}
              setSpeed={setSpeed}
              cycle={cycle}
              getCurrentCycleInfo={getCurrentCycleInfo}
              issuePolicy={issuePolicy}
              commitPolicy={commitPolicy}
            />

            {/* Botones de Acción */}
            <ActionButtons
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              runCycle={runCycle}
              handleReset={handleReset}
              doneInsts={doneInsts}
              instructions={instructions}
            />

            {/* Explicación Rápida */}
            <QuickExplanation />
          </div>

          {/* Columna Derecha: Visualización */}
          <div className="lg:col-span-8 space-y-6">

            {/* Header de Estado */}
            <StatusHeader
              cycle={cycle}
              doneInsts={doneInsts}
              instructions={instructions}
            />

            {/* Pipeline Visual */}
            <PipelineVisualization
              decodedQueue={decodedQueue}
              UNITS={UNITS}
              executingInsts={executingInsts}
              doneInsts={doneInsts}
              instructions={instructions}
              commitPolicy={commitPolicy}
              stallInIssue={stallInIssue}
            />

            {/* Ventana de Instrucciones (Out-of-Order) */}
            <InstructionWindow
              showWindow={showWindow}
              windowInsts={windowInsts}
            />

            {/* Editor Modal */}
            <ProgramEditor
              showEditor={showEditor}
              setShowEditor={setShowEditor}
              instructions={instructions}
              setInstructions={setInstructions}
              setCycle={setCycle}
              setIsPlaying={setIsPlaying}
            />

            {/* Timeline */}
            <Timeline
              instructions={instructions}
              cycle={cycle}
            />

          </div>
        </div>
      </div>
    </div>
  );
}
