
import * as XLSX from 'xlsx';
import { ObservationRecord, UtilizationMetrics, RoomPerformanceMetric, MeetingEvent, RoomSizeBreakdown, RoomClassification, CapacityFitBucket, GlobalSizeBin } from '../types';

// --- CONSTANTS ---

export const REQUIRED_FIELDS_WORKSTATION = [
  { key: 'floor', label: 'Level / Floor', required: true },
  { key: 'department', label: 'Department (Team)', required: false },
  { key: 'date', label: 'Date', required: true },
  { key: 'timeSlot', label: 'Time Slot', required: true },
  { key: 'isOccupied', label: 'Status (Occupied?)', required: true },
];

export const REQUIRED_FIELDS_MEETING = [
  { key: 'floor', label: 'Level / Floor', required: true },
  { key: 'roomName', label: 'Room Name', required: true },
  { key: 'roomType', label: 'Space Type', required: true },
  { key: 'capacity', label: 'Capacity (Marker)', required: false },
  { key: 'week', label: 'Week', required: false },
  { key: 'day', label: 'Day', required: true },
  { key: 'timeSlot', label: 'Time Slot', required: true },
  { key: 'isOccupied', label: 'Status', required: true },
  { key: 'attendeeCount', label: 'Occupancy (Count)', required: false },
];

// --- PARSING ---

export const parseExcelFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

// --- MAPPING HEURISTICS ---

export const autoMapColumns = (headers: string[], type: 'workstation' | 'meeting'): Record<string, number> => {
  const lowerHeaders = headers.map(h => String(h).toLowerCase().trim());
  const mapping: Record<string, number> = {};

  const findIdx = (keywords: string[]) => lowerHeaders.findIndex(h => keywords.some(k => h.includes(k)));

  // Common Fields
  mapping['date'] = findIdx(['date', 'timestamp']);
  mapping['timeSlot'] = findIdx(['time', 'slot', 'hour', 'start', 'period']);
  mapping['floor'] = findIdx(['floor', 'level', 'zone', 'lvl']); 
  mapping['week'] = findIdx(['week', 'wk']);
  mapping['day'] = findIdx(['day']);
  
  if (type === 'workstation') {
    mapping['isOccupied'] = findIdx(['occup', 'status', 'state', 'vacan', 'activity']); 
    mapping['department'] = findIdx(['dept', 'department', 'team', 'group', 'cost center']);
  } else {
    // Meeting Specifics
    // Crucial: Department often maps to Room Name in Meeting Utilization raw data
    mapping['roomName'] = findIdx(['room', 'name', 'id', 'department', 'dept']); 
    mapping['roomType'] = findIdx(['type', 'category', 'kind']);
    mapping['capacity'] = findIdx(['cap', 'seat', 'pax']);
    mapping['isOccupied'] = findIdx(['status', 'state']);
    mapping['attendeeCount'] = findIdx(['occupancy', 'actual', 'pax', 'people', 'count']);
  }

  // Cleanup unfound
  Object.keys(mapping).forEach(k => {
    if (mapping[k] === -1) delete mapping[k];
  });

  return mapping;
};

export const validateMapping = (data: any[], mapping: Record<string, number>, type: 'workstation'|'meeting') => {
    const required = type === 'workstation' ? REQUIRED_FIELDS_WORKSTATION : REQUIRED_FIELDS_MEETING;
    const missing = required.filter(f => f.required && mapping[f.key] === undefined);
    
    // Sample check logic
    const warnings: string[] = [];
    
    // Check first 10 rows for data validity
    const sampleRows = data.slice(1, 11);
    
    if (sampleRows.length > 0 && mapping['isOccupied'] !== undefined) {
        const idx = mapping['isOccupied'];
        const hasValidStatus = sampleRows.some(r => {
            const val = String(r[idx]).toLowerCase();
            return val.includes('occ') || val === '1' || val === '0' || val === 'yes' || val === 'no' || val === 'true' || val === 'false';
        });
        if (!hasValidStatus) warnings.push("Status column values don't look standard (e.g. 'Occupied', '1', 'Yes').");
    }

    if (sampleRows.length > 0 && mapping['timeSlot'] !== undefined) {
        const idx = mapping['timeSlot'];
        const hasTime = sampleRows.some(r => {
            const val = String(r[idx]);
            return val.includes(':') || !isNaN(parseFloat(val)); // Very basic check
        });
        if (!hasTime) warnings.push("Time column doesn't appear to contain time formats.");
    }
    
    return {
        isValid: missing.length === 0,
        missingFields: missing.map(f => f.label),
        warnings
    };
};

