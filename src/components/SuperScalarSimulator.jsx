import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfigurationPanel from './ConfigurationPanel';
import ActionButtons from './ActionButtons';
import QuickExplanation from './QuickExplanation';
import KidWindow from './KidWindow';
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
  const [kidMode, setKidMode] = useState(false);
  const [kidWindowVisible, setKidWindowVisible] = useState(false);
  const [highlightedInstructionId, setHighlightedInstructionId] = useState(null);
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
    setHighlightedInstructionId(null);
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
            if (DEBUG) console.log(`Ciclo ${currentCycle}: Stall de emisión - ${inst.id} no puede emitirse (FU ocupada)`);
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
            if (DEBUG) console.log(`Ciclo ${currentCycle}: Stall de emisión - ${inst.id} no puede emitirse (FU ocupada)`);
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
          // Terminó ejecución, pasar a waiting para escribir resultado (Write Back) en el SIGUIENTE ciclo
          newInsts[idx] = { ...inst, stage: 'waiting', fuRemaining: 0 };
        } else {
          newInsts[idx] = { ...inst, fuRemaining: remaining };
        }
      }
    });

    return newInsts;
  };

  // Fase 4: Commit (escritura)
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

  // Show kid window when kidMode is enabled
  useEffect(() => {
    if (kidMode) setKidWindowVisible(true);
    else setKidWindowVisible(false);
  }, [kidMode]);

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
        info.push(`Listas para escribir: ${readyToCommit.join(', ')}`);  // <-- Mensaje correcto
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

  // Friendly explanations for kids / simplified messages
  const getKidFriendlyCycleInfo = () => {
    const decodingNow = instructions.filter(i => i.decodeAt === cycle).map(i => i.id);
    const issuingNow = instructions.filter(i => i.issueAt === cycle).map(i => i.id);
    const completingNow = instructions.filter(i => i.completeAt === cycle).map(i => i.id);
    const waitingDeps = instructions.filter(i => i.stage === 'waiting' && i.blockReason).map(i => i.id);
    const readyToCommit = instructions.filter(i => i.stage === 'waiting' && !i.blockReason).map(i => i.id);
    const busyUnits = executingInsts.filter(i => i.stage === 'fu').map(i => `${i.id} en ${UNITS.find(u => u.id === i.unitId)?.label || 'unidad'}`);

    let info = [];
    if (cycle === 0) {
      info.push('Estoy listo para empezar.');
    } else {
      if (decodingNow.length > 0) info.push(`Decodificando: ${decodingNow.join(', ')}`);
      if (issuingNow.length > 0) info.push(`Ejecutando: ${issuingNow.join(', ')}`); // más entendible para usuarios no técnicos
      if (readyToCommit.length > 0) info.push(`Listo para guardar: ${readyToCommit.join(', ')}`);
      if (completingNow.length > 0) info.push(`Ya guardé: ${completingNow.join(', ')}`);
      if (waitingDeps.length > 0) info.push(`Esperando otra instrucción: ${waitingDeps.join(', ')}`);
      if (busyUnits.length > 0) info.push(`Máquinas ocupadas: ${busyUnits.join(', ')}`);
      if (info.length === 0) info.push('Nada nuevo en este ciclo.');
    }
    return info;
  };

  // Detalle técnico ligero para usuarios que quieren un nivel mas técnico
  const getKidFriendlyDetails = () => {
    const detailLines = [];
    detailLines.push({ text: `Estado detallado — Ciclo ${cycle}`, instId: null });

    const decodeIds = decodeQueue.map(i => i.id);
    detailLines.push({ text: `Buffer de decodificación: ${decodeIds.length ? decodeIds.join(', ') : 'vacío'}`, instId: null });

    const allDecoded = instructions.filter(i => i.stage === 'decoded');
    const decodedReady = allDecoded.filter(i => !i.blockReason).map(i => i.id);
    const decodedBlocked = allDecoded.filter(i => i.blockReason).map(i => ({ id: i.id, reason: i.blockReason }));

    // Agregar entradas individuales de instrucciones listas (para poder resaltarlas)
    if (decodedReady.length > 0) {
      detailLines.push({ text: `Decodificadas (listas para emitir):`, instId: null });
      decodedReady.forEach(id => detailLines.push({ text: `• ${id}`, instId: id }));
    } else {
      detailLines.push({ text: `Decodificadas (listas para emitir): ninguna`, instId: null });
    }

    if (decodedBlocked.length > 0) {
      detailLines.push({ text: `Decodificadas (bloqueadas):`, instId: null });
      decodedBlocked.forEach(obj => detailLines.push({ text: `• ${obj.id} (${obj.reason})`, instId: obj.id }));
    } else {
      detailLines.push({ text: `Decodificadas (bloqueadas): ninguna`, instId: null });
    }

    // Show per-unit status
    UNITS.forEach(u => {
      const inst = executingInsts.find(i => i.unitId === u.id);
      if (inst) detailLines.push({ text: `${u.label}: ${inst.id} (restan ${inst.fuRemaining} ciclos)`, instId: inst.id });
      else detailLines.push({ text: `${u.label}: libre`, instId: null });
    });

    const waitingToCommit = instructions.filter(i => i.stage === 'waiting' && i.fuRemaining === 0).map(i => i.id);
    if (waitingToCommit.length) {
      detailLines.push({ text: `Listas para escribir:`, instId: null });
      waitingToCommit.forEach(id => detailLines.push({ text: `• ${id}`, instId: id }));
    } else {
      detailLines.push({ text: `Listas para escribir: ninguna`, instId: null });
    }

    // Determine blocked reasons and unmet deps
    const blockedInsts = instructions.filter(i => i.blockReason);
    blockedInsts.forEach(bi => {
      const unmet = bi.deps.filter(depId => {
        const dep = instructions.find(d => d.id === depId);
        return !dep || dep.stage !== 'done';
      });
      if (unmet.length > 0) {
        detailLines.push({ text: `${bi.id} espera: ${unmet.join(', ')}`, instId: bi.id });
      } else {
        detailLines.push({ text: `${bi.id} bloqueada por: ${bi.blockReason}`, instId: bi.id });
      }
    });

    const stalls = blockedInsts.map(i => `${i.id} (${i.blockReason})`);
    if (stalls.length) detailLines.push({ text: `Bloqueos: ${stalls.join(', ')}`, instId: null });

    detailLines.push({ text: `Completadas: ${doneInsts.length} / ${instructions.length}`, instId: null });

    // Sugerencia: instrucciones listas para emitir
    const readyToIssue = allDecoded.filter(i => i.decodeAt < cycle && !i.blockReason && canExecute(i, instructions));
    if (readyToIssue.length > 0) {
      detailLines.push({ text: `Instrucciones listas para emitir si hay FU libres:`, instId: null });
      readyToIssue.forEach(i => detailLines.push({ text: `• ${i.id}`, instId: i.id }));
    } else {
      detailLines.push({ text: `Instrucciones listas para emitir si hay FU libres: ninguna`, instId: null });
    }

    return detailLines;
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
              kidMode={kidMode}
              setKidMode={setKidMode}
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
            <QuickExplanation currentInfo={getCurrentCycleInfo()} />
            <KidWindow
              show={kidWindowVisible}
              lines={getKidFriendlyCycleInfo()}
              details={getKidFriendlyDetails()}
              onClose={() => setKidWindowVisible(false)}
              onHighlight={(id) => setHighlightedInstructionId(id)}
              onDisableKidMode={() => { setKidMode(false); setKidWindowVisible(false); setHighlightedInstructionId(null); }}
            />
          </div>

          {/* Columna Derecha: Visualización */}
          <div className="lg:col-span-8 space-y-6">

            {/* Header de Estado */}
            <StatusHeader
              cycle={cycle}
              doneInsts={doneInsts}
              instructions={instructions}
              highlightId={highlightedInstructionId}
              onClearHighlight={() => setHighlightedInstructionId(null)}
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
              highlightId={highlightedInstructionId}
              onHighlight={(id) => setHighlightedInstructionId(id)}
            />

            {/* Ventana de Instrucciones (Out-of-Order) */}
            <InstructionWindow
              showWindow={showWindow}
              windowInsts={windowInsts}
              highlightId={highlightedInstructionId}
              onHighlight={(id) => setHighlightedInstructionId(id)}
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
