
import React, { useState, useMemo } from 'react';
import { ProjectReality, StrategyParams, CalculatedMetrics, FloorMetrics, ProgramGroup } from '../types';
import { calculateMetrics } from '../utils/calculations';
import { getAreaConstants, getProgramPreset } from '../constants';
import VisualMixChart from './VisualMixChart';
import { 
  ArrowLeft, ChevronDown, ChevronRight, Layout, 
  ArrowRightLeft, Maximize2, Layers, Check, Search, PieChart,
  AlertTriangle, Gauge, Share, FileText, Activity
} from 'lucide-react';

interface Props {
  project: ProjectReality;
  scenario: StrategyParams;
  metrics: CalculatedMetrics;
  allScenarios: StrategyParams[];
  onBack: () => void;
  programGroups: ProgramGroup[];
  onSwitchScenario: (id: string) => void;
  onGoToStacking: () => void;
}

const FloorDetailRow = ({ 
  label, count, area, totalFloorArea, deltaCount, deltaArea, unit, key 
}: { 
  label: string, count: number, area: number, totalFloorArea: number, 
  deltaCount?: number, deltaArea?: number, unit: string, key?: any 
}) => {
  const pct = totalFloorArea > 0 ? (area / totalFloorArea) * 100 : 0;
  
  return (
    <tr className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group">
      <td className="py-2 pl-4 text-sm font-medium text-slate-700">{label}</td>
      <td className="py-2 px-2 text-right text-sm text-slate-600 font-mono">
         {count > 0 ? count : '-'}
         {deltaCount !== undefined && deltaCount !== 0 && (
            <span className={`ml-1 text-[10px] ${deltaCount > 0 ? 'text-blue-600' : 'text-orange-600'}`}>
               {deltaCount > 0 ? '+' : ''}{deltaCount}
            </span>
         )}
      </td>
      <td className="py-2 px-2 text-right text-sm text-slate-600 font-mono">
         {Math.round(area).toLocaleString()}
         {deltaArea !== undefined && deltaArea !== 0 && (
            <span className={`ml-1 text-[10px] ${deltaArea > 0 ? 'text-blue-600' : 'text-orange-600'}`}>
               {deltaArea > 0 ? '+' : ''}{Math.round(deltaArea)}
            </span>
         )}
      </td>
      <td className="py-2 pr-4 text-right text-xs text-slate-400 font-mono">
         {pct > 0 ? `${pct.toFixed(1)}%` : '-'}
      </td>
    </tr>
  );
};

// --- FLOOR STRESS LOGIC ---
const getFloorStress = (fMetric: FloorMetrics, unit: string) => {
   const drivers: string[] = [];
   let level: 'Low' | 'Medium' | 'High' = 'Low';

   // 1. Utilization
   if (fMetric.utilization > 100) {
      level = 'High';
      drivers.push('Over Capacity (>100% Util)');
   } else if (fMetric.utilization > 90) {
      level = 'Medium';
      drivers.push('High Utilization (>90%)');
   }

   // 2. Density
   const density = fMetric.areaUsed / fMetric.headcount;
   // Thresholds vary by unit. Approx 8 sqm or 85 sqft as tight.
   const tightThreshold = unit === 'sqm' ? 8 : 85;
   if (density < tightThreshold) {
      if (level === 'Low') level = 'Medium';
      drivers.push(`High Density (<${tightThreshold} ${unit}/p)`);
   }

   // 3. Meeting Ratio
   const ratio = fMetric.headcount / (fMetric.meetingRoomsTotal || 1);
   if (ratio > 40) {
      // 1 room per 40 people is generally poor availability
      drivers.push('Low Meeting Availability');
   }

   return { level, drivers };
};

