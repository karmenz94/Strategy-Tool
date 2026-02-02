
/**
 * DEPRECATED: This service is no longer used for deriving workstation counts.
 * The core logic has moved to utils/calculations.ts where user-defined global counts 
 * (Fixed and Alternative) are distributed to floors.
 * 
 * Kept strictly for type reference or future utility if complex derivation returns.
 */

import { WorkspaceCalculationResult } from "../types";

export const calculateSpaceBudget = (
  totalHeadcount: number,
  agilePercent: number, // Legacy param
): WorkspaceCalculationResult => {
  return {
    fixedWorkstationsRaw: 0,
    fixedWorkstations: 0,
    alternativeWorkpoints: 0,
    calculationTimestamp: new Date().toISOString(),
    calculationSource: 'DEPRECATED_V2'
  };
};
