
export enum SpaceType {
  WORKSTATION = 'Workstations',
  MEETING = 'Meeting Rooms',
  PHONE = 'Phone Booths',
  SUPPORT = 'Support & Amenity',
  CIRCULATION = 'Circulation',
}

export type UnitType = 'sqm' | 'sqft';
export type AreaDefinition = 'NIA' | 'Gross';
export type MetricType = 'headcount' | 'seats';
export type RoundingPolicy = 'floor' | 'round' | 'ceil';

export interface Floor {
  id: string;
  name: string;
  headcount: number;
}

export type AdjacencyStrengthLabel = 'High' | 'Medium' | 'Low' | 'None';

export interface Collaborator {
  deptId: string;
  strength: number; // 0-100 representation
}

export interface Department {
  id: string;
  name: string;
  headcount: number;         // Current
  futureHeadcount?: number;  // Optional Future
  occupancy?: number;        // Percentage (0-100)
  pinnedFloor?: string;      // ID of floor if locked/assigned
  color?: string;            // Visual identifier
  collaborators: Collaborator[]; // Inputs
}

export interface AdjacencyPair {
  dept1: Department;
  dept2: Department;
  score: number; // Combined score (0-200)
  strengthLabel: string;
  isCrossFloor: boolean;
  overlap: number; // 0-1 (1 = fully co-located)
  friction: number; // Score * (1 - Overlap), 0-100 scale
  asymmetry: number; 
}

export interface AdjacencyStats {
  stressScore: number; // 0-100 normalized score
  topFrictionPairs: AdjacencyPair[];
  allPairs: AdjacencyPair[];
  matrix: Record<string, Record<string, number>>;
}

export interface ProgramGroup {
  id: string;
  name: string; // Renamed from "Visual Groups" to "Program Lenses" in UI, keeping key for compat
  color: string;
  items: string[]; 
}

export interface ProjectReality {
  projectName: string; // Mandatory
  location: string;
  industry: string;
  customIndustry?: string;
  projectType: string;
  customProjectType?: string;
  
  areaInput: number; 
  areaDefinition: AreaDefinition;
  targetEfficiency: number; 
  calculatedNia: number; 
  unit: UnitType;
  
  headcount: number;
  floors: Floor[]; 
  departments: Department[]; 
  programStructure: ProgramGroup[];
}

export interface MeetingRatios {
  small: number;    
  medium: number;   
  large: number;    
  board: number;    
  townhall: number; 
}

export type SupportLogic = 'ratio' | 'area_per_person' | 'pct_nia' | 'fixed_area' | 'fixed_count';

export interface SupportSpaceDef {
  id: string;
  name: string;
  category: 'pantry' | 'utilities' | 'storage' | 'wellness' | 'server' | 'collab' | 'other';
  logic: SupportLogic;
  value: number; 
  areaPerUnit?: number; 
}

export interface StrategyParams {
  id: string; 
  name: string; 
  
  // Planning Factors
  circulationPct: number; 
  growthBuffer: number; 

  // Workplace Strategy
  workpoints: {
    fixed: number;        // User input: Total Assigned Seats (Open + Enclosed)
    alternative: number;  // User input: Agile/Flex points
  };
  
  enclosedOfficeCount: number; // Subset of Fixed
  
  meetingRatios: MeetingRatios; 
  phoneBoothRatio: number; 
  supportSpaces: SupportSpaceDef[];
}

export interface WorkspaceCalculationResult {
  fixedWorkstationsRaw: number;
  fixedWorkstations: number; // Rounded
  alternativeWorkpoints: number;
  calculationTimestamp: string;
  calculationSource: string;
}

export interface FloorMetrics {
  floorId: string;
  name: string;
  headcount: number;
  
  enclosedOffices: number;
  openDesks: number; // "Fixed Workstations" (Open Area)
  altDesks: number;  // "Alternative Workpoints"
  totalDesks: number;
  
  meetingRoomsTotal: number;
  roomsSmall: number;
  roomsMedium: number;
  roomsLarge: number;
  roomsBoard: number;
  roomsTownhall: number;
  
  phoneBooths: number;
  supportSummary: { name: string; count: number; area: number }[];
  
  areaUsed: number;
  areaWorkstations: number; 
  areaMeeting: number;
  areaPhone: number;
  areaSupport: number; 
  areaCirculation: number;
  utilization: number; 
}

export interface CalculatedMetrics {
  totalHeadcountWithGrowth: number;
  totalOpenPlanPeople: number;
  
  requiredDesks: number; 
  openDesks: number;
  altDesks: number;
  enclosedOffices: number;
  
