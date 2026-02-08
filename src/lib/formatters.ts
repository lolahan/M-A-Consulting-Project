/**
 * Format a number as Euro Millions (€m) with 2 decimal places.
 * @param valueInMillions The value in millions (e.g. 1.5 for €1.5m). 
 *                        If the input is raw value (1,500,000), it should be divided by 1,000,000 first.
 * @returns Formatted string like "€1.50m"
 */
export const formatEuroM = (valueInMillions: number): string => {
    return new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(valueInMillions) + 'm';
};

/**
 * Format payback period in months.
 * @param months Number of months
 * @returns String like "6.1 months"
 */
export const formatMonths = (months: number): string => {
    return `${months.toFixed(1)} months`;
};
