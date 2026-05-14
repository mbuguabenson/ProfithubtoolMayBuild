import { TAnalysisHistory, TDigitStat } from '../stores/analysis-store';

export class DigitStatsEngine {
    ticks: number[] = [];
    prices: number[] = [];
    current_price: number = 0;

    // Configuration
    over_under_threshold = 5;
    match_diff_digit = 6;
    total_samples = 1000;
    pip = 2; // Default to 2 decimals

    // History
    even_odd_history: TAnalysisHistory[] = [];
    over_under_history: TAnalysisHistory[] = [];
    matches_differs_history: TAnalysisHistory[] = [];
    rise_fall_history: TAnalysisHistory[] = [];

    // Cached Stats
    digit_stats: TDigitStat[] = [];
    recent_powers: number[][] = []; // History of powers for each digit [tick][digit]
    max_power_history = 50;

    constructor() {
        this.reset();
    }

    reset() {
        this.ticks = [];
        this.prices = [];
        this.current_price = 0;
        this.even_odd_history = [];
        this.over_under_history = [];
        this.matches_differs_history = [];
        this.rise_fall_history = [];
        this.initDigitStats();
    }

    private initDigitStats() {
        this.digit_stats = Array.from({ length: 10 }, (_, i) => ({
            digit: i,
            count: 0,
            percentage: 0,
            rank: i + 1,
            power: 50,
            is_increasing: false,
        }));
    }

    // Robust digit extraction helper
    extractLastDigit(price: number | string): number {
        const p = Number(price);
        if (isNaN(p)) return 0;

        // Use fixed precision based on pip to ensure trailing zeros are kept
        const fixed_price = p.toFixed(this.pip);
        const last_char = fixed_price[fixed_price.length - 1];
        const digit = parseInt(last_char);
        return isNaN(digit) ? 0 : digit;
    }

    update(new_ticks: number[], new_prices: number[]) {
        this.ticks = new_ticks;
        this.prices = new_prices;
        const price = new_prices.length > 0 ? new_prices[new_prices.length - 1] : 0;
        this.current_price = price;
        this.updateStats();

        const last_digit = this.extractLastDigit(price);
        this.updateHistory(last_digit);
    }

    setConfig(config: {
        over_under_threshold?: number;
        match_diff_digit?: number;
        total_samples?: number;
        pip?: number;
    }) {
        if (config.over_under_threshold !== undefined) this.over_under_threshold = config.over_under_threshold;
        if (config.match_diff_digit !== undefined) this.match_diff_digit = config.match_diff_digit;
        if (config.total_samples !== undefined) this.total_samples = config.total_samples;
        if (config.pip !== undefined) this.pip = config.pip;

        // Re-calculate stats with new config if needed
        this.updateStats();
    }

    private updateStats() {
        const counts = Array(10).fill(0);
        this.ticks.forEach(d => counts[d]++);

        const total = this.ticks.length || 1;

        // Calculate powers/trend for each digit
        const last_50_ticks = this.ticks.slice(-50);
        const last_10_ticks = this.ticks.slice(-10);

        // Rank digits by frequency
        const sorted_indices = counts.map((c, i) => ({ count: c, index: i })).sort((a, b) => b.count - a.count);

        this.digit_stats = counts.map((count, digit) => {
            const percentage = (count / total) * 100;

            // Calculate rank (1=most, 10=least)
            const rank = sorted_indices.findIndex(s => s.index === digit) + 1;

            // Calculate power movement (trend)
            const recent_count = last_10_ticks.filter(d => d === digit).length;
            const mid_count = last_50_ticks.filter(d => d === digit).length / 5;
            const is_increasing = recent_count > mid_count;
            const power = 50 + (recent_count - mid_count) * 10;

            return {
                digit,
                count,
                percentage,
                rank,
                power: Math.min(100, Math.max(0, power)),
                is_increasing,
            };
        });

        // Capture power snapshot for history
        const current_powers = this.digit_stats.map(s => s.power);
        this.recent_powers.push(current_powers);
        if (this.recent_powers.length > this.max_power_history) {
            this.recent_powers.shift();
        }
    }

