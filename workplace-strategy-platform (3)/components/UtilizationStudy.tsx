
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Upload, FileSpreadsheet, ArrowRight, Check, AlertTriangle, 
  BarChart2, Filter, Info, Download, 
  ChevronRight, RefreshCw, Briefcase, Users, Layout, Settings, X,
  AlignLeft, AlignCenter, Edit2, AlertCircle, ChevronDown, Table, Eye,
  ArrowUp, ArrowDown, Lightbulb, PieChart, CheckCircle, MoreHorizontal, HelpCircle
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
                    {/* Data Interpretation Button removed as requested */}
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
                                     // Get 3 samples from the selected column
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
                                            className={`w-full p-2 text-sm border rounded outline-none transition-all ${
                                                selectedIdx === undefined && field.required 
                                                ? 'border-rose-300 bg-rose-50 focus:border-rose-500' 
                                                : 'border-slate-300 bg-white focus:border-indigo-500'
                                            }`}
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
                                             ) : (
                                                 <div className="text-[10px] text-slate-300 italic pl-1">Map a column to see preview</div>
                                             )}
                                         </div>
                                     </div>
                                 )})}
                             </div>
                        </div>
                        <div className="p-5 border-t border-slate-200 bg-white">
                            <button 
                                onClick={handleApplyMapping} 
                                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                <Check className="w-4 h-4" /> Apply Mapping
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Event Drill-down Drawer */}
            {activeDrillDown && (
                <EventDrillDownDrawer 
                    title={activeDrillDown.title}
                    events={activeDrillDown.events} 
                    context={activeDrillDown.context}
                    onClose={() => setActiveDrillDown(null)}
                    onJumpToRaw={(ids) => setRawFilterIds(ids)}
                />
            )}

            {/* Raw Data Modal */}
            {rawFilterIds && (
                <RawDataInspector 
                    ids={rawFilterIds} 
                    allRecords={records} 
                    onClose={() => setRawFilterIds(null)}
                />
            )}
        </div>
    );
};

// --- SUB-COMPONENTS FOR DRILL DOWN ---

const EventDrillDownDrawer = ({ title, events, context, onClose, onJumpToRaw }: { title: string, events: MeetingEvent[], context?: string, onClose: () => void, onJumpToRaw: (ids: string[]) => void }) => {
    
    const handleExport = () => {
        const data = events.map(e => ({
            Week: e.week,
            Day: e.day,
            Time: e.time,
            Floor: e.floor,
            Room: e.roomName,
            Type: e.roomType,
            Attendees: e.attendees
        }));
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
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            {title}
                            <span className="bg-indigo-100 text-indigo-700 text-sm px-2 py-0.5 rounded-full">{events.length}</span>
                        </h3>
                        {context && (
                            <div className="mt-2 p-2 bg-indigo-50 border border-indigo-100 rounded text-xs text-indigo-700 font-medium">
                                These events contribute to the room being classified as <span className="font-bold uppercase">{context}</span>.
                            </div>
                        )}
                    </div>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-700" /></button>
                </div>
                
                <div className="flex-grow overflow-y-auto p-0">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white border-b border-slate-200 text-xs text-slate-500 uppercase font-semibold sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 bg-white w-20">Wk-Day</th>
                                <th className="px-6 py-3 bg-white w-20">Time</th>
                                <th className="px-6 py-3 bg-white">Room</th>
                                <th className="px-6 py-3 bg-white text-right">Attendees</th>
                                <th className="px-6 py-3 bg-white text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {events.map((e, i) => (
                                <tr key={i} className="hover:bg-slate-50 group">
                                    <td className="px-6 py-3 font-medium text-slate-500">W{e.week}-D{e.day}</td>
                                    <td className="px-6 py-3 text-slate-600">{e.time}</td>
                                    <td className="px-6 py-3 text-slate-700">
                                        <div className="truncate w-32" title={e.roomName}>{e.roomName}</div>
                                        <div className="text-[10px] text-slate-400">{e.roomType}</div>
                                    </td>
                                    <td className="px-6 py-3 text-right font-bold text-indigo-600">{e.attendees}</td>
                                    <td className="px-6 py-3 text-right">
                                        <button 
                                            onClick={() => onJumpToRaw(e.rawRowIds)}
                                            className="text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Table className="w-3 h-3" /> Raw Data
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-5 border-t border-slate-200 bg-white">
                    <button 
                        onClick={handleExport}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                        <Download className="w-4 h-4" /> Export Events CSV
                    </button>
                </div>
            </div>
        </div>
    );
};