// --- TRANSFORMATION ---

const parseStatus = (val: any): boolean => {
  if (val === 1 || val === '1') return true;
  if (typeof val === 'string') {
    const v = val.toLowerCase().trim();
    if (v.includes('unoccupied')) return false;
    if (v.includes('occupied') || v === 'yes' || v === 'y' || v === 'occ') return true;
  }
  return false;
};

export const transformData = (
  rawData: any[], 
  mappings: Record<string, number>,
  mode: 'workstation' | 'meeting'
): ObservationRecord[] => {
  const records: ObservationRecord[] = [];
  
  // Guard against rows that are just repeated headers or empty
  const isHeaderLike = (str: string) => {
      const s = String(str).toLowerCase().trim();
      return ['level', 'floor', 'department', 'room', 'type', 'capacity', 'status', 'occupancy', 'week', 'day', 'time'].includes(s);
  };

  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length === 0) continue;

    const getVal = (key: string) => {
      const idx = mappings[key];
      return idx !== undefined ? row[idx] : undefined;
    };

    // Common Base
    const date = String(getVal('date') || '');
    const timeSlot = String(getVal('timeSlot') || '');
    const floor = String(getVal('floor') || 'Unknown').trim();
    const rawWeek = getVal('week');
    const rawDay = getVal('day');
    
    // Parse numeric fields
    const week = parseInt(rawWeek) || undefined;
    const day = parseInt(rawDay) || undefined;

    // Filter out rows where "Floor" is literally "Level" or similar (header repeat)
    if (isHeaderLike(floor)) continue;

    // Skip empty logic rows
    if (floor === 'Unknown' && !timeSlot && !date) continue;

    if (mode === 'workstation') {
        // Workstation Logic
        // Ensure we have minimal data
        if (date || timeSlot || floor !== 'Unknown') {
            records.push({
                id: `obs-${i}`,
                date: date || 'Unknown Date',
                timeSlot: timeSlot || 'Unknown Time',
                floor,
                department: String(getVal('department') || 'Unassigned'),
                isOccupied: parseStatus(getVal('isOccupied')),
                week,
                day
            });
        }
    } else {
        // Meeting Logic - Person Row Extraction
        const isOccupied = parseStatus(getVal('isOccupied'));
        const rawOccupancy = getVal('attendeeCount');
        
        let actualAttendees = 0;
        if (isOccupied) {
            const parsedOcc = parseInt(rawOccupancy);
            if (!isNaN(parsedOcc) && parsedOcc > 0) {
                actualAttendees = parsedOcc;
            } else {
                actualAttendees = 1; // Default: 1 row = 1 person
            }
        }

        if (timeSlot || day || week || floor !== 'Unknown') {
            records.push({
                id: `mtg-${i}`,
                date: date,
                timeSlot: timeSlot || 'Unknown Time',
                floor,
                roomName: String(getVal('roomName') || `Room ${i}`),
                roomType: String(getVal('roomType') || 'Meeting Room'),
                capacity: 1, // Placeholder
                attendeeCount: actualAttendees,
                isOccupied,
                week,
                day
            });
        }
    }
  }
  return records;
};

// --- CALCULATION LOGIC ---

