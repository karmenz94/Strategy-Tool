
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Upload, FileSpreadsheet, ArrowRight, Check, AlertTriangle, 
  BarChart2, Filter, Info, Download, 
  ChevronRight, RefreshCw, Briefcase, Users, Layout, Settings, X,
  AlignLeft, AlignCenter, Edit2, AlertCircle, ChevronDown, Table, Eye,
  ArrowUp, ArrowDown, Lightbulb, PieChart, CheckCircle, MoreHorizontal, HelpCircle,
  Palette, Image as ImageIcon, FileText, RotateCcw, ChevronUp
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, LineChart, Line, Cell, PieChart as RePieChart, Pie, LabelList, ReferenceLine
} from 'recharts';
import { ObservationRecord, StudyType, RoomPerformanceMetric, MeetingEvent, RoomSizeBreakdown, CapacityFitBucket, GlobalSizeBin, UtilizationMetrics, ConcurrencyMetric } from '../types';
import { 
  REQUIRED_FIELDS_WORKSTATION, REQUIRED_FIELDS_MEETING, 
  parseExcelFile, transformData, calculateWorkstationMetrics, calculateMeetingMetrics, generateSampleData, autoMapColumns, validateMapping, calculateConcurrencyStats
} from '../utils/utilization';
import { MM_PALETTE } from '../constants';
import * as XLSX from 'xlsx';

