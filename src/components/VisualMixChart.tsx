
import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LabelList } from 'recharts';
import { ProgramGroup } from '../types';

interface Props {
  data: any[];
  groups: ProgramGroup[];
  unit: string;
  height?: number | string;
  showLegend?: boolean;
  layout?: 'vertical' | 'horizontal';
  barSize?: number;
  maxCategories?: number; // Logic to collapse small groups if > N
  showLabels?: boolean; // Toggle for % labels (Defaults to true now)
}

const VisualMixChart: React.FC<Props> = ({ 
  data, 
  groups, 
  unit, 
  height = "100%", 
  showLegend = true,
  layout = 'vertical',
  barSize = 40,
  maxCategories = 6,
  showLabels = true
}) => {
  
  // Transform data if groups exceed limit & calculate totals for %
  const { chartData, activeGroups } = useMemo(() => {
     // 1. Determine Groups
     let finalGroups = groups;
     if (groups.length > maxCategories) {
        const mainGroups = groups.slice(0, maxCategories - 1);
        const otherGroupDef: ProgramGroup = {
            id: '_other',
            name: 'Other',
            color: '#94a3b8', 
            items: []
        };
        finalGroups = [...mainGroups, otherGroupDef];
     }

     // 2. Transform Rows
     const transformedData = data.map(row => {
        const newRow: any = { ...row, _total: 0 };
        
        // Calculate Total
        let rowTotal = 0;
        groups.forEach(g => {
            if (row[g.id]) rowTotal += row[g.id];
        });
        
        // Handle "Other" collapsing if needed
        if (groups.length > maxCategories) {
            const mainGroups = groups.slice(0, maxCategories - 1);
            const otherGroups = groups.slice(maxCategories - 1);
            
            let otherTotal = 0;
            otherGroups.forEach(g => {
                if (newRow[g.id] !== undefined) {
                    otherTotal += newRow[g.id];
                    delete newRow[g.id]; 
                }
            });
            newRow['_other'] = otherTotal;
        }
        
        newRow._total = rowTotal;
        return newRow;
     });

     return { 
        chartData: transformedData, 
        activeGroups: finalGroups 
     };

  }, [data, groups, maxCategories]);

  const renderCustomLabel = (props: any) => {
    const { x, y, width, height, value, payload } = props;
    
    // Safety check: payload might be undefined in some render cycles or animations
    const total = payload && typeof payload._total === 'number' ? payload._total : 0;
    
    // Avoid division by zero
    const percent = total > 0 ? value / total : 0;

    // Threshold: Hide labels for segments smaller than 5% to avoid clutter
    if (percent < 0.05) return null;
    
    // Check dimensions to prevent overflow text (visual check)
    const isHorizontal = layout === 'vertical'; // Recharts layout names are inverted relative to bar direction (layout='vertical' means horizontal bars)
    const minSize = 20; 
    
    // If the bar segment is too small in pixels, hide the label
    if (isHorizontal && width < minSize) return null;
    if (!isHorizontal && height < minSize) return null;

    return (
      <text 
        x={x + width / 2} 
        y={y + height / 2} 
        fill="#fff" 
        textAnchor="middle" 
        dominantBaseline="middle" 
        fontSize={10}
        fontWeight="bold"
        style={{ pointerEvents: 'none', textShadow: '0px 0px 3px rgba(0,0,0,0.6)' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        layout={layout}
        barSize={barSize}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
         {layout === 'vertical' ? (
           <>
             <XAxis type="number" hide />
             <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} width={100} />
           </>
         ) : (
           <>
             <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} />
             <YAxis type="number" hide />
           </>
         )}
         
         <Tooltip 
           cursor={{ fill: 'transparent' }}
           content={({ active, payload }) => {
              if (active && payload && payload.length && payload[0].payload) {
                 const total = payload[0].payload._total || 0;
                 return (
                    <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-xl text-xs z-50">
                       <div className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">
                          {payload[0].payload.name} Total: {Math.round(total).toLocaleString()} {unit}
                       </div>
                       {payload.map((entry: any, i: number) => (
                          <div key={i} className="flex justify-between items-center gap-4 mb-1">
                             <span style={{ color: entry.color }} className="font-semibold">{entry.name}:</span>
                             <span className="text-slate-600 font-mono">
                                {Math.round(entry.value as number).toLocaleString()} ({total > 0 ? ((entry.value as number) / total * 100).toFixed(1) : 0}%)
                             </span>
                          </div>
                       ))}
                    </div>
                 );
              }
              return null;
           }}
         />
         {showLegend && <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#475569' }} />}
         
         {activeGroups.map(group => (
            <Bar key={group.id} dataKey={group.id} name={group.name} stackId="a" fill={group.color} radius={[0, 0, 0, 0]}>
                {showLabels && <LabelList dataKey={group.id} content={renderCustomLabel} />}
            </Bar>
         ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default VisualMixChart;