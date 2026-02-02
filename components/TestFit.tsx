
import React from 'react';
import { CalculatedMetrics, ProjectReality } from '../types';
import { Activity, AlertTriangle, CheckCircle, Gauge, Users, Maximize, GitCommit } from 'lucide-react';

interface Props {
  metrics: CalculatedMetrics;
  project: ProjectReality;
}

const ScoreCard = ({ 
  label, score, max, unit, inverse = false, warning 
}: { 
  label: string, score: number, max: number, unit: string, inverse?: boolean, warning?: boolean 
}) => {
  const pct = Math.min((score / max) * 100, 100);
  const isGood = inverse ? pct < 95 : pct > 80; // Heuristic
  const color = warning ? 'text-amber-500' : isGood ? 'text-emerald-600' : 'text-rose-600';
  const barColor = warning ? 'bg-amber-500' : isGood ? 'bg-emerald-500' : 'bg-rose-500';

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
       <div className="flex justify-between items-start">
          <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
          {warning ? <AlertTriangle className="w-4 h-4 text-amber-500" /> : <Activity className="w-4 h-4 text-slate-300" />}
       </div>
       <div>
          <div className={`text-2xl font-bold ${color}`}>
            {score.toLocaleString()} <span className="text-sm font-medium text-slate-400">/ {max.toLocaleString()} {unit}</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
             <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }}></div>
          </div>
       </div>
    </div>
  );
};

const TestFit: React.FC<Props> = ({ metrics, project }) => {
  // Calculations
  const areaStress = (metrics.totalUsedArea / project.calculatedNia) * 100;
  const adjStress = metrics.adjacencyStats.stressScore;
  
  // Overall feasibility score (Simple heuristic)
  let designScore = 100;
  if (areaStress > 100) designScore -= (areaStress - 100) * 2;
  if (metrics.effectiveDeskRatio > 1.8) designScore -= 10;
  if (metrics.derivedMeetingRatio > 25) designScore -= 10;
  if (adjStress > 20) designScore -= (adjStress - 20) * 0.5; // Penalty for adjacency friction

  designScore = Math.max(0, Math.min(100, designScore));

  const verdict = designScore > 85 ? 'Excellent Fit' : designScore > 70 ? 'Manageable with Compromise' : 'High Risk / Not Feasible';
  const verdictColor = designScore > 85 ? 'bg-emerald-100 text-emerald-700' : designScore > 70 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';

  return (
    <div className="flex flex-col h-full gap-6 max-w-5xl mx-auto w-full">
      
      {/* Top Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex items-center justify-between">
         <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Spatial Stress Analysis</h2>
            <p className="text-slate-500">Automated assessment of project constraints vs strategic demand.</p>
         </div>
         <div className={`px-6 py-4 rounded-xl text-center ${verdictColor}`}>
            <div className="text-3xl font-bold">{designScore.toFixed(0)}/100</div>
            <div className="text-xs font-bold uppercase tracking-wide mt-1">{verdict}</div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <ScoreCard 
           label="Space Utilization Index" 
           score={Math.round(metrics.totalUsedArea)} 
           max={Math.round(project.calculatedNia)} 
           unit={project.unit.toUpperCase()} 
           inverse
           warning={areaStress > 95 && areaStress <= 100}
         />
         <ScoreCard 
           label="Operational Stress Index" 
           score={Math.round(adjStress)} 
           max={100} 
           unit="Score" 
           inverse
         />
         <ScoreCard 
           label="Headcount" 
           score={metrics.totalHeadcountWithGrowth} 
           max={project.headcount} 
           unit="ppl" 
           inverse
         />
         <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-500 uppercase">Density</span>
                <Maximize className="w-4 h-4 text-slate-300" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">
                {metrics.density.toFixed(1)} <span className="text-sm font-medium text-slate-400">{project.unit.toUpperCase()}/p</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">Target: 8.0 - 12.0</div>
            </div>
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex-grow">
         <h3 className="text-sm font-bold text-slate-800 uppercase mb-4">Strategic Stress Factors</h3>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
               {[
                 { label: 'Circulation & Flow', val: metrics.areaCirculation, max: metrics.totalUsedArea * 0.35, desc: 'Circulation ratio check.' },
                 { label: 'Meeting Capacity', val: 20, max: metrics.derivedMeetingRatio, desc: 'Meeting capacity verification.', inverse: true },
                 { label: 'Sharing Strategy Alignment', val: metrics.effectiveDeskRatio, max: 1.5, desc: 'Evaluates cultural readiness for shared desks.' }
               ].map((item, idx) => {
                 const status = idx === 0 ? 'Good' : idx === 1 ? 'Tight' : 'Aggressive';
                 const color = status === 'Good' ? 'text-emerald-600' : 'text-amber-600';
                 
                 return (
                   <div key={idx} className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="p-2 bg-white rounded-md shadow-sm mr-4">
                         {idx === 0 ? <Gauge className="w-5 h-5 text-indigo-500" /> : <Users className="w-5 h-5 text-indigo-500" />}
                      </div>
                      <div className="flex-grow">
                         <div className="text-sm font-bold text-slate-700">{item.label}</div>
                         <div className="text-xs text-slate-500">{item.desc}</div>
                      </div>
                      <div className={`text-right font-bold text-sm ${color}`}>
                         {status}
                      </div>
                   </div>
                 );
               })}
            </div>

            <div>
               <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <GitCommit className="w-4 h-4 text-indigo-500" />
                  <h4 className="text-sm font-bold text-slate-800">Top Friction Drivers</h4>
                  <span className="text-xs text-slate-400 ml-auto">Impact Score (0-100)</span>
               </div>
               <div className="space-y-2">
                  {metrics.adjacencyStats.topFrictionPairs.length > 0 ? (
                    metrics.adjacencyStats.topFrictionPairs.slice(0, 5).map((pair, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                         <div className="flex flex-col">
                           <div className="text-xs font-bold text-slate-700 flex items-center gap-1">
                             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pair.dept1.color }}></div>
                             {pair.dept1.name} + {pair.dept2.name}
                           </div>
                           <div className="text-[10px] text-amber-600 font-medium">Split across floors</div>
                         </div>
                         <div className="flex items-center gap-2">
                            <div className="text-[10px] text-slate-400">Str: {(pair.score/2).toFixed(0)}</div>
                            <div className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-bold w-12 text-center">
                               {pair.friction.toFixed(0)}
                            </div>
                         </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 italic flex items-center gap-2 p-4 bg-emerald-50 rounded border border-emerald-100">
                      <CheckCircle className="w-4 h-4 text-emerald-500" /> 
                      No significant adjacency friction detected.
                    </div>
                  )}
               </div>
            </div>
         </div>
      </div>

    </div>
  );
};

export default TestFit;