const FloorCard = ({ 
  floor, 
  fMetric, 
  project, 
  scenario, 
  programGroups,
  compareFMetric,
  onGoToStacking,
  key
}: { 
  floor: any, 
  fMetric: FloorMetrics, 
  project: ProjectReality, 
  scenario: StrategyParams, 
  programGroups: ProgramGroup[],
  compareFMetric?: FloorMetrics,
  onGoToStacking: () => void,
  key?: any
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [includeInExport, setIncludeInExport] = useState(true);
  
  const unit = project.unit.toUpperCase();
  const CONSTANTS = getAreaConstants(project.unit);
  const { level: stressLevel, drivers } = getFloorStress(fMetric, project.unit);

  const stressColor = stressLevel === 'High' ? 'text-rose-600 bg-rose-50 border-rose-100' 
                   : stressLevel === 'Medium' ? 'text-amber-600 bg-amber-50 border-amber-100'
                   : 'text-emerald-600 bg-emerald-50 border-emerald-100';

  // Helper to get raw data for table
  const getSpaceItems = (metric: FloorMetrics) => {
      return [
          { group: 'Work', label: 'Open Workstations', count: metric.openDesks, area: metric.openDesks * CONSTANTS.deskOpen },
          { group: 'Work', label: 'Enclosed Offices', count: metric.enclosedOffices, area: metric.enclosedOffices * CONSTANTS.deskEnclosed },
          { group: 'Work', label: 'Alternative Points', count: metric.altDesks, area: metric.altDesks * CONSTANTS.deskAlt },
          { group: 'Meet', label: 'Small Mtg (4p)', count: metric.roomsSmall, area: metric.roomsSmall * (project.unit === 'sqm' ? 10 : 100) },
          { group: 'Meet', label: 'Medium Mtg (8p)', count: metric.roomsMedium, area: metric.roomsMedium * (project.unit === 'sqm' ? 18 : 190) },
          { group: 'Meet', label: 'Large Mtg (14p)', count: metric.roomsLarge, area: metric.roomsLarge * (project.unit === 'sqm' ? 25 : 270) },
          { group: 'Meet', label: 'Boardroom (20p)', count: metric.roomsBoard, area: metric.roomsBoard * (project.unit === 'sqm' ? 40 : 430) },
          { group: 'Meet', label: 'Phone Booths', count: metric.phoneBooths, area: metric.phoneBooths * CONSTANTS.phoneBooth },
          ...metric.supportSummary.map(s => ({ group: 'Support', label: s.name, count: s.count, area: s.area })),
          { group: 'Circ', label: 'Circulation', count: 0, area: metric.areaCirculation },
      ].filter(i => i.area > 0 || i.count > 0);
  };

  const items = getSpaceItems(fMetric);
  const compareItems = compareFMetric ? getSpaceItems(compareFMetric) : [];

  // Chart Data Preparation
  const chartData = useMemo(() => {
     const dataPoint: any = { name: floor.name };
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
                const supportDef = scenario.supportSpaces.find(sp => sp.id === itemId);
                if (supportDef) {
                    const summaryItem = fMetric.supportSummary.find(sum => sum.name === supportDef.name);
                    if (summaryItem) groupArea += summaryItem.area;
                }
             }
        });
        dataPoint[group.id] = groupArea;
     });
     return [dataPoint];
  }, [fMetric, programGroups, scenario, CONSTANTS]);

  return (
    <div className={`bg-white rounded-xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-indigo-200 shadow-md ring-1 ring-indigo-50' : 'border-slate-200 shadow-sm'}`}>
       
       {/* Floor Header */}
       <div 
         className={`p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50/50' : ''}`}
         onClick={() => setIsExpanded(!isExpanded)}
       >
          <div className="flex items-center gap-4">
             <div className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
             </div>
             <div>
                <h3 className="font-bold text-slate-800">{floor.name}</h3>
                <div className="text-xs text-slate-500 flex gap-3">
                   <span className="font-mono">{Math.round(fMetric.areaUsed).toLocaleString()} {unit}</span>
                   <span>•</span>
                   <span>{fMetric.headcount} HC</span>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="hidden sm:flex flex-col items-end">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Occupancy</div>
                <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full ${fMetric.utilization > 100 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${Math.min(fMetric.utilization, 100)}%` }}
                        ></div>
                    </div>
                    <span className="text-xs font-bold text-slate-700">{fMetric.utilization.toFixed(0)}%</span>
                </div>
             </div>

             <div className={`px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${stressColor}`}>
                {stressLevel === 'High' ? <AlertTriangle className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                {stressLevel} Stress
             </div>
          </div>
       </div>

       {/* Expanded Details */}
       {isExpanded && (
          <div className="border-t border-slate-100 animate-in slide-in-from-top-2">
             
             {/* 0. Stress & Actions Banner */}
             <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-start">
                 <div className="flex gap-4">
                    {drivers.length > 0 ? (
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Stress Drivers</span>
                            <div className="flex flex-wrap gap-2">
                                {drivers.map((d, i) => (
                                    <span key={i} className="text-xs font-medium text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm">
                                        {d}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                            <Check className="w-4 h-4" /> No critical stress factors detected.
                        </div>
                    )}
                 </div>

                 <div className="flex items-center gap-2">
                     <button 
                        onClick={() => setIncludeInExport(!includeInExport)}
                        className={`text-xs font-bold px-3 py-1.5 rounded border flex items-center gap-1.5 transition-colors ${
                            includeInExport 
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                                : 'bg-white text-slate-400 border-slate-200'
                        }`}
                        title="Include in Design Handoff Export"
                     >
                        {includeInExport ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                        Export
                     </button>
                     <button 
                        onClick={onGoToStacking}
                        className="text-xs font-bold px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 flex items-center gap-1.5 shadow-sm"
                     >
                        <Layers className="w-3 h-3" /> Edit in Stacking
                     </button>
                 </div>
             </div>

             {/* 1. Visual Bar */}
             <div className="p-6 pb-2">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                   <PieChart className="w-3 h-3" /> Program Mix
                </div>
                <div className="h-16 mb-6 bg-white rounded-lg border border-slate-100 p-2 shadow-sm">
                   <VisualMixChart 
                      data={chartData}
                      groups={programGroups}
                      unit={unit}
                      layout="horizontal"
                      barSize={24}
                      showLabels={true}
                      showLegend={false}
                   />
                </div>
             </div>

             {/* 2. Detailed Table */}
             <div className="px-6 pb-6">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                   <Layout className="w-3 h-3" /> Space Breakdown (Design Schedule)
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                   <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                         <tr>
                            <th className="py-2 pl-4 text-left text-xs font-bold text-slate-500 uppercase">Space Type</th>
                            <th className="py-2 px-2 text-right text-xs font-bold text-slate-500 uppercase">Qty</th>
                            <th className="py-2 px-2 text-right text-xs font-bold text-slate-500 uppercase">Area ({unit})</th>
                            <th className="py-2 pr-4 text-right text-xs font-bold text-slate-500 uppercase">% Floor</th>
                         </tr>
                      </thead>
                      <tbody>
                         {items.map((item, idx) => {
                            // Find delta if compare metric exists
                            let dCount = 0;
                            let dArea = 0;
                            if (compareFMetric) {
                               const match = compareItems.find(c => c.label === item.label);
                               if (match) {
                                  dCount = item.count - match.count;
                                  dArea = item.area - match.area;
                               } else {
                                  // Item strictly new in this scenario (or renamed), assume delta is full amount
                                  dCount = item.count;
                                  dArea = item.area;
                               }
                            }

                            return (
                               <FloorDetailRow 
                                  key={idx}
                                  label={item.label}
                                  count={item.count}
                                  area={item.area}
                                  totalFloorArea={fMetric.areaUsed}
                                  unit={unit}
                                  deltaCount={compareFMetric ? dCount : undefined}
                                  deltaArea={compareFMetric ? dArea : undefined}
                               />
                            );
                         })}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
       )}
    </div>
  );
};

const ScenarioDeepDive: React.FC<Props> = ({ 
  project, scenario, metrics, allScenarios, onBack, programGroups, onSwitchScenario, onGoToStacking
}) => {
  const [compareId, setCompareId] = useState<string | null>(null);

  const compareStrategy = allScenarios.find(s => s.id === compareId);
  const compareMetrics = compareStrategy ? calculateMetrics(project, compareStrategy) : null;

  // Project Level Chart Data
  const projectChartData = useMemo(() => {
     const CONSTANTS = getAreaConstants(project.unit);
     const dataPoint: any = { name: "Project Total" };
     
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
                    const supportDef = scenario.supportSpaces.find(sp => sp.id === itemId);
                    if (supportDef) {
                        const summaryItem = fMetric.supportSummary.find(sum => sum.name === supportDef.name);
                        if (summaryItem) groupArea += summaryItem.area;
                    }
                }
            });
        });
        dataPoint[group.id] = groupArea;
     });
     return [dataPoint];
  }, [metrics, programGroups, scenario, project]);

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      
      {/* Header Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-10 sticky top-0">
         <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
              title="Back to Comparison"
            >
               <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3">
               <div className="flex flex-col">
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Active Deep Dive</div>
                 <div className="relative group">
                    <select 
                       className="appearance-none bg-transparent text-xl font-bold text-slate-800 outline-none cursor-pointer pr-8 hover:text-indigo-600 transition-colors"
                       value={scenario.id}
                       onChange={(e) => onSwitchScenario(e.target.value)}
                    >
                       {allScenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                 </div>
               </div>
               
               <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block"></div>
               
               <div className="hidden sm:block">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Project</div>
                  <div className="text-sm font-medium text-slate-600">{project.projectName}</div>
               </div>
            </div>
         </div>

         {/* Compare Control */}
         <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                <ArrowRightLeft className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-600 uppercase mr-2 hidden sm:inline">Side-by-Side</span>
                <select 
                   className="bg-transparent text-sm font-bold text-indigo-700 outline-none cursor-pointer w-32 sm:w-auto"
                   value={compareId || ''}
                   onChange={(e) => setCompareId(e.target.value || null)}
                >
                   <option value="">None</option>
                   {allScenarios.filter(s => s.id !== scenario.id).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                   ))}
                </select>
             </div>
             
             <button 
                onClick={onGoToStacking}
                className="hidden sm:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-all text-sm"
             >
                <Layers className="w-4 h-4" /> Stacking Plan
             </button>
         </div>
      </div>

      <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
         <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
             
             {/* Left Column: Project Overview */}
             <div className="lg:col-span-4 space-y-6">
                 
                 {/* Stats Card */}
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 uppercase mb-4 flex items-center gap-2">
                       <Maximize2 className="w-4 h-4" /> Project Totals
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <div className="text-xs text-slate-500">Total Area</div>
                          <div className="text-xl font-bold text-slate-800">{Math.round(metrics.totalUsedArea).toLocaleString()} <span className="text-xs font-normal text-slate-400">{project.unit.toUpperCase()}</span></div>
                          {compareMetrics && (
                             <div className={`text-xs font-mono ${metrics.totalUsedArea > compareMetrics.totalUsedArea ? 'text-orange-600' : 'text-blue-600'}`}>
                                {metrics.totalUsedArea > compareMetrics.totalUsedArea ? '+' : ''}{Math.round(metrics.totalUsedArea - compareMetrics.totalUsedArea)} vs Base
                             </div>
                          )}
                       </div>
                       <div>
                          <div className="text-xs text-slate-500">Utilization</div>
                          <div className={`text-xl font-bold ${metrics.fitFactor > 100 ? 'text-rose-600' : 'text-emerald-600'}`}>
                             {metrics.fitFactor.toFixed(0)}%
                          </div>
                       </div>
                       <div>
                          <div className="text-xs text-slate-500">Seat Count</div>
                          <div className="text-xl font-bold text-slate-800">{metrics.requiredDesks}</div>
                       </div>
                       <div>
                          <div className="text-xs text-slate-500">Density</div>
                          <div className="text-xl font-bold text-slate-800">{metrics.density.toFixed(1)}</div>
                       </div>
                    </div>
                 </div>

                 {/* Visual Mix */}
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 uppercase mb-4 flex items-center gap-2">
                       <PieChart className="w-4 h-4" /> Program Distribution
                    </h3>
                    <div className="h-64">
                       <VisualMixChart 
                          data={projectChartData}
                          groups={programGroups}
                          unit={project.unit.toUpperCase()}
                          layout="vertical" // Actually means horizontal bars in this specific component config
                          barSize={50}
                          showLabels={true}
                          showLegend={true}
                       />
                    </div>
                 </div>

                 {/* Test Fit Summary Mini */}
                 <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 shadow-sm">
                    <h3 className="text-sm font-bold text-indigo-900 uppercase mb-2 flex items-center gap-2">
                       <Activity className="w-4 h-4" /> Test Fit Diagnostics
                    </h3>
                    <p className="text-xs text-indigo-700 mb-4 leading-relaxed">
                       Overall feasibility assessment based on floor plate capacity and programmatic needs.
                    </p>
                    <div className="flex items-center gap-3">
                        <div className={`text-2xl font-bold ${metrics.adjacencyStats.stressScore > 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                           {Math.max(0, 100 - metrics.adjacencyStats.stressScore).toFixed(0)}/100
                        </div>
                        <div className="text-xs font-bold text-slate-500 uppercase">Fit Score</div>
                    </div>
                 </div>
             </div>

             {/* Right Column: Floor Explorer */}
             <div className="lg:col-span-8">
                 <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                           <Layers className="w-5 h-5 text-indigo-600" /> Floor Explorer
                        </h3>
                        <div className="text-xs text-slate-500 mt-1">
                           Detailed space breakdown and stress analysis per floor.
                        </div>
                    </div>
                    {/* Legend for Stress */}
                    <div className="hidden sm:flex items-center gap-3 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                           <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Low Stress
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                           <div className="w-2 h-2 rounded-full bg-amber-500"></div> Med Stress
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                           <div className="w-2 h-2 rounded-full bg-rose-500"></div> High Stress
                        </div>
                    </div>
                 </div>
                 
                 <div className="space-y-4">
                    {project.floors.map(floor => {
                       const fMetric = metrics.floorMetrics.find(fm => fm.floorId === floor.id);
                       if (!fMetric) return null;
                       
                       const compareFMetric = compareMetrics 
                          ? compareMetrics.floorMetrics.find(fm => fm.name === floor.name) // Match by name usually safer if IDs drift, but ID is best
                          : undefined;

                       return (
                          <FloorCard 
                             key={floor.id}
                             floor={floor}
                             fMetric={fMetric}
                             project={project}
                             scenario={scenario}
                             programGroups={programGroups}
                             compareFMetric={compareFMetric}
                             onGoToStacking={onGoToStacking}
                          />
                       );
                    })}
                 </div>
             </div>
         </div>
      </div>
    </div>
  );
};

export default ScenarioDeepDive;
