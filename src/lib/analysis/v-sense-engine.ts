export interface VSenseSignal {
    market: string;
    strategy: 'DIFFERS' | 'EVEN_ODD' | 'OVER_UNDER';
    targetDigit?: number;
    targetSide?: 'EVEN' | 'ODD' | 'OVER' | 'UNDER';
    powerTrend: 'UP' | 'DOWN' | 'STABLE';
    stretch: 'CONFIRMED' | 'NONE';
    confidence: number;
    status: 'SAFE' | 'MODERATE' | 'AVOID';
    reasoning: string[];
}

export interface VSenseState {
    digits: number[];
    power: number[]; // 0-9
    momentum: number[]; // 0-9
    ranking: number[]; // digits sorted by priority
}

export class VSenseEngine {
    private ticks: number[];
    private market: string;

    constructor(ticks: number[], market: string) {
        this.ticks = ticks;
        this.market = market;
    }

    public analyze(): VSenseSignal[] {
        if (this.ticks.length < 30) return [];

        const state = this.calculateState();
        const signals: VSenseSignal[] = [];

        // MODULE A: DIFFERS
        const differs = this.analyzeDiffers(state);
        if (differs) signals.push(differs);

        // MODULE B: EVEN/ODD
        const evenOdd = this.analyzeEvenOdd(state);
        if (evenOdd) signals.push(evenOdd);

        // MODULE C: OVER/UNDER
        const overUnder = this.analyzeOverUnder(state);
        if (overUnder) signals.push(overUnder);

        return signals;
    }

    private calculateState(): VSenseState {
        const total = this.ticks.length;
        const counts = new Array(10).fill(0);
        this.ticks.forEach(d => counts[d]++);

        const power = counts.map(c => (c / total) * 100);

        // Momentum calculation (last 15 vs previous)
        const recentWindow = this.ticks.slice(-15);
        const prevWindow = this.ticks.slice(-45, -15);

        const recentCounts = new Array(10).fill(0);
        recentWindow.forEach(d => recentCounts[d]++);
        const recentPower = recentCounts.map(c => (c / (recentWindow.length || 1)) * 100);

        const prevCounts = new Array(10).fill(0);
        prevWindow.forEach(d => prevCounts[d]++);
        const prevPower = prevCounts.map(c => (c / (prevWindow.length || 1)) * 100);

        const momentum = recentPower.map((rp, i) => rp - prevPower[i]);

        // Ranking: Digit Power + Momentum Weight
        const ranking = [...Array(10).keys()].sort((a, b) => {
            const scoreA = power[a] + momentum[a] * 0.5;
            const scoreB = power[b] + momentum[b] * 0.5;
            return scoreB - scoreA;
        });

        return { digits: this.ticks, power, momentum, ranking };
    }

    private analyzeDiffers(state: VSenseState): VSenseSignal | null {
        // D in {2,3,4,5,6,7}, Power decreasing, Rank 4-7
        const targets = [2, 3, 4, 5, 6, 7].filter(d => {
            const rank = state.ranking.indexOf(d);
            return state.momentum[d] < 0 && rank >= 3 && rank <= 6;
        });

        if (targets.length === 0) return null;

        const target = targets[0];
        const highestPowerIncreasing = state.momentum[state.ranking[0]] > 0;
        const leastPowerIncreasing = state.momentum[state.ranking[9]] > 0;
        const stretch = highestPowerIncreasing || leastPowerIncreasing;

        let score = 15; // Base score for ticks
        if (state.power[target] < 10) score += 20;
        if (state.momentum[target] < 0) score += 20;
        if (stretch) score += 25;
        if (state.ranking.indexOf(target) >= 4) score += 20;

        return {
            market: this.market,
            strategy: 'DIFFERS',
            targetDigit: target,
            powerTrend: state.momentum[target] < 0 ? 'DOWN' : 'UP',
            stretch: stretch ? 'CONFIRMED' : 'NONE',
            confidence: score,
            status: score >= 75 ? 'SAFE' : score >= 60 ? 'MODERATE' : 'AVOID',
            reasoning: [
                `Target digit ${target} shows distribution stretch`,
                state.momentum[target] < 0 ? 'Power is decreasing as expected' : 'Power stabilizing',
                stretch ? 'Market expansion confirmed' : 'Normal distribution',
            ],
        };
    }