const UtilizationStudy: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'import' | 'results'>('import');
  const [studyType, setStudyType] = useState<StudyType>('workstation');
  
  // Data State
  const [rawData, setRawData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, number>>({});
  const [records, setRecords] = useState<ObservationRecord[]>([]);
  const [validationErrors, setValidationErrors] = useState<{missing: string[], warnings: string[]} | null>(null);
  const [initialShowMapping, setInitialShowMapping] = useState(false);
  
  // UI State
  const [step, setStep] = useState<1 | 2>(1); // 1: Type, 2: Upload (Auto-processes)
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- HANDLERS ---

  const processAndAdvance = (data: any[], filename: string) => {
    setIsProcessing(true);
    setRawData(data);
    setFileName(filename);
    
    // Assume Row 0 is headers for now
    const headRow = data[0] as string[];
    setHeaders(headRow);

    // Auto Map
    const guessedMappings = autoMapColumns(headRow, studyType === 'workstation' ? 'workstation' : 'meeting');
    setMappings(guessedMappings);

    // Transform immediately for initial view
    const processed = transformData(data, guessedMappings, studyType === 'workstation' ? 'workstation' : 'meeting');
    setRecords(processed);

    // Validation
    const validation = validateMapping(data, guessedMappings, studyType === 'workstation' ? 'workstation' : 'meeting');
    if (!validation.isValid || validation.warnings.length > 0) {
        setValidationErrors({ missing: validation.missingFields, warnings: validation.warnings });
        setInitialShowMapping(true);
    } else {
        setValidationErrors(null);
        setInitialShowMapping(false);
    }

    setTimeout(() => {
        setIsProcessing(false);
        setActiveTab('results');
    }, 800);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await parseExcelFile(file);
      if (data && data.length > 0) {
        processAndAdvance(data, file.name);
        setError(null);
      } else {
        setError("File appears empty.");
      }
    } catch (err) {
      setError("Failed to parse Excel.");
    }
  };

  const loadSample = () => {
      const sample = generateSampleData(studyType === 'workstation' ? 'workstation' : 'meeting');
      setRecords(sample);
      setFileName("Sample_Data.xlsx");
      setInitialShowMapping(false);
      setActiveTab('results');
  };

  // --- RENDER ---

  if (activeTab === 'results') {
      return (
        <ResultsView 
            records={records} 
            type={studyType} 
            onBack={() => { setActiveTab('import'); setStep(1); }} 
            headers={headers}
            rawData={rawData}
            currentMappings={mappings}
            initialShowMapping={initialShowMapping}
            onUpdateMappings={(newMap) => {
                setMappings(newMap);
                const updated = transformData(rawData, newMap, studyType === 'workstation' ? 'workstation' : 'meeting');
                setRecords(updated);
            }}
        />
      );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center">
             <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <BarChart2 className="w-6 h-6 text-orange-500" /> Utilization Study
             </h1>
        </div>

        <div className="flex-grow p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px] flex flex-col justify-center">
                
                {step === 1 && (
                    <div className="p-10 text-center animate-in fade-in">
                        <h3 className="text-2xl font-bold text-slate-800 mb-2">Select Study Type</h3>
                        <p className="text-slate-500 mb-8">Choose the analytical lens for your observation data.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                            <button 
                                onClick={() => { setStudyType('workstation'); setStep(2); }} 
                                className="group p-8 border-2 border-slate-100 hover:border-orange-500 rounded-2xl hover:bg-orange-50/50 transition-all text-left relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Layout className="w-24 h-24 text-orange-600" />
                                </div>
                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Layout className="w-6 h-6 text-orange-600" />
                                </div>
                                <h4 className="text-lg font-bold text-slate-800 mb-1">Workstation Occupancy</h4>
                                <p className="text-sm text-slate-500">Analyze desk usage, peak loads, and department patterns.</p>
                            </button>

                            <button 
                                onClick={() => { setStudyType('meeting'); setStep(2); }} 
                                className="group p-8 border-2 border-slate-100 hover:border-orange-500 rounded-2xl hover:bg-orange-50/50 transition-all text-left relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Users className="w-24 h-24 text-orange-600" />
                                </div>
                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Users className="w-6 h-6 text-orange-600" />
                                </div>
                                <h4 className="text-lg font-bold text-slate-800 mb-1">Meeting Utilization</h4>
                                <p className="text-sm text-slate-500">Evaluate room capacity sizing and frequency of use.</p>
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="p-10 text-center animate-in fade-in">
                        {isProcessing ? (
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mb-6"></div>
                                <h3 className="text-xl font-bold text-slate-800">Processing Data...</h3>
                                <p className="text-slate-500 mt-2">Auto-detecting columns and calculating metrics.</p>
                            </div>
                        ) : (
                            <>
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                    <Upload className="w-10 h-10 text-slate-400" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Upload Data Source</h3>
                                <p className="text-slate-500 max-w-md mx-auto mb-8">
                                    Upload your Excel observation log. The system will automatically detect fields like Date, Time, Floor, and Occupancy.
                                </p>
                                
                                <div className="flex flex-col items-center gap-4">
                                    <label className="cursor-pointer bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-3">
                                        <FileSpreadsheet className="w-5 h-5" />
                                        Select Excel File
                                        <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                                    </label>
                                    
                                    <button onClick={loadSample} className="text-sm font-bold text-slate-400 hover:text-orange-600 transition-colors py-2">
                                        Use Sample Dataset
                                    </button>
                                </div>

                                {error && (
                                    <div className="mt-6 bg-rose-50 text-rose-600 px-4 py-3 rounded-lg inline-flex items-center gap-2 text-sm font-medium">
                                        <AlertTriangle className="w-4 h-4" /> {error}
                                    </div>
                                )}
                                
                                <button onClick={() => setStep(1)} className="mt-12 text-xs font-bold text-slate-400 hover:text-slate-600">
                                    ← Back to Study Type
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

// --- RESULTS VIEW WITH FILTERS & DRAWER ---

interface FilterState {
    floors: string[];
    rooms: string[];
    types: string[];
    weeks: string[];
    days: string[];
    timeSlots: string[];
    // Legacy support
    depts: string[];
    dates: string[];
}

const ResultsView: React.FC<{ 
    records: ObservationRecord[], 
    type: StudyType, 
    onBack: () => void,
    headers: string[],
    rawData: any[],
    currentMappings: Record<string, number>,
    initialShowMapping?: boolean,
    onUpdateMappings: (m: Record<string, number>) => void
}> = ({ records, type, onBack, headers, rawData, currentMappings, initialShowMapping, onUpdateMappings }) => {
    
    const [showMapping, setShowMapping] = useState(false);
    
    // --- DRILL DOWN STATE ---
    const [activeDrillDown, setActiveDrillDown] = useState<{ title: string, events: MeetingEvent[], context?: string } | null>(null);
    const [rawFilterIds, setRawFilterIds] = useState<string[] | null>(null);

    // --- MAPPING LOGIC (DEFERRED APPLY) ---
    const [tempMappings, setTempMappings] = useState<Record<string, number>>({});

    // When drawer opens, load current applied mappings into temp state
    useEffect(() => {
        if (showMapping) {
            setTempMappings({ ...currentMappings });
        }
    }, [showMapping, currentMappings]);

    // Handle Initial Open Request
    useEffect(() => {
        if (initialShowMapping) setShowMapping(true);
    }, [initialShowMapping]);

    const handleApplyMapping = () => {
        onUpdateMappings(tempMappings); // This rebuilds `records` in parent
        setShowMapping(false);
    };

    // --- FILTER LOGIC (VALUE BASED) ---
    const [filters, setFilters] = useState<FilterState>({ floors: [], rooms: [], types: [], weeks: [], days: [], timeSlots: [], depts: [], dates: [] });
    const [userCapacities, setUserCapacities] = useState<Record<string, number>>({}); 

    // Derive distinct options from VALID records only (The Normalized Dataset)
    const options = useMemo(() => {
        const f = new Set<string>();
        const r = new Set<string>();
        const ty = new Set<string>();
        const w = new Set<string>();
        const dy = new Set<number>();
        const t = new Set<string>();
        
        // Legacy
        const dep = new Set<string>();
        const dat = new Set<string>();

        // We assume records are strictly normalized data values now.
        // But we keep a safety check to avoid polluting filters with headers if parser failed
        const isHeader = (v: string) => ['level','floor','department','room','type','capacity','week','day','time'].includes(String(v).toLowerCase().trim());

        records.forEach(rec => {
            if(rec.floor && !isHeader(rec.floor)) f.add(rec.floor);
            if(rec.roomName && !isHeader(rec.roomName)) r.add(rec.roomName);
            if(rec.roomType && !isHeader(rec.roomType)) ty.add(rec.roomType);
            if(rec.week !== undefined) w.add(rec.week.toString());
            if(rec.day !== undefined) dy.add(rec.day);
            if(rec.timeSlot && !isHeader(rec.timeSlot)) t.add(rec.timeSlot);
            
            if(rec.department && !isHeader(rec.department)) dep.add(rec.department);
            if(rec.date) dat.add(rec.date);
        });

        return {
            floors: Array.from(f).sort(),
            rooms: Array.from(r).sort(),
            types: Array.from(ty).sort(),
            weeks: Array.from(w).sort((a,b) => parseInt(a) - parseInt(b)),
            days: Array.from(dy).sort((a,b) => a - b).map(String),
            timeSlots: Array.from(t).sort(),
            depts: Array.from(dep).sort(),
            dates: Array.from(dat).sort()
        };
    }, [records]);

    // Compute filtered subset
    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            if (filters.floors.length && !filters.floors.includes(r.floor)) return false;
            if (filters.timeSlots.length && !filters.timeSlots.includes(r.timeSlot)) return false;
            
            if (type === 'meeting') {
                if (filters.rooms.length && r.roomName && !filters.rooms.includes(r.roomName)) return false;
                if (filters.types.length && r.roomType && !filters.types.includes(r.roomType)) return false;
                if (filters.weeks.length && r.week !== undefined && !filters.weeks.includes(r.week.toString())) return false;
                if (filters.days.length && r.day !== undefined && !filters.days.includes(r.day.toString())) return false;
            } else {
                if (filters.depts.length && r.department && !filters.depts.includes(r.department)) return false;
                if (filters.dates.length && r.date && !filters.dates.includes(r.date)) return false;
            }
            return true;
        });
    }, [records, filters, type]);

    // Metrics based on filtered data
    const metrics = useMemo(() => {
        return type === 'workstation' 
            ? calculateWorkstationMetrics(filteredRecords) 
            : calculateMeetingMetrics(filteredRecords, userCapacities);
    }, [filteredRecords, type, userCapacities]);

    // Check for critical missing fields to show warning badge
    const requiredFields = type === 'workstation' ? REQUIRED_FIELDS_WORKSTATION : REQUIRED_FIELDS_MEETING;
    const missingFields = requiredFields.filter(f => f.required && currentMappings[f.key] === undefined);
    const hasCriticalWarning = missingFields.length > 0;

    const toggleFilter = (key: keyof FilterState, val: string) => {
        setFilters(prev => {
            const list = prev[key];
            return {
                ...prev,
                [key]: list.includes(val) ? list.filter(x => x !== val) : [...list, val]
            };
        });
    };

    const handleUpdateCapacity = (floor: string, room: string, cap: number) => {
        const key = `${floor}::${room}`;
        setUserCapacities(prev => ({ ...prev, [key]: cap }));
    };

    const FilterDropdown = ({ label, items, active, field }: { label: string, items: string[], active: string[], field: keyof FilterState }) => (
        <div className="relative group">
            <button className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${active.length > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                {label} {active.length > 0 && <span className="bg-indigo-600 text-white px-1.5 rounded-full text-[9px]">{active.length}</span>}
                <ChevronRight className="w-3 h-3 rotate-90 text-slate-400" />
            </button>
            <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 hidden group-hover:block z-50 p-2 max-h-64 overflow-y-auto">
                {items.length === 0 ? <div className="p-2 text-xs text-slate-400 italic">No options found</div> : 
                 items.map(item => (
                    <label key={item} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="rounded text-indigo-600 focus:ring-indigo-500" 
                            checked={active.includes(item)}
                            onChange={() => toggleFilter(field, item)}
                        />
                        <span className="text-xs text-slate-700 truncate">{item}</span>
                    </label>
                ))}
            </div>
        </div>
    );

    const handleExport = () => {
        const wb = XLSX.utils.book_new();
        
        // Sheet 1: Raw Data
        const rawSheet = XLSX.utils.json_to_sheet(filteredRecords);
        XLSX.utils.book_append_sheet(wb, rawSheet, "Raw Data");

        // Sheet 2: Analysis
        if (type === 'meeting' && metrics.roomMetrics) {
            const analysisData = metrics.roomMetrics.map(r => ({
                "Floor": r.floor,
                "Room Name": r.roomName,
                "Type": r.roomType,
                "Room Capacity (User)": r.capacity,
                "Observed Slots": r.observedSlots,
                "Occupied Slots": r.occupiedSlots,
                "Utilization %": (r.utilizationPct/100).toFixed(2),
                "Avg Occupancy": r.avgOccupancy.toFixed(1),
                "Top Meeting Size": r.topMeetingSize,
                "Classification": r.classification
            }));
            const analysisSheet = XLSX.utils.json_to_sheet(analysisData);
            XLSX.utils.book_append_sheet(wb, analysisSheet, "Room Performance");
        }

        XLSX.writeFile(wb, "Utilization_Analysis.xlsx");
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-20">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                        <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            {type === 'workstation' ? 'Workstation Occupancy' : 'Meeting Utilization'}
                            {hasCriticalWarning && (
                                <span title="Mapping Incomplete" className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    <AlertTriangle className="w-3 h-3" /> Fix Mapping
                                </span>
                            )}
                        </h2>
                        <p className="text-xs text-slate-500">{filteredRecords.length} Observations Analyzed</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white border border-transparent rounded-lg text-xs font-bold shadow-sm">
                        <Download className="w-4 h-4" /> Export
                    </button>
                </div>
            </div>

            {/* Filter Bar - Only show for Workstation studies */}
            {type === 'workstation' && (
                <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center gap-4 z-10 overflow-x-auto">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mr-2">
                        <Filter className="w-3 h-3" /> Filters:
                    </div>
                    <FilterDropdown label="Floor" items={options.floors} active={filters.floors} field="floors" />
                    <FilterDropdown label="Time Slot" items={options.timeSlots} active={filters.timeSlots} field="timeSlots" />
                    <FilterDropdown label="Department" items={options.depts} active={filters.depts} field="depts" />
                    <FilterDropdown label="Date" items={options.dates} active={filters.dates} field="dates" />
                    <button 
                        onClick={() => setFilters({floors:[], rooms:[], types:[], weeks:[], days:[], timeSlots:[], depts:[], dates:[]})} 
                        className="ml-auto text-xs font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1"
                    >
                        <X className="w-3 h-3" /> Clear
                    </button>
                </div>
            )}

            {/* Dashboard Content */}
            <div className="flex-grow p-8 overflow-y-auto custom-scrollbar">
                <div className="max-w-7xl mx-auto">
                    {filteredRecords.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">
                            <Filter className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>No records match the current filters.</p>
                        </div>
                    ) : type === 'workstation' ? (
                        <WorkstationDash metrics={metrics} />
                    ) : (
                        <MeetingDash 
                            metrics={metrics} 
                            records={filteredRecords}
                            onUpdateCapacity={handleUpdateCapacity}
                            onDrillDown={(title, events, context) => setActiveDrillDown({ title, events, context })}
                        />
                    )}
                </div>
            </div>

            {/* Mapping Drawer */}
            {showMapping && (
                <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
                    <div className="w-[450px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-bold text-slate-800">Auto Field Detection</h3>
                                <p className="text-[10px] text-slate-500 mt-0.5">Map Excel columns to required system fields.</p>
                            </div>
                            <button onClick={() => setShowMapping(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-700" /></button>
                        </div>
                        <div className="flex-grow overflow-y-auto p-6 bg-slate-50/50">
                            {hasCriticalWarning && (
                                <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold block mb-1">Missing Required Fields</span>
                                        <ul className="list-disc list-inside space-y-0.5">
                                            {missingFields.map(f => <li key={f.key}>{f.label}</li>)}
                                        </ul>
                                    </div>
                                </div>
                            )}
                            <div className="space-y-6">
                                 {requiredFields.map(field => {
                                     const selectedIdx = tempMappings[field.key];
                                     const samples = selectedIdx !== undefined && rawData.length > 1 
                                        ? rawData.slice(1, 4).map(r => r[selectedIdx]).filter(v => v !== undefined && v !== '')
                                        : [];
                                     return (
                                     <div key={field.key} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                         <label className="flex justify-between items-center mb-2">
                                             <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                {field.label}
                                                {field.required && <span className="text-rose-500" title="Required">*</span>}
                                             </span>
                                             {selectedIdx === undefined && field.required && (
                                                 <span className="text-[9px] text-rose-500 font-bold uppercase bg-rose-50 px-1.5 py-0.5 rounded">Unmapped</span>
                                             )}
                                         </label>
                                         <select 
                                            className={`w-full p-2 text-sm border rounded outline-none transition-all ${selectedIdx === undefined && field.required ? 'border-rose-300 bg-rose-50 focus:border-rose-500' : 'border-slate-300 bg-white focus:border-indigo-500'}`}
                                            value={selectedIdx ?? ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const newMap = {...tempMappings};
                                                if (val === '') delete newMap[field.key];
                                                else newMap[field.key] = parseInt(val);
                                                setTempMappings(newMap);
                                            }}
                                         >
                                             <option value="">(Select Excel Column)</option>
                                             {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                                         </select>
                                         <div className="mt-2 min-h-[1.5em]">
                                             {selectedIdx !== undefined ? (
                                                 <div className="text-[10px] text-slate-500 flex items-start gap-1.5 bg-slate-50 p-1.5 rounded">
                                                     <span className="font-bold text-slate-400 uppercase text-[9px] mt-0.5">Preview:</span>
                                                     <span className="font-mono text-slate-700 break-all leading-tight">
                                                         {samples.length > 0 ? samples.join(', ') : <span className="italic text-slate-400">Empty column</span>}
                                                     </span>
                                                 </div>
                                             ) : ( <div className="text-[10px] text-slate-300 italic pl-1">Map a column to see preview</div> )}
                                         </div>
                                     </div>
                                 )})}
                             </div>
                        </div>
                        <div className="p-5 border-t border-slate-200 bg-white">
                            <button onClick={handleApplyMapping} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Apply Mapping</button>
                        </div>
                    </div>
                </div>
            )}
            {activeDrillDown && (
                <EventDrillDownDrawer 
                    title={activeDrillDown.title}
                    events={activeDrillDown.events} 
                    context={activeDrillDown.context}
                    onClose={() => setActiveDrillDown(null)}
                    onJumpToRaw={(ids) => setRawFilterIds(ids)}
                />
            )}
            {rawFilterIds && (
                <RawDataInspector ids={rawFilterIds} allRecords={records} onClose={() => setRawFilterIds(null)} />
            )}
        </div>
    );
};

// --- SUB-COMPONENTS FOR DRILL DOWN ---
const EventDrillDownDrawer = ({ title, events, context, onClose, onJumpToRaw }: { title: string, events: MeetingEvent[], context?: string, onClose: () => void, onJumpToRaw: (ids: string[]) => void }) => {
    const handleExport = () => {
        const data = events.map(e => ({ Week: e.week, Day: e.day, Time: e.time, Floor: e.floor, Room: e.roomName, Type: e.roomType, Attendees: e.attendees }));
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Events");
        XLSX.writeFile(wb, `Drilldown_Events.xlsx`);
    };
    return (
        <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
            <div className="w-[600px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">{title}<span className="bg-indigo-100 text-indigo-700 text-sm px-2 py-0.5 rounded-full">{events.length}</span></h3>
                        {context && <div className="mt-2 p-2 bg-indigo-50 border border-indigo-100 rounded text-xs text-indigo-700 font-medium">These events contribute to the room being classified as <span className="font-bold uppercase">{context}</span>.</div>}
                    </div>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-700" /></button>
                </div>
                <div className="flex-grow overflow-y-auto p-0">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white border-b border-slate-200 text-xs text-slate-500 uppercase font-semibold sticky top-0 z-10 shadow-sm">
                            <tr><th className="px-6 py-3 bg-white w-20">Wk-Day</th><th className="px-6 py-3 bg-white w-20">Time</th><th className="px-6 py-3 bg-white">Room</th><th className="px-6 py-3 bg-white text-right">Attendees</th><th className="px-6 py-3 bg-white text-right">Action</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {events.map((e, i) => (
                                <tr key={i} className="hover:bg-slate-50 group">
                                    <td className="px-6 py-3 font-medium text-slate-500">W{e.week}-D{e.day}</td>
                                    <td className="px-6 py-3 text-slate-600">{e.time}</td>
                                    <td className="px-6 py-3 text-slate-700"><div className="truncate w-32" title={e.roomName}>{e.roomName}</div><div className="text-[10px] text-slate-400">{e.roomType}</div></td>
                                    <td className="px-6 py-3 text-right font-bold text-indigo-600">{e.attendees}</td>
                                    <td className="px-6 py-3 text-right"><button onClick={() => onJumpToRaw(e.rawRowIds)} className="text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"><Table className="w-3 h-3" /> Raw Data</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-5 border-t border-slate-200 bg-white">
                    <button onClick={handleExport} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Export Events CSV</button>
                </div>
            </div>
        </div>
    );
};

const RawDataInspector = ({ ids, allRecords, onClose }: { ids: string[], allRecords: ObservationRecord[], onClose: () => void }) => {
    const rawRows = allRecords.filter(r => ids.includes(r.id));
    return (
        <div className="absolute inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div><h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Table className="w-5 h-5 text-indigo-600" /> Source Data Inspection</h3><p className="text-xs text-slate-500 mt-1">Showing {rawRows.length} raw Excel row(s) corresponding to selected event.</p></div>
                    <button onClick={onClose}><X className="w-6 h-6 text-slate-400 hover:text-slate-700" /></button>
                </div>
                <div className="flex-grow overflow-auto p-6 bg-slate-50/50">
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold uppercase">
                                <tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Floor</th><th className="px-4 py-3">Room / Dept</th><th className="px-4 py-3">Day</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Occupancy</th><th className="px-4 py-3">Status</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rawRows.map(r => (
                                    <tr key={r.id} className="hover:bg-indigo-50/30">
                                        <td className="px-4 py-2 font-mono text-slate-400">{r.id}</td><td className="px-4 py-2 font-medium text-slate-700">{r.floor}</td><td className="px-4 py-2 text-slate-600">{r.roomName || r.department}</td><td className="px-4 py-2 text-slate-600">Day {r.day}</td><td className="px-4 py-2 text-slate-600">{r.timeSlot}</td><td className="px-4 py-2 font-bold text-indigo-600">{r.attendeeCount || 1}</td><td className="px-4 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${r.isOccupied ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{r.isOccupied ? 'Occupied' : 'Vacant'}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-200 bg-white flex justify-end"><button onClick={onClose} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors">Close</button></div>
            </div>
        </div>
    );
};

const WorkstationDash = ({ metrics }: { metrics: any }) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="col-span-1 lg:col-span-2 grid grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><div className="text-xs font-bold text-slate-400 uppercase">Avg Occupancy</div><div className="text-3xl font-bold text-indigo-600 mt-2">{metrics.avgOccupancy.toFixed(0)}%</div></div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><div className="text-xs font-bold text-slate-400 uppercase">Peak Occupancy</div><div className="text-3xl font-bold text-rose-500 mt-2">{metrics.peakOccupancy.toFixed(0)}%</div></div>
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200"><div className="flex gap-2 items-start text-xs text-slate-600"><Info className="w-4 h-4 text-indigo-500 flex-shrink-0" /><p><strong>Insight:</strong> {metrics.avgOccupancy < 50 ? "Low utilization suggests opportunity for desk sharing or consolidation." : "High utilization indicates steady demand."}</p></div></div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80"><h3 className="text-xs font-bold text-slate-500 uppercase mb-4">Occupancy Profile (Time)</h3><ResponsiveContainer width="100%" height="100%"><LineChart data={metrics.occupancyByTime}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="time" tick={{fontSize: 10}} /><YAxis unit="%" tick={{fontSize: 10}} /><Tooltip /><Line type="monotone" dataKey="rate" stroke={MM_PALETTE.primary} strokeWidth={3} dot={{r:4}} /></LineChart></ResponsiveContainer></div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80"><h3 className="text-xs font-bold text-slate-500 uppercase mb-4">Occupancy by Floor</h3><ResponsiveContainer width="100%" height="100%"><BarChart data={metrics.occupancyByFloor} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" unit="%" hide /><YAxis type="category" dataKey="floor" tick={{fontSize: 11}} width={50} /><Tooltip /><Bar dataKey="rate" fill={MM_PALETTE.program[0]} radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fontSize: 10, fill: '#64748b', formatter: (v: number) => `${v.toFixed(0)}%` }} /></BarChart></ResponsiveContainer></div>
    </div>
);

const RoomRow = ({ room, onUpdateCapacity, onDrillDown }: { room: RoomPerformanceMetric, onUpdateCapacity: (f: string, r: string, c: number) => void, onDrillDown: (t: string, e: MeetingEvent[], c?: string) => void, key?: React.Key }) => {
    const [expanded, setExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState(room.capacity?.toString() || '');

    useEffect(() => { if (!isEditing) setInputValue(room.capacity > 0 ? room.capacity.toString() : ''); }, [room.capacity, isEditing]);

    const handleStartEdit = () => { setInputValue(room.capacity > 0 ? room.capacity.toString() : ''); setIsEditing(true); };
    const handleSave = () => { const val = parseInt(inputValue); if (!isNaN(val) && val > 0) onUpdateCapacity(room.floor, room.roomName, val); else if (inputValue === '') onUpdateCapacity(room.floor, room.roomName, 0); setIsEditing(false); };
    const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSave(); };
    
    const getStatusColor = (status: string) => {
        if (status.includes('Under')) return 'bg-blue-50 text-blue-700 border-blue-200';
        if (status.includes('Over')) return 'bg-rose-50 text-rose-700 border-rose-200';
        if (status.includes('Reasonable') || status.includes('Well')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        return 'bg-slate-100 text-slate-600 border-slate-200';
    };

    const granularSegments = room.sizeBreakdown.map(sb => ({ label: `${sb.size}p`, pct: sb.occupancyPct, count: sb.count, size: sb.size })).filter(s => s.pct > 0);
    const getColor = (size: number) => { if (size <= 1) return 'bg-slate-200'; if (size <= 2) return 'bg-slate-300'; if (size <= 4) return 'bg-indigo-200'; if (size <= 6) return 'bg-indigo-300'; if (size <= 10) return 'bg-indigo-400'; return 'bg-indigo-500'; };

    // Use analysis object if available, otherwise fallback
    const analysis = room.analysis || {
        avgOccRaw: room.avgOccupancy,
        avgOccRounded: Math.round(room.avgOccupancy),
        avgRatio: room.capacity > 0 ? room.avgOccupancy / room.capacity : 0,
        typicalBin: 'N/A',
        typicalTypeVal: 0,
        typicalRounded: 0,
        typicalRatio: 0,
        statusRule: 'Legacy Calculation'
    };

    return (
        <>
            <tr className={`hover:bg-slate-50 transition-colors ${expanded ? 'bg-slate-50' : 'bg-white'}`}>
                <td className="px-6 py-4 text-slate-600 text-xs border-b border-slate-50">{room.floor}</td>
                <td className="px-4 py-4 border-b border-slate-50"><div className="font-bold text-slate-700 text-sm">{room.roomName}</div><div className="text-[10px] text-slate-400">{room.roomType}</div></td>
                <td className="px-4 py-4 text-center border-b border-slate-50">
                    {isEditing ? (
                        <input type="number" autoFocus className="w-16 p-1 text-center border border-indigo-300 rounded text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} />
                    ) : (
                        <div onClick={handleStartEdit} className="cursor-pointer group flex justify-center">{room.capacity > 0 ? <span className="text-sm font-mono text-slate-600 border-b border-transparent group-hover:border-indigo-300 group-hover:text-indigo-600 transition-all px-1">{room.capacity} pax</span> : <button className="text-[10px] bg-slate-100 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 font-bold px-2 py-1 rounded border border-slate-200 hover:border-indigo-200 transition-colors">Set</button>}</div>
                    )}
                </td>
                <td className="px-4 py-4 text-center font-bold text-slate-700 border-b border-slate-50">{room.utilizationPct.toFixed(0)}%</td><td className="px-4 py-4 text-center font-mono text-slate-600 border-b border-slate-50">{room.avgOccupancy.toFixed(1)}</td><td className="px-4 py-4 border-b border-slate-50"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getStatusColor(room.classification)}`}>{room.classification.split('/')[0].trim()}</span></td><td className="px-4 py-4 text-center border-b border-slate-50"><button onClick={() => setExpanded(!expanded)} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">{expanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}</button></td>
            </tr>
            {expanded && (
                <tr>
                    <td colSpan={7} className="px-6 py-4 bg-slate-50 border-b border-slate-200 shadow-inner">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-1">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center gap-4"><h4 className="text-xs font-bold text-slate-400 uppercase">Room Snapshot</h4><div className="grid grid-cols-3 gap-2 text-center"><div><div className="text-lg font-bold text-slate-700">{room.occupiedSlots}</div><div className="text-[9px] text-slate-400">Total Meetings</div></div><div><div className="text-lg font-bold text-indigo-600">{room.utilizationPct.toFixed(0)}%</div><div className="text-[9px] text-slate-400">Utilization</div></div><div><div className="text-lg font-bold text-slate-700">{room.avgOccupancy.toFixed(1)}</div><div className="text-[9px] text-slate-400">Avg Occ</div></div></div></div>
                            
                            {/* Card 2: Capacity Fit (DETAILED) */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                                <div className="flex justify-between items-start border-b border-slate-50 pb-2 mb-1">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase">Fit Analysis</h4>
                                    <div className="text-[10px] text-slate-500">
                                        Capacity: <strong>{room.capacity || '?'} pax</strong>
                                    </div>
                                </div>
                                {room.capacity > 0 ? (
                                    <>
                                        <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                                            <div className="text-slate-400 font-medium">Metric</div>
                                            <div className="text-right text-slate-400 font-medium">Value</div>
                                            <div className="text-right text-slate-400 font-medium">% Cap</div>
                                            
                                            <div className="text-slate-700 font-bold">Average</div>
                                            <div className="text-right font-mono text-slate-600">{analysis.avgOccRaw.toFixed(1)} <span className="text-slate-400">≈ {analysis.avgOccRounded}</span></div>
                                            <div className="text-right font-bold text-indigo-600">{(analysis.avgRatio * 100).toFixed(0)}%</div>

                                            <div className="text-slate-700 font-bold">Typical</div>
                                            <div className="text-right font-mono text-slate-600">{analysis.typicalBin} <span className="text-slate-400">≈ {analysis.typicalRounded}</span></div>
                                            <div className="text-right font-bold text-indigo-600">{(analysis.typicalRatio * 100).toFixed(0)}%</div>
                                        </div>
                                        <div className="mt-auto bg-slate-50 p-2 rounded border border-slate-100 text-[10px] flex items-start gap-2">
                                            <Info className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <span className="font-bold text-slate-500 uppercase">Logic:</span>
                                                <span className="text-slate-600 ml-1">{analysis.statusRule}</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-grow flex flex-col items-center justify-center text-center p-4 bg-amber-50 rounded border border-amber-100 border-dashed">
                                        <AlertTriangle className="w-5 h-5 text-amber-400 mb-2" />
                                        <p className="text-xs text-amber-700 font-medium">Set capacity above to evaluate fit.</p>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col"><h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex justify-between items-center"><span>Size Breakdown</span><button onClick={() => onDrillDown(`Events in ${room.roomName}`, room.sizeBreakdown.flatMap(s => s.events), room.classification)} className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded flex items-center gap-1"><Eye className="w-3 h-3" /> View All Events</button></h4><div className="flex-grow overflow-y-auto max-h-24 pr-1 custom-scrollbar"><table className="w-full text-xs text-left"><thead className="text-slate-400 border-b border-slate-100"><tr><th className="font-normal pb-1">Size</th><th className="font-normal pb-1 text-right">Count</th><th className="font-normal pb-1 text-right">%</th></tr></thead><tbody className="text-slate-600">{room.sizeBreakdown.map((sb, i) => (<tr key={i} className="border-b border-slate-50 last:border-0"><td className="py-1">{sb.size} pax</td><td className="py-1 text-right">{sb.count}</td><td className="py-1 text-right font-medium">{sb.occupancyPct.toFixed(0)}%</td></tr>))}</tbody></table></div></div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    )
}

// --- CONCURRENCY CARD (REFACTORED) ---
const ConcurrencyCard = ({ 
    stats, 
    roomTypes, 
    selectedType, 
    onSelectType,
    activeTotalRooms
}: { 
    stats: { avgPct: number, maxPct: number, timeline: ConcurrencyMetric[], uniqueRoomsCount: number }, 
    roomTypes: string[],
    selectedType: string,
    onSelectType: (t: string) => void,
    activeTotalRooms: number
}) => {
    const [chartColors, setChartColors] = useState({ bar: '#cbd5e1', highlight: '#f43f5e', line: '#6366f1' });
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const chartRef = useRef<HTMLDivElement>(null);

    useEffect(() => { const saved = localStorage.getItem('mm_chart_colors'); if (saved) { try { setChartColors(JSON.parse(saved)); } catch(e) {} } }, []);

    if (!stats || !stats.timeline) return null;

    const avgRoomsInUse = Math.round((stats.avgPct / 100) * activeTotalRooms);
    const maxRoomsInUse = Math.round((stats.maxPct / 100) * activeTotalRooms);
    const title = selectedType === 'All Rooms' ? 'OVERALL ROOM OCCUPANCY (CONCURRENCY)' : `${selectedType.toUpperCase()} OCCUPANCY (CONCURRENCY)`;

    const handleSaveColors = (newColors: any) => { setChartColors(newColors); localStorage.setItem('mm_chart_colors', JSON.stringify(newColors)); };
    const handleResetColors = () => { handleSaveColors({ bar: '#cbd5e1', highlight: '#f43f5e', line: '#6366f1' }); };

    const downloadCSV = () => {
        const header = ['Time', 'Occupied Rooms', 'Total Rooms', 'Concurrency %'];
        const rows = stats.timeline.map(t => [t.time, t.occupied, t.total, t.pct.toFixed(2)]);
        const csvContent = "data:text/csv;charset=utf-8," + [header.join(','), ...rows.map(r => r.join(','))].join('\n');
        const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `concurrency_data.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); setShowDownloadMenu(false);
    };

    const downloadPNG = () => {
        if (!chartRef.current) return;
        const svg = chartRef.current.querySelector('svg'); if (!svg) return;
        const serializer = new XMLSerializer(); const source = serializer.serializeToString(svg);
        const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' }); const url = URL.createObjectURL(blob);
        const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 600;
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const img = new Image();
        img.onload = () => { ctx.drawImage(img, 40, 40, 1120, 520); const pngUrl = canvas.toDataURL("image/png"); const link = document.createElement('a'); link.download = `concurrency_chart.png`; link.href = pngUrl; link.click(); URL.revokeObjectURL(url); setShowDownloadMenu(false); };
        img.src = url;
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row gap-8 relative">
            <div className="md:w-1/3 flex flex-col justify-center space-y-6">
                <div>
                    <div className="flex justify-between items-start mb-2"><h3 className="text-xs font-bold text-slate-500 uppercase">{title}</h3></div>
                    <div className="relative group w-full mb-4">
                        <select className="w-full appearance-none bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 py-2 pl-3 pr-8 rounded-lg hover:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer" value={selectedType} onChange={(e) => onSelectType(e.target.value)}>{roomTypes.map(t => <option key={t} value={t}>{t}</option>)}</select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                    </div>
                    <div className="flex items-center gap-2 mb-6">
                        <div className="relative">
                            <button onClick={() => setShowDownloadMenu(!showDownloadMenu)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition-colors" title="Download"><Download className="w-4 h-4" /></button>
                            {showDownloadMenu && (<div className="absolute left-0 bottom-full mb-2 w-40 bg-white border border-slate-200 rounded-lg shadow-xl z-20 overflow-hidden"><button onClick={downloadPNG} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"><ImageIcon className="w-3 h-3" /> Download PNG</button><button onClick={downloadCSV} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"><FileText className="w-3 h-3" /> Download CSV</button></div>)}
                        </div>
                        <div className="relative">
                            <button onClick={() => setShowColorPicker(!showColorPicker)} className={`p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors ${showColorPicker ? 'text-indigo-600 border-indigo-200' : 'text-slate-500'}`} title="Chart Colors"><Palette className="w-4 h-4" /></button>
                            {showColorPicker && (<div className="absolute left-0 bottom-full mb-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-4 animate-in fade-in slide-in-from-bottom-2"><h4 className="text-xs font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Chart Theme</h4><div className="space-y-3"><div><label className="text-[10px] text-slate-500 font-bold block mb-1">Standard Bar</label><div className="flex items-center gap-2"><input type="color" value={chartColors.bar} onChange={(e) => handleSaveColors({...chartColors, bar: e.target.value})} className="w-6 h-6 rounded cursor-pointer border-0 p-0" /><span className="text-[10px] font-mono text-slate-400">{chartColors.bar}</span></div></div><div><label className="text-[10px] text-slate-500 font-bold block mb-1">Max Peak (Highlight)</label><div className="flex items-center gap-2"><input type="color" value={chartColors.highlight} onChange={(e) => handleSaveColors({...chartColors, highlight: e.target.value})} className="w-6 h-6 rounded cursor-pointer border-0 p-0" /><span className="text-[10px] font-mono text-slate-400">{chartColors.highlight}</span></div></div><div><label className="text-[10px] text-slate-500 font-bold block mb-1">Average Line</label><div className="flex items-center gap-2"><input type="color" value={chartColors.line} onChange={(e) => handleSaveColors({...chartColors, line: e.target.value})} className="w-6 h-6 rounded cursor-pointer border-0 p-0" /><span className="text-[10px] font-mono text-slate-400">{chartColors.line}</span></div></div><button onClick={handleResetColors} className="w-full mt-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-bold flex items-center justify-center gap-1"><RotateCcw className="w-3 h-3" /> Reset Defaults</button></div></div>)}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex justify-between items-center"><span className="text-xs font-bold text-slate-500 uppercase">Total Rooms</span><span className="text-xl font-bold text-slate-800">{activeTotalRooms}</span></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100"><div className="text-xs font-bold text-slate-400 uppercase mb-1">Avg Occupied</div><div className="text-2xl font-bold text-indigo-600">{stats.avgPct.toFixed(1)}%</div><div className="text-[10px] font-medium text-slate-400 mt-1 leading-tight">≈ {avgRoomsInUse} in use</div></div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100"><div className="text-xs font-bold text-slate-400 uppercase mb-1">Max Occupied</div><div className="text-2xl font-bold text-rose-500">{stats.maxPct.toFixed(1)}%</div><div className="text-[10px] font-medium text-slate-400 mt-1 leading-tight">≈ {maxRoomsInUse} in use</div></div>
                    </div>
                </div>
            </div>
            <div className="md:w-2/3 flex flex-col" ref={chartRef}>
                <div className="h-64 relative">
                    {stats.timeline.length > 0 ? (
                        <>
                            <div className="absolute top-0 right-4 z-10 px-3 py-1 rounded-full text-xs font-bold shadow-sm border bg-white flex items-center gap-2" style={{ borderColor: chartColors.line, color: chartColors.line }}><div className="w-2 h-2 rounded-full" style={{ backgroundColor: chartColors.line }} />Avg {stats.avgPct.toFixed(1)}%</div>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.timeline} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={30} /><YAxis unit="%" tick={{ fontSize: 10 }} domain={[0, 100]} />
                                    <Tooltip content={({ active, payload, label }) => { if (active && payload && payload.length) { const data = payload[0].payload as ConcurrencyMetric; return (<div className="bg-white p-2 border border-slate-200 rounded shadow-lg text-xs"><div className="font-bold text-slate-800 mb-1">{label}</div><div className="text-indigo-600 font-bold">{data.pct.toFixed(1)}% Occupied</div><div className="text-slate-500">{data.occupied} / {data.total} Rooms Observed</div></div>); } return null; }} />
                                    <ReferenceLine y={stats.avgPct} stroke={chartColors.line} strokeDasharray="3 3" />
                                    <Bar dataKey="pct" fill={chartColors.bar} radius={[2, 2, 0, 0]}>{stats.timeline.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.pct === stats.maxPct ? chartColors.highlight : chartColors.bar} />))}</Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </>
                    ) : ( <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-xl"><BarChart2 className="w-8 h-8 mb-2" /><p className="text-xs">No occupied observations for selected room type.</p></div> )}
                </div>
                {stats.timeline.length > 0 && (<div className="flex items-center justify-center gap-6 mt-4 text-[10px] text-slate-500 font-medium"><div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: chartColors.bar }} /><span>Occupied</span></div><div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: chartColors.highlight }} /><span>Peak</span></div><div className="flex items-center gap-1.5"><div className="w-4 h-0.5 border-t-2 border-dashed" style={{ borderColor: chartColors.line }} /><span>Average</span></div></div>)}
            </div>
        </div>
    );
};

// --- NEW COMPONENT: MEETING SIZE DISTRIBUTION CARD ---
const MeetingSizeCard = ({ metrics }: { metrics: UtilizationMetrics }) => {
    const [palette, setPalette] = useState(MM_PALETTE.program);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const chartRef = useRef<HTMLDivElement>(null);

    const downloadCSV = () => {
        const header = ['Size Group', 'Count', 'Occupancy %'];
        const rows = metrics.globalSizeBins.map(b => [b.label, b.count, b.occupancyPct.toFixed(1)]);
        const csvContent = "data:text/csv;charset=utf-8," + [header.join(','), ...rows.map(r => r.join(','))].join('\n');
        const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `meeting_size_dist.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const downloadPNG = () => {
        if (!chartRef.current) return;
        const svg = chartRef.current.querySelector('svg'); if (!svg) return;
        const serializer = new XMLSerializer(); const source = serializer.serializeToString(svg);
        const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' }); const url = URL.createObjectURL(blob);
        const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 600;
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const img = new Image();
        img.onload = () => { ctx.drawImage(img, 50, 50, 700, 500); const pngUrl = canvas.toDataURL("image/png"); const link = document.createElement('a'); link.download = `meeting_size_dist.png`; link.href = pngUrl; link.click(); URL.revokeObjectURL(url); };
        img.src = url;
    };

    // Calculate Typical
    const typicalBin = metrics.globalSizeBins.reduce((prev, current) => (prev.count > current.count) ? prev : current, metrics.globalSizeBins[0]);
    
    // Custom Label for Outside
    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }: any) => {
        if (percent < 0.05) return null; 
        const RADIAN = Math.PI / 180;
        const radius = outerRadius + 20;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        
        return (
            <text x={x} y={y} fill="#64748b" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10} fontWeight="bold">
                {`${name} · ${value} · ${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 h-full flex flex-col relative group">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase">Meeting Size Distribution</h3>
                    <p className="text-[10px] text-slate-400 mt-1">Occupancy % by bucket (Attendees &gt; 0)</p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={downloadCSV} className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600" title="CSV"><FileText className="w-3 h-3" /></button>
                    <button onClick={downloadPNG} className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600" title="PNG"><ImageIcon className="w-3 h-3" /></button>
                    <button onClick={() => setShowColorPicker(!showColorPicker)} className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600" title="Colors"><Palette className="w-3 h-3" /></button>
                </div>
            </div>

            {showColorPicker && (
                <div className="absolute top-14 right-6 bg-white border border-slate-200 shadow-xl rounded-lg p-3 z-20 grid grid-cols-3 gap-2">
                    {palette.map((c, i) => (
                        <input key={i} type="color" value={c} onChange={(e) => { const newP = [...palette]; newP[i] = e.target.value; setPalette(newP); }} className="w-6 h-6 rounded cursor-pointer border-0 p-0" />
                    ))}
                </div>
            )}

            <div className="flex-grow flex flex-col md:flex-row items-center gap-8">
                <div className="w-full md:w-3/5 h-64 relative" ref={chartRef}>
                    <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                            <Pie 
                                data={metrics.globalSizeBins} 
                                dataKey="count" 
                                nameKey="label" 
                                cx="50%" cy="50%" 
                                innerRadius={60} 
                                outerRadius={80} 
                                paddingAngle={2}
                                label={renderCustomLabel}
                            >
                                {metrics.globalSizeBins.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={palette[index % palette.length]} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip />
                        </RePieChart>
                    </ResponsiveContainer>
                    {/* Center Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-700">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Total Meetings</span>
                        <span className="text-2xl font-bold">{metrics.roomMetrics.reduce((s,r) => s+r.occupiedSlots, 0)}</span>
                        {typicalBin && <span className="text-[9px] text-slate-400 mt-1">Typical: <span className="font-bold text-slate-600">{typicalBin.label}</span></span>}
                    </div>
                </div>

                <div className="w-full md:w-2/5 overflow-hidden">
                    <table className="w-full text-xs text-left">
                        <thead className="text-slate-400 border-b border-slate-100 font-semibold uppercase">
                            <tr>
                                <th className="pb-2 pl-2">Size</th>
                                <th className="pb-2 text-right">Count</th>
                                <th className="pb-2 pr-2 text-right">Occ %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-600">
                            {metrics.globalSizeBins.map((bin, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                    <td className="py-2 pl-2 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: palette[i % palette.length] }} />
                                        {bin.label}
                                    </td>
                                    <td className="py-2 text-right font-mono">{bin.count}</td>
                                    <td className="py-2 pr-2 text-right font-bold text-slate-700">{bin.occupancyPct.toFixed(1)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- NEW COMPONENT: WORK BEHAVIORS CARD ---
const WorkBehaviorsCard = ({ insights }: { insights: string[] }) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
        <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" /> Work Behaviors
        </h3>
        <div className="flex-grow">
            {insights.length > 0 ? (
                <ul className="space-y-4">
                    {insights.map((insight, i) => (
                        <li key={i} className="flex gap-3 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 items-start">
                            <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
                            <span className="leading-snug">{insight}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="text-xs text-slate-400 italic text-center py-10">No specific behavioral patterns detected.</div>
            )}
        </div>
    </div>
);

// --- NEW COMPONENT: OVERALL MEETING SUMMARY ---
const MeetingDash = ({ 
    metrics, 
    records,
    onUpdateCapacity, 
    onDrillDown 
}: { 
    metrics: UtilizationMetrics, 
    records: ObservationRecord[],
    onUpdateCapacity: (floor: string, room: string, cap: number) => void,
    onDrillDown: (title: string, events: MeetingEvent[], context?: string) => void
}) => {
    // Determine unique room types for the concurrency dropdown
    const roomTypes = useMemo(() => {
        const types = new Set<string>(['All Rooms']);
        records.forEach(r => { if (r.roomType) types.add(r.roomType); });
        return Array.from(types).sort();
    }, [records]);

    const [selectedConcurrencyType, setSelectedConcurrencyType] = useState('All Rooms');

    // Filter records for concurrency stats calculation based on selected type
    const concurrencyStats = useMemo(() => {
        const relevantRecords = selectedConcurrencyType === 'All Rooms' 
            ? records 
            : records.filter(r => r.roomType === selectedConcurrencyType);
        return calculateConcurrencyStats(relevantRecords);
    }, [records, selectedConcurrencyType]);

    // Calculate Active Total Rooms based on Selection
    const activeTotalRooms = useMemo(() => {
        if (selectedConcurrencyType === 'All Rooms') return metrics.totalRooms;
        // Count unique room names in the filtered set
        const uniqueRooms = new Set<string>();
        records.forEach(r => {
            if (r.roomType === selectedConcurrencyType && r.roomName) {
                uniqueRooms.add(r.roomName);
            }
        });
        return uniqueRooms.size;
    }, [records, selectedConcurrencyType, metrics.totalRooms]);

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* 1. Global KPI Cards (Top Layer) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-bold text-slate-400 uppercase">Avg Utilization</div>
                    <div className="text-3xl font-bold text-indigo-600 mt-2">{metrics.overallUtilization.toFixed(0)}%</div>
                    <div className="text-[10px] text-slate-400 mt-1">Of observed time slots</div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-bold text-slate-400 uppercase">Avg Occupancy</div>
                    <div className="text-3xl font-bold text-slate-800 mt-2">{metrics.overallAvgAttendees.toFixed(1)} <span className="text-sm font-medium text-slate-400">ppl</span></div>
                    <div className="text-[10px] text-slate-400 mt-1">When room is in use</div>
                </div>
                 <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-bold text-slate-400 uppercase">Peak Concurrency</div>
                    <div className="text-3xl font-bold text-rose-500 mt-2">{metrics.concurrencyStats?.maxPct.toFixed(0)}%</div>
                    <div className="text-[10px] text-slate-400 mt-1">Max % of rooms used at once</div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-bold text-slate-400 uppercase">Underutilized</div>
                    <div className="text-3xl font-bold text-amber-500 mt-2">
                        {metrics.roomMetrics.filter(r => r.classification.includes('Under')).length} <span className="text-sm font-medium text-slate-400">/ {metrics.roomMetrics.length} rms</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Rooms flagged for size mismatch</div>
                </div>
            </div>

            {/* 2. Concurrency Chart (Full Width) */}
            <ConcurrencyCard 
                stats={concurrencyStats} 
                roomTypes={roomTypes}
                selectedType={selectedConcurrencyType}
                onSelectType={setSelectedConcurrencyType}
                activeTotalRooms={activeTotalRooms}
            />

            {/* 3. Mid Section: Distribution & Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <MeetingSizeCard metrics={metrics} />
                </div>
                <div>
                    <WorkBehaviorsCard insights={metrics.globalInsights} />
                </div>
            </div>

            {/* 4. Room-by-Room Performance Table (Reverted to Expandable List) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <Layout className="w-4 h-4 text-slate-400" /> Room Performance
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white border-b border-slate-100 text-xs font-bold text-slate-500 uppercase">
                            <tr>
                                <th className="px-6 py-3">Location</th>
                                <th className="px-4 py-3">Room</th>
                                <th className="px-4 py-3 text-center">Capacity</th>
                                <th className="px-4 py-3 text-center">Util %</th>
                                <th className="px-4 py-3 text-center">Avg Occ</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {metrics.roomMetrics.map((room) => (
                                <RoomRow 
                                    key={`${room.floor}-${room.roomName}`}
                                    room={room}
                                    onUpdateCapacity={onUpdateCapacity}
                                    onDrillDown={onDrillDown}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UtilizationStudy;