const RawDataInspector = ({ ids, allRecords, onClose }: { ids: string[], allRecords: ObservationRecord[], onClose: () => void }) => {
    // Filter records
    const rawRows = allRecords.filter(r => ids.includes(r.id));

    return (
        <div className="absolute inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                            <Table className="w-5 h-5 text-indigo-600" /> Source Data Inspection
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Showing {rawRows.length} raw Excel row(s) corresponding to selected event.</p>
                    </div>
                    <button onClick={onClose}><X className="w-6 h-6 text-slate-400 hover:text-slate-700" /></button>
                </div>
                <div className="flex-grow overflow-auto p-6 bg-slate-50/50">
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold uppercase">
                                <tr>
                                    <th className="px-4 py-3">ID</th>
                                    <th className="px-4 py-3">Floor</th>
                                    <th className="px-4 py-3">Room / Dept</th>
                                    <th className="px-4 py-3">Day</th>
                                    <th className="px-4 py-3">Time</th>
                                    <th className="px-4 py-3">Occupancy</th>
                                    <th className="px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rawRows.map(r => (
                                    <tr key={r.id} className="hover:bg-indigo-50/30">
                                        <td className="px-4 py-2 font-mono text-slate-400">{r.id}</td>
                                        <td className="px-4 py-2 font-medium text-slate-700">{r.floor}</td>
                                        <td className="px-4 py-2 text-slate-600">{r.roomName || r.department}</td>
                                        <td className="px-4 py-2 text-slate-600">Day {r.day}</td>
                                        <td className="px-4 py-2 text-slate-600">{r.timeSlot}</td>
                                        <td className="px-4 py-2 font-bold text-indigo-600">{r.attendeeCount || 1}</td>
                                        <td className="px-4 py-2">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${r.isOccupied ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {r.isOccupied ? 'Occupied' : 'Vacant'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-200 bg-white flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const WorkstationDash = ({ metrics }: { metrics: any }) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="col-span-1 lg:col-span-2 grid grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-400 uppercase">Avg Occupancy</div>
                <div className="text-3xl font-bold text-indigo-600 mt-2">{metrics.avgOccupancy.toFixed(0)}%</div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-400 uppercase">Peak Occupancy</div>
                <div className="text-3xl font-bold text-rose-500 mt-2">{metrics.peakOccupancy.toFixed(0)}%</div>
            </div>
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div className="flex gap-2 items-start text-xs text-slate-600">
                    <Info className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <p><strong>Insight:</strong> {metrics.avgOccupancy < 50 ? "Low utilization suggests opportunity for desk sharing or consolidation." : "High utilization indicates steady demand."}</p>
                </div>
            </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">Occupancy Profile (Time)</h3>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.occupancyByTime}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" tick={{fontSize: 10}} />
                    <YAxis unit="%" tick={{fontSize: 10}} />
                    <Tooltip />
                    <Line type="monotone" dataKey="rate" stroke={MM_PALETTE.primary} strokeWidth={3} dot={{r:4}} />
                </LineChart>
            </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">Occupancy by Floor</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.occupancyByFloor} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" unit="%" hide />
                    <YAxis type="category" dataKey="floor" tick={{fontSize: 11}} width={50} />
                    <Tooltip />
                    <Bar dataKey="rate" fill={MM_PALETTE.program[0]} radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fontSize: 10, fill: '#64748b', formatter: (v: number) => `${v.toFixed(0)}%` }} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    </div>
);

// --- NEW COMPONENT: CAPACITY FIT BAR ---
const CapacityFitBar = ({ row }: { row: RoomPerformanceMetric }) => {
    const [showExplain, setShowExplain] = useState(false);

    if (!row.capacity || row.capacity === 0) {
        return <div className="text-xs text-slate-400 italic">Set capacity to evaluate fit.</div>;
    }

    // 1. Prepare Data for Bins (Observed Meeting Sizes Only)
    const granularSegments = row.sizeBreakdown.map(sb => ({
        label: `${sb.size}p`,
        pct: sb.occupancyPct,
        count: sb.count,
        size: sb.size
    })).filter(s => s.pct > 0);

    // Color Logic (Neutral Gradient)
    const getColor = (size: number) => {
        if (size <= 1) return 'bg-slate-200';
        if (size <= 2) return 'bg-slate-300';
        if (size <= 4) return 'bg-indigo-200';
        if (size <= 6) return 'bg-indigo-300';
        if (size <= 10) return 'bg-indigo-400';
        return 'bg-indigo-500';
    };

    // 2. Status Configuration
    const getStatusConfig = (status: string) => {
        if (status.includes('Under')) return { class: 'bg-blue-50 text-blue-700 border-blue-200', icon: ArrowDown };
        if (status.includes('Reasonably') || status.includes('Well')) return { class: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle };
        if (status.includes('Over')) return { class: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertTriangle };
        return { class: 'bg-amber-50 text-amber-700 border-amber-200', icon: MoreHorizontal };
    };
    
    const config = getStatusConfig(row.classification);
    const StatusIcon = config.icon;

    // Explanation Logic
    let explanation = "";
    if (row.classification.includes('Underutilized')) explanation = "Most meetings occur well below room capacity.";
    else if (row.classification.includes('Over')) explanation = "Meetings frequently approach or exceed room capacity.";
    else if (row.classification.includes('Reasonably')) explanation = "Room usage generally aligns with its designed capacity.";
    else explanation = "Meeting size patterns vary significantly and require review.";

    // Derived Thresholds for Explanation Panel
    const C = Math.round(row.capacity);
    const half = Math.round(0.5 * C);
    const seventy = Math.round(0.7 * C);
    const eighty = Math.round(0.8 * C);
    
    // Parse Primary Size
    const primarySize = parseInt(row.topMeetingSize.split('p')[0]) || 0;

    return (
        <div className="flex flex-col gap-4 w-full relative">
            
            {/* Header: Status (Conclusion) */}
            <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex items-center gap-1.5 ${config.class}`}>
                        <StatusIcon className="w-3 h-3" />
                        {row.classification}
                    </span>
                    <button 
                        onClick={() => setShowExplain(!showExplain)} 
                        className={`p-1 rounded hover:bg-slate-100 ${showExplain ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}
                        title="Explain Logic"
                    >
                        <Info className="w-3 h-3" />
                    </button>
                </div>
                
                {/* Explain Panel (Toggle) */}
                {showExplain && (
                    <div className="bg-slate-50 border border-slate-200 rounded p-3 text-[10px] space-y-2 animate-in fade-in slide-in-from-top-1 mt-1">
                        <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-2">
                            <div>
                                <span className="block text-slate-400 uppercase font-bold">Capacity</span>
                                <span className="font-mono font-bold text-slate-700">{C} pax</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 uppercase font-bold">Primary</span>
                                <span className="font-mono font-bold text-slate-700">{primarySize} pax</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 uppercase font-bold">Avg Occ</span>
                                <span className="font-mono font-bold text-slate-700">{row.avgOccupancy.toFixed(1)} pax</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="block text-slate-400 uppercase font-bold">Logic Applied</span>
                            <div className="flex justify-between items-center bg-white px-2 py-1 rounded border border-slate-100 text-slate-500">
                                <span>&lt; {half} pax</span>
                                <span>Underutilized</span>
                            </div>
                            <div className="flex justify-between items-center bg-white px-2 py-1 rounded border border-slate-100 text-slate-500">
                                <span>{half}–{seventy} pax</span>
                                <span>Reasonable</span>
                            </div>
                            <div className="flex justify-between items-center bg-white px-2 py-1 rounded border border-slate-100 text-slate-500">
                                <span>&gt; {eighty} pax</span>
                                <span>Over Utilized</span>
                            </div>
                        </div>
                        <div className="pt-1 text-slate-500 italic">
                            Values are rounded before comparison. Primary size or Avg Occ must trigger threshold.
                        </div>
                    </div>
                )}

                {!showExplain && (
                    <div className="text-[10px] text-slate-500 italic">
                        {explanation}
                    </div>
                )}
            </div>

            {/* The Visualization: Evidence (Distribution Bar) */}
            <div className="relative h-8 w-full mt-1">
                <div className="absolute inset-0 flex rounded-md overflow-hidden h-full border border-white bg-slate-50">
                    {granularSegments.map((seg, i) => (
                        <div 
                            key={i}
                            style={{ width: `${seg.pct}%` }}
                            className={`${getColor(seg.size)} h-full border-r border-white last:border-0 relative group flex items-center justify-center transition-colors hover:brightness-95`}
                            title={`${seg.label}: ${seg.pct.toFixed(1)}%`}
                        >
                            {seg.pct > 8 && (
                                <span className="text-[9px] font-bold text-slate-700 opacity-80 whitespace-nowrap px-1">
                                    {seg.label}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer: Context & Legend */}
            <div className="flex flex-col gap-2">
                {/* Context Metrics (Plain Text) */}
                <div className="text-[10px] text-slate-500 font-medium flex gap-3 border-b border-slate-100 pb-2">
                    <span>Room Capacity: <strong className="text-slate-700">{row.capacity} pax</strong></span>
                    <span className="text-slate-300">|</span>
                    <span>Avg Occupancy: <strong className="text-slate-700">{row.avgOccupancy.toFixed(1)} pax</strong></span>
                </div>

                {/* Legend (Observed Sizes Only) */}
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {granularSegments.map((seg, i) => (
                        <div key={i} className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${getColor(seg.size)}`}></div>
                            <span className="text-[9px] text-slate-400 font-medium">{seg.label} ({seg.pct.toFixed(0)}%)</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- NEW COMPONENT: CONCURRENCY CARD ---
const ConcurrencyCard = ({ 
    stats, 
    totalRooms, 
    roomTypes, 
    selectedType, 
    onSelectType 
}: { 
    stats: { avgPct: number, maxPct: number, timeline: ConcurrencyMetric[], uniqueRoomsCount: number }, 
    totalRooms: number, // Legacy context total
    roomTypes: string[],
    selectedType: string,
    onSelectType: (t: string) => void
}) => {
    if (!stats || !stats.timeline) return null;

    // Calculate approximate room counts for context
    const avgRoomsInUse = Math.round((stats.avgPct / 100) * stats.uniqueRoomsCount);
    const maxRoomsInUse = Math.round((stats.maxPct / 100) * stats.uniqueRoomsCount);

    const title = selectedType === 'All Rooms' 
        ? 'OVERALL ROOM OCCUPANCY (CONCURRENCY)' 
        : `${selectedType.toUpperCase()} OCCUPANCY (CONCURRENCY)`;

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8 flex flex-col md:flex-row gap-8">
            {/* Left: Summary Metrics */}
            <div className="md:w-1/3 flex flex-col justify-center space-y-6">
                <div>
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xs font-bold text-slate-500 uppercase">{title}</h3>
                        <div className="relative group">
                            <select 
                                className="appearance-none bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 py-1 pl-2 pr-6 rounded-md hover:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer max-w-[140px] truncate"
                                value={selectedType}
                                onChange={(e) => onSelectType(e.target.value)}
                            >
                                {roomTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1.5 pointer-events-none" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mb-6">Based on concurrent usage across all observed time slots.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">Average Occupied %</div>
                        <div className="text-2xl font-bold text-indigo-600">{stats.avgPct.toFixed(1)}%</div>
                        <div className="text-xs font-medium text-slate-500 mt-1">≈ {avgRoomsInUse} rooms in use</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">Max Occupied %</div>
                        <div className="text-2xl font-bold text-rose-500">{stats.maxPct.toFixed(1)}%</div>
                        <div className="text-xs font-medium text-slate-500 mt-1">≈ {maxRoomsInUse} rooms in use</div>
                    </div>
                </div>
            </div>

            {/* Right: Chart */}
            <div className="md:w-2/3 h-64">
                {stats.timeline.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.timeline} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis 
                                dataKey="time" 
                                tick={{ fontSize: 10 }} 
                                interval="preserveStartEnd" 
                                minTickGap={30}
                            />
                            <YAxis 
                                unit="%" 
                                tick={{ fontSize: 10 }} 
                                domain={[0, 100]} 
                            />
                            <Tooltip 
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload as ConcurrencyMetric;
                                        return (
                                            <div className="bg-white p-2 border border-slate-200 rounded shadow-lg text-xs">
                                                <div className="font-bold text-slate-800 mb-1">{label}</div>
                                                <div className="text-indigo-600 font-bold">{data.pct.toFixed(1)}% Occupied</div>
                                                <div className="text-slate-500">
                                                    {data.occupied} / {data.total} Rooms Observed
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <ReferenceLine y={stats.avgPct} stroke="#6366f1" strokeDasharray="3 3" label={{ value: 'Avg', position: 'insideTopRight', fill: '#6366f1', fontSize: 10 }} />
                            <Bar dataKey="pct" fill="#cbd5e1" radius={[2, 2, 0, 0]}>
                                {stats.timeline.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.pct === stats.maxPct ? '#f43f5e' : '#cbd5e1'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-xl">
                        <BarChart2 className="w-8 h-8 mb-2" />
                        <p className="text-xs">No occupied observations for selected room type.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- NEW COMPONENT: OVERALL MEETING SUMMARY ---
const OverallMeetingSummary = ({ metrics }: { metrics: any }) => {
    const data = metrics.globalSizeBins;
    
    // Transform for Recharts
    const chartData = data.map((d: GlobalSizeBin) => ({
        name: d.label,
        value: d.count,
        pct: d.occupancyPct,
        fill: d.label.includes('12p') ? MM_PALETTE.program[5] 
            : d.label.includes('8-11') ? MM_PALETTE.program[2]
            : d.label.includes('5-7') ? MM_PALETTE.program[1]
            : d.label.includes('3-4') ? MM_PALETTE.program[3]
            : MM_PALETTE.program[0]
    }));

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8 flex flex-col md:flex-row gap-8">
            {/* Left: Chart */}
            <div className="flex-1 min-w-[300px]">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">Meeting Size Distribution (Occupancy %)</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                            <Pie 
                                data={chartData} 
                                dataKey="pct" 
                                nameKey="name" 
                                innerRadius={60} 
                                outerRadius={80} 
                                paddingAngle={2}
                            >
                                {chartData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                                ))}
                                <LabelList 
                                    dataKey="name" 
                                    position="outside" 
                                    style={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} 
                                />
                            </Pie>
                            <Tooltip 
                                formatter={(val: number, name: string, props: any) => [
                                    `${val.toFixed(1)}% (${props.payload.value} mtgs)`, 
                                    name
                                ]}
                                contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                            />
                            <Legend 
                                verticalAlign="bottom" 
                                height={36} 
                                iconType="circle" 
                                wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#475569' }} 
                            />
                        </RePieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Middle: Stats Table */}
            <div className="flex-1">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">Global Distribution</h3>
                <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold uppercase">
                            <tr>
                                <th className="px-4 py-2">Size</th>
                                <th className="px-4 py-2 text-right">Count</th>
                                <th className="px-4 py-2 text-right">Occupancy %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {data.map((bin: GlobalSizeBin) => (
                                <tr key={bin.label}>
                                    <td className="px-4 py-2 font-medium text-slate-700">{bin.label}</td>
                                    <td className="px-4 py-2 text-right text-slate-500">{bin.count}</td>
                                    <td className="px-4 py-2 text-right font-bold text-indigo-600">{bin.occupancyPct.toFixed(1)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Right: Insights */}
            <div className="flex-1 bg-indigo-50 rounded-xl border border-indigo-100 p-5">
                <h3 className="text-xs font-bold text-indigo-800 uppercase mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-indigo-600" /> Work Behaviors
                </h3>
                <ul className="space-y-3">
                    {metrics.globalInsights.map((insight: string, i: number) => (
                        <li key={i} className="flex gap-2 text-xs text-indigo-900 leading-relaxed">
                            <ArrowRight className="w-3 h-3 text-indigo-400 mt-0.5 flex-shrink-0" />
                            {insight}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const MeetingDash = ({ metrics, records, onUpdateCapacity, onDrillDown }: { metrics: any, records: ObservationRecord[], onUpdateCapacity: (f: string, r: string, c: number) => void, onDrillDown: (title: string, events: MeetingEvent[], context?: string) => void }) => {
    const [sortField, setSortField] = useState<keyof RoomPerformanceMetric>('utilizationPct');
    const [sortAsc, setSortAsc] = useState(false);
    const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('All');
    
    // Concurrency State
    const [concurrencyType, setConcurrencyType] = useState('All Rooms');

    // Prepare sorted data
    const sortedData = useMemo(() => {
        let data = [...metrics.roomMetrics];
        
        // Filter
        if (statusFilter !== 'All') {
            data = data.filter(r => {
                if (statusFilter === 'Under') return r.classification.includes('Under');
                if (statusFilter === 'Fit') return r.classification.includes('Reasonably') || r.classification.includes('Well');
                if (statusFilter === 'Over') return r.classification.includes('Over');
                if (statusFilter === 'Mixed') return r.classification.includes('Mixed') || r.classification.includes('Unclassified');
                return true;
            });
        }

        return data.sort((a: any, b: any) => {
            const vA = a[sortField];
            const vB = b[sortField];
            return sortAsc ? (vA - vB) : (vB - vA);
        });
    }, [metrics.roomMetrics, sortField, sortAsc, statusFilter]);

    // Concurrency Logic
    const roomTypes = useMemo(() => {
        const types = new Set<string>();
        records.forEach(r => {
            if (r.roomType) types.add(r.roomType.trim());
        });
        return ['All Rooms', ...Array.from(types).sort()];
    }, [records]);

    const concurrencyStats = useMemo(() => {
        const activeRecords = concurrencyType === 'All Rooms' 
            ? records 
            : records.filter(r => (r.roomType || '').trim() === concurrencyType);
        
        return calculateConcurrencyStats(activeRecords);
    }, [records, concurrencyType]);

    // Helper for Primary Size Context
    const getPrimarySizeContext = (row: RoomPerformanceMetric) => {
        if (!row.sizeBreakdown || row.sizeBreakdown.length === 0) return "No data available.";

        // Sort by count desc to confirm mode
        const sorted = [...row.sizeBreakdown].sort((a,b) => b.count - a.count);
        const mode = sorted[0];
        
        // 1-2p dominance check
        const smalls = row.sizeBreakdown.filter(s => s.size <= 2);
        const smallPct = smalls.reduce((sum, s) => sum + s.occupancyPct, 0);
        
        if (mode.size <= 2 && smallPct > mode.occupancyPct + 5) {
            return `Small meetings (1–2p) account for ${smallPct.toFixed(0)}% of usage.`;
        }
        
        // 3-4p dominance check
        const mediums = row.sizeBreakdown.filter(s => s.size >= 3 && s.size <= 4);
        const mediumPct = mediums.reduce((sum, s) => sum + s.occupancyPct, 0);
        
        if ((mode.size === 3 || mode.size === 4) && mediumPct > mode.occupancyPct + 5) {
            return `3–4 pax meetings account for ${mediumPct.toFixed(0)}% of usage.`;
        }

        return "Most frequent occupancy observed.";
    };

    // Helper for Status Badge in Row
    const getRowBadge = (status: string) => {
        if (status.includes('Under')) return <span title={status} className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100"><ArrowDown className="w-3 h-3" /> Under</span>;
        if (status.includes('Reasonably') || status.includes('Well')) return <span title={status} className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100"><CheckCircle className="w-3 h-3" /> Fit</span>;
        if (status.includes('Over')) return <span title={status} className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100"><AlertTriangle className="w-3 h-3" /> Over</span>;
        return <span title={status} className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100"><MoreHorizontal className="w-3 h-3" /> Mixed</span>;
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* 0. Concurrency Card (Active) */}
            <ConcurrencyCard 
                stats={concurrencyStats} 
                totalRooms={metrics.totalRooms} 
                roomTypes={roomTypes}
                selectedType={concurrencyType}
                onSelectType={setConcurrencyType}
            />

            {/* 1. Overall Summary Section */}
            <OverallMeetingSummary metrics={metrics} />

            {/* 2. Room Performance Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <AlignLeft className="w-4 h-4 text-slate-500" /> Room Performance
                    </h3>
                    
                    {/* Status Filter */}
                    <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg">
                        {['All', 'Under', 'Fit', 'Over', 'Mixed'].map(f => (
                            <button
                                key={f}
                                onClick={() => setStatusFilter(f)}
                                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${
                                    statusFilter === f 
                                    ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    <div className="text-xs text-slate-400 hidden sm:block">
                        {metrics.totalRooms} Rooms | {metrics.totalObservations} Observations
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                            <tr>
                                <th className="px-6 py-3 cursor-pointer hover:text-slate-700" onClick={() => setSortField('floor')}>Floor</th>
                                <th className="px-6 py-3 cursor-pointer hover:text-slate-700" onClick={() => setSortField('roomName')}>Room Name</th>
                                <th className="px-6 py-3 cursor-pointer hover:text-slate-700" onClick={() => setSortField('roomType')}>Type</th>
                                <th className="px-6 py-3 text-center w-24">Capacity (Pax)</th>
                                <th className="px-6 py-3 text-right cursor-pointer hover:text-slate-700" onClick={() => setSortField('utilizationPct')}>Util %</th>
                                <th className="px-6 py-3 text-right cursor-pointer hover:text-slate-700" onClick={() => setSortField('avgOccupancy')}>Avg Occ.</th>
                                <th className="px-6 py-3 text-center">Status</th>
                                <th className="px-4 py-3 text-center w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedData.map((row, i) => {
                                const isExpanded = expandedRoom === `${row.floor}-${row.roomName}`;
                                return (
                                <React.Fragment key={i}>
                                <tr 
                                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50' : ''}`}
                                    onClick={() => setExpandedRoom(isExpanded ? null : `${row.floor}-${row.roomName}`)}
                                >
                                    <td className="px-6 py-3 text-slate-600">{row.floor}</td>
                                    <td className="px-6 py-3 font-medium text-slate-800">{row.roomName}</td>
                                    <td className="px-6 py-3 text-slate-500 text-xs">{row.roomType}</td>
                                    <td className="px-6 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                        <div className="relative group/edit w-20 mx-auto">
                                            <input 
                                                type="number" 
                                                className="w-full text-center border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent"
                                                placeholder="-"
                                                value={row.capacity || ''}
                                                onChange={(e) => onUpdateCapacity(row.floor, row.roomName, parseInt(e.target.value) || 0)}
                                            />
                                            <Edit2 className="w-3 h-3 text-slate-300 absolute right-0 top-1 opacity-0 group-hover/edit:opacity-100 pointer-events-none" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${row.utilizationPct > 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {row.utilizationPct.toFixed(0)}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-right font-mono text-slate-600">
                                        {row.avgOccupancy.toFixed(1)}
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        {getRowBadge(row.classification)}
                                    </td>
                                    <td className="px-4 py-3 text-center text-slate-400">
                                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </td>
                                </tr>
                                {isExpanded && (
                                    <tr>
                                        <td colSpan={8} className="p-0 bg-slate-50 border-b border-slate-200">
                                            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-top-2">
                                                
                                                {/* Left: Summary Card */}
                                                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm h-full flex flex-col justify-between">
                                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-4">Room Snapshot</h4>
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm text-slate-600">Total Meetings (Occupied)</span>
                                                            <span className="text-lg font-bold text-slate-800">{row.occupiedSlots}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm text-slate-600">Room Utilization</span>
                                                            <span className={`text-lg font-bold ${row.utilizationPct > 50 ? 'text-emerald-600' : 'text-slate-800'}`}>
                                                                {row.utilizationPct.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                        
                                                        {/* Prominent Primary Size Display */}
                                                        <div className="pt-2 border-t border-slate-100 mt-2">
                                                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Primary Meeting Size</div>
                                                            <div className="text-xl font-bold text-indigo-700">{row.topMeetingSize}</div>
                                                            <div className="text-[10px] text-slate-400 leading-tight">
                                                                {getPrimarySizeContext(row)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Center: Capacity Fit Bar */}
                                                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm h-full flex flex-col">
                                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-4">Capacity Fit Analysis</h4>
                                                    <div className="flex-grow flex items-center">
                                                        <CapacityFitBar row={row} />
                                                    </div>
                                                </div>

                                                {/* Right: Size Breakdown */}
                                                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-64">
                                                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                                                        <h4 className="text-xs font-bold text-slate-500 uppercase">Size Breakdown</h4>
                                                    </div>
                                                    <div className="flex-grow overflow-y-auto">
                                                        <table className="w-full text-left text-xs">
                                                            <thead className="bg-white sticky top-0 text-slate-400 font-bold border-b border-slate-100">
                                                                <tr>
                                                                    <th className="px-4 py-2">Size</th>
                                                                    <th className="px-4 py-2 text-right">Count</th>
                                                                    <th className="px-4 py-2 text-right">Occ %</th>
                                                                    <th className="px-4 py-2"></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {row.sizeBreakdown.map((item, idx) => (
                                                                    <tr key={idx} className="hover:bg-slate-50">
                                                                        <td className="px-4 py-2 font-bold text-slate-700">{item.size} pax</td>
                                                                        <td className="px-4 py-2 text-right text-slate-600">{item.count}</td>
                                                                        <td className="px-4 py-2 text-right font-mono font-bold text-indigo-700">
                                                                            {item.occupancyPct.toFixed(0)}%
                                                                        </td>
                                                                        <td className="px-4 py-2 text-right">
                                                                            <button 
                                                                                onClick={() => onDrillDown(`${row.roomName} - ${item.size} Pax Meetings`, item.events, row.classification)}
                                                                                className="text-[9px] font-bold text-slate-400 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 px-2 py-1 rounded transition-colors"
                                                                            >
                                                                                View ({item.count})
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                                {row.sizeBreakdown.length === 0 && (
                                                                    <tr><td colSpan={4} className="p-4 text-center text-slate-400">No data</td></tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>

                                            </div>
                                        </td>
                                    </tr>
                                )}
                                </React.Fragment>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UtilizationStudy;