    private analyzeEvenOdd(state: VSenseState): VSenseSignal | null {
        const evens = state.digits.filter(d => d % 2 === 0).length;
        const total = state.digits.length;
        const evenPower = (evens / total) * 100;
        const oddPower = 100 - evenPower;

        const dominant = evenPower >= 55 ? 'EVEN' : oddPower >= 55 ? 'ODD' : null;
        if (!dominant) return null;

        // Trade the reversion (e.g. if EVEN is dominant, trade ODD)
        const sideToTrade = dominant === 'EVEN' ? 'ODD' : 'EVEN';
        const recent5 = state.digits.slice(-5);
        const appearsTwice = recent5.filter(d => (sideToTrade === 'EVEN' ? d % 2 === 0 : d % 2 !== 0)).length >= 2;

        let score = 15;
        if (dominant === 'EVEN' ? evenPower >= 55 : oddPower >= 55) score += 20;
        if (appearsTwice) score += 25;
        // Check if dominant power is increasing
        const recent10 =
            state.digits.slice(-10).filter(d => (dominant === 'EVEN' ? d % 2 === 0 : d % 2 !== 0)).length / 10;
        const prev10 =
            state.digits.slice(-20, -10).filter(d => (dominant === 'EVEN' ? d % 2 === 0 : d % 2 !== 0)).length / 10;
        if (recent10 > prev10) score += 20;
        if (appearsTwice) score += 20;

        return {
            market: this.market,
            strategy: 'EVEN_ODD',
            targetSide: sideToTrade,
            powerTrend: 'UP',
            stretch: 'NONE',
            confidence: score,
            status: score >= 75 ? 'SAFE' : score >= 60 ? 'MODERATE' : 'AVOID',
            reasoning: [
                `${dominant} dominance detected (${(dominant === 'EVEN' ? evenPower : oddPower).toFixed(1)}%)`,
                `Mean-reversion potential for ${sideToTrade}`,
                appearsTwice ? `Frequency start for ${sideToTrade} detected` : 'Waiting for compression',
            ],
        };
    }

    private analyzeOverUnder(state: VSenseState): VSenseSignal | null {
        const unders = state.digits.filter(d => d <= 4).length;
        const total = state.digits.length;
        const underPower = (unders / total) * 100;
        const overPower = 100 - underPower;

        const dominant = underPower >= 55 ? 'UNDER' : overPower >= 55 ? 'OVER' : null;
        if (!dominant) return null;

        const sideToTrade = dominant === 'UNDER' ? 'OVER' : 'UNDER';
        const recent6 = state.digits.slice(-6);
        const appearsTwice = recent6.filter(d => (sideToTrade === 'UNDER' ? d <= 4 : d >= 5)).length >= 2;

        let score = 15;
        if (dominant === 'UNDER' ? underPower >= 55 : overPower >= 55) score += 20;
        if (appearsTwice) score += 25;

        const recent10 = state.digits.slice(-10).filter(d => (dominant === 'UNDER' ? d <= 4 : d >= 5)).length / 10;
        const prev10 = state.digits.slice(-20, -10).filter(d => (dominant === 'UNDER' ? d <= 4 : d >= 5)).length / 10;
        if (recent10 > prev10) score += 20;
        if (appearsTwice) score += 20;

        return {
            market: this.market,
            strategy: 'OVER_UNDER',
            targetSide: sideToTrade,
            powerTrend: 'UP',
            stretch: 'NONE',
            confidence: score,
            status: score >= 75 ? 'SAFE' : score >= 60 ? 'MODERATE' : 'AVOID',
            reasoning: [
                `${dominant} range dominance (${(dominant === 'UNDER' ? underPower : overPower).toFixed(1)}%)`,
                `${sideToTrade} suppression detected`,
                appearsTwice ? `Reversion trigger active` : 'Waiting for range shift',
            ],
        };
    }
}
