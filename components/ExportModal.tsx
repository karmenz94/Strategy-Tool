
import React, { useState, useEffect } from 'react';
import { StrategyParams, ProjectReality } from '../types';
import { 
  Download, FileSpreadsheet, Briefcase, Layout, Globe, 
  Check, X, ChevronRight, Settings, Layers, BarChart3, Database, 
  ArrowLeft, FileImage, Presentation, FileText
} from 'lucide-react';

export type ExportPreset = 'client' | 'designer' | 'internal' | 'custom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  scenarios: StrategyParams[];
  activeScenarioId: string;
  project: ProjectReality;
  initialPreset: ExportPreset;
}

type ContentSection = 'overview' | 'comparison' | 'program' | 'stacking' | 'analysis';
type FileFormat = 'pdf' | 'xlsx' | 'csv' | 'pptx' | 'png';

interface ExportConfig {
  preset: ExportPreset;
  selectedScenarios: string[]; // IDs
  sections: Record<ContentSection, boolean>;
  formats: Record<ContentSection, FileFormat[]>;
}

const SECTIONS: { id: ContentSection; label: string; icon: any; defaultFormats: FileFormat[] }[] = [
  { id: 'overview', label: 'Strategic Overview', icon: Briefcase, defaultFormats: ['pdf', 'pptx'] },
  { id: 'comparison', label: 'Scenario Comparison', icon: BarChart3, defaultFormats: ['pdf', 'xlsx'] },
  { id: 'program', label: 'Program Structure', icon: Database, defaultFormats: ['xlsx'] },
  { id: 'stacking', label: 'Floor & Space Details', icon: Layers, defaultFormats: ['xlsx', 'csv'] },
  { id: 'analysis', label: 'Analysis & Validation', icon: Layout, defaultFormats: ['pdf'] },
];

const PRESETS: Record<ExportPreset, Partial<ExportConfig>> = {
  client: {
    sections: { overview: true, comparison: true, program: false, stacking: false, analysis: true },
    formats: { overview: ['pdf'], comparison: ['pdf', 'pptx'], program: [], stacking: [], analysis: ['pdf'] }
  },
  designer: {
    sections: { overview: false, comparison: false, program: true, stacking: true, analysis: false },
    formats: { overview: [], comparison: [], program: ['xlsx'], stacking: ['xlsx', 'csv'], analysis: [] }
  },
  internal: {
    sections: { overview: true, comparison: true, program: true, stacking: true, analysis: true },
    formats: { overview: ['pdf'], comparison: ['xlsx'], program: ['xlsx'], stacking: ['xlsx'], analysis: ['pdf'] }
  },
  custom: {
    sections: { overview: false, comparison: false, program: false, stacking: false, analysis: false },
    formats: { overview: [], comparison: [], program: [], stacking: [], analysis: [] }
  }
};

