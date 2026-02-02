
import React, { useState } from 'react';
import { StrategyParams, MeetingRatios, SupportSpaceDef } from '../types';
import { Settings2, Briefcase, Users, LayoutGrid, Plus, Trash2, ChevronDown, ChevronRight, HelpCircle, Coffee, Calculator, AlertTriangle, CheckCircle } from 'lucide-react';
import { MEETING_BENCHMARKS } from '../constants';

interface Props {
  strategy: StrategyParams;
  onChange: (strategy: StrategyParams) => void;
  title?: string;
  isReadOnly?: boolean;
  baseHeadcount?: number; 
}

const SectionHeader = ({ 
  title, icon: Icon, isOpen, toggle 
}: { title: string, icon: any, isOpen: boolean, toggle: () => void }) => (
  <button 
    onClick={toggle}
    className="w-full flex items-center justify-between p-3 bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors"
  >
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-indigo-600" />
      <span className="text-sm font-bold text-slate-800 uppercase tracking-wide">{title}</span>
    </div>
    {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
  </button>
);

const NumberInput = ({
  label, value, unit, min, max, onChange, disabled, step = 1, note
}: {
  label: string; value: number; unit?: string; min?: number; max?: number;
  onChange: (val: number) => void; disabled?: boolean; step?: number; note?: string;
}) => (
  <div className={`mb-3 ${disabled ? 'opacity-60 grayscale' : ''}`}>
    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>
    <div className="flex items-center">
      <input 
        type="number"
        min={min} max={max} step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full p-2 text-sm border border-slate-200 rounded-l-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white font-medium"
      />
      {unit && (
        <div className="px-3 py-2 bg-slate-100 border border-l-0 border-slate-200 rounded-r-md text-xs font-bold text-slate-500 whitespace-nowrap">
          {unit}
        </div>
      )}
    </div>
    {note && <div className="text-[10px] text-slate-400 mt-1">{note}</div>}
  </div>
);

// Growth Buffer Helper to toggle between % and Absolute
const GrowthControl = ({ pct, baseHc, onChange, disabled }: { pct: number, baseHc: number, onChange: (v: number) => void, disabled?: boolean }) => {
  const [mode, setMode] = useState<'%' | 'Abs'>('%');
  
  const absValue = Math.round(baseHc * (pct / 100));

  const handleAbsChange = (newAbs: number) => {
    if (baseHc > 0) {
      const newPct = (newAbs / baseHc) * 100;
      onChange(parseFloat(newPct.toFixed(1)));
    }
  };

  return (
    <div className={`mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100 ${disabled ? 'opacity-60 grayscale' : ''}`}>
      <div className="flex justify-between items-center mb-2">
         <label className="text-xs font-bold text-indigo-800 uppercase tracking-wide">Growth Buffer</label>
         <div className="flex bg-white rounded border border-indigo-200 p-0.5">
            <button onClick={() => setMode('%')} className={`text-[10px] px-2 py-0.5 rounded ${mode === '%' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-slate-400'}`}>%</button>
            <button onClick={() => setMode('Abs')} className={`text-[10px] px-2 py-0.5 rounded ${mode === 'Abs' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-slate-400'}`}>HC</button>
         </div>
      </div>
      
      {mode === '%' ? (
        <NumberInput 
          label="" value={pct} unit="% add-on" min={0} max={100} step={1}
          onChange={onChange} disabled={disabled}
        />
      ) : (
         <div className="flex items-center">
          <input 
            type="number" 
            className="w-full p-2 text-sm border border-indigo-200 rounded-l-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={absValue}
            onChange={(e) => handleAbsChange(parseInt(e.target.value) || 0)}
            disabled={disabled}
          />
          <div className="px-3 py-2 bg-white border border-l-0 border-indigo-200 rounded-r-md text-xs font-bold text-indigo-500 whitespace-nowrap">
            People
          </div>
        </div>
      )}
      <div className="text-[10px] text-indigo-400 mt-1 flex justify-between">
         <span>Reserve capacity</span>
         <span>{mode === '%' ? `+${absValue} people` : `+${pct}% add-on`}</span>
      </div>
    </div>
  );
};

const MeetingRoomTable = ({ ratios, onChange, disabled }: { ratios: MeetingRatios, onChange: (r: MeetingRatios) => void, disabled?: boolean }) => {
  const update = (key: keyof MeetingRatios, val: number) => {
    onChange({ ...ratios, [key]: val });
  };

  const getStatus = (val: number, bench: number) => {
    if (val === 0) return { label: 'None', color: 'bg-slate-100 text-slate-400' };
    const diff = (val - bench) / bench;
    if (diff > 0.1) return { label: 'Conservative', color: 'bg-orange-100 text-orange-700' }; 
    if (diff < -0.1) return { label: 'Generous', color: 'bg-emerald-100 text-emerald-700' }; 
    return { label: 'Typical', color: 'bg-blue-100 text-blue-700' };
  };

  const Row = ({ type, label, val, bench }: { type: keyof MeetingRatios, label: string, val: number, bench: number }) => {
    const status = getStatus(val, bench);
    return (
      <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50 group">
        <td className="py-2 pl-2 text-xs font-medium text-slate-700 flex items-center gap-1">
          {label}
          <div className="group relative">
            <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-32 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-normal">
              Benchmark: 1 per {bench} ppl
            </div>
          </div>
        </td>
        <td className="py-2 px-1">
           <input 
             type="number" 
             className="w-full p-1 text-right text-xs border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 font-medium"
             value={val}
             onChange={(e) => update(type, parseInt(e.target.value) || 0)}
             disabled={disabled}
           />
        </td>
        <td className="py-2 pr-2 text-right">
           <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${status.color}`}>
             {status.label}
           </span>
        </td>
      </tr>
    );
  };

  return (
    <div className="mb-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
       <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
         <span className="text-xs font-bold text-slate-600 uppercase">Meeting Strategy</span>
         <span className="text-[10px] text-slate-400 italic">People per Room</span>
       </div>
       <table className="w-full">
         <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase font-semibold text-left">
           <tr>
             <th className="pl-2 py-1 font-normal w-1/3">Room Type</th>
             <th className="py-1 text-right font-normal pr-2">Input</th>
             <th className="pr-2 py-1 text-right font-normal">Status</th>
           </tr>
         </thead>
         <tbody>
            <Row type="small" label="Small (4p)" val={ratios.small} bench={MEETING_BENCHMARKS.small} />
            <Row type="medium" label="Medium (8p)" val={ratios.medium} bench={MEETING_BENCHMARKS.medium} />
            <Row type="large" label="Large (14p)" val={ratios.large} bench={MEETING_BENCHMARKS.large} />
            <Row type="board" label="Board (20p)" val={ratios.board} bench={MEETING_BENCHMARKS.board} />
            <Row type="townhall" label="Townhall" val={ratios.townhall} bench={MEETING_BENCHMARKS.townhall} />
         </tbody>
       </table>
    </div>
  );
};

const SupportSpaceManager = ({ spaces, onChange }: { spaces: SupportSpaceDef[], onChange: (s: SupportSpaceDef[]) => void }) => {
  const add = () => {
    onChange([...spaces, { id: `sup-${Date.now()}`, name: 'New Amenity', category: 'other', logic: 'pct_nia', value: 1 }]);
  };
  
  const update = (id: string, field: keyof SupportSpaceDef, val: any) => {
    onChange(spaces.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  const remove = (id: string) => {
    onChange(spaces.filter(s => s.id !== id));
  };

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
         <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1">
           <Coffee className="w-3 h-3" /> Support & Amenity
         </label>
         <button onClick={add} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
           <Plus className="w-3 h-3" /> Add
         </button>
      </div>
      <div className="space-y-2">
        {spaces.map(s => (
          <div key={s.id} className="bg-slate-50 p-2 rounded border border-slate-200 text-xs hover:border-indigo-200 transition-colors">
            <div className="flex justify-between items-center mb-2 gap-2">
              <input 
                className="bg-transparent font-bold text-slate-700 w-full focus:outline-none border-b border-transparent focus:border-indigo-200 text-xs" 
                value={s.name} 
                onChange={(e) => update(s.id, 'name', e.target.value)} 
                placeholder="Space Name"
              />
              <button onClick={() => remove(s.id)} className="text-slate-400 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <select 
                   className="w-full p-1 border rounded bg-white text-[10px]"
                   value={s.logic}
                   onChange={(e) => update(s.id, 'logic', e.target.value)}
              >
                  <option value="ratio">Ratio (1:X)</option>
                  <option value="pct_nia">% of NIA</option>
                  <option value="fixed_area">Fixed Area</option>
                  <option value="fixed_count">Fixed Count</option>
                  <option value="area_per_person">Area / Person</option>
              </select>
              
              <div className="flex items-center gap-1">
                   <input 
                      type="number" 
                      className="w-full p-1 border rounded bg-white text-right"
                      value={s.value}
                      onChange={(e) => update(s.id, 'value', parseFloat(e.target.value))}
                   />
                   <span className="text-[9px] text-slate-400 w-8 text-right">
                     {s.logic === 'pct_nia' ? '%' : s.logic === 'ratio' ? 'ppl' : 'val'}
                   </span>
              </div>
            </div>
            
            {(s.logic === 'ratio' || s.logic === 'fixed_count') && (
              <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="text-[9px] text-slate-400">Size per room:</span>
                  <div className="flex items-center gap-1 w-20">
                    <input 
                      type="number" 
                      className="w-full p-1 border rounded bg-white text-right text-[10px]"
                      value={s.areaPerUnit || 0}
                      onChange={(e) => update(s.id, 'areaPerUnit', parseFloat(e.target.value))}
                    />
                  </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const StrategyControl: React.FC<Props> = ({ strategy, onChange, title = "Active Strategy", isReadOnly = false, baseHeadcount = 100 }) => {
  const [sections, setSections] = useState({ planning: true, workplace: true });
  
  // Real-time diff calculation
  const totalHeadcount = Math.ceil(baseHeadcount * (1 + strategy.growthBuffer / 100));
  const fixed = strategy.workpoints?.fixed || 0;
  const alternative = strategy.workpoints?.alternative || 0;
  const totalWorkpoints = fixed + alternative;
  const diff = totalWorkpoints - totalHeadcount;

  const update = (key: keyof StrategyParams, val: any) => {
    if (!isReadOnly) onChange({ ...strategy, [key]: val });
  };

  const updateWorkpoints = (field: 'fixed' | 'alternative', val: number) => {
    if (!isReadOnly) {
        onChange({
            ...strategy,
            workpoints: {
                ...strategy.workpoints,
                [field]: Math.max(0, val)
            }
        });
    }
  };

  const toggle = (key: 'planning' | 'workplace') => setSections(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
      <div className="p-4 bg-slate-50 border-b border-slate-200">
         <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-indigo-600" />
            Strategy Inputs
         </h2>
         <div className="text-xs text-slate-500 mt-1 truncate font-medium">{title}</div>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar">
        
        {/* SECTION A: PLANNING FACTORS */}
        <SectionHeader title="Planning Factors" icon={LayoutGrid} isOpen={sections.planning} toggle={() => toggle('planning')} />
        
        {sections.planning && (
          <div className="p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
             <GrowthControl 
               pct={strategy.growthBuffer} 
               baseHc={baseHeadcount}
               onChange={(v) => update('growthBuffer', v)} 
               disabled={isReadOnly}
             />
             
             <NumberInput 
               label="Circulation"
               value={strategy.circulationPct}
               unit="% add-on"
               min={10} max={60}
               onChange={(v) => update('circulationPct', v)}
               disabled={isReadOnly}
             />
          </div>
        )}

        {/* SECTION B: WORKPLACE STRATEGY */}
        <SectionHeader title="Workplace Strategy" icon={Briefcase} isOpen={sections.workplace} toggle={() => toggle('workplace')} />
        
        {sections.workplace && (
          <div className="p-4 space-y-6 animate-in slide-in-from-top-2 duration-200">
            
            <NumberInput 
              label="Enclosed Offices"
              value={strategy.enclosedOfficeCount}
              unit="people"
              min={0}
              onChange={(v) => update('enclosedOfficeCount', v)}
              disabled={isReadOnly}
              note="Included within Fixed Workstations count"
            />

            <div className="pt-2 border-t border-slate-100">
               <div className="flex justify-between items-center mb-2">
                   <label className="block text-xs font-bold text-slate-500 uppercase">Workpoints Target</label>
               </div>
               
               <NumberInput 
                 label="Fixed Workstations"
                 value={fixed}
                 unit="seats"
                 min={0}
                 onChange={(v) => updateWorkpoints('fixed', v)}
                 disabled={isReadOnly}
                 note="Total assigned desks (includes Enclosed Offices)"
               />

               <NumberInput 
                 label="Alternative Workpoints"
                 value={alternative}
                 unit="points"
                 min={0}
                 onChange={(v) => updateWorkpoints('alternative', v)}
                 disabled={isReadOnly}
                 note="Agile, flex, or touchdown points"
               />

               {/* Real-time Calculation Card */}
               <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-xs space-y-2 shadow-sm mb-3 mt-2">
                  <div className="flex items-center gap-1.5 border-b border-indigo-200 pb-1.5 mb-1">
                      <Calculator className="w-3 h-3 text-indigo-500" />
                      <span className="font-bold text-indigo-800">Supply vs Demand</span>
                  </div>
                  <div className="flex justify-between">
                      <span className="text-indigo-600">Total Headcount:</span>
                      <span className="font-bold text-indigo-900">{totalHeadcount}</span>
                  </div>
                  <div className="flex justify-between">
                      <span className="text-indigo-600">Total Workpoints:</span>
                      <span className="font-bold text-indigo-900">{totalWorkpoints}</span>
                  </div>
                  <div className={`flex justify-between font-bold pt-1 border-t border-indigo-100 ${diff < 0 ? 'text-amber-600' : diff > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                      <span className="flex items-center gap-1">
                         {diff < 0 ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />} Status:
                      </span>
                      <span>
                         {diff === 0 ? "Matched" : diff > 0 ? `Over by ${diff}` : `Under by ${Math.abs(diff)}`}
                      </span>
                  </div>
               </div>
            </div>

            <MeetingRoomTable 
              ratios={strategy.meetingRatios} 
              onChange={(r) => update('meetingRatios', r)}
              disabled={isReadOnly}
            />

            <NumberInput 
              label="Phone Booth Ratio"
              value={strategy.phoneBoothRatio}
              unit="ppl : 1 booth"
              min={1} max={100}
              onChange={(v) => update('phoneBoothRatio', v)}
              disabled={isReadOnly}
            />

            <div className="border-t border-slate-100 pt-4">
              <SupportSpaceManager 
                spaces={strategy.supportSpaces || []}
                onChange={(s) => update('supportSpaces', s)}
              />
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default StrategyControl;