    private updateHistory(digit: number) {
        // Even/Odd
        const is_even = digit % 2 === 0;
        this.even_odd_history.unshift({
            type: is_even ? 'E' : 'O',
            value: is_even ? 'Even' : 'Odd',
            color: is_even ? '#10b981' : '#ef4444',
        });
        if (this.even_odd_history.length > 50) this.even_odd_history.pop();

        // Over/Under
        const is_over = digit > this.over_under_threshold;
        this.over_under_history.unshift({
            type: is_over ? 'O' : 'U',
            value: is_over ? 'Over' : 'Under',
            color: is_over ? '#10b981' : '#ef4444',
        });
        if (this.over_under_history.length > 50) this.over_under_history.pop();

        // Matches/Differs
        const is_match = digit === this.match_diff_digit;
        this.matches_differs_history.unshift({
            type: is_match ? 'M' : 'D',
            value: is_match ? 'Match' : 'Differ',
            color: is_match ? '#3b82f6' : '#f59e0b',
        });
        if (this.matches_differs_history.length > 50) this.matches_differs_history.pop();

        // Rise/Fall
        // We need previous price, which is tricky since we only store current.
        // Logic in store used `this.current_price` BEFORE updating it with new price.
        // For now, let's assume price change logic is handled externally or we store prev_price
        // Simplified: Rise/Fall history needs context of previous tick, which we lose if we just pass `price`.
        // However, `update` is called with new price. The `current_price` member holds the OLD price *before* we update it in `update` method?
        // Wait, `update` sets `this.current_price = price`. So we need to capture prev before setting.
    }

    // Override update to handle price history correctly
    updateWithHistory(new_ticks: number[], new_price: number) {
        const prev_price = this.current_price;
        this.ticks = new_ticks;
        this.prices.push(new_price);
        if (this.prices.length > this.total_samples) {
            this.prices.shift();
        }
        this.current_price = new_price;
        this.updateStats();

        const last_digit = this.extractLastDigit(new_price);

        // Rise/Fall
        const is_rise = new_price > prev_price;
        this.rise_fall_history.unshift({
            type: is_rise ? 'R' : 'F',
            value: is_rise ? 'Rise' : 'Fall',
            color: is_rise ? '#10b981' : '#ef4444',
        });
        if (this.rise_fall_history.length > 50) this.rise_fall_history.pop();

        this.updateHistory(last_digit);
    }

    getPercentages() {
        const total = this.ticks.length || 1;
        const evens = this.ticks.filter(d => d % 2 === 0).length;
        const overs = this.ticks.filter(d => d > this.over_under_threshold).length;
        const matches = this.ticks.filter(d => d === this.match_diff_digit).length;

        let rises = 0;
        let valid_price_deltas = 0;
        for (let i = 1; i < this.prices.length; i++) {
            if (this.prices[i] > this.prices[i - 1]) rises++;
            valid_price_deltas++;
        }
        const total_price_deltas = Math.max(1, valid_price_deltas);

        return {
            even: (evens / total) * 100,
            odd: ((total - evens) / total) * 100,
            over: (overs / total) * 100,
            under: ((total - overs) / total) * 100,
            match: (matches / total) * 100,
            differ: ((total - matches) / total) * 100,
            rise: (rises / total_price_deltas) * 100,
            fall: 100 - (rises / total_price_deltas) * 100,
        };
    }