export const calculateWorkstationMetrics = (records: ObservationRecord[]): UtilizationMetrics => {
    // 1. Overall
    const total = records.length;
    const occupied = records.filter(r => r.isOccupied).length;
    const avgOccupancy = total > 0 ? (occupied / total) * 100 : 0;

    // 2. By Time (Peak Calculation)
    const timeGroups: Record<string, {t: number, o: number}> = {};
    records.forEach(r => {
        if (!timeGroups[r.timeSlot]) timeGroups[r.timeSlot] = {t: 0, o: 0};
        timeGroups[r.timeSlot].t++;
        if (r.isOccupied) timeGroups[r.timeSlot].o++;
    });
    
    let peakOccupancy = 0;
    const occupancyByTime = Object.keys(timeGroups).map(t => {
        const rate = (timeGroups[t].o / timeGroups[t].t) * 100;
        if (rate > peakOccupancy) peakOccupancy = rate;
        return { time: t, rate };
    }).sort((a,b) => a.time.localeCompare(b.time)); 

    // 3. By Floor
    const floorGroups: Record<string, {t: number, o: number}> = {};
    records.forEach(r => {
        if (!floorGroups[r.floor]) floorGroups[r.floor] = {t: 0, o: 0};
        floorGroups[r.floor].t++;
        if (r.isOccupied) floorGroups[r.floor].o++;
    });
    const occupancyByFloor = Object.keys(floorGroups).map(f => ({
        floor: f,
        rate: (floorGroups[f].o / floorGroups[f].t) * 100
    }));

    return {
        avgOccupancy,
        peakOccupancy,
        occupancyByTime,
        occupancyByFloor,
        roomMetrics: [],
        totalObservations: total,
        totalRooms: 0,
        overallUtilization: avgOccupancy,
        overallAvgAttendees: 0,
        globalSizeBins: [],
        globalInsights: []
    };
};

const getSizeBin = (attendees: number): string => {
    if (attendees === 1) return '1p';
    if (attendees === 2) return '2p';
    if (attendees >= 3 && attendees <= 4) return '3-4p';
    if (attendees >= 5 && attendees <= 7) return '5-7p';
    if (attendees >= 8 && attendees <= 11) return '8-11p';
    if (attendees >= 12) return '12p+';
    return '0p'; // Should not happen for occupied
};

export const calculateConcurrencyStats = (records: ObservationRecord[]) => {
    const timepointMap = new Map<string, {
        week: number,
        day: number,
        timeStr: string,
        allRooms: Set<string>,
        occupiedRooms: Set<string>
    }>();

    const uniqueRooms = new Set<string>();

    records.forEach(r => {
        if (r.roomName) uniqueRooms.add(r.roomName);
        if (!r.timeSlot) return;
        
        // Normalize keys
        const week = r.week || 1;
        const day = r.day || 1;
        const timeStr = r.timeSlot.trim();
        
        // Composite key for grouping
        const key = `W${week}-D${day}-${timeStr}`;
        
        if (!timepointMap.has(key)) {
            timepointMap.set(key, {
                week, 
                day, 
                timeStr, 
                allRooms: new Set(),
                occupiedRooms: new Set()
            });
        }
        
        const entry = timepointMap.get(key)!;
        const room = r.roomName || 'Unknown';
        
        // Track observation at this timepoint
        entry.allRooms.add(room);
        
        // Track occupancy
        if (r.isOccupied) {
            entry.occupiedRooms.add(room);
        }
    });

    // Convert to array and sort chronologically
    const timeline = Array.from(timepointMap.values()).map(entry => {
        const total = entry.allRooms.size;
        const occupied = entry.occupiedRooms.size;
        const pct = total > 0 ? (occupied / total) * 100 : 0;
        
        // Heuristic sort value: Week -> Day -> Time
        let timeVal = 0;
        if (entry.timeStr.includes(':')) {
            const parts = entry.timeStr.split(':');
            timeVal = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
        } else {
            const floatVal = parseFloat(entry.timeStr);
            if (!isNaN(floatVal)) {
                 if (floatVal < 1) timeVal = floatVal * 1440; // Excel fraction
                 else timeVal = floatVal; 
            }
        }

        const sortKey = (entry.week * 100000) + (entry.day * 2000) + timeVal;

        return {
            time: `W${entry.week} D${entry.day} ${entry.timeStr}`, 
            sortKey,
            occupied,
            total,
            pct
        };
    }).sort((a,b) => a.sortKey - b.sortKey)
      .map(({ time, occupied, total, pct }) => ({ time, occupied, total, pct }));

    const avgConcurrencyPct = timeline.length > 0 
        ? timeline.reduce((sum, t) => sum + t.pct, 0) / timeline.length 
        : 0;
    const maxConcurrencyPct = timeline.length > 0 
        ? Math.max(...timeline.map(t => t.pct)) 
        : 0;

    return {
        avgPct: avgConcurrencyPct,
        maxPct: maxConcurrencyPct,
        timeline: timeline,
        uniqueRoomsCount: uniqueRooms.size
    };
};

