
import React from 'react';
import { StrategyParams, CalculatedMetrics, ProjectReality } from '../types';
import { Copy, Trash2, Plus, ArrowRightLeft, FileText, ShieldCheck } from 'lucide-react';

interface Props {
  scenarios: StrategyParams[];
  activeId: string;
  project: ProjectReality;
  metrics: CalculatedMetrics; // Active metrics
  onActivate: (id: string) => void;
  onAdd: () => void;
  onDuplicate: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  compareId: string | null;
  onCompare: (id: string | null) => void;
  compareMetrics: CalculatedMetrics | null;
  onGoToDecision: () => void;
}

const ScenarioPanel: React.FC<Props> = ({
  scenarios, activeId, project, metrics,
  onActivate, onAdd, onDuplicate, onDelete, onRename,
  compareId, onCompare, compareMetrics, onGoToDecision
}) => {

  const activeScenario = scenarios.find(s => s.id === activeId);
  const compareScenario = scenarios.find(s => s.id === compareId);

  // Helper for deltas
  const DeltaRow = ({ label, v1, v2, unit = '', inverse = false }: { label: string, v1: number, v2: number, unit?: string, inverse?: boolean }) => {
    const diff = v1 - v2;
    const isZero = diff === 0;
    const isPositive = diff > 0;
    const color = isZero ? 'text-slate-300' : isPositive ? 'text-blue-600' : 'text-orange-600';
    const sign = isPositive ? '+' : '';

    return (
      <div className="flex justify-between items-center text-xs py-1 border-b border-slate-50 last:border-0">
        <span className="text-slate-500">{label}</span>
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-800">{v1.toLocaleString()}</span>
          {!isZero && (
            <span className={`font-mono text-[10px] ${color}`}>
              {sign}{diff.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Generate Structured Insight
  const getStructuredInsight = (current: CalculatedMetrics, baseline: CalculatedMetrics) => {
    const deskDiff = current.requiredDesks - baseline.requiredDesks;
    const areaDiff = current.totalUsedArea - baseline.totalUsedArea;
    const densityDiff = current.density - baseline.density;
    
    // 1. Variance
    let varianceText = "";
    if (deskDiff > 0) varianceText = `Increases capacity by ${deskDiff} workpoints (+${((deskDiff/baseline.requiredDesks)*100).toFixed(0)}%).`;
    else if (deskDiff < 0) varianceText = `Reduces capacity by ${Math.abs(deskDiff)} workpoints.`;
    else varianceText = "Maintains equivalent workpoint capacity.";

    // 2. Impact
    let impactText = "";
    if (areaDiff > 0) impactText = `Requires ${Math.round(areaDiff)} ${project.unit} additional area, putting pressure on the spatial budget.`;
    else if (areaDiff < 0) impactText = `Recovers ${Math.round(Math.abs(areaDiff))} ${project.unit} of area, improving spatial efficiency.`;
    else impactText = "Neutral impact on overall area consumption.";

    // 3. Decision
    let decisionText = "";
    if (densityDiff < -1) decisionText = "Consider: Does the higher density impact acoustic comfort?";
    else if (densityDiff > 1) decisionText = "Consider: Is the generous density essential for experience targets?";
    else decisionText = "Consider: Trade-off lies primarily in operational style rather than space.";

    return { varianceText, impactText, decisionText };
  };

  const insight = compareMetrics ? getStructuredInsight(metrics, compareMetrics) : null;

  return (
    <div className="bg-white border-l border-slate-200 h-full flex flex-col w-80">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Scenarios</h2>
          <button onClick={onAdd} className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold">
            <Plus className="w-3 h-3" /> New
          </button>
        </div>

        <div className="space-y-2">
          {scenarios.map(s => (
            <div 
              key={s.id}
              onClick={() => onActivate(s.id)}
              className={`group p-2 rounded-lg border cursor-pointer transition-all ${
                activeId === s.id 
                  ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500' 
                  : 'bg-white border-slate-200 hover:border-indigo-300'
              }`}
            >
              <div className="flex justify-between items-center">
                {activeId === s.id ? (
                  <input 
                    value={s.name}
                    onChange={(e) => onRename(s.id, e.target.value)}
                    className="text-sm font-bold text-indigo-700 bg-transparent outline-none w-full"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="text-sm font-medium text-slate-600 group-hover:text-indigo-600">{s.name}</span>
                )}
                
                {activeId === s.id && (
                  <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-1 text-slate-400 hover:text-indigo-600" title="Duplicate">
                      <Copy className="w-3 h-3" />
                    </button>
                    {scenarios.length > 1 && (
                      <button onClick={(e) => { e.stopPropagation(); onDelete(s.id); }} className="p-1 text-slate-400 hover:text-rose-500" title="Delete">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-200">
           <button 
             onClick={onGoToDecision}
             className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors border border-indigo-200"
           >
             <ShieldCheck className="w-4 h-4" /> Compare & Decide
           </button>
        </div>
      </div>

      {/* Comparison Selector */}
      <div className="p-4 border-b border-slate-200">
         <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2">
           <ArrowRightLeft className="w-3 h-3" /> Quick Comparison
         </label>
         <select 
           className="w-full text-sm p-2 border border-slate-200 rounded-md bg-slate-50 focus:outline-none"
           value={compareId || ''}
           onChange={(e) => onCompare(e.target.value || null)}
         >
           <option value="">None (Single View)</option>
           {scenarios.filter(s => s.id !== activeId).map(s => (
             <option key={s.id} value={s.id}>{s.name}</option>
           ))}
         </select>
      </div>

      {/* Comparison Card (Sticky/Scrollable) */}
      {compareMetrics && compareScenario && insight ? (
        <div className="flex-grow overflow-y-auto p-4 bg-slate-50">
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-indigo-600 truncate max-w-[100px]">{activeScenario?.name}</span>
                <span className="text-[10px] text-slate-400">vs</span>
                <span className="text-xs font-bold text-slate-600 truncate max-w-[100px]">{compareScenario.name}</span>
              </div>

              {/* Metric Deltas */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Seating</p>
                <DeltaRow label="Open Seats" v1={metrics.openDesks} v2={compareMetrics.openDesks} />
                <DeltaRow label="Alt Seats" v1={metrics.altDesks} v2={compareMetrics.altDesks} />
                <DeltaRow label="Total" v1={metrics.requiredDesks} v2={compareMetrics.requiredDesks} />
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Spaces</p>
                <DeltaRow label="Meeting Rms" v1={metrics.totalMeetingRooms} v2={compareMetrics.totalMeetingRooms} />
                <DeltaRow label="Phone Booths" v1={metrics.totalPhoneBooths} v2={compareMetrics.totalPhoneBooths} />
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Area ({project.unit})</p>
                <DeltaRow label="Used Area" v1={Math.round(metrics.totalUsedArea)} v2={Math.round(compareMetrics.totalUsedArea)} />
                <div className="flex justify-between items-center text-xs py-1">
                   <span className="text-slate-500">Utilization Index</span>
                   <div className="flex items-center gap-2">
                      <span className={`font-bold ${metrics.fitFactor > 100 ? 'text-rose-600' : 'text-emerald-600'}`}>{metrics.fitFactor.toFixed(0)}%</span>
                      <span className="text-slate-300">/</span>
                      <span className="text-slate-400">{compareMetrics.fitFactor.toFixed(0)}%</span>
                   </div>
                </div>
              </div>
           </div>

           <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
              <div className="flex items-start gap-2 mb-2">
                <FileText className="w-4 h-4 mt-0.5 text-blue-600" />
                <span className="font-bold uppercase text-[10px] text-blue-500 mt-0.5">Analysis</span>
              </div>
              <div className="space-y-2">
                 <div>
                    <span className="font-bold block text-blue-900 mb-0.5">Variance</span>
                    <span className="leading-tight block text-blue-800">{insight.varianceText}</span>
                 </div>
                 <div>
                    <span className="font-bold block text-blue-900 mb-0.5">Strategic Impact</span>
                    <span className="leading-tight block text-blue-800">{insight.impactText}</span>
                 </div>
                 <div className="pt-2 border-t border-blue-100 mt-1">
                    <span className="leading-tight block text-blue-700 italic">{insight.decisionText}</span>
                 </div>
              </div>
           </div>
        </div>
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center text-slate-400 p-8 text-center">
           <ArrowRightLeft className="w-8 h-8 mb-2 opacity-20" />
           <p className="text-xs">Select a scenario above to compare metrics.</p>
        </div>
      )}

    </div>
  );
};

export default ScenarioPanel;