import React, { useState } from 'react';
import StrategyControl from './StrategyControl';
import ResultsDashboard from './ResultsDashboard';
import ScenarioPanel from './ScenarioPanel';
import { StrategicDecisionView } from './StrategicDecisionView';
import { ProjectReality, StrategyParams, CalculatedMetrics } from '../types';
import { Calculator, ShieldCheck } from 'lucide-react';

interface Props {
  project: ProjectReality;
  setProject: (p: ProjectReality) => void;
  activeStrategy: StrategyParams;
  handleStrategyChange: (s: StrategyParams) => void;
  activeMetrics: CalculatedMetrics;
  scenarios: StrategyParams[];
  activeScenarioId: string;
  setActiveScenarioId: (id: string) => void;
  addScenario: () => void;
  duplicateScenario: () => void;
  deleteScenario: (id: string) => void;
  renameScenario: (id: string, name: string) => void;
  compareScenarioId: string | null;
  setCompareScenarioId: (id: string | null) => void;
  compareMetrics: CalculatedMetrics | null;
  onNavigate: (page: 'stacking') => void;
}

const SpaceBudget: React.FC<Props> = ({
  project, activeStrategy, handleStrategyChange, activeMetrics,
  scenarios, activeScenarioId, setActiveScenarioId,
  addScenario, duplicateScenario, deleteScenario, renameScenario,
  compareScenarioId, setCompareScenarioId, compareMetrics,
  onNavigate
}) => {
  const [viewMode, setViewMode] = useState<'planning' | 'decision'>('planning');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      
      {/* Top View Switcher */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between">
         <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button 
               onClick={() => setViewMode('planning')}
               className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                  viewMode === 'planning' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
               }`}
            >
               <Calculator className="w-3 h-3" /> Detailed Planning
            </button>
            <button 
               onClick={() => setViewMode('decision')}
               className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                  viewMode === 'decision' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
               }`}
            >
               <ShieldCheck className="w-3 h-3" /> Decision Framework
            </button>
         </div>
      </div>

      <div className="flex-grow overflow-hidden relative">
         {viewMode === 'decision' ? (
            <StrategicDecisionView 
               project={project}
               scenarios={scenarios}
               activeScenarioId={activeScenarioId}
               onActivateScenario={setActiveScenarioId}
               onProceed={() => onNavigate('stacking')}
            />
         ) : (
            <div className="flex h-full">
               {/* Left: Inputs */}
               <div className="w-[340px] flex-shrink-0 flex flex-col border-r border-slate-200 bg-white z-10">
                   <div className="flex-grow overflow-hidden">
                     <StrategyControl 
                       strategy={activeStrategy} 
                       onChange={handleStrategyChange}
                       title={activeStrategy.name}
                       baseHeadcount={project.headcount}
                     />
                   </div>
               </div>

               {/* Center: Dashboard */}
               <div className="flex-grow overflow-y-auto bg-slate-50/50 p-6">
                   <ResultsDashboard 
                     metrics={activeMetrics} 
                     strategy={activeStrategy} 
                     project={project}
                   />
               </div>

               {/* Right: Scenarios */}
               <div className="w-80 flex-shrink-0 bg-white border-l border-slate-200 z-10">
                   <ScenarioPanel 
                     scenarios={scenarios}
                     activeId={activeScenarioId}
                     project={project}
                     metrics={activeMetrics}
                     onActivate={setActiveScenarioId}
                     onAdd={addScenario}
                     onDuplicate={duplicateScenario}
                     onDelete={deleteScenario}
                     onRename={renameScenario}
                     compareId={compareScenarioId}
                     onCompare={setCompareScenarioId}
                     compareMetrics={compareMetrics}
                     onGoToDecision={() => setViewMode('decision')}
                   />
               </div>
            </div>
         )}
      </div>
    </div>
  );
};

export default SpaceBudget;