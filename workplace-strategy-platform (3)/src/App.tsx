
import React, { useState, useEffect, useMemo } from 'react';
import ProjectSetup from './components/ProjectSetup';
import SpaceBudget from './components/SpaceBudget';
import StackingPlan from './components/StackingPlan';
import AdjacencyModel from './components/AdjacencyModel';
import TestFit from './components/TestFit';
import ExportsPage from './components/ExportsPage';
import UtilizationStudy from './components/UtilizationStudy';
import OnboardingTour from './components/OnboardingTour';

import { ProjectReality, StrategyParams } from './types';
import { DEFAULT_PROJECT, DEFAULT_STRATEGY, getIndustryDefaults } from './constants';
import { calculateMetrics } from './utils/calculations';
import { 
  Layout, Home, Calculator, Layers, GitCommit, 
  Activity, Download, Hexagon, X, ArrowRight, BarChart2
} from 'lucide-react';

type Page = 'home' | 'budget' | 'stacking' | 'adjacency' | 'test-fit' | 'exports' | 'utilization';

const App: React.FC = () => {
  const [project, setProject] = useState<ProjectReality>(DEFAULT_PROJECT);
  const [activePage, setActivePage] = useState<Page>('home');
  const [showOnboarding, setShowOnboarding] = useState(true);

  // Scenario State
  const [scenarios, setScenarios] = useState<StrategyParams[]>([
    { ...DEFAULT_STRATEGY, id: 's1', name: 'Scenario A' }
  ]);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('s1');
  const [compareScenarioId, setCompareScenarioId] = useState<string | null>(null);

  // Active Data
  const activeStrategy = scenarios.find(s => s.id === activeScenarioId) || scenarios[0];
  const activeMetrics = useMemo(() => calculateMetrics(project, activeStrategy), [project, activeStrategy]);

  // Comparison Data
  const compareStrategy = scenarios.find(s => s.id === compareScenarioId);
  const compareMetrics = compareStrategy ? calculateMetrics(project, compareStrategy) : null;

  // Actions
  const handleStrategyChange = (updated: StrategyParams) => {
    setScenarios(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const addScenario = () => {
    const newId = `s${Date.now()}`;
    const newScenario = { ...DEFAULT_STRATEGY, id: newId, name: `Option ${scenarios.length + 1}` };
    setScenarios([...scenarios, newScenario]);
    setActiveScenarioId(newId);
  };

  const duplicateScenario = () => {
    const newId = `s${Date.now()}`;
    const newScenario = { ...activeStrategy, id: newId, name: `${activeStrategy.name} (Copy)` };
    setScenarios([...scenarios, newScenario]);
    setActiveScenarioId(newId);
  };

  const deleteScenario = (id: string) => {
    if (scenarios.length > 1) {
      const remaining = scenarios.filter(s => s.id !== id);
      setScenarios(remaining);
      if (activeScenarioId === id) setActiveScenarioId(remaining[0].id);
      if (compareScenarioId === id) setCompareScenarioId(null);
    }
  };

  const renameScenario = (id: string, name: string) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  };

  // Industry Defaults Effect
  useEffect(() => {
    const defaults = getIndustryDefaults(project.industry, project.projectType);
    if (Object.keys(defaults).length > 0) {
      setScenarios(prev => prev.map(s => 
        s.id === activeScenarioId ? { ...s, ...defaults } : s
      ));
    }
  }, [project.industry, project.projectType]); 


  // Navigation Component
  const NavItem = ({ page, label, icon: Icon }: { page: Page, label: string, icon: any }) => (
    <button 
      onClick={() => setActivePage(page)}
      className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-all duration-200 border-l-2 ${
        activePage === page 
          ? 'border-orange-500 bg-slate-50 text-slate-900' 
          : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700'
      }`}
    >
      <Icon className={`w-4 h-4 ${activePage === page ? 'text-orange-500' : 'text-slate-400'}`} />
      {label}
    </button>
  );

  return (
    <div className="h-screen w-screen bg-slate-100 flex overflow-hidden font-sans text-slate-900">
      
      {showOnboarding && <OnboardingTour onClose={() => setShowOnboarding(false)} />}

      {/* M Moser Instrument Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-30 shadow-sm">
         <div className="p-6 border-b border-slate-100">
            <div className="flex flex-col gap-1.5">
               <div className="flex items-center gap-2">
                  <div className="w-2 h-8 bg-orange-500 rounded-sm"></div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">M MOSER ASSOCIATES</div>
               </div>
               <h1 className="text-base font-bold text-slate-800 leading-tight pl-4">Workplace Strategy<br/>Toolkit</h1>
            </div>
         </div>

         <div className="flex-grow py-8 space-y-8 overflow-y-auto">
            <div className="space-y-1">
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-6 mb-3">Context</div>
               <NavItem page="home" label="Project Information" icon={Home} />
            </div>

            <div className="space-y-1">
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-6 mb-3">Strategy & Planning</div>
               <NavItem page="budget" label="Space Budget" icon={Calculator} />
               <NavItem page="stacking" label="Stacking Plan" icon={Layers} />
            </div>
            
            <div className="space-y-1">
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-6 mb-3">Deep Analysis</div>
               <NavItem page="adjacency" label="Team Adjacency" icon={GitCommit} />
               <NavItem page="utilization" label="Utilization Study" icon={BarChart2} />
               <NavItem page="test-fit" label="Test Fit Scoring" icon={Activity} />
            </div>
            
            <div className="space-y-1">
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-6 mb-3">Deliverables</div>
               <NavItem page="exports" label="Exports" icon={Download} />
            </div>
         </div>

         <div className="p-5 border-t border-slate-100 bg-slate-50">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm">
                  <Hexagon className="w-4 h-4 text-slate-400" />
               </div>
               <div className="flex-grow overflow-hidden">
                  <div className="text-xs font-bold text-slate-800 truncate" title={project.projectName}>{project.projectName || "New Project"}</div>
                  <div className="text-[10px] text-slate-500 truncate">{project.location || "Location N/A"}</div>
               </div>
            </div>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col overflow-hidden bg-[#F8FAFC] relative">
        <div className="flex-grow overflow-hidden relative">
           
           {/* Project Home Page */}
           {activePage === 'home' && (
             <div className="h-full p-8 overflow-y-auto">
                 <ProjectSetup data={project} onChange={setProject} />
             </div>
           )}

           {/* Space Budget Page */}
           {activePage === 'budget' && (
             <SpaceBudget 
                project={project}
                setProject={setProject}
                activeStrategy={activeStrategy}
                handleStrategyChange={handleStrategyChange}
                activeMetrics={activeMetrics}
                scenarios={scenarios}
                activeScenarioId={activeScenarioId}
                setActiveScenarioId={setActiveScenarioId}
                addScenario={addScenario}
                duplicateScenario={duplicateScenario}
                deleteScenario={deleteScenario}
                renameScenario={renameScenario}
                compareScenarioId={compareScenarioId}
                setCompareScenarioId={setCompareScenarioId}
                compareMetrics={compareMetrics}
                onNavigate={(page) => setActivePage(page)}
             />
           )}

           {/* Stacking Plan Page */}
           {activePage === 'stacking' && (
             <div className="h-full p-6 flex flex-col">
                <div className="mb-6 flex justify-between items-end px-2">
                   <div>
                     <h2 className="text-xl font-bold text-slate-800">Stacking Plan</h2>
                     <p className="text-sm text-slate-500">Translate strategy into floor-by-floor allocation.</p>
                   </div>
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Active Strategy:</span>
                      <span className="text-xs font-bold bg-white border border-slate-200 text-orange-600 px-3 py-1 rounded-full shadow-sm">
                        {activeStrategy.name}
                      </span>
                   </div>
                </div>
                <div className="flex-grow overflow-hidden bg-white rounded-xl shadow-sm border border-slate-200">
                   <StackingPlan 
                     metrics={activeMetrics} 
                     project={project} 
                     strategy={activeStrategy} 
                     mode="default" 
                     onUpdateProject={setProject}
                   />
                </div>
             </div>
           )}

           {/* Adjacency Page */}
           {activePage === 'adjacency' && (
             <div className="h-full p-6">
               <AdjacencyModel 
                 project={project} 
                 onChange={setProject} 
                 metrics={activeMetrics}
                 onNavigateToStacking={() => setActivePage('stacking')}
               />
             </div>
           )}

           {/* Utilization Study Page */}
           {activePage === 'utilization' && (
             <div className="h-full">
               <UtilizationStudy />
             </div>
           )}

           {/* Test Fit Page */}
           {activePage === 'test-fit' && (
             <div className="h-full p-8 overflow-y-auto">
               <TestFit metrics={activeMetrics} project={project} />
             </div>
           )}

           {/* Exports Page */}
           {activePage === 'exports' && (
             <div className="h-full">
               <ExportsPage project={project} scenarios={scenarios} activeScenarioId={activeScenarioId} />
             </div>
           )}

        </div>
      </div>

    </div>
  );
};

export default App;