export const calculateMeetingMetrics = (
    records: ObservationRecord[],
    userCapacities: Record<string, number> = {}
): UtilizationMetrics => {
    
    // 1. EVENT GENERATION (Strict Grouping)
    const eventMap = new Map<string, MeetingEvent & { occupied: boolean }>();

    records.forEach(r => {
        // Unique Event Key
        const key = `${r.floor}::${r.roomName}::${r.week}::${r.day}::${r.timeSlot}`;
        
        if (!eventMap.has(key)) {
            eventMap.set(key, { 
                eventId: key,
                floor: r.floor, 
                roomName: r.roomName || 'Unknown', 
                roomType: r.roomType || 'General', 
                week: r.week || 0,
                day: r.day || 0, 
                time: r.timeSlot, 
                attendees: 0, 
                occupied: false,
                rawRowIds: [] 
            });
        }
        
        const event = eventMap.get(key)!;
        event.rawRowIds.push(r.id);
        if (r.isOccupied) {
            event.occupied = true;
            // Strict Sum of Occupancy for this event
            event.attendees += (r.attendeeCount || 1);
        }
    });

    // 2. AGGREGATION & GLOBAL STATS
    const roomMap = new Map<string, {
        floor: string,
        name: string,
        type: string,
        totalMeetings: number, // Observed Slots
        occupiedMeetings: number,
        totalAttendees: number,
        sizeCounts: Record<number, number>,
        binCounts: Record<string, number>,
        eventsBySize: Record<number, MeetingEvent[]>,
        fitBuckets: { low: MeetingEvent[], mid: MeetingEvent[], fit: MeetingEvent[], over: MeetingEvent[] }
    }>();

    // Global Accumulators
    const globalSizeCounts: Record<number, number> = {};
    const globalBinCounts: Record<string, number> = {};
    const binOrder = ['1p', '2p', '3-4p', '5-7p', '8-11p', '12p+'];
    binOrder.forEach(b => globalBinCounts[b] = 0);

    let totalOccupiedEventsAll = 0;
    let grandTotalAttendees = 0;

    eventMap.forEach(event => {
        const roomKey = `${event.floor}::${event.roomName}`;
        
        if (!roomMap.has(roomKey)) {
            roomMap.set(roomKey, {
                floor: event.floor,
                name: event.roomName,
                type: event.roomType,
                totalMeetings: 0,
                occupiedMeetings: 0,
                totalAttendees: 0,
                sizeCounts: {},
                binCounts: {},
                eventsBySize: {},
                fitBuckets: { low: [], mid: [], fit: [], over: [] }
            });
        }

        const roomStats = roomMap.get(roomKey)!;
        roomStats.totalMeetings++;

        // Only count as Occupied Meeting if attendees > 0
        if (event.occupied && event.attendees > 0) {
            roomStats.occupiedMeetings++;
            roomStats.totalAttendees += event.attendees;
            
            // Global Updates
            totalOccupiedEventsAll++;
            grandTotalAttendees += event.attendees;

            const k = event.attendees;
            
            // Size Count (Local)
            roomStats.sizeCounts[k] = (roomStats.sizeCounts[k] || 0) + 1;
            
            // Size Count (Global)
            globalSizeCounts[k] = (globalSizeCounts[k] || 0) + 1;

            // Event List
            const fullEvent = {
                week: event.week,
                day: event.day,
                time: event.time,
                attendees: event.attendees,
                eventId: event.eventId,
                floor: event.floor,
                roomName: event.roomName,
                roomType: event.roomType,
                rawRowIds: event.rawRowIds
            };

            if (!roomStats.eventsBySize[k]) roomStats.eventsBySize[k] = [];
            roomStats.eventsBySize[k].push(fullEvent);

            // Bin Count (Local & Global)
            const bin = getSizeBin(k);
            roomStats.binCounts[bin] = (roomStats.binCounts[bin] || 0) + 1;
            globalBinCounts[bin] = (globalBinCounts[bin] || 0) + 1;

            // Capacity Fit Analysis (Keeping legacy buckets for detailed view if needed, but not primary classification)
            const capacity = userCapacities[roomKey] || 0;
            if (capacity > 0) {
                const ratio = event.attendees / capacity;
                if (ratio < 0.40) roomStats.fitBuckets.low.push(fullEvent);
                else if (ratio < 0.70) roomStats.fitBuckets.mid.push(fullEvent);
                else if (ratio <= 1.00) roomStats.fitBuckets.fit.push(fullEvent);
                else roomStats.fitBuckets.over.push(fullEvent);
            }
        }
    });

    // 3. ROOM METRIC CONSTRUCTION
    const roomMetrics: RoomPerformanceMetric[] = [];

    roomMap.forEach((stats, key) => {
        // Size Breakdown
        const sizeBreakdown: RoomSizeBreakdown[] = Object.keys(stats.sizeCounts).map(kStr => {
            const k = parseInt(kStr);
            const count = stats.sizeCounts[k];
            // Occupancy % = Count(k) / Total_Occupied_Meetings(room)
            const occupancyPct = stats.occupiedMeetings > 0 ? (count / stats.occupiedMeetings) * 100 : 0;
            
            const sortedEvents = (stats.eventsBySize[k] || []).sort((a,b) => {
                if (a.day !== b.day) return a.day - b.day;
                return a.time.localeCompare(b.time);
            });

            return {
                floor: stats.floor,
                roomName: stats.name,
                size: k,
                count: count,
                occupancyPct: occupancyPct,
                events: sortedEvents
            };
        }).sort((a,b) => a.size - b.size);

        // --- NEW CLASSIFICATION LOGIC ---
        
        // 1. Capacity
        const capacity = userCapacities[key] || 0;
        
        // 2. Avg Occupancy
        const avgOccupancy = stats.occupiedMeetings > 0 ? stats.totalAttendees / stats.occupiedMeetings : 0;
        const avgOccRounded = Math.round(avgOccupancy);

        // 3. Typical (Mode)
        let maxBinCount = 0;
        let typicalBinLabel = '';
        Object.entries(stats.binCounts).forEach(([bin, count]) => {
            if (count > maxBinCount) {
                maxBinCount = count;
                typicalBinLabel = bin;
            }
        });
        
        let typicalValue = 0;
        switch(typicalBinLabel) {
            case '1p': typicalValue = 1; break;
            case '2p': typicalValue = 2; break;
            case '3-4p': typicalValue = 3.5; break;
            case '5-7p': typicalValue = 6; break;
            case '8-11p': typicalValue = 9.5; break;
            case '12p+': typicalValue = 12; break;
            default: typicalValue = 0;
        }
        const typicalRounded = Math.round(typicalValue);
        const modePct = stats.occupiedMeetings > 0 ? (maxBinCount / stats.occupiedMeetings) * 100 : 0;
        const topMeetingSizeStr = typicalValue > 0 ? `${typicalBinLabel} (${modePct.toFixed(0)}%)` : '-';

        // 4. Classification
        let classification: RoomClassification = 'Mixed Pattern / Review Required';
        let statusRule = 'Mixed';
        let avgRatio = 0;
        let typicalRatio = 0;

        if (capacity <= 0) {
            classification = 'Unclassified';
            statusRule = 'Missing Capacity';
        } else if (stats.occupiedMeetings === 0) {
            // No data implies underutilized or unused, but technically mixed/review if we observed slots but saw none.
            classification = 'Underutilized / Size Mismatch';
            statusRule = 'No Usage';
        } else {
            avgRatio = avgOccRounded / capacity;
            typicalRatio = typicalRounded / capacity;

            if (avgRatio > 1.0 || typicalRatio > 1.0) {
                classification = 'Over Capacity Risk';
                statusRule = 'Avg or Typical > 100%';
            } else if (avgRatio < 0.50 && typicalRatio < 0.50) {
                classification = 'Underutilized / Size Mismatch';
                statusRule = 'Both Metrics < 50%';
            } else if ((avgRatio >= 0.50 && avgRatio <= 0.79) && (typicalRatio >= 0.50 && typicalRatio <= 0.79)) {
                classification = 'Reasonably Utilized';
                statusRule = 'Both Metrics 50-79%';
            } else if ((avgRatio >= 0.80 && avgRatio <= 1.00) && (typicalRatio >= 0.80 && typicalRatio <= 1.00)) {
                classification = 'Over Utilized';
                statusRule = 'Both Metrics 80-100%';
            } else {
                classification = 'Mixed Pattern / Review Required';
                statusRule = 'Metrics in different bands';
            }
        }

        // Keep bucket counts for detailed modal/chart usage
        const countLow = stats.fitBuckets.low.length;
        const countMid = stats.fitBuckets.mid.length;
        const countFit = stats.fitBuckets.fit.length;
        const countOver = stats.fitBuckets.over.length;
        
        const pctLow = stats.occupiedMeetings > 0 ? countLow / stats.occupiedMeetings : 0;
        const pctMid = stats.occupiedMeetings > 0 ? countMid / stats.occupiedMeetings : 0;
        const pctFit = stats.occupiedMeetings > 0 ? countFit / stats.occupiedMeetings : 0;
        const pctOver = stats.occupiedMeetings > 0 ? countOver / stats.occupiedMeetings : 0;

        roomMetrics.push({
            floor: stats.floor,
            roomName: stats.name,
            roomType: stats.type,
            capacity: capacity,
            observedSlots: stats.totalMeetings,
            occupiedSlots: stats.occupiedMeetings,
            utilizationPct: stats.totalMeetings > 0 ? (stats.occupiedMeetings / stats.totalMeetings) * 100 : 0,
            avgOccupancy: avgOccupancy,
            meetingSizeDistribution: stats.binCounts,
            sizeBreakdown: sizeBreakdown,
            topMeetingSize: topMeetingSizeStr,
            avgCapRatio: avgRatio,
            classification: classification,
            analysis: {
                avgOccRaw: avgOccupancy,
                avgOccRounded: avgOccRounded,
                avgRatio: avgRatio,
                typicalBin: typicalBinLabel,
                typicalTypeVal: typicalValue,
                typicalRounded: typicalRounded,
                typicalRatio: typicalRatio,
                statusRule
            },
            capacityFit: {
                low: { count: countLow, pct: pctLow * 100, events: stats.fitBuckets.low },
                mid: { count: countMid, pct: pctMid * 100, events: stats.fitBuckets.mid },
                fit: { count: countFit, pct: pctFit * 100, events: stats.fitBuckets.fit },
                over: { count: countOver, pct: pctOver * 100, events: stats.fitBuckets.over },
            }
        });
    });

    // 4. GLOBAL STATS CONSTRUCTION
    const totalMeetingsAllRooms = roomMetrics.reduce((sum, r) => sum + r.observedSlots, 0);

    const globalSizeBins: GlobalSizeBin[] = binOrder.map(bin => ({
        label: bin,
        count: globalBinCounts[bin],
        occupancyPct: totalOccupiedEventsAll > 0 ? (globalBinCounts[bin] / totalOccupiedEventsAll) * 100 : 0
    }));

    // Insight Generation
    const globalInsights: string[] = [];
    const count1p = globalBinCounts['1p'] || 0;
    const count2p = globalBinCounts['2p'] || 0;
    const count8_11 = globalBinCounts['8-11p'] || 0;
    const count12 = globalBinCounts['12p+'] || 0;
    
    if (totalOccupiedEventsAll > 0) {
        const smallPct = ((count1p + count2p) / totalOccupiedEventsAll) * 100;
        const largePct = ((count8_11 + count12) / totalOccupiedEventsAll) * 100;

        if (smallPct > 60) globalInsights.push("Most interactions are small-format (1-2p), suggesting high demand for focus or dyad rooms.");
        if (largePct > 15) globalInsights.push("Notable volume of mid-to-large meetings indicates valid need for formal conference spaces.");
        if (largePct < 5) globalInsights.push("Large meetings (8p+) are infrequent; consider repurposing large boardrooms.");
        if (globalBinCounts['3-4p'] > globalBinCounts['1p']) globalInsights.push("Small group collaboration (3-4p) is a dominant behavior.");
    } else {
        globalInsights.push("Insufficient data to generate behavioral insights.");
    }

    // 5. CONCURRENCY CALCULATION (Delegate)
    const concurrencyStats = calculateConcurrencyStats(records);

    return {
        avgOccupancy: 0, // Unused for meeting
        peakOccupancy: 0,
        occupancyByTime: [],
        occupancyByFloor: [],
        roomMetrics,
        totalObservations: totalMeetingsAllRooms,
        totalRooms: roomMap.size,
        overallUtilization: totalMeetingsAllRooms > 0 ? (totalOccupiedEventsAll / totalMeetingsAllRooms) * 100 : 0,
        overallAvgAttendees: totalOccupiedEventsAll > 0 ? grandTotalAttendees / totalOccupiedEventsAll : 0,
        globalSizeBins,
        globalInsights,
        concurrencyStats
    };
};

