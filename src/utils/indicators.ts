export interface DonchianResult {
    upper: number;
    lower: number;
    middle: number;
}

/**
 * Calculate Donchian Channels
 * @param prices Array of prices (last is most recent)
 * @param period Lookback period (default 20)
 */
export const calculateDonchian = (prices: number[], period: number = 20): DonchianResult | null => {
    if (prices.length < period) return null;

    const window = prices.slice(-period);
    const upper = Math.max(...window);
    const lower = Math.min(...window);
    const middle = (upper + lower) / 2;

    return { upper, lower, middle };
};
