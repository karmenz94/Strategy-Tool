
import React, { useMemo, useState } from 'react';
import { ProjectReality, StrategyParams, CalculatedMetrics, ProgramGroup } from '../types';
import { calculateMetrics } from '../utils/calculations';
import { Users, Layout, Maximize, AlertCircle, CheckCircle, ArrowRight, TrendingUp, Lightbulb, PieChart, ShieldCheck } from 'lucide-react';
import VisualMixChart from './VisualMixChart';
import { getAreaConstants, getProgramPreset } from '../constants';

interface Props {
  project: ProjectReality;
  scenarios: StrategyParams[];
  activeScenarioId: string;
  onActivateScenario: (id: string) => void;
}

const ScenarioSnapshotCard = ({ 
  scenario, 
  metrics, 
  project, 
  isActive, 
  onSelect 
}: { 
  scenario: StrategyParams, 
  metrics: CalculatedMetrics, 
  project: ProjectReality, 
  isActive: boolean, 
  onSelect: () => void,
  key?: any
}) => {
  const isViable = metrics.fitFactor <= 100;
  const unitLabel = project.unit.toUpperCase();

  return (
    <div 
      className={`relative flex flex-col p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md h-full ${
        isActive 
          ? 'bg-white border-indigo-600 shadow-lg z-10' 
          : 'bg-white border-slate-200 hover:border-indigo-300'
      }`}
      onClick={onSelect}
    >
      {isActive && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
          Selected
        </div>
      )}

      <div className="flex justify-between items-start mb-3">
        <h3 className={`text-base font-bold truncate ${isActive ? 'text-indigo-800' : 'text-slate-700'}`} title={scenario.name}>{scenario.name}</h3>
        <div className={`flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${isViable ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
          {isViable ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-3 gap-x-2 mb-3">
        <div>
           <div className="text-[9px] text-slate-400 uppercase font-bold">Headcount</div>
           <div className="text-lg font-bold text-slate-800">{metrics.totalHeadcountWithGrowth}</div>
        </div>
        <div>
           <div className="text-[9px] text-slate-400 uppercase font-bold">Seats</div>
           <div className="text-lg font-bold text-slate-800">{metrics.requiredDesks}</div>
        </div>
        <div>
           <div className="text-[9px] text-slate-400 uppercase font-bold">Density</div>
           <div className="text-sm font-bold text-slate-800">
             {metrics.density.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">{unitLabel}/p</span>
           </div>
        </div>
        <div>
           <div className="text-[9px] text-slate-400 uppercase font-bold">Utilization</div>
           <div className={`text-sm font-bold ${metrics.fitFactor > 100 ? 'text-rose-600' : 'text-slate-800'}`}>
             {metrics.fitFactor.toFixed(0)}%
           </div>
        </div>
      </div>
      
      <div className="mt-auto pt-3 border-t border-slate-100">
         <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold text-slate-500">Meeting Ratio</span>
            <span className="text-xs font-bold text-indigo-600">1 : {metrics.derivedMeetingRatio.toFixed(0)}</span>
         </div>
      </div>
    </div>
  );
};

const ImplicationsBlock = ({ scenario, metrics }: { scenario: StrategyParams, metrics: CalculatedMetrics, key?: any }) => {
    // Basic rule-based text generation using effective ratio instead of removed policy ratio
    const sharing = metrics.effectiveDeskRatio;
    const isAggressive = sharing > 1.4;
    const isHighDensity = metrics.density < 8; // e.g. < 8 sqm/person is tight
    
    return (
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 h-full">
            <h4 className="text-xs font-bold text-slate-800 uppercase mb-3 flex items-center gap-2">
                <Lightbulb className="w-3 h-3 text-amber-500" /> Strategic Implications
            </h4>
            <ul className="space-y-2">
                <li className="text-xs text-slate-600 flex gap-2">
                    <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span>
                        {isAggressive 
                            ? "High sharing ratio requires robust change management and neighborhood planning." 
                            : "Conservative sharing provides dedicated seating but consumes more area."}
                    </span>
                </li>
                <li className="text-xs text-slate-600 flex gap-2">
                    <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span>
                        {isHighDensity 
                            ? "High density efficiency maximizes headcount but may impact acoustic comfort." 
                            : "Generous density allows for future growth and diverse amenity spaces."}
                    </span>
                </li>
            </ul>
        </div>
    );
};

const ClientReviewView: React.FC<Props> = ({ project, scenarios, activeScenarioId, onActivateScenario }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    scenarios.length > 0 ? scenarios.map(s => s.id).slice(0, 3) : []
  );

  // Default display groups from program structure or preset
  const programGroups = project.programStructure || getProgramPreset(project.projectType);

  // Calculate metrics for ALL scenarios
  const scenarioMetricsMap = useMemo(() => {
    return scenarios.reduce((acc, s) => {
      acc[s.id] = calculateMetrics(project, s);
      return acc;
    }, {} as Record<string, CalculatedMetrics>);
  }, [project, scenarios]);

  // Filter to selected for comparison
  const comparedScenarios = scenarios.filter(s => selectedIds.includes(s.id));
  
  // Prepare Visual Mix Data (Project Totals)
  const visualMixData = useMemo(() => {
     const CONSTANTS = getAreaConstants(project.unit);
     
     return comparedScenarios.map(s => {
         const metrics = scenarioMetricsMap[s.id];
         const dataPoint: any = { name: s.name };
         
         // Aggregate project-level totals for groups
         programGroups.forEach(group => {
            let groupArea = 0;
            // Iterate all floors to sum up group area
            metrics.floorMetrics.forEach(fMetric => {
                group.items.forEach(itemId => {
                    if (itemId === 'work_open') groupArea += fMetric.openDesks * CONSTANTS.deskOpen;
                    else if (itemId === 'work_enclosed') groupArea += fMetric.enclosedOffices * CONSTANTS.deskEnclosed;
                    else if (itemId === 'work_alt') groupArea += fMetric.altDesks * CONSTANTS.deskAlt;
                    else if (itemId === 'meet') groupArea += fMetric.areaMeeting;
                    else if (itemId === 'phone') groupArea += fMetric.areaPhone;
                    else if (itemId === 'circ') groupArea += fMetric.areaCirculation;
                    else {
                        const supportDef = s.supportSpaces.find(sp => sp.id === itemId);
                        if (supportDef) {
                            const summaryItem = fMetric.supportSummary.find(sum => sum.name === supportDef.name);
                            if (summaryItem) groupArea += summaryItem.area;
                        }
                    }
                });
            });
            dataPoint[group.id] = groupArea;
         });
         return dataPoint;
     });
  }, [comparedScenarios, scenarioMetricsMap, project, programGroups]);

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
        if (selectedIds.length > 1) setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
        if (selectedIds.length < 3) setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      
      {/* Header / Selector */}
      <div className="flex-shrink-0 p-6 pb-2">
         <div className="flex justify-between items-end mb-4">
             <div>
                <h1 className="text-2xl font-bold text-slate-800">Strategic Decision Framework</h1>
                <p className="text-slate-500">Compare structural implications and confirm the optimal direction.</p>
             </div>
             <div className="flex gap-2">
                {scenarios.map(s => (
                    <button
                        key={s.id}
                        onClick={() => toggleSelection(s.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                            selectedIds.includes(s.id) 
                            ? 'bg-indigo-600 text-white border-indigo-600' 
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        {s.name}
                    </button>
                ))}
             </div>
         </div>
      </div>

      <div className="flex-grow overflow-y-auto px-6 pb-6">
         <div className="grid grid-cols-1 gap-8 max-w-6xl mx-auto">
            
            {/* 1. Snapshots Layer */}
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <Layout className="w-4 h-4 text-indigo-600" />
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Strategic Metrics Overview</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {comparedScenarios.map(s => (
                        <ScenarioSnapshotCard 
                            key={s.id}
                            scenario={s}
                            metrics={scenarioMetricsMap[s.id]}
                            project={project}
                            isActive={activeScenarioId === s.id}
                            onSelect={() => onActivateScenario(s.id)}
                        />
                    ))}
                </div>
            </section>

            {/* 2. Structural Comparison Layer (Visual Mix) */}
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <PieChart className="w-4 h-4 text-indigo-600" />
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Structural Visual Mix (Project Total)</h2>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80">
                    <VisualMixChart 
                        data={visualMixData}
                        groups={programGroups}
                        unit={project.unit.toUpperCase()}
                        layout="horizontal"
                        barSize={80}
                        showLabels={true} 
                    />
                </div>
            </section>

            {/* 3. Implications Layer */}
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Trade-offs & Implications</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {comparedScenarios.map(s => (
                         <ImplicationsBlock key={s.id} scenario={s} metrics={scenarioMetricsMap[s.id]} />
                    ))}
                </div>
            </section>

            {/* 4. Decision CTA */}
            <section className="mt-4 flex justify-end">
                <div className="bg-indigo-900 text-white p-6 rounded-xl shadow-lg flex items-center justify-between w-full md:w-auto md:min-w-[500px]">
                    <div>
                        <div className="text-xs font-bold text-indigo-300 uppercase mb-1">Current Selection</div>
                        <div className="text-xl font-bold">{scenarios.find(s => s.id === activeScenarioId)?.name}</div>
                        <div className="text-xs text-indigo-200 mt-1">
                             {scenarioMetricsMap[activeScenarioId].fitFactor <= 100 
                                ? "This scenario fits within the target area." 
                                : "Warning: This scenario exceeds the target area."}
                        </div>
                    </div>
                    <button className="bg-white text-indigo-900 px-6 py-3 rounded-lg font-bold hover:bg-indigo-50 transition-colors flex items-center gap-2 shadow-sm">
                        <ShieldCheck className="w-5 h-5" />
                        Proceed with Selection
                    </button>
                </div>
            </section>

         </div>
      </div>
    </div>
  );
};

export default ClientReviewView;