// --- SAMPLE DATA GENERATOR ---
export const generateSampleData = (mode: 'workstation' | 'meeting'): ObservationRecord[] => {
    const records: ObservationRecord[] = [];
    const floors = ['L10', 'L11', 'L12'];
    const timeSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
    
    if (mode === 'workstation') {
        const depts = ['Sales', 'IT', 'HR', 'Finance', 'Product'];
        for (let i = 0; i < 800; i++) {
            const isOccupied = Math.random() > 0.4;
            records.push({
                id: `sim-${i}`,
                date: '2024-01-01',
                timeSlot: timeSlots[Math.floor(Math.random() * timeSlots.length)],
                floor: floors[Math.floor(Math.random() * floors.length)],
                department: depts[Math.floor(Math.random() * depts.length)],
                isOccupied
            });
        }
    } else {
        const rooms = [
            { name: 'Focus 01', type: 'Focus Room' },
            { name: 'Meet 01', type: 'Meeting Room' },
            { name: 'Meet 02', type: 'Meeting Room' },
            { name: 'Boardroom', type: 'Boardroom' }
        ];
        
        for (let i = 0; i < 500; i++) {
            const r = rooms[Math.floor(Math.random() * rooms.length)];
            const time = timeSlots[Math.floor(Math.random() * timeSlots.length)];
            const floor = floors[Math.floor(Math.random() * floors.length)];
            const day = Math.floor(Math.random() * 5) + 1;
            
            // Randomly decide if meeting occurs
            const isMeeting = Math.random() > 0.3;
            
            if (!isMeeting) {
                // Unoccupied slot (1 row)
                records.push({
                    id: `sim-empty-${i}`,
                    floor, roomName: r.name, roomType: r.type,
                    day, timeSlot: time, isOccupied: false,
                    date: ''
                });
            } else {
                // Occupied meeting (Multiple person rows)
                const attendees = Math.floor(Math.random() * 8) + 1; // 1 to 8 people
                for (let p = 0; p < attendees; p++) {
                    records.push({
                        id: `sim-occ-${i}-${p}`,
                        floor, roomName: r.name, roomType: r.type,
                        day, timeSlot: time, isOccupied: true,
                        attendeeCount: 1, // Each person is 1 count
                        date: ''
                    });
                }
            }
        }
    }
    return records;
};