
import React, { useMemo } from 'react';
import { CalculatedMetrics, StrategyParams, ProjectReality, ProgramGroup } from '../types';
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { AlertCircle, CheckCircle, Users, Layout, Maximize } from 'lucide-react';
import StackingPlan from './StackingPlan';
import { getAreaConstants, getProgramPreset } from '../constants';

interface Props {
  metrics: CalculatedMetrics;
  strategy: StrategyParams;
  project: ProjectReality;
}

const ResultsDashboard: React.FC<Props> = ({ metrics, strategy, project }) => {
  
  // Use current project structure or fallback to default
  const programGroups = project.programStructure || getProgramPreset(project.projectType);
  const CONSTANTS = getAreaConstants(project.unit);

  // Calculate area per group dynamically
  const areaData = useMemo(() => {
    // We need to sum areas from floor metrics because global support area isn't split by item ID at the top level
    return programGroups.map(group => {
        let value = 0;
        
        // Sum across all floors
        metrics.floorMetrics.forEach(fm => {
            group.items.forEach(itemId => {
                if (itemId === 'work_open') value += fm.openDesks * CONSTANTS.deskOpen;
                else if (itemId === 'work_enclosed') value += fm.enclosedOffices * CONSTANTS.deskEnclosed;
                else if (itemId === 'work_alt') value += fm.altDesks * CONSTANTS.deskAlt;
                else if (itemId === 'meet') value += fm.areaMeeting;
                else if (itemId === 'phone') value += fm.areaPhone;
                else if (itemId === 'circ') value += fm.areaCirculation;
                else {
                    // Support space lookup
                    const supportDef = strategy.supportSpaces.find(s => s.id === itemId);
                    if (supportDef) {
                        const summaryItem = fm.supportSummary.find(s => s.name === supportDef.name);
                        if (summaryItem) value += summaryItem.area;
                    }
                }
            });
        });

        return {
            name: group.name,
            value,
            color: group.color
        };
    }).filter(d => d.value > 0);
  }, [metrics, programGroups, strategy, CONSTANTS]);

  const unitLabel = project.unit.toUpperCase();
  const fitColor = metrics.fitFactor > 100 ? 'text-rose-600' : 'text-emerald-600';

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="bold" style={{ textShadow: '0px 0px 3px rgba(0,0,0,0.5)', pointerEvents: 'none' }}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Helper to get formatted area for a specific group by name (for the summary list)
  const getGroupTotal = (name: string) => {
      const item = areaData.find(d => d.name === name);
      return item ? Math.round(item.value).toLocaleString() : '0';
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-4 flex-shrink-0">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:border-orange-200 transition-colors">
           <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Capacity</span>
           </div>
           <div className="text-3xl font-bold text-slate-800 tracking-tight">{metrics.totalHeadcountWithGrowth}</div>
           <div className="text-xs text-slate-400 mt-1 font-medium">Total People (w/ Growth)</div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:border-orange-200 transition-colors">
           <div className="flex items-center gap-2 mb-3">
              <Layout className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Workpoints</span>
           </div>
           <div className="text-3xl font-bold text-slate-800 tracking-tight">{metrics.requiredDesks}</div>
           <div className="text-xs text-slate-400 flex gap-2 mt-1 font-medium">
              <span>{metrics.openDesks} Open</span>
              <span className="text-slate-300">|</span>
              <span>{metrics.enclosedOffices} Enc</span>
           </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:border-orange-200 transition-colors">
           <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Meeting Rms</span>
           </div>
           <div className="text-3xl font-bold text-slate-800 tracking-tight">{metrics.totalMeetingRooms} <span className="text-lg font-normal text-slate-400">rms</span></div>
           <div className="text-xs text-slate-400 mt-1 font-medium">Ratio 1 : {metrics.derivedMeetingRatio.toFixed(1)}</div>
        </div>
        <div className={`bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow ${metrics.fitFactor > 100 ? 'border-l-4 border-l-rose-500' : 'border-l-4 border-l-emerald-500'}`}>
           <div className="flex items-center gap-2 mb-3">
              <Maximize className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Space Utilization Index</span>
           </div>
           <div className={`text-3xl font-bold tracking-tight ${fitColor}`}>{metrics.fitFactor.toFixed(0)}%</div>
           <div className="text-xs text-slate-400 mt-1 font-medium">{Math.round(metrics.totalUsedArea).toLocaleString()} / {Math.round(project.calculatedNia).toLocaleString()} {unitLabel}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-grow min-h-0">
         <div className="flex flex-col gap-6 min-h-0">
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-64 flex-shrink-0">
                <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center rounded-t-xl">
                   <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Strategic Metrics Overview</h3>
                   <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{metrics.density.toFixed(1)} {unitLabel}/p</span>
                </div>
                <div className="flex-grow p-2">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie data={areaData} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" label={renderCustomizedLabel} labelLine={false}>
                          {areaData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`${Math.round(value).toLocaleString()} ${unitLabel}`, 'Area']} contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }} />
                        <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#475569' }} />
                     </PieChart>
                   </ResponsiveContainer>
                </div>
             </div>
             
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col flex-grow overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-white rounded-t-xl">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Program Budget</h3>
                </div>
                <div className="flex-grow overflow-y-auto p-5 space-y-6 custom-scrollbar">
                   {/* Dynamically render program groups? For now, we stick to key structural categories but updated labels */}
                   
                   {/* Workstations Group */}
                   <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-800 font-bold border-b border-slate-100 pb-2 mb-2">
                          <span>Workstations</span>
                          <span>{getGroupTotal('Workstations')}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500"><span>Open ({metrics.openDesks})</span> <span>Fixed Points</span></div>
                      <div className="flex justify-between text-xs text-slate-500"><span>Enclosed ({metrics.enclosedOffices})</span> <span>Fixed Points</span></div>
                   </div>

                   {/* Collaboration & Meeting Group */}
                   <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-800 font-bold border-b border-slate-100 pb-2 mb-2">
                          <span>Meeting Rooms</span>
                          <span>{getGroupTotal('Meeting Rooms')}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500"><span>Rooms</span> <span>{metrics.totalMeetingRooms}</span></div>
                      <div className="flex justify-between text-xs text-slate-500"><span>Ratio</span> <span>1:{metrics.derivedMeetingRatio.toFixed(0)}</span></div>
                   </div>

                   {/* Collaboration Specific */}
                   <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-800 font-bold border-b border-slate-100 pb-2 mb-2">
                          <span>Collaboration</span>
                          <span>{getGroupTotal('Collaboration')}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500"><span>Open Zones</span> <span className="text-[10px] text-slate-400">Calculated</span></div>
                   </div>

                   {/* Support Group */}
                   <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-800 font-bold border-b border-slate-100 pb-2 mb-2">
                          <span>Support</span>
                          <span>{getGroupTotal('Support')}</span>
                      </div>
                      {/* Filter out open collab from support summary list if it's there */}
                      {metrics.floorMetrics[0]?.supportSummary.filter(s => s.name !== 'Open Collaboration').map((s, i) => (
                        <div key={i} className="flex justify-between text-xs text-slate-500"><span>{s.name}</span><span className="text-[10px] text-slate-400">Included</span></div>
                      ))}
                   </div>
                </div>
             </div>
         </div>
         <div className="min-h-0 h-full">
            <StackingPlan metrics={metrics} project={project} strategy={strategy} />
         </div>
      </div>
    </div>
  );
};

export default ResultsDashboard;