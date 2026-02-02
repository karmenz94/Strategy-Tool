
import React, { useState } from 'react';
import { ChevronRight, X, Home, Calculator, GitCommit, Layout, ShieldCheck } from 'lucide-react';

const STEPS = [
  {
    title: "Project Context",
    desc: "Define the strategic identity, scale, and physical constraints of your project. These inputs drive all subsequent capacity calculations.",
    icon: Home
  },
  {
    title: "Strategy & Budget",
    desc: "Model scenarios by adjusting policy ratios (Sharing, Meeting, Support). See real-time impact on area demand vs supply.",
    icon: Calculator
  },
  {
    title: "Decision Framework",
    desc: "Compare scenarios side-by-side using strategic indicators like Density, Utilization Index, and Meeting Ratios.",
    icon: ShieldCheck
  },
  {
    title: "Stacking & Mix",
    desc: "Visualize program distribution across floors. Ensure the 'Program Mix' aligns with organizational goals.",
    icon: Layout
  },
  {
    title: "Deep Analysis",
    desc: "Use Team Adjacency and Utilization Studies to validate your strategy with data-driven evidence.",
    icon: GitCommit
  }
];

const OnboardingTour = ({ onClose }: { onClose: () => void }) => {
  const [current, setCurrent] = useState(0);

  const handleNext = () => {
    if (current < STEPS.length - 1) setCurrent(current + 1);
    else onClose();
  };

  const StepIcon = STEPS[current].icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
          {/* Header Image Area */}
          <div className="h-32 bg-gradient-to-r from-orange-500 to-rose-500 relative flex items-center justify-center">
             <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                <StepIcon className="w-8 h-8 text-white" />
             </div>
             <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
          </div>

          <div className="p-8 text-center">
             <div className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-2">Step {current + 1} of {STEPS.length}</div>
             <h2 className="text-2xl font-bold text-slate-800 mb-4">{STEPS[current].title}</h2>
             <p className="text-slate-500 leading-relaxed mb-8 h-16">{STEPS[current].desc}</p>
             
             <div className="flex gap-2 justify-center mb-8">
                {STEPS.map((_, i) => (
                   <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-8 bg-orange-500' : 'w-2 bg-slate-200'}`} />
                ))}
             </div>

             <button 
               onClick={handleNext}
               className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
             >
                {current === STEPS.length - 1 ? 'Get Started' : 'Next Step'} <ChevronRight className="w-4 h-4" />
             </button>
          </div>
       </div>
    </div>
  );
};

export default OnboardingTour;