    /**
     * Nexus Strategic Signal Analysis
     * Calculates power based on a 15-tick window with specific safety margins.
     */
    getNexusSignal(tier: 'balanced' | 'aggressive' | 'pro' | 'extreme') {
        const window = this.ticks.slice(-15);
        if (window.length < 15) return null;

        let under_range: number[] = [];
        let over_range: number[] = [];
        let prediction_u = 6;
        let prediction_o = 3;

        switch (tier) {
            case 'balanced':
                under_range = [0, 1, 2, 3, 4];
                over_range = [5, 6, 7, 8, 9];
                prediction_u = 6;
                prediction_o = 3;
                break;
            case 'aggressive':
                under_range = [0, 1, 2, 3, 4, 5, 6];
                over_range = [3, 4, 5, 6, 7, 8, 9];
                prediction_u = 7;
                prediction_o = 2;
                break;
            case 'pro':
                under_range = [0, 1, 2, 3, 4, 5, 6, 7];
                over_range = [2, 3, 4, 5, 6, 7, 8, 9];
                prediction_u = 8;
                prediction_o = 1;
                break;
            case 'extreme':
                under_range = [0, 1, 2, 3, 4, 5, 6, 7, 8];
                over_range = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                prediction_u = 9;
                prediction_o = 0;
                break;
        }

        const u_count = window.filter(d => under_range.includes(d)).length;
        const o_count = window.filter(d => over_range.includes(d)).length;

        const u_power = (u_count / 15) * 100;
        const o_power = (o_count / 15) * 100;

        // Calculate highest percentage digit in each pool
        const getTopDigit = (range: number[]) => {
            const range_counts = range.map(d => ({
                digit: d,
                count: window.filter(x => x === d).length,
            }));
            const top = range_counts.sort((a, b) => b.count - a.count)[0];
            return top;
        };

        const u_top = getTopDigit(under_range);
        const o_top = getTopDigit(over_range);

        return {
            under: {
                power: u_power,
                prediction: prediction_u,
                top_digit: u_top.digit,
                top_digit_pct: (u_top.count / 15) * 100,
            },
            over: {
                power: o_power,
                prediction: prediction_o,
                top_digit: o_top.digit,
                top_digit_pct: (o_top.count / 15) * 100,
            },
            timestamp: Date.now(),
        };
    }

    /**
     * Finds the Most, 2nd Most, and Least digits.
     */
    getRankedDigits() {
        const counts = Array(10).fill(0);
        this.ticks.forEach(d => counts[d]++);
        const ranked = counts.map((count, digit) => ({ digit, count })).sort((a, b) => b.count - a.count);

        return {
            most: ranked[0].digit,
            second_most: ranked[1].digit,
            least: ranked[9].digit,
        };
    }

    /**
     * Even/Odd Strategic Analysis
     * Implements the 4 core conditions requested for the Nexus EO system.
     */
    getEOStrategicSignal(targetSide: 'EVEN' | 'ODD') {
        const window_15 = this.ticks.slice(-15);
        if (window_15.length < 15) return null;

        const ranks = this.getRankedDigits();
        const last_tick = window_15[window_15.length - 1];
        const prev_tick = window_15[window_15.length - 2];
        const prev_prev_tick = window_15[window_15.length - 3];

        const sideOf = (d: number) => (d % 2 === 0 ? 'EVEN' : 'ODD');
        const elite = [ranks.most, ranks.second_most, ranks.least];

        // Condition 1: Rank Alignment
        const c1 =
            sideOf(ranks.most) === targetSide &&
            sideOf(ranks.second_most) === targetSide &&
            sideOf(ranks.least) === targetSide;

        // Condition 2: The Bounce (Confirm return to target after opposition)
        const opposite = targetSide === 'EVEN' ? 'ODD' : 'EVEN';
        const c2 =
            sideOf(prev_prev_tick) === opposite && sideOf(prev_tick) === opposite && sideOf(last_tick) === targetSide;

        // Condition 3: Exhaustion Reversal
        const stats = this.getPercentages();
        const side_pct = targetSide === 'EVEN' ? stats.even : stats.odd;
        // Simplified trend: compare last 15 vs last 50
        const window_50 = this.ticks.slice(-50);
        const side_count_50 = window_50.filter(d => sideOf(d) === targetSide).length;
        const trend_decreasing = window_15.filter(d => sideOf(d) === targetSide).length / 15 < side_count_50 / 50;
        const c3 =
            side_pct > 60 && trend_decreasing && sideOf(last_tick) === targetSide && sideOf(prev_tick) === targetSide;

        // Condition 4: Elite Continuity
        const c4 = last_tick === prev_tick && elite.includes(last_tick);

        // Pattern Streaks
        const streak = (history: number[]) => {
            if (history.length === 0) return { count: 0, type: '' };
            const type = sideOf(history[history.length - 1]);
            let count = 0;
            for (let i = history.length - 1; i >= 0; i--) {
                if (sideOf(history[i]) === type) count++;
                else break;
            }
            return { count, type };
        };

        return {
            conditions: { c1, c2, c3, c4 },
            streak: streak(window_15),
            ranks,
            last_digit: last_tick,
            last_side: sideOf(last_tick),
            timestamp: Date.now(),
        };
    }
}
