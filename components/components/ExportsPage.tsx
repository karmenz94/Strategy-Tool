
import React, { useState } from 'react';
import { ProjectReality, StrategyParams } from '../types';
import { Download, FileText, FileSpreadsheet, Briefcase, Layout, Globe, Check, Settings, Plus, ArrowRight } from 'lucide-react';
import ExportModal, { ExportPreset } from './ExportModal';

interface Props {
  project: ProjectReality;
  scenarios: StrategyParams[];
  activeScenarioId: string;
}

const ExportsPage: React.FC<Props> = ({ project, scenarios, activeScenarioId }) => {
  const activeScenario = scenarios.find(s => s.id === activeScenarioId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<ExportPreset>('custom');

  const openExport = (preset: ExportPreset) => {
    setSelectedPreset(preset);
    setIsModalOpen(true);
  };

  const ExportCard = ({ 
    preset, title, desc, icon: Icon, color, items, isCustom = false 
  }: { 
    preset: ExportPreset, title: string, desc: string, icon: any, color: string, items: string[], isCustom?: boolean 
  }) => (
    <div className={`relative bg-white p-6 rounded-xl border transition-all flex flex-col h-full group ${isCustom ? 'border-dashed border-slate-300 hover:border-indigo-400' : 'border-slate-200 shadow-sm hover:shadow-md'}`}>
       <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${color}`}>
          <Icon className={`w-6 h-6 ${isCustom ? 'text-indigo-600' : 'text-white'}`} />
       </div>
       <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
       <p className="text-sm text-slate-500 mb-6 flex-grow">{desc}</p>
       
       <ul className="space-y-2 mb-6">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
               <Check className={`w-3 h-3 ${isCustom ? 'text-slate-400' : 'text-emerald-500'}`} /> {item}
            </li>
          ))}
       </ul>

       <button 
         onClick={() => openExport(preset)}
         className={`w-full py-2.5 rounded-lg border font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
           isCustom 
             ? 'border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100' 
             : 'border-slate-200 text-slate-700 hover:bg-slate-50'
         }`}
       >
          {isCustom ? <Settings className="w-4 h-4" /> : <Download className="w-4 h-4" />}
          {isCustom ? 'Open Builder' : 'Download Package'}
       </button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto w-full h-full flex flex-col p-6">
       <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Project Exports</h2>
          <p className="text-slate-500 mt-1">Generate documentation packages for different stakeholders.</p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100">
             Active Scenario: {activeScenario?.name}
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ExportCard 
             preset="client"
             title="Client Presentation"
             desc="Executive summary with transparent charts, strategic metrics, and comparisons."
             icon={Briefcase}
             color="bg-indigo-600"
             items={['PDF Report', 'High-level KPIs', 'Strategic Insights']}
          />
          <ExportCard 
             preset="designer"
             title="Designer Handoff"
             desc="Technical data package for architectural teams to begin test fitting."
             icon={Layout}
             color="bg-pink-600"
             items={['Excel / CSV', 'Stacking Matrices', 'Room Quantities']}
          />
          <ExportCard 
             preset="internal"
             title="Internal Record"
             desc="Complete project dump containing all assumptions and metadata."
             icon={Globe}
             color="bg-emerald-600"
             items={['Excel Workbook', 'All Scenarios', 'Full Audit Log']}
          />
          <ExportCard 
             preset="custom"
             title="Custom Builder"
             desc="Build a specific export package by selecting content and formats manually."
             icon={Plus}
             color="bg-indigo-50"
             items={['Select Content', 'Choose Formats', 'Multi-Scenario']}
             isCustom={true}
          />
       </div>

       <ExportModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialPreset={selectedPreset}
          scenarios={scenarios}
          activeScenarioId={activeScenarioId}
          project={project}
       />
    </div>
  );
};

export default ExportsPage;
