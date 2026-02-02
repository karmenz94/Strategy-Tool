
import React, { useEffect, useState } from 'react';
import { ProjectReality, UnitType } from '../types';
import { INDUSTRIES, PROJECT_TYPES, getProgramPreset } from '../constants';
import { Building, MapPin, Users, Scaling, Briefcase, ArrowRightLeft, Layers, AlertTriangle, ChevronDown, ChevronRight, FileText, Palette, Globe, Settings2 } from 'lucide-react';
import VisualizationSettings from './VisualizationSettings';

interface Props {
  data: ProjectReality;
  onChange: (data: ProjectReality) => void;
}

const SectionHeader = ({ number, title, icon: Icon }: { number: string, title: string, icon: any }) => (
  <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100">
    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold font-mono">
      {number}
    </div>
    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
      <Icon className="w-4 h-4 text-orange-500" />
      {title}
    </h3>
  </div>
);

const ProjectSetup: React.FC<Props> = ({ data, onChange }) => {
  const [showFloors, setShowFloors] = useState(false);
  const [showVizSettings, setShowVizSettings] = useState(false);

  // Auto-calculate NIA
  useEffect(() => {
    let newNia = data.areaInput;
    if (data.areaDefinition === 'Gross') {
      newNia = data.areaInput * (data.targetEfficiency / 100);
    }
    if (newNia !== data.calculatedNia) {
      onChange({ ...data, calculatedNia: newNia });
    }
  }, [data.areaInput, data.areaDefinition, data.targetEfficiency, data.calculatedNia]);

  const handleChange = (field: keyof ProjectReality, value: any) => {
    let updates = { ...data, [field]: value };
    if (field === 'projectType') {
      const newPreset = getProgramPreset(value);
      updates = { ...updates, programStructure: newPreset };
    }
    onChange(updates);
  };

  const handleUnitToggle = (newUnit: UnitType) => {
    onChange({ ...data, unit: newUnit });
  };

  const updateFloorCount = (count: number) => {
    const currentFloors = [...data.floors];
    if (count > currentFloors.length) {
      for (let i = currentFloors.length; i < count; i++) {
        currentFloors.push({ id: `f${i+1}`, name: `Floor ${i+1}`, headcount: 0 });
      }
    } else if (count < currentFloors.length) {
      currentFloors.length = count;
    }
    onChange({ ...data, floors: currentFloors });
  };

  const updateFloorHc = (index: number, hc: number) => {
    const newFloors = [...data.floors];
    newFloors[index].headcount = hc;
    onChange({ ...data, floors: newFloors });
  };

  const floorHcSum = data.floors.reduce((sum, f) => sum + f.headcount, 0);
  const hcMismatch = floorHcSum !== data.headcount;

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-5xl mx-auto">
      
      <div className="mb-10">
         <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
           <Building className="w-6 h-6 text-orange-500" />
           Project Information
         </h2>
         <p className="text-slate-500 mt-2">
           Defining the strategic context and constraints for the portfolio analysis.
         </p>
      </div>

      <div className="space-y-12">
        
        {/* Section 1: Strategic Context (Identity & Location) */}
        <section>
          <SectionHeader number="1" title="Strategic Context" icon={Briefcase} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Project Name <span className="text-rose-500">*</span></label>
              <div className="flex items-center bg-slate-50 px-4 py-3 rounded-lg border border-slate-200 focus-within:border-orange-400 transition-all">
                <FileText className="w-5 h-5 text-slate-400 mr-3" />
                <input 
                  type="text" 
                  className="bg-transparent w-full text-lg font-bold text-slate-800 focus:outline-none placeholder-slate-300"
                  value={data.projectName || ''}
                  onChange={(e) => handleChange('projectName', e.target.value)}
                  placeholder="e.g. Project Zenith - Global HQ"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Industry Sector</label>
              <div className="relative group">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <select 
                  className="w-full bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700 pl-10 pr-3 py-2.5 rounded-lg focus:outline-none focus:border-orange-400 appearance-none"
                  value={data.industry}
                  onChange={(e) => handleChange('industry', e.target.value)}
                >
                  {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Location</label>
              <div className="relative group">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700 pl-10 pr-3 py-2.5 rounded-lg focus:outline-none focus:border-orange-400"
                  value={data.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="City, Country"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Scale & Typology */}
        <section>
          <SectionHeader number="2" title="Scale & Typology" icon={Scaling} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Project Typology</label>
              <div className="relative group">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <select 
                  className="w-full bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700 pl-10 pr-3 py-2.5 rounded-lg focus:outline-none focus:border-orange-400 appearance-none"
                  value={data.projectType}
                  onChange={(e) => handleChange('projectType', e.target.value)}
                >
                  {PROJECT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Total Base Headcount</label>
              <div className="relative group">
                <Users className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input 
                  type="number" 
                  min="1"
                  className="w-full bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 pl-10 pr-3 py-2.5 rounded-lg focus:outline-none focus:border-orange-400"
                  value={data.headcount}
                  onChange={(e) => handleChange('headcount', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Physical Constraints (Area & Floors) */}
        <section>
          <SectionHeader number="3" title="Physical Constraints" icon={Layers} />
          
          <div className="flex flex-wrap items-end gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100 mb-6">
              <div className="flex-grow min-w-[240px] space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Input Area
                </label>
                <div className="flex items-center gap-6 mb-3">
                   <label className="inline-flex items-center cursor-pointer group">
                      <input 
                        type="radio" 
                        className="form-radio text-orange-600 w-4 h-4 focus:ring-orange-500 border-slate-300" 
                        checked={data.areaDefinition === 'NIA'}
                        onChange={() => onChange({...data, areaDefinition: 'NIA', targetEfficiency: 100})}
                      />
                      <span className="ml-2 text-sm text-slate-700 font-medium">NIA (Net Internal)</span>
                   </label>
                   <label className="inline-flex items-center cursor-pointer group">
                      <input 
                        type="radio" 
                        className="form-radio text-orange-600 w-4 h-4 focus:ring-orange-500 border-slate-300" 
                        checked={data.areaDefinition === 'Gross'}
                        onChange={() => onChange({...data, areaDefinition: 'Gross', targetEfficiency: 80})}
                      />
                      <span className="ml-2 text-sm text-slate-700 font-medium">Gross Area</span>
                   </label>
                </div>
                
                <div className="relative group max-w-xs">
                   <input 
                     type="number" 
                     className="w-full bg-white border border-slate-300 text-lg font-bold text-slate-800 pl-4 pr-12 py-2 rounded-lg focus:outline-none focus:border-orange-400 shadow-sm"
                     value={data.areaInput}
                     onChange={(e) => handleChange('areaInput', parseFloat(e.target.value))}
                   />
                   <span className="absolute right-4 top-3 text-xs font-bold text-slate-400 uppercase">{data.unit}</span>
                </div>
              </div>

              {data.areaDefinition === 'Gross' && (
                <div className="w-40 space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Efficiency
                  </label>
                  <div className="relative group">
                     <input 
                       type="number" 
                       min="50"
                       max="100"
                       className="w-full bg-white border border-slate-300 text-lg font-medium text-slate-700 px-3 py-2 rounded-lg focus:outline-none focus:border-orange-400 text-right pr-8 shadow-sm"
                       value={data.targetEfficiency}
                       onChange={(e) => handleChange('targetEfficiency', parseFloat(e.target.value))}
                     />
                     <span className="absolute right-3 top-3 text-sm text-slate-400 font-bold">%</span>
                  </div>
                </div>
              )}

              <div className="flex items-center pb-4 text-slate-300">
                 <ArrowRightLeft className="w-6 h-6" />
              </div>

              <div className="flex-grow min-w-[200px] space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Effective NIA (Usable)
                </label>
                <div className="flex items-center bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-xl font-bold text-slate-800 w-full font-mono">
                    {Math.round(data.calculatedNia).toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 font-bold ml-2 uppercase">{data.unit}</span>
                </div>
              </div>
          </div>

          <div className="space-y-4">
             <div className="flex justify-between items-center">
               <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Number of Floors</label>
               <input 
                  type="number" 
                  min="1"
                  max="50"
                  className="w-24 bg-white border border-slate-200 text-sm font-medium text-slate-700 px-3 py-1.5 rounded-lg focus:outline-none focus:border-orange-400 text-right"
                  value={data.floors.length}
                  onChange={(e) => updateFloorCount(parseInt(e.target.value) || 1)}
                />
             </div>

             <button 
                onClick={() => setShowFloors(!showFloors)}
                className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase hover:text-orange-600 transition-colors group"
              >
                {showFloors ? <ChevronDown className="w-4 h-4 text-orange-500" /> : <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-500" />}
                Floor-by-Floor Allocation {showFloors ? '' : '(Optional)'}
              </button>
              
              {showFloors && (
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                   <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                       {data.floors.map((floor, idx) => (
                         <div key={floor.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm focus-within:border-orange-400 transition-colors">
                           <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">{floor.name}</div>
                           <div className="flex items-center gap-2">
                               <Users className="w-3 h-3 text-slate-300" />
                               <input 
                                 type="number"
                                 className="w-full text-sm font-bold text-slate-700 focus:outline-none"
                                 value={floor.headcount}
                                 onChange={(e) => updateFloorHc(idx, parseInt(e.target.value) || 0)}
                               />
                           </div>
                         </div>
                       ))}
                   </div>
                   {hcMismatch && (
                     <div className="mt-4 flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
                       <AlertTriangle className="w-4 h-4 text-amber-500" />
                       <span>Warning: Floor headcount sum ({floorHcSum}) does not match Total Headcount ({data.headcount}). Stacking calculations generally prioritize floor data.</span>
                     </div>
                   )}
                </div>
              )}
          </div>
        </section>

        {/* Section 4: System Preferences */}
        <section>
          <SectionHeader number="4" title="System Preferences" icon={Settings2} />
          
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
             <div className="flex items-center gap-6">
                <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-500 uppercase">Unit System</label>
                   <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                     <button 
                       onClick={() => handleUnitToggle('sqm')}
                       className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${data.unit === 'sqm' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                     >
                       SQM
                     </button>
                     <button 
                       onClick={() => handleUnitToggle('sqft')}
                       className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${data.unit === 'sqft' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                     >
                       SQFT
                     </button>
                  </div>
                </div>
             </div>

             <button 
               onClick={() => setShowVizSettings(true)}
               className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:border-orange-400 hover:text-orange-600 transition-all shadow-sm"
             >
                <Palette className="w-4 h-4" /> Customize Visualization
             </button>
          </div>
        </section>

      </div>
      
      {showVizSettings && (
         <VisualizationSettings 
            project={data}
            onChange={onChange}
            onClose={() => setShowVizSettings(false)}
         />
      )}
    </div>
  );
};

export default ProjectSetup;