const ExportModal: React.FC<Props> = ({ isOpen, onClose, scenarios, activeScenarioId, project, initialPreset }) => {
  const [step, setStep] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  // Configuration State
  const [config, setConfig] = useState<ExportConfig>({
    preset: 'custom',
    selectedScenarios: [activeScenarioId],
    sections: { ...PRESETS.custom.sections } as any,
    formats: { ...PRESETS.custom.formats } as any
  });

  // Reset/Init on Open
  useEffect(() => {
    if (isOpen) {
      setStep(1); // Start at Purpose
      setExportComplete(false);
      setIsExporting(false);
      
      // Apply initial preset settings
      const presetConfig = PRESETS[initialPreset];
      setConfig({
        preset: initialPreset,
        selectedScenarios: initialPreset === 'internal' ? scenarios.map(s => s.id) : [activeScenarioId],
        sections: { ...presetConfig.sections } as any,
        formats: { ...presetConfig.formats } as any
      });
      
      // Auto-advance for shortcuts if not custom
      if (initialPreset !== 'custom') {
         setStep(2); 
      }
    }
  }, [isOpen, initialPreset, activeScenarioId, scenarios]);

  if (!isOpen) return null;

  // --- Handlers ---

  const handlePresetSelect = (preset: ExportPreset) => {
    const presetConfig = PRESETS[preset];
    setConfig(prev => ({
      ...prev,
      preset,
      selectedScenarios: preset === 'internal' ? scenarios.map(s => s.id) : [activeScenarioId],
      sections: { ...presetConfig.sections } as any,
      formats: { ...presetConfig.formats } as any
    }));
    setStep(2);
  };

  const toggleScenario = (id: string) => {
    setConfig(prev => {
      const current = prev.selectedScenarios;
      const isSelected = current.includes(id);
      return {
        ...prev,
        selectedScenarios: isSelected 
          ? current.filter(cid => cid !== id) // Allow empty? Maybe enforce at least 1 later
          : [...current, id]
      };
    });
  };

  const toggleSection = (id: ContentSection) => {
    setConfig(prev => {
      const isEnabled = prev.sections[id];
      // If enabling, set default formats if none selected
      let newFormats = prev.formats[id];
      if (!isEnabled && (!newFormats || newFormats.length === 0)) {
         const def = SECTIONS.find(s => s.id === id)?.defaultFormats || [];
         newFormats = [...def];
      }

      return {
        ...prev,
        sections: { ...prev.sections, [id]: !isEnabled },
        formats: { ...prev.formats, [id]: newFormats }
      };
    });
  };

  const toggleFormat = (sectionId: ContentSection, format: FileFormat) => {
    setConfig(prev => {
      const current = prev.formats[sectionId] || [];
      const isSelected = current.includes(format);
      const newFormats = isSelected ? current.filter(f => f !== format) : [...current, format];
      return {
        ...prev,
        formats: { ...prev.formats, [sectionId]: newFormats }
      };
    });
  };

  const generateDataPayload = () => {
     // Updated data structure for Requirement E (Fixed/Alt/Total)
     const selectedScenariosData = scenarios
        .filter(s => config.selectedScenarios.includes(s.id))
        .map(s => {
           const totalHc = Math.ceil(project.headcount * (1 + s.growthBuffer / 100));
           const fixed = s.workpoints?.fixed || 0;
           const alt = s.workpoints?.alternative || 0;
           const total = fixed + alt;
           
           return {
              Scenario: s.name,
              TotalHeadcount: totalHc,
              FixedWorkstations: fixed,
              AlternativeWorkpoints: alt,
              TotalWorkpoints: total,
              EnclosedOffices: s.enclosedOfficeCount,
              Ratio: (total > 0 ? totalHc / total : 0).toFixed(2),
              DeltaVsHeadcount: total - totalHc,
              Timestamp: new Date().toISOString()
           };
        });
     
     console.log("Generating Export with Workpoint Columns:", selectedScenariosData);
     return selectedScenariosData;
  };

  const handleGenerate = () => {
    setIsExporting(true);
    
    // Trigger data generation for audit
    generateDataPayload();

    // Simulation
    setTimeout(() => {
      setIsExporting(false);
      setExportComplete(true);
      setTimeout(() => {
        setExportComplete(false);
        onClose();
      }, 2000);
    }, 2000);
  };

  // --- Render Steps ---

  const renderStep1_Purpose = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-lg font-bold text-slate-800">Select Export Purpose</h3>
        <p className="text-sm text-slate-500">Choose a recommended package or build your own.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { id: 'client', label: 'Client Presentation', icon: Briefcase, desc: 'High-level insights & charts.' },
          { id: 'designer', label: 'Designer Handoff', icon: Layout, desc: 'Detailed spatial data.' },
          { id: 'internal', label: 'Internal Record', icon: Globe, desc: 'Full project archive.' },
          { id: 'custom', label: 'Custom Build', icon: Settings, desc: 'Manual selection.' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => handlePresetSelect(item.id as ExportPreset)}
            className={`p-4 rounded-xl border-2 text-left hover:border-indigo-400 transition-all group ${config.preset === item.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white'}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${config.preset === item.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className={`font-bold ${config.preset === item.id ? 'text-indigo-900' : 'text-slate-700'}`}>{item.label}</span>
            </div>
            <p className="text-xs text-slate-500 ml-12">{item.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep2_Scope = () => (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full">
      {/* Scenarios (Left) */}
      <div className="md:col-span-4 border-r border-slate-100 pr-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Include Scenarios</h4>
        <div className="space-y-2">
          {scenarios.map(s => {
             const isSelected = config.selectedScenarios.includes(s.id);
             return (
               <label key={s.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                  <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                     {isSelected && <Check className="w-3 h-3" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={isSelected} onChange={() => toggleScenario(s.id)} />
                  <div>
                    <div className={`text-sm font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{s.name}</div>
                    {s.id === activeScenarioId && <div className="text-[10px] text-indigo-500 font-medium">Active Strategy</div>}
                  </div>
               </label>
             );
          })}
        </div>
      </div>

      {/* Content (Right) */}
      <div className="md:col-span-8">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Select Content Sections</h4>
        <div className="space-y-3">
          {SECTIONS.map(section => {
             const isSelected = config.sections[section.id];
             return (
               <div key={section.id} className={`p-3 rounded-xl border transition-all ${isSelected ? 'border-indigo-600 shadow-sm' : 'border-slate-200 opacity-80 hover:opacity-100'}`}>
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection(section.id)}>
                     <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                           <section.icon className="w-4 h-4" />
                        </div>
                        <span className={`text-sm font-bold ${isSelected ? 'text-slate-800' : 'text-slate-500'}`}>{section.label}</span>
                     </div>
                     <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isSelected ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isSelected ? 'translate-x-4' : ''}`} />
                     </div>
                  </div>
               </div>
             );
          })}
        </div>
      </div>
    </div>
  );

  const renderStep3_Formats = () => (
    <div className="space-y-4">
       <div className="text-center mb-6">
          <h3 className="text-lg font-bold text-slate-800">Output Formats</h3>
          <p className="text-sm text-slate-500">Select file types for each content section.</p>
       </div>
       
       <div className="space-y-4">
         {SECTIONS.filter(s => config.sections[s.id]).map(section => (
           <div key={section.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                    <section.icon className="w-4 h-4" />
                 </div>
                 <span className="text-sm font-bold text-slate-800">{section.label}</span>
              </div>
              
              <div className="flex gap-2">
                 {['pdf', 'xlsx', 'csv', 'pptx', 'png'].map((fmt) => {
                    const format = fmt as FileFormat;
                    const isSelected = config.formats[section.id]?.includes(format);
                    const Icon = format === 'xlsx' || format === 'csv' ? FileSpreadsheet : format === 'pptx' ? Presentation : format === 'png' ? FileImage : FileText;
                    
                    return (
                       <button 
                         key={fmt}
                         onClick={() => toggleFormat(section.id, format)}
                         className={`px-3 py-1.5 rounded-md text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                           isSelected 
                             ? 'bg-indigo-600 text-white border-indigo-600' 
                             : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                         }`}
                       >
                         {isSelected && <Check className="w-3 h-3" />}
                         <Icon className="w-3 h-3" />
                         {fmt.toUpperCase()}
                       </button>
                    );
                 })}
              </div>
           </div>
         ))}
         {Object.values(config.sections).every(v => !v) && (
            <div className="text-center p-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
               No content sections selected. Go back to select content.
            </div>
         )}
       </div>
    </div>
  );

  const renderStep4_Generate = () => {
    const fileCount = Object.keys(config.sections)
      .filter(k => config.sections[k as ContentSection])
      .reduce((sum, k) => sum + (config.formats[k as ContentSection]?.length || 0), 0);
    
    return (
       <div className="flex flex-col items-center justify-center h-full py-8 text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
             <Download className="w-8 h-8 text-indigo-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Ready to Generate</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-8">
             You are about to generate a <strong>{config.preset === 'custom' ? 'Custom' : config.preset.charAt(0).toUpperCase() + config.preset.slice(1)}</strong> package containing <strong>{fileCount} files</strong> across {config.selectedScenarios.length} scenarios.
          </p>
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 w-full max-w-md text-left text-xs text-slate-600 space-y-2 mb-8">
             <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-bold">Included Scenarios:</span>
                <span>{config.selectedScenarios.length}</span>
             </div>
             {SECTIONS.filter(s => config.sections[s.id]).map(s => (
                <div key={s.id} className="flex justify-between">
                   <span>{s.label}</span>
                   <span className="font-mono text-slate-400">{config.formats[s.id]?.map(f => f.toUpperCase()).join(', ')}</span>
                </div>
             ))}
             {config.formats['stacking']?.includes('csv') && (
               <div className="mt-2 pt-2 border-t border-slate-200 text-indigo-600 font-bold flex items-center gap-1">
                 <Check className="w-3 h-3" /> Includes Fixed/Alternative counts
               </div>
             )}
          </div>

          <button 
             onClick={handleGenerate}
             disabled={isExporting || exportComplete || fileCount === 0}
             className={`flex items-center gap-2 px-8 py-3 rounded-xl text-base font-bold text-white transition-all shadow-lg transform active:scale-95 ${
               exportComplete ? 'bg-emerald-500 hover:bg-emerald-600' : isExporting ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200'
             }`}
          >
             {isExporting ? 'Generating Files...' : exportComplete ? 'Download Complete!' : 'Generate Package'}
             {exportComplete ? <Check className="w-5 h-5" /> : !isExporting && <Download className="w-5 h-5" />}
          </button>
       </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-600" />
              Export Builder
            </h2>
            <p className="text-sm text-slate-500 mt-1">Configure your data package.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-center py-4 bg-white border-b border-slate-100 flex-shrink-0">
           {[1, 2, 3, 4].map((s, idx) => (
             <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                   {s}
                </div>
                {idx < 3 && <div className={`w-12 h-0.5 mx-2 ${step > s ? 'bg-indigo-600' : 'bg-slate-200'}`} />}
             </div>
           ))}
        </div>

        {/* Content */}
        <div className="flex-grow p-8 overflow-y-auto bg-slate-50/30">
           {step === 1 && renderStep1_Purpose()}
           {step === 2 && renderStep2_Scope()}
           {step === 3 && renderStep3_Formats()}
           {step === 4 && renderStep4_Generate()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center flex-shrink-0">
           {step > 1 ? (
             <button onClick={() => setStep(step - 1)} className="px-5 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
             </button>
           ) : (
             <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-slate-400 hover:text-slate-600">Cancel</button>
           )}

           {step < 4 ? (
             <button 
               onClick={() => setStep(step + 1)} 
               className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md transition-all"
             >
               Next Step <ChevronRight className="w-4 h-4" />
             </button>
           ) : (
              <div /> // Step 4 has its own main action
           )}
        </div>

      </div>
    </div>
  );
};

export default ExportModal;
