
import { StrategyParams, UnitType, MeetingRatios, SupportSpaceDef, ProjectReality, ProgramGroup } from './types';

export const INDUSTRIES = [
  "Technology", "Finance", "Professional Services", "Legal", "Real Estate", 
  "Retail/FMCG", "Media & Creative", "Healthcare", "Education", 
  "Manufacturing", "Logistics", "Public Sector", "Other (Custom)"
];

export const PROJECT_TYPES = [
  "Global HQ", 
  "Regional HQ",
  "Corporate Office", 
  "Client-facing Office",
  "R&D / Innovation Hub", 
  "Trading Floor", 
  "Back Office", 
  "Flex / Hybrid Workplace", 
  "Other (Custom)"
];

// M Moser Strategy Palette (Professional, Strategy-First)
export const MM_PALETTE = {
  // Brand Anchor
  primary: '#F97316', // M Moser Orange
  primaryHover: '#EA580C',
  
  // Semantic
  success: '#10B981', // Emerald 500
  warning: '#F59E0B', // Amber 500
  danger: '#EF4444',  // Rose 500
  info: '#3B82F6',    // Blue 500

  // UI Neutrals
  ui: {
    bg: '#F8FAFC',    // Slate 50
    card: '#FFFFFF',  // White
    border: '#E2E8F0',// Slate 200
    text: '#334155',  // Slate 700
    textLight: '#94A3B8', // Slate 400
  },

  // Program Categories (Distinct, High Contrast for Charts)
  program: [
    '#64748B', // Workstations - Slate
    '#F97316', // Collaboration - Orange
    '#8B5CF6', // Meeting Rooms - Violet
    '#0EA5E9', // Support - Sky
    '#94A3B8', // Circulation - Light Slate
    '#F43F5E', // Special/Lab - Rose
  ],

  // Departments (Qualitative Palette)
  departments: [
    '#3B82F6', '#8B5CF6', '#EC4899', '#F43F5E', '#F97316', 
    '#EAB308', '#84CC16', '#10B981', '#06B6D4', '#6366F1'
  ]
};

// Meeting Size Bins for Utilization Study
export const MEETING_SIZE_BINS = [
  { label: '1p (Solo)', min: 1, max: 1 },
  { label: '2p', min: 2, max: 2 },
  { label: '3-4p', min: 3, max: 4 },
  { label: '5-7p', min: 5, max: 7 },
  { label: '8-12p', min: 8, max: 12 },
  { label: '13p+', min: 13, max: 999 },
];

// Base constants in SQM
const BASE_SQM = {
  deskOpen: 4.5,
  deskAlt: 3.0,
  deskEnclosed: 12.0, // Private office size
  meetingAvg: 18,
  phoneBooth: 1.5,
};

// Base constants in SQFT
const BASE_SQFT = {
  deskOpen: 48,
  deskAlt: 32,
  deskEnclosed: 130,
  meetingAvg: 195,
  phoneBooth: 16,
};

export const getAreaConstants = (unit: UnitType) => {
  return unit === 'sqm' ? BASE_SQM : BASE_SQFT;
};

// BENCHMARKS: People per Room
export const MEETING_BENCHMARKS: MeetingRatios = {
  small: 25,     // 1 per 25 ppl
  medium: 60,    // 1 per 60 ppl
  large: 150,    // 1 per 150 ppl
  board: 300,    // 1 per 300 ppl
  townhall: 1000 // 1 per 1000 ppl (often 0 in small projects)
};

export const DEFAULT_SUPPORT_SPACES: SupportSpaceDef[] = [
  { id: 'sup-1', name: 'Tea Point / Pantry', category: 'pantry', logic: 'ratio', value: 50, areaPerUnit: 15 },
  { id: 'sup-2', name: 'Open Collaboration', category: 'collab', logic: 'pct_nia', value: 15 },
  { id: 'sup-3', name: 'Storage', category: 'storage', logic: 'pct_nia', value: 2 },
  { id: 'sup-4', name: 'IT / Server Room', category: 'server', logic: 'fixed_area', value: 10 },
  { id: 'sup-5', name: 'Wellness / Mothers', category: 'wellness', logic: 'fixed_count', value: 1, areaPerUnit: 10 },
  { id: 'sup-6', name: 'Print / Utilities', category: 'utilities', logic: 'ratio', value: 75, areaPerUnit: 4 },
];