  totalMeetingRooms: number;
  totalMeetingSeats: number;
  totalPhoneBooths: number;
  
  derivedMeetingRatio: number; 
  effectiveDeskRatio: number; 

  areaWorkstations: number;
  areaMeeting: number;
  areaPhone: number;
  areaSupport: number;
  areaCirculation: number;
  totalUsedArea: number;
  remainingArea: number;
  
  density: number; 
  occupancyRatio: number; 
  fitFactor: number; // Renamed in UI to "Space Utilization Index"
  
  adjacencyStats: AdjacencyStats;

  roomMix: {
    small: number;
    medium: number;
    large: number;
    board: number;
    townhall: number;
  };

  floorMetrics: FloorMetrics[];
}

// --- UTILIZATION STUDY TYPES ---

export type StudyType = 'workstation' | 'meeting' | 'collaboration';

export interface ObservationRecord {
  id: string;
  date: string;
  timeSlot: string; 
  floor: string;
  department?: string; // Used as 'Room Name' for Meeting
  
  // Workstation Specific
  isOccupied: boolean; 
  activity?: 'Focus' | 'Interaction' | 'Call' | 'Other';
  
  // Meeting Specific
  roomName?: string;
  roomType?: string; // Focus, Meeting, etc.
  capacity?: number;
  attendeeCount?: number; // Actual attendees (Calculated)
  
  // Time Meta
  week?: number;
  day?: number;
}

export interface MeetingEvent {
  eventId: string;
  floor: string;
  roomName: string;
  roomType: string;
  week: number;
  day: number;
  time: string;
  attendees: number;
  rawRowIds: string[]; // Track original Excel row IDs
}

export interface RoomSizeBreakdown {
  floor: string;
  roomName: string;
  size: number; // k (attendee count)
  count: number; // Count_room(k)
  occupancyPct: number; // Frequency: Count / Total Meetings (0-100)
  events: MeetingEvent[]; // Full list of events for this size
}

export type RoomClassification = 'Underutilized / Size Mismatch' | 'Reasonably Utilized' | 'Over Utilized' | 'Over Capacity Risk' | 'Mixed Pattern / Review Required' | 'Unclassified';

export interface CapacityFitBucket {
  count: number;
  pct: number; // 0-100
  events: MeetingEvent[];
}

export interface GlobalSizeBin {
  label: string;
  count: number;
  occupancyPct: number; // Global Occupancy %
}

export interface RoomPerformanceMetric {
  floor: string;
  roomName: string;
  roomType: string;
  capacity: number; // This is the calculated "User Defined" capacity or placeholder
  
  // Counts
  observedSlots: number;
  occupiedSlots: number;
  
  // Metrics
  utilizationPct: number;
  avgOccupancy: number; // Renamed from avgAttendees
  
  // Capacity Analysis
  avgCapRatio: number; // avgOccupancy / capacity
  classification: RoomClassification;
  capacityFit: {
    low: CapacityFitBucket;  // < 40%
    mid: CapacityFitBucket;  // 40-70%
    fit: CapacityFitBucket;  // 70-100%
    over: CapacityFitBucket; // > 100%
  };

  // Detailed Analysis for Explanation
  analysis?: {
    avgOccRaw: number;
    avgOccRounded: number;
    avgRatio: number;
    typicalBin: string;
    typicalTypeVal: number;
    typicalRounded: number;
    typicalRatio: number;
    statusRule: string;
  };

  // Distribution
  meetingSizeDistribution: Record<string, number>; // Bin Label -> Count
  sizeBreakdown: RoomSizeBreakdown[]; // Detailed integer size breakdown
  topMeetingSize: string; // e.g. "4 pax (30%)"
}

export interface ConcurrencyMetric {
  time: string;
  occupied: number;
  total: number;
  pct: number;
}

export interface UtilizationMetrics {
  // Workstation
  avgOccupancy: number;
  peakOccupancy: number;
  occupancyByTime: { time: string, rate: number }[];
  occupancyByFloor: { floor: string, rate: number }[];
  
  // Meeting Summary
  totalObservations: number;
  totalRooms: number;
  overallUtilization: number;
  overallAvgAttendees: number;
  
  // Concurrency (New)
  concurrencyStats?: {
    avgPct: number;
    maxPct: number;
    timeline: ConcurrencyMetric[];
  };

  // Global Meeting Summary (Report Style)
  globalSizeBins: GlobalSizeBin[];
  globalInsights: string[]; // Generated insights
  
  // Room Details
  roomMetrics: RoomPerformanceMetric[];
}

export interface AiInsight {
  verdict: 'Viable' | 'At Risk' | 'Not Viable';
  drivers: string[];
  recommendations: string[];
}