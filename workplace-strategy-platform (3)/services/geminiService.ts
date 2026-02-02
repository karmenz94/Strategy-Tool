import { GoogleGenAI, Type } from "@google/genai";
import { CalculatedMetrics, ProjectReality, StrategyParams, AiInsight } from "../types";

const apiKey = process.env.API_KEY || '';
const getClient = () => new GoogleGenAI({ apiKey });

export const generateExecutiveSummary = async (
  project: ProjectReality,
  strategy: StrategyParams,
  metrics: CalculatedMetrics
): Promise<AiInsight | null> => {
  if (!apiKey) return null;

  const ai = getClient();
  const effIndustry = project.industry === 'Other (Custom)' ? project.customIndustry : project.industry;
  
  // Calculate effective sharing ratio for context (since globalWorkstationRatio is removed)
  const totalSeats = metrics.requiredDesks;
  const sharingRatio = totalSeats > 0 ? (metrics.totalHeadcountWithGrowth / totalSeats).toFixed(2) : "N/A";

  const prompt = `
    Role: Workplace Strategy Consultant.
    Task: Evaluate feasibility of a space budget.
    
    Context:
    - Industry: ${effIndustry}
    - NIA: ${Math.round(project.calculatedNia)} ${project.unit}
    - Headcount: ${project.headcount} (Effective with growth: ${metrics.totalHeadcountWithGrowth})
    
    Strategy:
    - Enclosed Offices: ${metrics.enclosedOffices} (Fixed Count)
    - Effective Sharing Ratio: 1:${sharingRatio}
    - Meeting Benchmark: 1 room per ${metrics.derivedMeetingRatio.toFixed(1)} people (derived)
    - Support Area: ${Math.round(metrics.areaSupport)} ${project.unit}
    
    Outcomes:
    - Total Workpoints: ${metrics.requiredDesks} (Open + Enclosed)
    - Total Meeting Rooms: ${metrics.totalMeetingRooms}
    - Occupancy: ${metrics.fitFactor.toFixed(1)}% of NIA
    - Density: ${metrics.density.toFixed(1)} ${project.unit}/person
    
    Analysis:
    1. Verdict: 'Viable' (<95%), 'At Risk' (95-105%), 'Not Viable' (>105%).
    2. Drivers: Key factors impacting the fit factor.
    3. Recommendations: 2 specific trade-offs to improve viability.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verdict: { type: Type.STRING, enum: ['Viable', 'At Risk', 'Not Viable'] },
            drivers: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['verdict', 'drivers', 'recommendations']
        }
      }
    });
    
    if (response.text) {
        return JSON.parse(response.text) as AiInsight;
    }
    return null;

  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};