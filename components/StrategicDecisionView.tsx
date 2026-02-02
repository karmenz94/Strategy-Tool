
import React, { useMemo, useState, useEffect } from 'react';
import { ProjectReality, StrategyParams, CalculatedMetrics, ProgramGroup } from '../types';
import { calculateMetrics } from '../utils/calculations';
import { 
  Users, Layout, AlertCircle, CheckCircle, ArrowRight, TrendingUp, 
  Lightbulb, PieChart, ShieldCheck, ArrowRightLeft, Layers, 
  Monitor, ChevronDown, ChevronRight, Eye, EyeOff, Briefcase, Coffee, Search
} from 'lucide-react';
import VisualMixChart from './VisualMixChart';
// import ScenarioDeepDive from './ScenarioDeepDive';
import { getAreaConstants, getProgramPreset } from '../constants';

interface Props {
  project: ProjectReality;
  scenarios: StrategyParams[];
  activeScenarioId: string;
  onActivateScenario: (id: string) => void;
  onProceed: () => void;
}

type LensType = 'metrics' | 'workpoints' | 'meeting' | 'support' | 'space_mix' | 'floors' | 'implications';

// --- UTILS ---

const getDeltaBadge = (values: number[], inverse = false) => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  if (min === 0 && max === 0) return null;
  if (min === max) return <span className="text-[10px] text-slate-400 font-medium px-2">No Variance</span>;
  
  const diff = max - min;
  const pct = min === 0 ? 100 : (diff / min) * 100;
  
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
       pct > 15 ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-slate-600 bg-slate-100 border-slate-200'
    }`}>
       {pct > 100 ? '>100%' : `${pct.toFixed(0)}%`} Δ
    </span>
  );
};

// Aggregate support totals from floor metrics
const getSupportTotals = (metrics: CalculatedMetrics) => {
  const summary: Record<string, { count: number, area: number }> = {};
  metrics.floorMetrics.forEach(fm => {
    fm.supportSummary.forEach(item => {
      if (!summary[item.name]) summary[item.name] = { count: 0, area: 0 };
      summary[item.name].count += item.count;
      summary[item.name].area += item.area;
    });
  });
  return summary;
};

// --- SUB-COMPONENTS ---

const LensSection = ({ 
  title, 
  icon: Icon, 
  isOpen, 
  onToggle, 
  children,
  deltaValues 
}: { 
  title: string, 
  icon: any, 
  isOpen: boolean, 
  onToggle: () => void, 
  children?: React.ReactNode,
  deltaValues?: number[]
}) => (
  <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300">
    <button 
      onClick={onToggle}
      className={`w-full flex items-center justify-between p-4 ${isOpen ? 'bg-slate-50 border-b border-slate-100' : 'bg-white hover:bg-slate-50'}`}
    >
      <div className="flex items-center gap-2">
         <div className={`p-1.5 rounded-lg ${isOpen ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
            <Icon className="w-4 h-4" />
         </div>
         <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="flex items-center gap-3">
         {!isOpen && deltaValues && getDeltaBadge(deltaValues)}
         {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </div>
    </button>
    {isOpen && <div className="p-5 animate-in slide-in-from-top-2 duration-200">{children}</div>}
  </section>
);

const ComparisonTable = ({ 
  scenarios, 
  rows 
}: { 
  scenarios: StrategyParams[], 
  rows: { label: string, subLabel?: string, values: (string | number | React.ReactNode)[], highlight?: boolean }[] 
}) => (
  <div className="overflow-hidden rounded-lg border border-slate-200">
    <table className="w-full">
       <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
             <th className="text-left py-3 pl-4 text-xs font-bold text-slate-400 uppercase w-1/3">Metric / Driver</th>
             {scenarios.map(s => (
               <th key={s.id} className="text-right py-3 px-4 text-xs font-bold text-indigo-800 uppercase w-32">{s.name}</th>
             ))}
          </tr>
       </thead>
       <tbody className="divide-y divide-slate-50">
          {rows.map((row, idx) => (
            <tr key={idx} className={`hover:bg-slate-50/80 ${row.highlight ? 'bg-indigo-50/30' : ''}`}>
               <td className="py-3 pl-4">
                  <div className="text-xs font-bold text-slate-700">{row.label}</div>
                  {row.subLabel && <div className="text-[10px] text-slate-400 font-medium">{row.subLabel}</div>}
               </td>
               {row.values.map((val, vIdx) => (
                 <td key={vIdx} className="py-3 px-4 text-right text-sm font-medium text-slate-700">
                    {val}
                 </td>
               ))}
            </tr>
          ))}
       </tbody>
    </table>
  </div>
);

const ScenarioSnapshotCard = ({ 
  scenario, 
  metrics, 
  project, 
  isActive, 
  onSelect,
  onDeepDive
}: { 
  scenario: StrategyParams, 
  metrics: CalculatedMetrics, 
  project: ProjectReality, 
  isActive: boolean, 
  onSelect: () => void,
  onDeepDive: () => void,
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
          Selected Direction
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
           <div className="text-[9px] text-slate-400 uppercase font-bold">Total Headcount</div>
           <div className="text-lg font-bold text-slate-800">{metrics.totalHeadcountWithGrowth}</div>
        </div>
        <div>
           <div className="text-[9px] text-slate-400 uppercase font-bold">Workpoints</div>
           <div className="text-lg font-bold text-slate-800">{metrics.requiredDesks}</div>
        </div>
        <div>
           <div className="text-[9px] text-slate-400 uppercase font-bold">Density</div>
           <div className="text-sm font-bold text-slate-800">
             {metrics.density.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">{unitLabel}/p</span>
           </div>
        </div>
        <div>
           <div className="text-[9px] text-slate-400 uppercase font-bold">Space Utilization Index</div>
           <div className={`text-sm font-bold ${metrics.fitFactor > 100 ? 'text-rose-600' : 'text-slate-800'}`}>
             {metrics.fitFactor.toFixed(0)}%
           </div>
        </div>
      </div>
      
      <div className="mt-auto pt-3 border-t border-slate-100 flex justify-between items-center">
         <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500">Meeting Ratio</span>
            <span className="text-xs font-bold text-indigo-600">1 : {metrics.derivedMeetingRatio.toFixed(0)}</span>
         </div>
         <button 
           onClick={(e) => { e.stopPropagation(); onDeepDive(); }}
           className="text-[10px] flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1.5 rounded-md font-bold transition-colors border border-slate-200"
         >
           <Search className="w-3 h-3" /> Details
         </button>
      </div>
    </div>
  );
};

const FloorComparisonView = ({ 
  project, 
  scenarios, 
  metricsMap, 
  programGroups 
}: { 
  project: ProjectReality, 
  scenarios: StrategyParams[], 
  metricsMap: Record<string, CalculatedMetrics>,
  programGroups: ProgramGroup[]
}) => {
  const CONSTANTS = getAreaConstants(project.unit);

  return (
    <div className="space-y-6">
       {project.floors.map(floor => {
          const floorChartData = scenarios.map(s => {
             const fMetric = metricsMap[s.id].floorMetrics.find(fm => fm.floorId === floor.id);
             const dataPoint: any = { name: s.name };
             
             if (fMetric) {
               programGroups.forEach(group => {
                  let groupArea = 0;
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
                  dataPoint[group.id] = groupArea;
               });
             }
             return dataPoint;
          });

          return (
             <div key={floor.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-sm font-bold text-slate-700 mb-3 flex justify-between">
                   <span>{floor.name}</span>
                   <span className="text-slate-400 font-normal text-xs">{floor.headcount} HC</span>
                </h4>
                <div className="h-24">
                   <VisualMixChart 
                     data={floorChartData}
                     groups={programGroups}
                     unit={project.unit.toUpperCase()}
                     layout="horizontal"
                     barSize={30}
                     showLegend={false}
                     showLabels={true}
                   />
                </div>
             </div>
          );
       })}
    </div>
  );
};

const RecommendationEngine = ({ 
  scenario, 
  metrics, 
  project, 
  programGroups 
}: { 
  scenario: StrategyParams, 
  metrics: CalculatedMetrics, 
  project: ProjectReality, 
  programGroups: ProgramGroup[],
  key?: any
}) => {
    // Helper to generate dimension-specific insights
    const getWorkstationInsight = () => {
        if (metrics.effectiveDeskRatio <= 1.0) return "Assignments: Traditional 1:1 model ensures dedicated seating for all, minimizing change management but maximizing area consumption.";
        if (metrics.effectiveDeskRatio < 1.4) return "Assignments: Hybrid approach introduces sharing while maintaining team anchors. Requires team-level zoning.";
        return "Assignments: High-agility model assumes mostly mobile workforce. Relies heavily on alternative settings to absorb overflow.";
    };

    const getCollaborationInsight = () => {
        if (metrics.derivedMeetingRatio > 25) return "Collaboration: Lean meeting ratio may cause room scarcity during peak hours. Focus on bookable open collab zones.";
        if (metrics.derivedMeetingRatio < 15) return "Collaboration: High provision of enclosed meeting spaces supports intensive privacy needs but impacts open plan capacity.";
        return "Collaboration: Balanced meeting supply aligns with standard benchmarks.";
    };

    const getSupportInsight = () => {
        const supportPct = (metrics.areaSupport / metrics.totalUsedArea) * 100;
        if (supportPct > 15) return "Experience: Amenity-rich environment emphasizes social connection and wellness over density.";
        return "Experience: Functional approach to amenities prioritizes operational efficiency.";
    };

    return (
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 h-full flex flex-col">
            <div className="flex justify-between items-start mb-3 border-b border-slate-200 pb-2">
               <div className="text-xs font-bold text-slate-700 truncate pr-2">{scenario.name}</div>
               <div className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-slate-200 text-slate-600`}>
                  Strategy Profile
               </div>
            </div>
            
            <ul className="space-y-3 flex-grow">
                {[
                    { label: "Workstations", text: getWorkstationInsight() },
                    { label: "Meeting & Collab", text: getCollaborationInsight() },
                    { label: "Support", text: getSupportInsight() }
                ].map((item, i) => (
                    <li key={i} className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{item.label}</span>
                        <span className="text-xs text-slate-600 leading-snug">{item.text}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

// --- MAIN COMPONENT ---

const StrategicDecisionView: React.FC<Props> = ({ project, scenarios, activeScenarioId, onActivateScenario, onProceed }) => {
  // Deep Dive State
  const [deepDiveId, setDeepDiveId] = useState<string | null>(null);

  // Comparison State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Lens State (Visibility)
  const [expandedLenses, setExpandedLenses] = useState<LensType[]>(['metrics', 'implications']);

  useEffect(() => {
     const initial = [activeScenarioId];
     const others = scenarios.filter(s => s.id !== activeScenarioId).slice(0, 2);
     others.forEach(o => initial.push(o.id));
     setSelectedIds(initial);
  }, [scenarios, activeScenarioId]);

  const toggleLens = (id: LensType) => {
    setExpandedLenses(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]);
  };

  // Helper: Get metrics for all
  const scenarioMetricsMap = useMemo(() => {
    return scenarios.reduce((acc, s) => {
      acc[s.id] = calculateMetrics(project, s);
      return acc;
    }, {} as Record<string, CalculatedMetrics>);
  }, [project, scenarios]);

  // Derived Data
  const comparedScenarios = scenarios.filter(s => selectedIds.includes(s.id));
  const activeScenario = scenarios.find(s => s.id === activeScenarioId);
  const activeMetrics = activeScenario ? scenarioMetricsMap[activeScenarioId] : null;

  // Program Groups (Program Structure)
  const programGroups = project.programStructure || getProgramPreset(project.projectType);

  // Visual Mix Data
  const visualMixData = useMemo(() => {
     const CONSTANTS = getAreaConstants(project.unit);
     return comparedScenarios.map(s => {
         const metrics = scenarioMetricsMap[s.id];
         const dataPoint: any = { name: s.name };
         programGroups.forEach(group => {
            let groupArea = 0;
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

    // --- RENDER DEEP DIVE ---
  // Temporarily disabled because ScenarioDeepDive component is missing in this prototype build.
  if (deepDiveId) {
    return (
      <div className="p-6">
        <div className="max-w-3xl mx-auto bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-900">
          <div className="font-bold mb-2">Deep Dive (temporary placeholder)</div>
          <div className="text-sm">
            This prototype references <span className="font-mono">ScenarioDeepDive</span>, but the component
            isn’t present in the codebase, so Deep Dive is disabled for build/deploy.
          </div>
          <button
            className="mt-4 px-3 py-2 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 font-bold text-sm"
            onClick={() => setDeepDiveId(null)}
          >
            Back
          </button>
        </div>
      </div>
    );
  }


  // --- RENDER COMPARISON DASHBOARD ---
  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
      
      {/* Left Sidebar: Scenario Selector */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col z-10 flex-shrink-0">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
             <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-indigo-600" /> Compare
             </h2>
             <p className="text-xs text-slate-500 mt-1">Select up to 3 scenarios.</p>
          </div>
          <div className="flex-grow overflow-y-auto p-2 space-y-2">
             {scenarios.map(s => {
               const isSelected = selectedIds.includes(s.id);
               const isActive = activeScenarioId === s.id;
               return (
                 <div 
                   key={s.id}
                   className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-50 border-indigo-200' 
                        : 'bg-white border-slate-200 hover:border-indigo-200'
                   }`}
                   onClick={() => toggleSelection(s.id)}
                 >
                    <div className="flex items-center gap-2 mb-1">
                       <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                          {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                       </div>
                       <span className={`text-sm font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-600'}`}>{s.name}</span>
                    </div>
                    {isActive && <div className="ml-6 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Current Selection</div>}
                 </div>
               );
             })}
          </div>
      </div>

      {/* Main Content: Decision Framework */}
      <div className="flex-grow flex flex-col overflow-hidden relative">
         
         {/* Scrollable Workspace */}
         <div className="flex-grow overflow-y-auto p-8 custom-scrollbar bg-slate-50/50">
            <div className="max-w-5xl mx-auto space-y-6 pb-32">
               
               <div className="mb-8">
                  <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Strategic Decision Framework</h1>
                        <p className="text-slate-500">Evaluating strategies for {project.projectName}.</p>
                    </div>
                  </div>
               </div>

               {/* Lens 1: High-Level Metrics (Always Visible if enabled, but using Lens wrapper) */}
               <LensSection 
                  title="Strategic Metrics Overview" 
                  icon={Layout} 
                  isOpen={expandedLenses.includes('metrics')} 
                  onToggle={() => toggleLens('metrics')}
               >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {comparedScenarios.map(s => (
                          <ScenarioSnapshotCard 
                              key={s.id}
                              scenario={s}
                              metrics={scenarioMetricsMap[s.id]}
                              project={project}
                              isActive={activeScenarioId === s.id}
                              onSelect={() => onActivateScenario(s.id)}
                              onDeepDive={() => setDeepDiveId(s.id)}
                          />
                      ))}
                  </div>
               </LensSection>

               {/* Lens 2: Workplace Strategy */}
               <LensSection 
                  title="Workstation Strategy" 
                  icon={Monitor} 
                  isOpen={expandedLenses.includes('workpoints')} 
                  onToggle={() => toggleLens('workpoints')}
                  deltaValues={comparedScenarios.map(s => scenarioMetricsMap[s.id].requiredDesks)}
               >
                  <ComparisonTable 
                    scenarios={comparedScenarios}
                    rows={[
                      { label: 'Total Workpoints (Seats)', values: comparedScenarios.map(s => scenarioMetricsMap[s.id].requiredDesks.toLocaleString()), highlight: true },
                      { label: 'Open Workstations', values: comparedScenarios.map(s => scenarioMetricsMap[s.id].openDesks) },
                      { label: 'Enclosed Offices (Private)', values: comparedScenarios.map(s => scenarioMetricsMap[s.id].enclosedOffices) },
                      { label: 'Alternative Workpoints', values: comparedScenarios.map(s => scenarioMetricsMap[s.id].altDesks) },
                      { label: 'Effective Sharing Ratio', subLabel: 'Total HC / Total Seats', values: comparedScenarios.map(s => `1 : ${scenarioMetricsMap[s.id].effectiveDeskRatio.toFixed(2)}`) },
                    ]}
                  />
               </LensSection>

               {/* Lens 3: Meeting & Collaboration */}
               <LensSection 
                  title="Meeting Rooms" 
                  icon={Users} 
                  isOpen={expandedLenses.includes('meeting')} 
                  onToggle={() => toggleLens('meeting')}
                  deltaValues={comparedScenarios.map(s => scenarioMetricsMap[s.id].totalMeetingRooms)}
               >
                  <ComparisonTable 
                    scenarios={comparedScenarios}
                    rows={[
                      { label: 'Total Enclosed Meeting Rooms', values: comparedScenarios.map(s => scenarioMetricsMap[s.id].totalMeetingRooms), highlight: true },
                      { label: 'Total Meeting Capacity (Seats)', values: comparedScenarios.map(s => scenarioMetricsMap[s.id].totalMeetingSeats) },
                      { label: 'Effective Meeting Ratio', subLabel: 'Headcount per Room', values: comparedScenarios.map(s => `1 : ${scenarioMetricsMap[s.id].derivedMeetingRatio.toFixed(1)}`) },
                      // Room Mix
                      { label: 'Small Meeting Rooms (4p)', values: comparedScenarios.map(s => scenarioMetricsMap[s.id].roomMix.small) },
                      { label: 'Medium Meeting Rooms (8p)', values: comparedScenarios.map(s => scenarioMetricsMap[s.id].roomMix.medium) },
                      { label: 'Large Meeting Rooms (14p)', values: comparedScenarios.map(s => scenarioMetricsMap[s.id].roomMix.large) },
                      { label: 'Boardrooms (20p)', values: comparedScenarios.map(s => scenarioMetricsMap[s.id].roomMix.board) },
                      { label: 'Phone Booths (1p)', values: comparedScenarios.map(s => scenarioMetricsMap[s.id].totalPhoneBooths) },
                    ]}
                  />
               </LensSection>

               {/* Lens 4: Support & Amenities */}
               <LensSection 
                  title="Support & Amenity Allocation" 
                  icon={Coffee} 
                  isOpen={expandedLenses.includes('support')} 
                  onToggle={() => toggleLens('support')}
                  deltaValues={comparedScenarios.map(s => Math.round(scenarioMetricsMap[s.id].areaSupport))}
               >
                  <ComparisonTable 
                     scenarios={comparedScenarios}
                     rows={[
                        { label: 'Total Support Area', values: comparedScenarios.map(s => `${Math.round(scenarioMetricsMap[s.id].areaSupport).toLocaleString()} ${project.unit.toUpperCase()}`), highlight: true },
                        { label: '% of NIA', values: comparedScenarios.map(s => `${(scenarioMetricsMap[s.id].areaSupport / project.calculatedNia * 100).toFixed(1)}%`) },
                        // Dynamic Rows for each support type
                        ...(() => {
                           // 1. Collect all unique support names from all scenarios
                           const allSupportNames = new Set<string>();
                           comparedScenarios.forEach(s => s.supportSpaces.forEach(sp => allSupportNames.add(sp.name)));
                           
                           // 2. Generate rows for each
                           return Array.from(allSupportNames).map(name => {
                              return {
                                 label: name,
                                 values: comparedScenarios.map(s => {
                                    // Find definition in strategy
                                    const def = s.supportSpaces.find(sp => sp.name === name);
                                    // Find actual count/area from metrics
                                    const summary = getSupportTotals(scenarioMetricsMap[s.id]);
                                    const actual = summary[name];
                                    
                                    if (!def || !actual) return '-';
                                    
                                    // Format: "Count (Logic)" or "Area (Logic)"
                                    const logicStr = def.logic === 'ratio' ? `1:${def.value}` : def.logic === 'pct_nia' ? `${def.value}%` : 'Fixed';
                                    
                                    if (actual.count > 0) return `${actual.count} (${logicStr})`;
                                    return `${Math.round(actual.area)} ${project.unit === 'sqm' ? 'm²' : 'ft²'} (${logicStr})`;
                                 })
                              };
                           });
                        })()
                     ]}
                  />
               </LensSection>

               {/* Lens 5: Program Mix */}
               <LensSection 
                  title="Program Mix (Space Distribution)" 
                  icon={PieChart} 
                  isOpen={expandedLenses.includes('space_mix')} 
                  onToggle={() => toggleLens('space_mix')}
               >
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-72">
                      <VisualMixChart 
                          data={visualMixData}
                          groups={programGroups}
                          unit={project.unit.toUpperCase()}
                          layout="horizontal"
                          barSize={60}
                          showLabels={true}
                      />
                  </div>
               </LensSection>

               {/* Lens 6: Floor Composition */}
               <LensSection 
                  title="Floor-by-Floor Breakdown" 
                  icon={Layers} 
                  isOpen={expandedLenses.includes('floors')} 
                  onToggle={() => toggleLens('floors')}
               >
                  <FloorComparisonView 
                    project={project} 
                    scenarios={comparedScenarios} 
                    metricsMap={scenarioMetricsMap}
                    programGroups={programGroups}
                  />
               </LensSection>

               {/* Lens 7: Implications */}
               <LensSection 
                  title="Strategic Implications & Recommendations" 
                  icon={TrendingUp} 
                  isOpen={expandedLenses.includes('implications')} 
                  onToggle={() => toggleLens('implications')}
               >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {comparedScenarios.map(s => (
                           <RecommendationEngine key={s.id} scenario={s} metrics={scenarioMetricsMap[s.id]} project={project} programGroups={programGroups} />
                      ))}
                  </div>
               </LensSection>

            </div>
         </div>

         {/* Bottom Action Bar */}
         <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-2xl flex justify-between items-center z-20 px-8">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-indigo-100 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-indigo-700" />
               </div>
               <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Selected Strategy</div>
                  <div className="text-lg font-bold text-slate-800">{activeScenario?.name}</div>
               </div>
               {activeMetrics && (
                  <div className={`ml-4 px-3 py-1 rounded text-xs font-bold ${activeMetrics.fitFactor <= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                     {activeMetrics.fitFactor.toFixed(0)}% Utilization
                  </div>
               )}
            </div>
            
            <button 
               onClick={onProceed}
               className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-all hover:translate-x-1"
            >
               Proceed to Stacking Plan <Layers className="w-4 h-4" />
            </button>
         </div>
      </div>
    </div>
  );
};

export default StrategicDecisionView;
