
import React, { useState, useEffect, useMemo } from 'react';
import { CalculatedMetrics, ProjectReality, StrategyParams, ProgramGroup } from '../types';
import { Copy, Layers, Columns, List, Maximize2, Minimize2, Settings, Check, PieChart as PieIcon, X, ArrowRightLeft, Plus, Trash2, AlertTriangle, Tag } from 'lucide-react';
import { getAreaConstants, getProgramPreset } from '../constants';
import VisualMixChart from './VisualMixChart';

interface Props {
  metrics: CalculatedMetrics;
  project: ProjectReality;
  strategy: StrategyParams;
  mode?: 'default' | 'review';
  onUpdateProject?: (p: ProjectReality) => void;
}

// Available Keys for Mapping - Updated Labels for Agile Strategy
const MAPPABLE_ITEMS = [
  { id: 'work_open', label: 'Fixed Workstations' },
  { id: 'work_enclosed', label: 'Enclosed Offices (Private)' },
  { id: 'work_alt', label: 'Alternative Workpoints' },
  { id: 'meet', label: 'Meeting Rooms (Enclosed)' },
  { id: 'phone', label: 'Phone Booths' },
  { id: 'circ', label: 'Circulation' },
];

const PRESET_COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#64748b'];

const ProgramStructureConfig = ({ 
  groups, 
  supportSpaces,
  onSave, 
  onClose 
}: { 
  groups: ProgramGroup[], 
  supportSpaces: {id: string, name: string}[],
  onSave: (groups: ProgramGroup[]) => void, 
  onClose: () => void 
}) => {
  const [localGroups, setLocalGroups] = useState<ProgramGroup[]>(JSON.parse(JSON.stringify(groups)));

  // Ensure all support spaces are in the list
  const allItems = [
    ...MAPPABLE_ITEMS,
    ...supportSpaces.map(s => ({ id: s.id, label: s.name }))
  ];

  const handleAddGroup = () => {
    const newId = `g-${Date.now()}`;
    const nextColor = PRESET_COLORS[localGroups.length % PRESET_COLORS.length];
    setLocalGroups([...localGroups, { 
      id: newId, 
      name: 'New Category', 
      color: nextColor, 
      items: [] 
    }]);
  };

  const handleRemoveGroup = (groupId: string) => {
    if (localGroups.length <= 1) return; // Prevent deleting last group

    const groupToRemove = localGroups.find(g => g.id === groupId);
    const targetGroup = localGroups.find(g => g.id !== groupId); // Fallback group to catch items

    if (!targetGroup) return;

    // Migrate items from deleted group to target group
    const updatedGroups = localGroups
      .filter(g => g.id !== groupId)
      .map(g => {
        if (g.id === targetGroup.id) {
          return { ...g, items: [...g.items, ...(groupToRemove?.items || [])] };
        }
        return g;
      });

    setLocalGroups(updatedGroups);
  };

  const handleMoveItem = (itemId: string, targetGroupId: string) => {
    const newGroups = localGroups.map(g => ({
      ...g,
      items: g.id === targetGroupId 
        ? [...g.items, itemId] 
        : g.items.filter(id => id !== itemId)
    }));
    setLocalGroups(newGroups);
  };

  const updateGroupColor = (groupId: string, color: string) => {
    setLocalGroups(localGroups.map(g => g.id === groupId ? { ...g, color } : g));
  };
  
  const updateGroupName = (groupId: string, name: string) => {
    setLocalGroups(localGroups.map(g => g.id === groupId ? { ...g, name } : g));
  };

  const isWarning = localGroups.length > 6;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
       <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
             <div>
                <h3 className="font-bold text-slate-800 text-lg">Configure Program Structure</h3>
                <p className="text-sm text-slate-500 mt-1">Define how space types are categorized for visual analysis and reporting.</p>
             </div>
             <button onClick={onClose}><X className="w-6 h-6 text-slate-400 hover:text-slate-700" /></button>
          </div>
          
          <div className="flex-grow overflow-y-auto p-6 bg-slate-50/50">
             
             {isWarning && (
                <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm text-amber-800">
                   <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                   <div>
                      <span className="font-bold">Recommendation:</span> You have defined {localGroups.length} categories. 
                      For optimal clarity in client presentations, we recommend sticking to 4-6 distinct program categories. 
                      Excess categories will be automatically collapsed into "Other" in some summary charts.
                   </div>
                </div>
             )}

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {localGroups.map(group => (
                  <div key={group.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                     <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
                        <input 
                          type="color" 
                          value={group.color} 
                          onChange={(e) => updateGroupColor(group.id, e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer border-0 p-0 overflow-hidden"
                        />
                        <input 
                          type="text" 
                          value={group.name} 
                          onChange={(e) => updateGroupName(group.id, e.target.value)}
                          className="font-bold text-sm bg-transparent border-b border-transparent focus:border-indigo-500 outline-none text-slate-800 flex-grow"
                          placeholder="Category Name"
                        />
                        {localGroups.length > 1 && (
                           <button 
                             onClick={() => handleRemoveGroup(group.id)}
                             className="text-slate-300 hover:text-rose-500 transition-colors"
                             title="Delete Category (Items will be moved)"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                        )}
                     </div>
                     
                     <div className="space-y-2">
                        {group.items.length === 0 ? (
                           <div className="text-xs text-slate-400 italic py-4 text-center border-2 border-dashed border-slate-100 rounded">
                              No items assigned
                           </div>
                        ) : (
                           group.items.map(itemId => {
                             const itemDef = allItems.find(i => i.id === itemId);
                             return (
                               <div key={itemId} className="relative group flex items-center bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs hover:border-indigo-300 transition-colors">
                                  <span className="mr-2 text-slate-700 font-medium truncate flex-grow" title={itemDef?.label}>
                                     {itemDef?.label || itemId}
                                  </span>
                                  
                                  {/* Dropdown overlay for moving items */}
                                  <div className="relative">
                                     <ArrowRightLeft className="w-3 h-3 text-slate-300 group-hover:text-indigo-600" />
                                     <select 
                                       className="absolute right-0 top-0 w-6 h-6 opacity-0 cursor-pointer" 
                                       value={group.id} 
                                       onChange={(e) => handleMoveItem(itemId, e.target.value)}
                                     >
                                        {localGroups.map(g => <option key={g.id} value={g.id}>Move to {g.name}</option>)}
                                     </select>
                                  </div>
                               </div>
                             );
                           })
                        )}
                     </div>
                  </div>
                ))}

                {/* Add Group Button */}
                <button 
                   onClick={handleAddGroup}
                   className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all min-h-[200px]"
                >
                   <div className="p-3 bg-white rounded-full shadow-sm">
                      <Plus className="w-6 h-6" />
                   </div>
                   <span className="text-sm font-bold">Add Category</span>
                </button>
             </div>
          </div>

          <div className="p-5 border-t border-slate-200 flex justify-between items-center bg-white">
             <div className="text-xs text-slate-500">
                <strong>Integrity Check:</strong> All space types must belong to exactly one category.
             </div>
             <div className="flex gap-3">
                <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button 
                  onClick={() => onSave(localGroups)}
                  className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-md transition-all transform hover:scale-105"
                >
                  Apply Configuration
                </button>
             </div>
          </div>
       </div>
    </div>
  );
};

const StackingPlan: React.FC<Props> = ({ metrics, project, strategy, mode = 'default', onUpdateProject }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'matrix' | 'visual'>(mode === 'review' ? 'visual' : 'summary');
  const [viewMode, setViewMode] = useState<'qty' | 'area'>('qty'); 
  const [copied, setCopied] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const [programGroups, setProgramGroups] = useState<ProgramGroup[]>(
    project.programStructure || getProgramPreset(project.projectType)
  );

  useEffect(() => {
    if (project.programStructure) setProgramGroups(project.programStructure);
  }, [project.programStructure]);

  const handleSaveConfig = (newGroups: ProgramGroup[]) => {
    setProgramGroups(newGroups);
    if (onUpdateProject) {
      onUpdateProject({ ...project, programStructure: newGroups });
    }
    setShowConfig(false);
  };

  const unit = project.unit.toUpperCase();
  const floors = project.floors;

  const handleCopy = () => {
    const header = ['Space Type', ...floors.map(f => f.name), 'Total'].join('\t');
    const rows = [
      ['Headcount', ...metrics.floorMetrics.map(f => f.headcount), metrics.totalHeadcountWithGrowth],
      ['Total Seats', ...metrics.floorMetrics.map(f => f.totalDesks), metrics.requiredDesks],
      ['Used Area', ...metrics.floorMetrics.map(f => Math.round(f.areaUsed)), Math.round(metrics.totalUsedArea)],
    ];
    const text = [header, ...rows.map(r => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFullScreen = () => setIsFullScreen(!isFullScreen);

  const chartData = useMemo(() => {
    const CONSTANTS = getAreaConstants(project.unit);
    
    return floors.map((floor) => {
      const fMetric = metrics.floorMetrics.find(m => m.floorId === floor.id);
      if (!fMetric) return { name: floor.name };

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
            const supportDef = strategy.supportSpaces.find(s => s.id === itemId);
            if (supportDef) {
               const summaryItem = fMetric.supportSummary.find(s => s.name === supportDef.name);
               if (summaryItem) groupArea += summaryItem.area;
            }
          }
        });
        dataPoint[group.id] = groupArea;
      });

      return dataPoint;
    });
  }, [metrics, project, programGroups, strategy]);

  const containerClass = isFullScreen 
    ? 'fixed inset-0 z-50 bg-white flex flex-col' 
    : 'bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full';

  const Cell = ({ val, isTotal = false, type = 'number' }: { val: number, isTotal?: boolean, type?: 'number'|'area'|'percent', key?: any }) => (
    <td className={`px-4 py-3 text-right text-xs whitespace-nowrap ${
      isTotal 
        ? 'font-bold bg-indigo-50 text-indigo-900 border-l border-slate-200 sticky right-0 z-10' 
        : 'text-slate-600 border-b border-slate-50'
    }`}>
       {type === 'area' ? Math.round(val).toLocaleString() : 
        type === 'percent' ? `${val.toFixed(0)}%` : 
        val.toLocaleString()}
    </td>
  );

  const RowHeader = ({ label, isGroup = false }: { label: string, isGroup?: boolean }) => (
    <td className={`sticky left-0 bg-white z-10 px-4 py-3 text-xs border-r border-slate-100 ${
      isGroup ? 'font-bold text-slate-800 bg-slate-50 uppercase tracking-wide' : 'font-medium text-slate-600'
    }`}>
      {label}
    </td>
  );

  return (
    <div className={containerClass}>
      
      <div className="p-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center flex-shrink-0">
         <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
               <Layers className="w-4 h-4 text-indigo-600" />
               {isFullScreen ? 'Stacking Plan (Full Screen)' : 'Stacking Plan'}
            </h3>
            
            <div className="flex items-center gap-1 ml-4 bg-white border border-slate-200 rounded-lg p-0.5">
               <button 
                  onClick={() => setActiveTab('summary')}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-md transition ${activeTab === 'summary' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                  <List className="w-3 h-3" /> Summary
               </button>
               <button 
                  onClick={() => setActiveTab('matrix')}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-md transition ${activeTab === 'matrix' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                  <Columns className="w-3 h-3" /> Matrix
               </button>
               <button 
                  onClick={() => setActiveTab('visual')}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-md transition ${activeTab === 'visual' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                  <PieIcon className="w-3 h-3" /> Program Mix
               </button>
            </div>

            {activeTab === 'visual' && (
               <>
                  <button 
                     onClick={() => setShowConfig(true)}
                     className="ml-2 flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition border border-transparent hover:border-slate-200"
                  >
                     <Settings className="w-3 h-3" /> Structure
                  </button>
               </>
            )}

            {activeTab === 'matrix' && (
               <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 ml-2">
                  <button 
                     onClick={() => setViewMode('qty')}
                     className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${viewMode === 'qty' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500'}`}
                  >
                     Qty
                  </button>
                  <button 
                     onClick={() => setViewMode('area')}
                     className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${viewMode === 'area' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500'}`}
                  >
                     Area
                  </button>
               </div>
            )}
         </div>

         <div className="flex items-center gap-2">
           <button 
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
           >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Export'}
           </button>
           
           <button 
             onClick={toggleFullScreen}
             className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
             title={isFullScreen ? "Exit Full Screen" : "Expand to Full Screen"}
           >
             {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
           </button>
           
           {isFullScreen && (
             <button onClick={toggleFullScreen} className="ml-2 p-1 text-slate-400 hover:text-slate-700">
               <X className="w-5 h-5" />
             </button>
           )}
         </div>
      </div>

      <div className={`flex-grow overflow-auto relative custom-scrollbar ${isFullScreen ? 'p-6 bg-slate-100' : ''}`}>
        {activeTab === 'visual' ? (
           <div className={`h-full flex flex-col ${isFullScreen ? 'bg-white shadow-sm rounded-lg p-6' : 'p-4'}`}>
              <div className="flex-grow w-full min-h-[300px]">
                 <VisualMixChart 
                   data={chartData} 
                   groups={programGroups} 
                   unit={unit} 
                   layout="vertical"
                   showLabels={true} 
                 />
              </div>
           </div>
        ) : (
          <div className={isFullScreen ? 'bg-white shadow-sm rounded-lg overflow-hidden' : ''}>
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white z-20 shadow-sm">
                <tr>
                  <th className="sticky left-0 z-30 bg-white border-b border-slate-200 px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[160px] border-r border-slate-100">
                    Space Type
                  </th>
                  {floors.map(f => (
                    <th key={f.id} className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50 min-w-[100px]">
                      {f.name}
                    </th>
                  ))}
                  <th className="sticky right-0 z-30 bg-indigo-50 border-b border-l border-slate-200 px-4 py-3 text-right text-xs font-bold text-indigo-800 uppercase tracking-wider min-w-[100px]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {activeTab === 'summary' ? (
                  <>
                    <tr><RowHeader label="Headcount (Capacity)" isGroup />{metrics.floorMetrics.map(f => <Cell key={f.floorId} val={f.headcount} />)}<Cell val={metrics.totalHeadcountWithGrowth} isTotal /></tr>
                    <tr><RowHeader label="Total Workpoints (Seats)" />{metrics.floorMetrics.map(f => <Cell key={f.floorId} val={f.totalDesks} />)}<Cell val={metrics.requiredDesks} isTotal /></tr>
                    <tr><RowHeader label="Total Meeting Rooms" />{metrics.floorMetrics.map(f => <Cell key={f.floorId} val={f.meetingRoomsTotal} />)}<Cell val={metrics.totalMeetingRooms} isTotal /></tr>
                    <tr><RowHeader label={`Total Area (${unit})`} isGroup />{metrics.floorMetrics.map(f => <Cell key={f.floorId} val={f.areaUsed} type="area" />)}<Cell val={metrics.totalUsedArea} isTotal type="area" /></tr>
                    <tr><RowHeader label="Space Utilization Index" />{metrics.floorMetrics.map(f => <Cell key={f.floorId} val={f.utilization} type="percent" />)}<Cell val={metrics.fitFactor} isTotal type="percent" /></tr>
                  </>
                ) : (
                  <>
                    <tr className="bg-slate-50/50"><RowHeader label="WORKSTATIONS" isGroup /><td colSpan={floors.length + 1}></td></tr>
                    <tr>
                        <RowHeader label="Enclosed Offices" />
                        {metrics.floorMetrics.map(f => <Cell key={f.floorId} val={viewMode === 'qty' ? f.enclosedOffices : (f.enclosedOffices * 12)} type={viewMode === 'qty' ? 'number' : 'area'} />)}
                        <Cell val={viewMode === 'qty' ? metrics.enclosedOffices : (metrics.enclosedOffices * 12)} isTotal type={viewMode === 'qty' ? 'number' : 'area'} />
                    </tr>
                    <tr>
                        <RowHeader label="Fixed Workstations" />
                        {metrics.floorMetrics.map(f => <Cell key={f.floorId} val={viewMode === 'qty' ? f.openDesks : (f.areaWorkstations - (f.enclosedOffices * 12))} type={viewMode === 'qty' ? 'number' : 'area'} />)}
                        <Cell val={viewMode === 'qty' ? metrics.openDesks : (metrics.areaWorkstations - (metrics.enclosedOffices * 12))} isTotal type={viewMode === 'qty' ? 'number' : 'area'} />
                    </tr>
                    <tr>
                        <RowHeader label="Alternative Workpoints" />
                        {metrics.floorMetrics.map(f => <Cell key={f.floorId} val={viewMode === 'qty' ? f.altDesks : f.altDesks * 3} type={viewMode === 'qty' ? 'number' : 'area'} />)}
                        <Cell val={viewMode === 'qty' ? metrics.altDesks : metrics.altDesks * 3} isTotal type={viewMode === 'qty' ? 'number' : 'area'} />
                    </tr>
                    <tr className="bg-slate-50/50"><RowHeader label="MEETING ROOMS" isGroup /><td colSpan={floors.length + 1}></td></tr>
                    <tr>
                        <RowHeader label="Total Meeting" />
                         {metrics.floorMetrics.map(f => <Cell key={f.floorId} val={viewMode === 'qty' ? f.meetingRoomsTotal : f.areaMeeting} type={viewMode === 'qty' ? 'number' : 'area'} />)}
                         <Cell val={viewMode === 'qty' ? metrics.totalMeetingRooms : metrics.areaMeeting} isTotal type={viewMode === 'qty' ? 'number' : 'area'} />
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showConfig && (
        <ProgramStructureConfig 
          groups={programGroups} 
          supportSpaces={strategy.supportSpaces}
          onSave={handleSaveConfig} 
          onClose={() => setShowConfig(false)} 
        />
      )}
    </div>
  );
};

export default StackingPlan;