// --- PROGRAM STRUCTURE PRESETS ---
export const getProgramPreset = (type: string): ProgramGroup[] => {
  // New Standard Structure: Workstations, Collaboration, Meeting Rooms, Support, Circulation
  return [
    { 
      id: 'pg-work', 
      name: 'Workstations', 
      color: MM_PALETTE.program[0], // Slate
      items: ['work_open', 'work_alt', 'work_enclosed'] 
    },
    { 
      id: 'pg-collab', 
      name: 'Collaboration', 
      color: MM_PALETTE.program[1], // Orange
      items: ['sup-2'] // Open Collaboration (ID sup-2)
    },
    { 
      id: 'pg-meet', 
      name: 'Meeting Rooms', 
      color: MM_PALETTE.program[2], // Violet
      items: ['meet', 'phone'] 
    },
    { 
      id: 'pg-supp', 
      name: 'Support', 
      color: MM_PALETTE.program[3], // Sky
      items: ['sup-1', 'sup-3', 'sup-4', 'sup-5', 'sup-6'] // All other support
    },
    { 
      id: 'pg-circ', 
      name: 'Circulation', 
      color: MM_PALETTE.program[4], // Light Slate
      items: ['circ'] 
    }
  ];
};

export const DEFAULT_PROJECT: ProjectReality = {
  projectName: "New Strategic Hub", // Default
  location: "Singapore",
  industry: "Technology",
  projectType: "Regional HQ",
  areaInput: 2500,
  areaDefinition: 'NIA',
  targetEfficiency: 80,
  calculatedNia: 2500,
  unit: 'sqm',
  headcount: 300,
  floors: [{ id: 'f1', name: 'Floor 1', headcount: 300 }],
  departments: [
    { 
      id: 'd1', name: 'Sales', headcount: 80, futureHeadcount: 90, occupancy: 80, color: MM_PALETTE.departments[0], 
      collaborators: [{ deptId: 'd2', strength: 80 }] 
    },
    { 
      id: 'd2', name: 'Marketing', headcount: 40, futureHeadcount: 45, occupancy: 70, color: MM_PALETTE.departments[1], 
      collaborators: [{ deptId: 'd1', strength: 80 }, { deptId: 'd4', strength: 50 }] 
    },
    { 
      id: 'd3', name: 'Engineering', headcount: 120, futureHeadcount: 140, occupancy: 60, color: MM_PALETTE.departments[2], 
      collaborators: [{ deptId: 'd4', strength: 80 }] 
    },
    { 
      id: 'd4', name: 'Product', headcount: 30, futureHeadcount: 35, occupancy: 90, color: MM_PALETTE.departments[3], 
      collaborators: [{ deptId: 'd3', strength: 80 }, { deptId: 'd2', strength: 50 }] 
    },
    { 
      id: 'd5', name: 'G&A', headcount: 30, futureHeadcount: 30, occupancy: 95, color: MM_PALETTE.departments[4], 
      collaborators: [] 
    },
  ],
  programStructure: getProgramPreset("Regional HQ")
};

export const DEFAULT_STRATEGY: StrategyParams = {
  id: 'default',
  name: 'Base Case',
  
  workpoints: {
    fixed: 240, // Example default (80% of 300)
    alternative: 60,
  },
  
  circulationPct: 25,
  growthBuffer: 5,

  enclosedOfficeCount: 10, 
  meetingRatios: { ...MEETING_BENCHMARKS },
  phoneBoothRatio: 15,
  
  supportSpaces: [...DEFAULT_SUPPORT_SPACES]
};

export const getIndustryDefaults = (industry: string, type: string): Partial<StrategyParams> => {
  let defaults: Partial<StrategyParams> = {};
  switch (industry) {
    case 'Legal':
      defaults = { enclosedOfficeCount: 50 }; // High office count
      break;
    case 'Technology':
      defaults = { enclosedOfficeCount: 5 }; // Low office count
      break;
  }
  return defaults;
};