
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ProjectReality, Department, AdjacencyPair, Collaborator } from '../types';
import { GitCommit, Network, Grid, ArrowRight, Info, Columns, Rows, Move, ZoomIn, ZoomOut, Plus, Trash2, ChevronRight, ChevronDown, User, Layers, Menu, X } from 'lucide-react';
import { MM_PALETTE } from '../constants';

interface Props {
  project: ProjectReality;
  onChange: (project: ProjectReality) => void;
  metrics: any; 
  onNavigateToStacking: () => void;
}

// --- UTILS ---

const STRENGTH_LABELS = {
  0: 'None',
  30: 'Low',
  60: 'Medium',
  90: 'High',
  100: 'Critical'
};

const getStrengthLabel = (val: number) => {
  if (val >= 90) return 'Critical';
  if (val >= 60) return 'Medium';
  if (val >= 30) return 'Low';
  return 'None';
};

const getStrengthColor = (val: number) => {
  if (val >= 90) return 'bg-rose-500';
  if (val >= 60) return 'bg-orange-500';
  if (val >= 30) return 'bg-blue-400';
  return 'bg-slate-200';
};

// --- INPUT PANEL COMPONENT ---

const AdjacencyInputPanel = ({ 
  project, 
  onChange, 
  selectedDeptId, 
  onSelectDept 
}: { 
  project: ProjectReality, 
  onChange: (p: ProjectReality) => void,
  selectedDeptId: string | null,
  onSelectDept: (id: string | null) => void
}) => {
  
  const updateDept = (id: string, updates: Partial<Department>) => {
    const newDepts = project.departments.map(d => d.id === id ? { ...d, ...updates } : d);
    onChange({ ...project, departments: newDepts });
  };

  const addDept = () => {
    const newId = `d-${Date.now()}`;
    const newDept: Department = {
      id: newId,
      name: 'New Dept',
      headcount: 10,
      color: MM_PALETTE.departments[project.departments.length % MM_PALETTE.departments.length],
      collaborators: []
    };
    onChange({ ...project, departments: [...project.departments, newDept] });
    onSelectDept(newId);
  };

  const removeDept = (id: string) => {
    const newDepts = project.departments.filter(d => d.id !== id);
    // Also remove any connections pointing TO this dept
    const cleanedDepts = newDepts.map(d => ({
      ...d,
      collaborators: d.collaborators.filter(c => c.deptId !== id)
    }));
    onChange({ ...project, departments: cleanedDepts });
    if (selectedDeptId === id) onSelectDept(null);
  };

  const updateInteraction = (sourceId: string, targetId: string, strength: number) => {
    const sourceDept = project.departments.find(d => d.id === sourceId);
    if (!sourceDept) return;

    let newCollaborators = [...sourceDept.collaborators];
    const existingIdx = newCollaborators.findIndex(c => c.deptId === targetId);

    if (existingIdx >= 0) {
      if (strength === 0) {
        newCollaborators.splice(existingIdx, 1);
      } else {
        newCollaborators[existingIdx] = { ...newCollaborators[existingIdx], strength };
      }
    } else if (strength > 0) {
      newCollaborators.push({ deptId: targetId, strength });
    }

    updateDept(sourceId, { collaborators: newCollaborators });
  };

  const selectedDept = project.departments.find(d => d.id === selectedDeptId);

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-full">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-orange-600" />
          Departments & Flows
        </h3>
        <button onClick={addDept} className="p-1.5 bg-white border border-slate-200 rounded hover:bg-orange-50 hover:text-orange-600 transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar">
        {/* Dept List */}
        <div className="divide-y divide-slate-100">
          {project.departments.map(dept => {
            const isSelected = dept.id === selectedDeptId;
            return (
              <div key={dept.id} className={`group transition-colors ${isSelected ? 'bg-orange-50/50' : 'hover:bg-slate-50'}`}>
                {/* Header Row */}
                <div 
                  className="p-3 flex items-center gap-3 cursor-pointer"
                  onClick={() => onSelectDept(isSelected ? null : dept.id)}
                >
                  <div className="relative">
                     <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: dept.color }}></div>
                     <input 
                       type="color" 
                       className="absolute inset-0 opacity-0 cursor-pointer"
                       value={dept.color}
                       onChange={(e) => updateDept(dept.id, { color: e.target.value })}
                       onClick={(e) => e.stopPropagation()}
                     />
                  </div>
                  
                  <div className="flex-grow min-w-0">
                    <input 
                      className={`text-sm font-bold bg-transparent w-full outline-none truncate ${isSelected ? 'text-orange-900' : 'text-slate-700'}`}
                      value={dept.name}
                      onChange={(e) => updateDept(dept.id, { name: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                       <span className="flex items-center gap-0.5">
                          <User className="w-3 h-3" /> {dept.headcount}
                       </span>
                       <span className="flex items-center gap-0.5">
                          <Layers className="w-3 h-3" /> {project.floors.find(f => f.id === dept.pinnedFloor)?.name || 'Unassigned'}
                       </span>
                    </div>
                  </div>

                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={(e) => { e.stopPropagation(); removeDept(dept.id); }} className="p-1.5 text-slate-300 hover:text-rose-500">
                        <Trash2 className="w-3 h-3" />
                     </button>
                     <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                  </div>
                </div>

                {/* Expanded Editor */}
                {isSelected && (
                  <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-1">
                     
                     {/* Properties */}
                     <div className="grid grid-cols-2 gap-2 mb-4">
                        <div>
                           <label className="text-[10px] font-bold text-slate-400 uppercase">Headcount</label>
                           <input 
                              type="number" 
                              className="w-full text-xs p-1.5 border border-slate-200 rounded bg-white"
                              value={dept.headcount}
                              onChange={(e) => updateDept(dept.id, { headcount: parseInt(e.target.value) || 0 })}
                           />
                        </div>
                        <div>
                           <label className="text-[10px] font-bold text-slate-400 uppercase">Floor</label>
                           <select 
                              className="w-full text-xs p-1.5 border border-slate-200 rounded bg-white"
                              value={dept.pinnedFloor || ''}
                              onChange={(e) => updateDept(dept.id, { pinnedFloor: e.target.value || undefined })}
                           >
                              <option value="">Unassigned</option>
                              {project.floors.map(f => (
                                 <option key={f.id} value={f.id}>{f.name}</option>
                              ))}
                           </select>
                        </div>
                     </div>

                     {/* Interactions */}
                     <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex justify-between">
                           <span>Interaction Strength (0-100)</span>
                           <span className="text-orange-600">With...</span>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                           {project.departments.filter(d => d.id !== dept.id).map(target => {
                              const connection = dept.collaborators.find(c => c.deptId === target.id);
                              const strength = connection?.strength || 0;
                              
                              return (
                                 <div key={target.id} className="flex items-center gap-2 text-xs">
                                    <span className="w-20 truncate text-slate-600" title={target.name}>{target.name}</span>
                                    <input 
                                       type="range" 
                                       min="0" max="100" step="10"
                                       className="flex-grow h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                       value={strength}
                                       onChange={(e) => updateInteraction(dept.id, target.id, parseInt(e.target.value))}
                                    />
                                    <span className={`w-8 text-right font-mono ${strength > 0 ? 'text-slate-800 font-bold' : 'text-slate-300'}`}>{strength}</span>
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {project.departments.length === 0 && (
           <div className="p-8 text-center text-slate-400 text-xs">
              No departments defined.<br/>Click + to add one.
           </div>
        )}
      </div>
    </div>
  );
};

// --- VISUALIZATION COMPONENTS ---

const AdjacencyMatrix = ({ 
  matrix, 
  onCellClick,
  hoveredLink,
  onHoverLink,
  sortedDepts
}: { 
  matrix: Record<string, Record<string, number>>,
  onCellClick: (d1: Department, d2: Department) => void,
  hoveredLink: { d1: string, d2: string } | null,
  onHoverLink: (pair: { d1: string, d2: string } | null) => void,
  sortedDepts: Department[]
}) => {
  const cellSize = 28;
  const headerSize = 100;
  
  // Dynamic sizing based on dept count, but capped max size
  const totalSize = headerSize + (sortedDepts.length * cellSize);

  return (
    <div className="w-full h-full overflow-auto flex justify-center items-center p-4 bg-slate-50/50">
      <div className="relative bg-white shadow-sm border border-slate-200 p-2 rounded-lg" style={{ width: totalSize + 20, height: totalSize + 20 }}>
        
        {/* Top Headers (Targets) */}
        <div className="absolute left-[100px] top-0 flex pointer-events-none">
           {sortedDepts.map((d, i) => (
              <div key={d.id} className="relative h-[100px]" style={{ width: cellSize }}>
                 <div 
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 origin-bottom-left -rotate-45 text-[10px] font-bold text-slate-600 whitespace-nowrap overflow-visible"
                    style={{ width: 120 }}
                 >
                    {d.name}
                 </div>
              </div>
           ))}
        </div>

        {/* Left Headers (Origins) */}
        <div className="absolute top-[100px] left-0 flex flex-col pointer-events-none">
           {sortedDepts.map((d, i) => (
              <div key={d.id} className="h-[28px] w-[100px] flex items-center justify-end pr-2 gap-2">
                 <span className="text-[10px] font-bold text-slate-600 truncate max-w-[70px]" title={d.name}>{d.name}</span>
                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
              </div>
           ))}
        </div>

        {/* Grid */}
        <div className="absolute top-[100px] left-[100px] flex flex-col border-t border-l border-slate-200">
           {sortedDepts.map((row) => (
              <div key={row.id} className="flex">
                 {sortedDepts.map((col) => {
                    if (row.id === col.id) return <div key={col.id} className="bg-slate-100 border-r border-b border-slate-200" style={{ width: cellSize, height: cellSize }} />;
                    
                    const val = matrix[row.id]?.[col.id] || 0;
                    const opacity = val / 100;
                    const isHovered = hoveredLink && ((hoveredLink.d1 === row.id && hoveredLink.d2 === col.id) || (hoveredLink.d1 === col.id && hoveredLink.d2 === row.id));
                    
                    return (
                       <div 
                          key={col.id}
                          className={`border-r border-b border-slate-200 flex items-center justify-center text-[9px] font-bold cursor-pointer transition-all duration-150 ${isHovered ? 'ring-2 ring-indigo-500 z-10 scale-110' : 'hover:bg-slate-50'}`}
                          style={{ 
                             width: cellSize, 
                             height: cellSize, 
                             backgroundColor: val > 0 ? `rgba(249, 115, 22, ${opacity})` : 'transparent', // Orange base
                             color: val > 50 ? 'white' : '#94a3b8' 
                          }}
                          onClick={() => onCellClick(row, col)}
                          onMouseEnter={() => onHoverLink({ d1: row.id, d2: col.id })}
                          onMouseLeave={() => onHoverLink(null)}
                          title={`${row.name} → ${col.name}: ${val}`}
                       >
                          {val > 0 ? val : ''}
                       </div>
                    );
                 })}
              </div>
           ))}
        </div>
      </div>
    </div>
  );
};

const ChordDiagram = ({ 
    sortedDepts, 
    pairs, 
    onHoverLink, 
    hoveredLink, 
    project 
}: { 
    sortedDepts: Department[], 
    pairs: AdjacencyPair[], 
    onHoverLink: (pair: { d1: string, d2: string } | null) => void,
    hoveredLink: { d1: string, d2: string } | null,
    project: ProjectReality
}) => {
    const size = 600;
    const center = size / 2;
    const rInner = 200;
    const rOuter = 220;
    const rFloor = 250; // Floor band ring radius

    // Group logic
    const getFloorName = (id?: string) => project.floors.find(f => f.id === id)?.name || 'Unassigned';
    
    // Calculate layout
    // We want equal visual weight per department for clarity, or headcount weighted?
    // Let's stick to Headcount Weighted but with a min-arc constraint so small depts don't vanish.
    const totalMetric = sortedDepts.reduce((sum, d) => sum + Math.max(d.headcount || 0, 5), 0);
    const gapRad = 0.05; 
    const availableRad = 2 * Math.PI - (gapRad * sortedDepts.length);
    const scale = availableRad / (totalMetric || 1);

    let angle = -Math.PI / 2; // Start top
    const nodes = sortedDepts.map(d => {
        const val = Math.max(d.headcount || 0, 5);
        const sweep = val * scale;
        const start = angle;
        const end = angle + sweep;
        const mid = (start + end) / 2;
        angle = end + gapRad;
        
        // Coords
        const x = center + rInner * Math.cos(mid);
        const y = center + rInner * Math.sin(mid);
        
        return { ...d, start, end, mid, x, y };
    });

    // Floor Arcs
    const floorArcs: any[] = [];
    if (nodes.length > 0) {
        let curFloor = nodes[0].pinnedFloor;
        let startIdx = 0;
        
        nodes.forEach((n, i) => {
            const isLast = i === nodes.length - 1;
            const nextFloor = isLast ? null : nodes[i+1].pinnedFloor;
            
            if (nextFloor !== curFloor || isLast) {
                const startNode = nodes[startIdx];
                const endNode = n; // Include current node in arc
                
                floorArcs.push({ 
                    name: getFloorName(curFloor), 
                    start: startNode.start - 0.02, 
                    end: endNode.end + 0.02 
                });
                
                curFloor = nextFloor;
                startIdx = i + 1;
            }
        });
    }

    // SVG Path Helper
    const arcPath = (r: number, start: number, end: number, thickness: number = 0) => {
        const r2 = r + thickness;
        const x1 = center + r * Math.cos(start);
        const y1 = center + r * Math.sin(start);
        const x2 = center + r * Math.cos(end);
        const y2 = center + r * Math.sin(end);
        
        // For simple strokes
        const flag = end - start <= Math.PI ? 0 : 1;
        return `M ${x1} ${y1} A ${r} ${r} 0 ${flag} 1 ${x2} ${y2}`;
    };

    return (
       <div className="w-full h-full flex items-center justify-center p-4">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full max-w-[600px] select-none">
             
             {/* Floor Rings (Background) */}
             {floorArcs.map((f, i) => {
                 const mid = (f.start + f.end) / 2;
                 // Text pos
                 const tx = center + (rFloor + 25) * Math.cos(mid);
                 const ty = center + (rFloor + 25) * Math.sin(mid);
                 
                 return (
                     <g key={`floor-${i}`}>
                        <path 
                            d={arcPath(rFloor, f.start, f.end)} 
                            fill="none" 
                            stroke="#f1f5f9" 
                            strokeWidth="20" 
                            strokeLinecap="butt" 
                        />
                        {/* Floor Label */}
                        <text 
                            x={tx} y={ty} 
                            textAnchor="middle" 
                            dominantBaseline="middle" 
                            className="text-[10px] font-bold fill-slate-400 uppercase tracking-wide"
                            style={{ fontSize: '10px' }}
                        >
                            {f.name}
                        </text>
                     </g>
                 );
             })}

             {/* Links */}
             {pairs.map((p, i) => {
                 const src = nodes.find(n => n.id === p.dept1.id);
                 const tgt = nodes.find(n => n.id === p.dept2.id);
                 if (!src || !tgt) return null;
                 
                 const isHovered = hoveredLink && ((hoveredLink.d1 === src.id && hoveredLink.d2 === tgt.id) || (hoveredLink.d1 === tgt.id && hoveredLink.d2 === src.id));
                 const isDimmed = hoveredLink && !isHovered;
                 
                 // Quadratic Bezier from src mid to tgt mid through center
                 // Make it curvy: control point is center (0,0 relative to svg?) -> center is (size/2, size/2)
                 
                 return (
                     <path 
                        key={`link-${i}`}
                        d={`M ${src.x} ${src.y} Q ${center} ${center} ${tgt.x} ${tgt.y}`}
                        fill="none"
                        stroke={isHovered ? MM_PALETTE.primary : `url(#grad-${i})`}
                        strokeWidth={isHovered ? 4 : Math.max(1, (p.score / 200) * 12)} // Thickness based on score
                        opacity={isHovered ? 1 : isDimmed ? 0.05 : 0.4}
                        onMouseEnter={() => onHoverLink({ d1: src.id, d2: tgt.id })}
                        onMouseLeave={() => onHoverLink(null)}
                        className="transition-all duration-300 cursor-pointer"
                     />
                 );
             })}
             
             {/* Gradients Definition */}
             <defs>
                {pairs.map((p, i) => {
                    const src = nodes.find(n => n.id === p.dept1.id);
                    const tgt = nodes.find(n => n.id === p.dept2.id);
                    if (!src || !tgt) return null;
                    return (
                        <linearGradient key={`grad-${i}`} id={`grad-${i}`} gradientUnits="userSpaceOnUse" x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}>
                            <stop offset="0%" stopColor={src.color} />
                            <stop offset="100%" stopColor={tgt.color} />
                        </linearGradient>
                    );
                })}
             </defs>

             {/* Dept Nodes (Arcs) */}
             {nodes.map(n => {
                 const isHovered = hoveredLink && (hoveredLink.d1 === n.id || hoveredLink.d2 === n.id);
                 const isDimmed = hoveredLink && !isHovered;
                 
                 // Label pos
                 const midAngle = n.mid;
                 const lx = center + (rOuter + 15) * Math.cos(midAngle);
                 const ly = center + (rOuter + 15) * Math.sin(midAngle);
                 const rotate = (midAngle * 180 / Math.PI) + (lx < center ? 180 : 0);

                 return (
                     <g key={n.id} className="transition-opacity duration-300" style={{ opacity: isDimmed ? 0.2 : 1 }}>
                         {/* Dept Arc */}
                         <path 
                            d={arcPath(rInner, n.start, n.end)} 
                            fill="none" 
                            stroke={n.color} 
                            strokeWidth="16" 
                            className="cursor-pointer hover:brightness-110"
                            onMouseEnter={() => onHoverLink({ d1: n.id, d2: n.id })} // Hack to highlight self
                            onMouseLeave={() => onHoverLink(null)}
                         />
                         
                         {/* Label */}
                         <text 
                            x={lx} y={ly} 
                            textAnchor={lx > center ? 'start' : 'end'} 
                            dominantBaseline="middle" 
                            className="text-[10px] font-bold fill-slate-700 pointer-events-none"
                            // Rotate label to align with radius? Optional. Just flat is readable usually.
                            // Let's do radial alignment for chord standard
                            transform={`rotate(${rotate - (lx < center ? 180 : 0)}, ${lx}, ${ly})`}
                         >
                            {n.name}
                         </text>
                     </g>
                 );
             })}
          </svg>
       </div>
    );
};

// --- MAIN COMPONENT ---

const AdjacencyModel: React.FC<Props> = ({ project, onChange, metrics, onNavigateToStacking }) => {
  const [hoveredLink, setHoveredLink] = useState<{ d1: string, d2: string } | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [isInputOpen, setIsInputOpen] = useState(true); // Drawer state for mobile
  
  const { adjacencyStats } = metrics;
  
  // Sort Logic: By Floor Index then Headcount
  const sortedDepts = useMemo(() => {
      const getFloorIdx = (id?: string) => project.floors.findIndex(f => f.id === id);
      return [...project.departments].sort((a,b) => {
          const f1 = getFloorIdx(a.pinnedFloor);
          const f2 = getFloorIdx(b.pinnedFloor);
          if (f1 !== f2) return (f1 === -1 ? 99 : f1) - (f2 === -1 ? 99 : f2);
          return b.headcount - a.headcount;
      });
  }, [project]);

  // Click on cell -> selects dept in panel
  const handleCellClick = (d1: Department, d2: Department) => {
      setSelectedDeptId(d1.id);
      setIsInputOpen(true);
  };

  return (
    <div className="flex h-full bg-slate-100 overflow-hidden relative">
        
        {/* LEFT: Input Panel (Collapsible/Drawer) */}
        <div className={`transition-all duration-300 ease-in-out bg-white border-r border-slate-200 z-20 flex-shrink-0 flex flex-col absolute md:relative h-full ${isInputOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 md:w-0'}`}>
            <div className="flex-grow overflow-hidden w-80">
                <AdjacencyInputPanel 
                    project={project}
                    onChange={onChange}
                    selectedDeptId={selectedDeptId}
                    onSelectDept={setSelectedDeptId}
                />
            </div>
            
            {/* Toggle Button (Mobile/Desktop) */}
            <button 
                onClick={() => setIsInputOpen(!isInputOpen)}
                className="absolute top-1/2 -right-8 bg-white border border-l-0 border-slate-200 p-1.5 rounded-r-lg shadow-sm text-slate-500 hover:text-indigo-600 z-30"
                title={isInputOpen ? "Collapse Panel" : "Expand Panel"}
            >
                {isInputOpen ? <Menu className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
        </div>

        {/* Restore Button when closed (Desktop specific usually, but handled by absolute button above) */}
        {!isInputOpen && (
             <button 
                onClick={() => setIsInputOpen(true)}
                className="absolute top-4 left-4 bg-white p-2 rounded-lg shadow border border-slate-200 z-10 text-slate-600 hover:text-indigo-600"
             >
                <Columns className="w-5 h-5" />
             </button>
        )}

        {/* RIGHT: Visualizations */}
        <div className="flex-grow flex flex-col h-full overflow-hidden">
            {/* Toolbar */}
            <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex justify-between items-center flex-shrink-0 z-10">
                <div className="ml-10 md:ml-0"> {/* Spacer for toggle button */}
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Network className="w-5 h-5 text-orange-500" /> Team Adjacency Model
                    </h2>
                    <p className="text-xs text-slate-500">Define departmental flows to optimize stacking.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 text-xs text-slate-500">
                        <Info className="w-3 h-3 text-slate-400" />
                        <span>Hover diagram to trace flows</span>
                    </div>
                    <button 
                        onClick={onNavigateToStacking}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                    >
                        Go to Stacking <ArrowRight className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-grow overflow-y-auto p-4 md:p-8 bg-slate-50/50">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full min-h-[600px]">
                    
                    {/* Matrix Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-full min-h-[500px]">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                <Grid className="w-4 h-4 text-slate-400" /> Interaction Matrix
                            </h3>
                            <span className="text-[10px] text-slate-400 font-medium">Click cell to edit flow</span>
                        </div>
                        <div className="flex-grow relative">
                            <AdjacencyMatrix 
                                matrix={adjacencyStats.matrix}
                                onCellClick={handleCellClick}
                                hoveredLink={hoveredLink}
                                onHoverLink={setHoveredLink}
                                sortedDepts={sortedDepts}
                            />
                        </div>
                    </div>

                    {/* Chord Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-full min-h-[500px]">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                <Network className="w-4 h-4 text-slate-400" /> Flow Network
                            </h3>
                            <div className="flex gap-2">
                                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                    <span className="w-2 h-2 rounded-full bg-slate-300"></span> Floor Ring
                                </div>
                            </div>
                        </div>
                        <div className="flex-grow relative flex items-center justify-center bg-white">
                            <ChordDiagram 
                                sortedDepts={sortedDepts}
                                pairs={adjacencyStats.allPairs}
                                onHoverLink={setHoveredLink}
                                hoveredLink={hoveredLink}
                                project={project}
                            />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
  );
};

export default AdjacencyModel;
