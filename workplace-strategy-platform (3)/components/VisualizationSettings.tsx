
import React, { useState } from 'react';
import { ProjectReality, ProgramGroup, Department } from '../types';
import { X, RotateCcw, Palette, Layers, Users, Check } from 'lucide-react';
import { MM_PALETTE } from '../constants';

interface Props {
  project: ProjectReality;
  onChange: (project: ProjectReality) => void;
  onClose: () => void;
}

const VisualizationSettings: React.FC<Props> = ({ project, onChange, onClose }) => {
  const [activeTab, setActiveTab] = useState<'program' | 'depts'>('program');

  const updateProgramColor = (id: string, color: string) => {
    const updated = project.programStructure?.map(g => 
      g.id === id ? { ...g, color } : g
    ) || [];
    onChange({ ...project, programStructure: updated });
  };

  const updateDeptColor = (id: string, color: string) => {
    const updated = project.departments.map(d => 
      d.id === id ? { ...d, color } : d
    );
    onChange({ ...project, departments: updated });
  };

  const resetDefaults = () => {
    if (activeTab === 'program') {
      const updated = project.programStructure?.map((g, i) => ({
        ...g,
        color: MM_PALETTE.program[i % MM_PALETTE.program.length]
      })) || [];
      onChange({ ...project, programStructure: updated });
    } else {
      const updated = project.departments.map((d, i) => ({
        ...d,
        color: MM_PALETTE.departments[i % MM_PALETTE.departments.length]
      }));
      onChange({ ...project, departments: updated });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Palette className="w-4 h-4 text-orange-500" />
              Visualization Settings
            </h2>
            <p className="text-xs text-slate-500 mt-1">Customize diagram color mapping for exports.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-5 pt-2 bg-slate-50/50">
          <button 
            onClick={() => setActiveTab('program')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'program' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <Layers className="w-3 h-3" /> Program Structure
          </button>
          <button 
            onClick={() => setActiveTab('depts')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'depts' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <Users className="w-3 h-3" /> Departments
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6 bg-white">
          
          <div className="flex justify-end mb-4">
             <button onClick={resetDefaults} className="text-[10px] font-bold text-slate-400 hover:text-orange-600 flex items-center gap-1 transition-colors">
               <RotateCcw className="w-3 h-3" /> Reset to M Moser Standard
             </button>
          </div>

          <div className="space-y-2">
             {activeTab === 'program' ? (
                project.programStructure?.map(group => (
                  <div key={group.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-orange-200 transition-colors">
                     <span className="font-bold text-xs text-slate-700">{group.name}</span>
                     <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-slate-400 uppercase">{group.color}</span>
                        <div className="relative overflow-hidden w-8 h-8 rounded-full border border-slate-200 shadow-sm">
                           <input 
                              type="color" 
                              value={group.color}
                              onChange={(e) => updateProgramColor(group.id, e.target.value)}
                              className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                           />
                        </div>
                     </div>
                  </div>
                ))
             ) : (
                project.departments.map(dept => (
                  <div key={dept.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-orange-200 transition-colors">
                     <span className="font-bold text-xs text-slate-700">{dept.name}</span>
                     <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-slate-400 uppercase">{dept.color}</span>
                        <div className="relative overflow-hidden w-8 h-8 rounded-full border border-slate-200 shadow-sm">
                           <input 
                              type="color" 
                              value={dept.color}
                              onChange={(e) => updateDeptColor(dept.id, e.target.value)}
                              className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                           />
                        </div>
                     </div>
                  </div>
                ))
             )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
           <button 
             onClick={onClose}
             className="flex items-center gap-2 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg shadow-sm transition-all text-xs"
           >
             <Check className="w-3 h-3" /> Apply Settings
           </button>
        </div>

      </div>
    </div>
  );
};

export default VisualizationSettings;
