/**
 * Advanced Financial Engine for License Renegotiation
 * Computes NPV, Discounted Payback, and Scenario comparisons.
 * Aligned with Excel CN Sheet logic.
 */

export interface YearlyRevenue {
  year: string;
  revenue: number;
}

export type DealStructure = 'exclusivityOnly' | 'fullTerm';

export interface CalcInputs {
  forecast: YearlyRevenue[];
  baselineRoyaltyRate: number; // e.g. 0.35 (35%)
  newRoyaltyRate: number;      // e.g. 0.07 (7%)
  upfrontFee: number;          // in actual currency units (e.g. 1500000 for 1.5m)
  discountRate: number;        // e.g. 0.135 (13.5%)
  exclusivityYears: number;
  dealStructure: DealStructure; // New toggle
}

export interface DealAnalysis {
  baselineTotalRoyalties: number;
  newDealTotalRoyalties: number;
  annualBaselineRoyalties: number[];
  annualNewDealRoyalties: number[];
  annualSavings: number[];
  cumulativeDiscountedSavings: number[];
  npvOfSavings: number;
  dealNPV: number;
  paybackMonths: number | null; // Null if no payback
  ebitdaUplift: number; // Sum of annual savings
  isPaybackWithinExclusivity: boolean;
  rdConsultantFee?: number; // Total R&D Consultant Fees deducted
}

/**
 * Performs core financial calculations for the licensing deal.
 */
export const computeDealAnalysis = (inputs: CalcInputs): DealAnalysis => {
  const {
    forecast,
    baselineRoyaltyRate,
    newRoyaltyRate,
    upfrontFee,
    discountRate,
    exclusivityYears,
    dealStructure
  } = inputs;

  let baselineTotalRoyalties = 0;
  let newDealTotalRoyalties = 0;

  const annualBaselineRoyalties: number[] = [];
  const annualNewDealRoyalties: number[] = [];
  const annualSavings: number[] = [];
  const cumulativeDiscountedSavings: number[] = [];

  let currentNPVOfSavings = 0;
  let paybackMonths: number | null = null;
  let ebitdaUplift = 0;

  // Helper to interpolate monthly payback
  let previousCumulativeNPV = -upfrontFee;

  // We treat T=0 as the moment upfront fee is paid. 
  // Flows start at Year 1.
  // Payback calculation needs granular check or linear interpolation.
  // Here we use standard discounted cash flow summation.

  forecast.forEach((v, index) => {
    const t = index + 1; // Year index (1..N)

    // 1. Baseline Royalty
    const bRoyalty = v.revenue * baselineRoyaltyRate;
    baselineTotalRoyalties += bRoyalty;
    annualBaselineRoyalties.push(bRoyalty);

    // 2. New Deal Royalty
    // Logic: 
    // if dealStructure == 'exclusivityOnly': reduced rate for Exclusivity Years, then revert to baseline
    // if dealStructure == 'fullTerm': reduced rate for all years
    let activeRate = baselineRoyaltyRate;

    if (dealStructure === 'fullTerm') {
      activeRate = newRoyaltyRate;
    } else {
      // exclusivityOnly
      activeRate = t <= exclusivityYears ? newRoyaltyRate : baselineRoyaltyRate;
    }

    const nRoyalty = v.revenue * activeRate;
    newDealTotalRoyalties += nRoyalty;
    annualNewDealRoyalties.push(nRoyalty);

    // 3. Savings (Driver of EBITDA Uplift)
    let savings = bRoyalty - nRoyalty;

    // R&D Consultant Fee Logic:
    // "Every year there is exclusivity, pay €0.12m (40d * €3000)"
    // We assume this applies during the defined exclusivity period.
    const isExclusiveYear = t <= exclusivityYears;
    if (isExclusiveYear) {
      savings -= 120000; // Deduct €120k cost
    }

    annualSavings.push(savings);
    ebitdaUplift += savings;

    // 4. Discounted Savings (for NPV & Payback)
    const discountedSaving = savings / Math.pow(1 + discountRate, t);
    currentNPVOfSavings += discountedSaving;
    cumulativeDiscountedSavings.push(currentNPVOfSavings);

    // 5. Payback Calculation (Linear Interpolation for Months)
    // Current cumulative net cash flow = currentNPVOfSavings - upfrontFee
    const currentCumulativeNet = currentNPVOfSavings - upfrontFee;

    if (paybackMonths === null) {
      if (currentCumulativeNet >= 0) {
        // Payback occurred in this year t
        // Fraction of year needed = (Negative Balance at start of year) / (Discounted Cash Flow in this year)
        // Balance at start = |previousCumulativeNPV|
        // actually previousCumulativeNPV is net of upfront.
        // Let's rely on pure DCF:
        // Uncovered amount at start of year = upfrontFee - (currentNPVOfSavings - discountedSaving)
        const uncoveredAtStart = upfrontFee - (currentNPVOfSavings - discountedSaving);

        // If uncoveredAtStart < 0, it means it was already paid back (should have been caught, but safe guard)
        // Fraction = uncoveredAtStart / discountedSaving
        const fraction = Math.max(0, uncoveredAtStart) / discountedSaving;

        paybackMonths = (t - 1 + fraction) * 12;
      }
    }
  });

  const dealNPV = currentNPVOfSavings - upfrontFee;
  const isPaybackWithinExclusivity = paybackMonths !== null && paybackMonths <= (exclusivityYears * 12);

  return {
    baselineTotalRoyalties,
    newDealTotalRoyalties,
    annualBaselineRoyalties,
    annualNewDealRoyalties,
    annualSavings,
    cumulativeDiscountedSavings,
    npvOfSavings: currentNPVOfSavings,
    dealNPV,
    paybackMonths,
    ebitdaUplift,
    isPaybackWithinExclusivity,
    rdConsultantFee: exclusivityYears * 120000 // Approximate total for display
  };
};

export const formatEuroM = (val: number) => {
  return `€${val.toFixed(1)}m`;
};

export const formatMonths = (months: number | null) => {
  if (months === null) return "Never";
  return `${months.toFixed(1)} mo`;
};
