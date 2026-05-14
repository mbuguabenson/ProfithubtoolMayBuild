export type TickData = {
    quote: number;
    digit: number;
};

export type TrendDirection = 'rising' | 'falling' | 'stable';

export type PatternStats = {
    frequencies: Record<number, number>;
    sorted_digits: number[]; // Ordered by frequency (desc)
    most_frequent: number;
    second_most_frequent: number;
    least_frequent: number;
    percentages: Record<number, number>;
};

/**
 * Calculates detailed statistics for a slice of ticks.
 */
export const calculatePatternStats = (digits: number[]): PatternStats => {
    const frequencies: Record<number, number> = {};
    const total = digits.length || 1;

    // Initialize all digits 0-9 with 0
    for (let i = 0; i <= 9; i++) frequencies[i] = 0;

    digits.forEach(d => {
        frequencies[d] = (frequencies[d] || 0) + 1;
    });

    const sorted_digits = Object.keys(frequencies)
        .map(Number)
        .sort((a, b) => frequencies[b] - frequencies[a]);

    const percentages: Record<number, number> = {};
    for (const d in frequencies) {
        percentages[d] = (frequencies[d] / total) * 100;
    }

    return {
        frequencies,
        sorted_digits,
        most_frequent: sorted_digits[0],
        second_most_frequent: sorted_digits[1],
        least_frequent: sorted_digits[sorted_digits.length - 1],
        percentages,
    };
};

/**
 * Determines the trend of a specific percentage over a window.
 * compares current stats vs previous stats (t-1)
 */
export const calculateTrend = (current_pct: number, previous_pct: number): TrendDirection => {
    if (current_pct > previous_pct) return 'rising';
    if (current_pct < previous_pct) return 'falling';
    return 'stable';
};

/**
 * Checks if a specific digit is increasing in power (frequency percentage rising).
 */
export const isDigitPowerIncreasing = (digit: number, current_digits: number[], window_size: number = 25): boolean => {
    // Current window
    const current_slice = current_digits.slice(-window_size);
    const current_freq = current_slice.filter(d => d === digit).length;

    // Previous window (shifted back by 1 tick)
    const prev_slice = current_digits.slice(-window_size - 1, -1);
    const prev_freq = prev_slice.filter(d => d === digit).length;

    return current_freq > prev_freq;
};

/**
 * Helper to get Over/Under group stats
 */
export const getOverUnderStats = (digits: number[]) => {
    const total = digits.length || 1;
    const over = digits.filter(d => d > 4).length;
    const under = digits.length - over;

    return {
        over_pct: (over / total) * 100,
        under_pct: (under / total) * 100,
        over_count: over,
        under_count: under,
    };
};

/**
 * Helper to get Even/Odd group stats
 */
export const getEvenOddStats = (digits: number[]) => {
    const total = digits.length || 1;
    const even = digits.filter(d => d % 2 === 0).length;
    const odd = digits.length - even;

    return {
        even_pct: (even / total) * 100,
        odd_pct: (odd / total) * 100,
        even_count: even,
        odd_count: odd,
    };
};
