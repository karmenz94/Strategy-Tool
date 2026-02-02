
import { ProjectReality, StrategyParams, CalculatedMetrics, FloorMetrics, SupportSpaceDef, AdjacencyPair } from '../types';
import { getAreaConstants } from '../constants';

// Seat capacities for room types
const ROOM_CAPACITY = { s: 4, m: 8, l: 14, b: 20, t: 40 };

// Area assumptions per room (sqm / sqft handled in calc)
const ROOM_AREA_SQM = { s: 10, m: 18, l: 25, b: 40, t: 80 };

export const calculateMetrics = (
  project: ProjectReality,
  strategy: StrategyParams
): CalculatedMetrics => {
  const CONSTANTS = getAreaConstants(project.unit);
  const nia = project.calculatedNia;
  
  // Initialize Aggregates
  let totalHeadcountWithGrowth = 0;
  let requiredDesks = 0;
  let openDesksTotal = 0; // "Fixed Workstations" (Open)
  let altDesksTotal = 0;  // "Alternative Workpoints"
  let enclosedOfficesTotal = 0;

  let totalMeetingRooms = 0;
  let totalMeetingSeats = 0;
  let totalPhoneBooths = 0;
  
  let areaWorkstations = 0;
  let areaMeeting = 0;
  let areaPhone = 0;
  let areaSupport = 0;
  let areaCirculation = 0;
  let totalUsedArea = 0;

  const roomMix = { small: 0, medium: 0, large: 0, board: 0, townhall: 0 };
  const floorMetrics: FloorMetrics[] = [];

  const totalBaseHc = project.floors.reduce((sum, f) => sum + f.headcount, 0) || project.headcount; 
  
  // --- GLOBAL STRATEGY INPUTS ---
  // In this new model, user inputs GLOBAL quantities for the scenario.
  // We must distribute these across floors based on floor headcount weight.
  
  const globalTotalFixed = strategy.workpoints?.fixed || 0; // Fixed = Open + Enclosed
  const globalTotalAlt = strategy.workpoints?.alternative || 0;
  const globalEnclosedCount = strategy.enclosedOfficeCount || 0;

  // Derive Global Open Fixed (Fixed Input - Enclosed Input)
  // Ensure we don't go negative if user input Enclosed > Fixed
  const globalOpenFixed = Math.max(0, globalTotalFixed - globalEnclosedCount);

  // Iterate Floors
  project.floors.forEach(floor => {
    // 0. Base Headcount w/ Growth
    const floorHc = Math.ceil(floor.headcount * (1 + strategy.growthBuffer / 100));
    totalHeadcountWithGrowth += floorHc;

    const floorWeight = totalBaseHc > 0 ? floor.headcount / totalBaseHc : 0;

    // --- WORKPOINTS (Distributed Logic) ---
    
    // Distribute Global Enclosed
    const fEnclosedCount = Math.round(globalEnclosedCount * floorWeight);
    
    // Distribute Global Open Fixed
    // We used to floor/ceil, here we round to nearest integer to try and sum up correctly
    // Note: Rounding errors might cause +/- 1 total difference, acceptable for estimation
    const fOpenDesks = Math.round(globalOpenFixed * floorWeight);
    
    // Distribute Global Alternative
    const fAltDesks = Math.round(globalTotalAlt * floorWeight);
    
    const fTotalDesks = fEnclosedCount + fOpenDesks + fAltDesks;
    
    enclosedOfficesTotal += fEnclosedCount;
    openDesksTotal += fOpenDesks;
    altDesksTotal += fAltDesks;
    requiredDesks += fTotalDesks;

    // --- MEETING ROOMS ---
    const roomsS = strategy.meetingRatios.small > 0 ? Math.ceil(floorHc / strategy.meetingRatios.small) : 0;
    const roomsM = strategy.meetingRatios.medium > 0 ? Math.ceil(floorHc / strategy.meetingRatios.medium) : 0;
    const roomsL = strategy.meetingRatios.large > 0 ? Math.ceil(floorHc / strategy.meetingRatios.large) : 0;
    const roomsB = strategy.meetingRatios.board > 0 ? Math.ceil(floorHc / strategy.meetingRatios.board) : 0;
    const roomsT = strategy.meetingRatios.townhall > 0 ? Math.ceil(floorHc / strategy.meetingRatios.townhall) : 0;
    
    const floorMeetingRooms = roomsS + roomsM + roomsL + roomsB + roomsT;
    const floorMeetingSeats = 
      (roomsS * ROOM_CAPACITY.s) + 
      (roomsM * ROOM_CAPACITY.m) + 
      (roomsL * ROOM_CAPACITY.l) + 
      (roomsB * ROOM_CAPACITY.b) + 
      (roomsT * ROOM_CAPACITY.t);

    totalMeetingRooms += floorMeetingRooms;
    totalMeetingSeats += floorMeetingSeats;

    roomMix.small += roomsS;
    roomMix.medium += roomsM;
    roomMix.large += roomsL;
    roomMix.board += roomsB;
    roomMix.townhall += roomsT;

    // --- PHONE BOOTHS ---
    const pbRatio = Math.max(1, strategy.phoneBoothRatio);
    const floorPhoneBooths = Math.ceil(floorHc / pbRatio);
    totalPhoneBooths += floorPhoneBooths;

    // --- SUPPORT SPACES ---
    let fSupportArea = 0;
    const fSupportSummary: { name: string; count: number; area: number }[] = [];

    strategy.supportSpaces.forEach(space => {
      let count = 0;
      let area = 0;

      if (space.logic === 'ratio') {
        count = Math.ceil(floorHc / Math.max(1, space.value));
        area = count * (space.areaPerUnit || 0);
      } else if (space.logic === 'fixed_count') {
        const totalQty = space.value;
        const share = totalQty * floorWeight;
        area = share * (space.areaPerUnit || 0);
        count = share; 
      } else if (space.logic === 'area_per_person') {
        area = floorHc * space.value;
        count = 0;
      } else if (space.logic === 'pct_nia') {
        const estFloorNia = nia * floorWeight;
        area = estFloorNia * (space.value / 100);
        count = 0;
      } else if (space.logic === 'fixed_area') {
        area = space.value * floorWeight;
        count = 0;
      }

      fSupportArea += area;
      fSupportSummary.push({ name: space.name, count, area });
    });

    // --- AREA CALCULATIONS ---
    const areaEnclosed = fEnclosedCount * CONSTANTS.deskEnclosed;
    const areaOpen = fOpenDesks * CONSTANTS.deskOpen;
    const areaAlt = fAltDesks * CONSTANTS.deskAlt;
    const fAreaWork = areaEnclosed + areaOpen + areaAlt;

    let fAreaMeetingSqm = 
      (roomsS * ROOM_AREA_SQM.s) + 
      (roomsM * ROOM_AREA_SQM.m) + 
      (roomsL * ROOM_AREA_SQM.l) + 
      (roomsB * ROOM_AREA_SQM.b) +
      (roomsT * ROOM_AREA_SQM.t);

    const fAreaMeeting = project.unit === 'sqft' ? fAreaMeetingSqm * 10.76 : fAreaMeetingSqm;
    const fAreaPhone = floorPhoneBooths * CONSTANTS.phoneBooth;

    const fSubTotal = fAreaWork + fAreaMeeting + fAreaPhone + fSupportArea;
    const fAreaCirc = fSubTotal * (strategy.circulationPct / 100);
    const fTotalUsed = fSubTotal + fAreaCirc;

    const estimatedFloorNia = nia * floorWeight;
    const floorUtil = estimatedFloorNia > 0 ? (fTotalUsed / estimatedFloorNia) * 100 : 0;

    areaWorkstations += fAreaWork;
    areaMeeting += fAreaMeeting;
    areaPhone += fAreaPhone;
    areaSupport += fSupportArea;
    areaCirculation += fAreaCirc;
    totalUsedArea += fTotalUsed;

    floorMetrics.push({
      floorId: floor.id,
      name: floor.name,
      headcount: floorHc,
      enclosedOffices: fEnclosedCount,
      openDesks: fOpenDesks,
      altDesks: fAltDesks,
      totalDesks: fTotalDesks,
      meetingRoomsTotal: floorMeetingRooms,
      roomsSmall: roomsS,
      roomsMedium: roomsM,
      roomsLarge: roomsL,
      roomsBoard: roomsB,
      roomsTownhall: roomsT,
      phoneBooths: floorPhoneBooths,
      supportSummary: fSupportSummary,
      areaUsed: fTotalUsed,
      areaWorkstations: fAreaWork,
      areaMeeting: fAreaMeeting,
      areaPhone: fAreaPhone,
      areaSupport: fSupportArea,
      areaCirculation: fAreaCirc,
      utilization: floorUtil
    });
  });

  // --- ADJACENCY SCORING ---
  const depts = project.departments;
  const count = depts.length;
  const pairs: AdjacencyPair[] = [];
  const matrix: Record<string, Record<string, number>> = {};
  
  // Build Matrix
  depts.forEach(d => {
    matrix[d.id] = {};
    d.collaborators.forEach(c => {
      if (c.deptId) matrix[d.id][c.deptId] = c.strength;
    });
  });

  let totalPossibleStrength = 0;
  let totalBrokenStrength = 0;

  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const d1 = depts[i];
      const d2 = depts[j];
      
      const val1 = matrix[d1.id]?.[d2.id] || 0;
      const val2 = matrix[d2.id]?.[d1.id] || 0;
      const combinedScore = val1 + val2; // 0-200
      
      if (combinedScore > 0) {
        // Floor Logic
        const f1 = d1.pinnedFloor;
        const f2 = d2.pinnedFloor;
        
        let overlap = 0;
        if (!f1 && !f2) overlap = 1; 
        else if (f1 === f2) overlap = 1; 
        else overlap = 0; 

        const splitPenalty = 1 - overlap;
        
        const pairStrength = combinedScore / 2; // 0-100
        const friction = pairStrength * splitPenalty;

        totalPossibleStrength += pairStrength;
        totalBrokenStrength += friction;

        let label = 'Low';
        if (combinedScore >= 160) label = 'Critical';
        else if (combinedScore >= 100) label = 'High';
        else if (combinedScore >= 50) label = 'Medium';

        pairs.push({
          dept1: d1,
          dept2: d2,
          score: combinedScore,
          strengthLabel: label,
          isCrossFloor: splitPenalty === 1,
          asymmetry: Math.abs(val1 - val2),
          friction: friction,
          overlap: overlap
        });
      }
    }
  }

  const stressScore = totalPossibleStrength > 0 
    ? (totalBrokenStrength / totalPossibleStrength) * 100 
    : 0;

  const derivedMeetingRatio = totalMeetingRooms > 0 ? totalHeadcountWithGrowth / totalMeetingRooms : 0;
  
  // Effective ratio now derived from total seats
  const effectiveDeskRatio = requiredDesks > 0 ? totalHeadcountWithGrowth / requiredDesks : 0;

  return {
    totalHeadcountWithGrowth,
    totalOpenPlanPeople: totalHeadcountWithGrowth - enclosedOfficesTotal,
    requiredDesks,
    openDesks: openDesksTotal, // Fixed Open
    altDesks: altDesksTotal,   // Alternative
    enclosedOffices: enclosedOfficesTotal,
    totalMeetingRooms,
    totalMeetingSeats,
    totalPhoneBooths,
    derivedMeetingRatio,
    effectiveDeskRatio,
    areaWorkstations,
    areaMeeting,
    areaPhone,
    areaSupport,
    areaCirculation,
    totalUsedArea,
    remainingArea: nia - totalUsedArea,
    density: totalHeadcountWithGrowth > 0 ? nia / totalHeadcountWithGrowth : 0,
    occupancyRatio: requiredDesks > 0 ? nia / requiredDesks : 0,
    fitFactor: (totalUsedArea / nia) * 100,
    roomMix,
    floorMetrics,
    adjacencyStats: {
      stressScore,
      topFrictionPairs: pairs.filter(p => p.friction > 0).sort((a,b) => b.friction - a.friction),
      allPairs: pairs.sort((a,b) => b.score - a.score),
      matrix
    }
  };
};