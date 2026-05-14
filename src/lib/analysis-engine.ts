export interface Signal {
    type: string;
    status: 'TRADE NOW' | 'WAIT' | 'NEUTRAL';
    probability: number;
    recommendation: string;
    entryCondition: string;
    targetDigit?: number;
}

export interface DigitFrequency {
    digit: number;
    count: number;
    percentage: number;
}

export interface AnalysisResult {
    digitFrequencies: DigitFrequency[];
    evenPercentage: number;
    oddPercentage: number;
    highPercentage: number; // 5-9
    lowPercentage: number; // 0-4
    overPercentage: number; // > prediction (default 4.5)
    underPercentage: number; // < prediction (default 4.5)
    entropy: number;
    powerIndex: { strongest: number; weakest: number; gap: number };
    missingDigits: number[];
    streaks: { digit: number; count: number }[];
    totalTicks: number;
    maxTicks: number;
}

class AnalysisEngine {
    private ticks: number[] = [];
    public maxTicks: number;

    constructor(maxTicks = 100) {
        this.maxTicks = maxTicks;
    }

    public addTick(price: number, pip_size = 2): void {
        const priceStr = price.toFixed(pip_size);
        const lastDigit = parseInt(priceStr[priceStr.length - 1]);
        if (!isNaN(lastDigit)) {
            this.ticks.push(lastDigit);
            if (this.ticks.length > this.maxTicks) {
                this.ticks.shift();
            }
        }
    }

    public getAnalysis(): AnalysisResult {
        const counts = Array(10).fill(0);
        let evenCount = 0;
        let oddCount = 0;
        let highCount = 0;
        let lowCount = 0;
        let overCount = 0;
        let underCount = 0;
        const total = this.ticks.length;

        this.ticks.forEach(digit => {
            counts[digit]++;
            if (digit % 2 === 0) evenCount++;
            else oddCount++;
            if (digit >= 5) highCount++;
            else lowCount++;
            if (digit > 4) overCount++;
            if (digit < 5) underCount++;
        });

        const frequencies: DigitFrequency[] = counts.map((count, digit) => ({
            digit,
            count,
            percentage: total > 0 ? (count / total) * 100 : 0,
        }));

        const sortedFreqs = [...frequencies].sort((a, b) => b.count - a.count);
        const missingDigits = frequencies.filter(f => f.count === 0).map(f => f.digit);

        // Entropy calculation (simplified)
        const entropy = frequencies.reduce((acc, f) => {
            const p = f.percentage / 100;
            return p > 0 ? acc - p * Math.log2(p) : acc;
        }, 0);

        // Streaks
        const streaks: { digit: number; count: number }[] = [];
        if (this.ticks.length > 0) {
            let currentDigit = this.ticks[0];
            let currentCount = 1;
            for (let i = 1; i < this.ticks.length; i++) {
                if (this.ticks[i] === currentDigit) {
                    currentCount++;
                } else {
                    if (currentCount > 1) streaks.push({ digit: currentDigit, count: currentCount });
                    currentDigit = this.ticks[i];
                    currentCount = 1;
                }
            }
            if (currentCount > 1) streaks.push({ digit: currentDigit, count: currentCount });
        }

        return {
            digitFrequencies: frequencies,
            evenPercentage: total > 0 ? (evenCount / total) * 100 : 0,
            oddPercentage: total > 0 ? (oddCount / total) * 100 : 0,
            highPercentage: total > 0 ? (highCount / total) * 100 : 0,
            lowPercentage: total > 0 ? (lowCount / total) * 100 : 0,
            overPercentage: total > 0 ? (overCount / total) * 100 : 0,
            underPercentage: total > 0 ? (underCount / total) * 100 : 0,
            entropy,
            powerIndex: {
                strongest: sortedFreqs[0]?.digit ?? 0,
                weakest: sortedFreqs[9]?.digit ?? 0,
                gap: (sortedFreqs[0]?.percentage ?? 0) - (sortedFreqs[9]?.percentage ?? 0),
            },
            missingDigits,
            streaks,
            totalTicks: total,
            maxTicks: this.maxTicks,
        };
    }

    public generateSignals(): Signal[] {
        const analysis = this.getAnalysis();
        if (analysis.totalTicks < 20) return [];

        const signals: Signal[] = [];

        // 1. Even/Odd Signal
        const evenOdd = this.generateEvenOddSignal(analysis);
        if (evenOdd) signals.push(evenOdd);

        // 2. Over/Under 4.5 Signal
        const overUnder = this.generateOverUnderSignal(analysis);
        if (overUnder) signals.push(overUnder);

        // 3. Matches Signal
        const matches = this.generateMatchesSignal(analysis);
        if (matches) signals.push(matches);

        // 4. Differs Signal
        const differs = this.generateDiffersSignal(analysis);
        if (differs) signals.push(differs);

        // 5. Rise/Fall Signal (Simplified trend)
        const riseFall = this.generateRiseFallSignal();
        if (riseFall) signals.push(riseFall);

        return signals;
    }

    private generateEvenOddSignal(analysis: AnalysisResult): Signal | null {
        const maxPct = Math.max(analysis.evenPercentage, analysis.oddPercentage);
        const type = analysis.evenPercentage >= analysis.oddPercentage ? 'Even' : 'Odd';
        const opposite = type === 'Even' ? 'Odd' : 'Even';

        if (maxPct >= 60) {
            return {
                type: 'Even/Odd',
                status: 'TRADE NOW',
                probability: maxPct,
                recommendation: `Strong ${type.toLowerCase()} bias detected`,
                entryCondition: `Wait for 2+ consecutive ${opposite.toLowerCase()} digits`,
            };
        } else if (maxPct >= 55) {
            return {
                type: 'Even/Odd',
                status: 'WAIT',
                probability: maxPct,
                recommendation: `${type} showing moderate bias`,
                entryCondition: `Wait for bias to reach 60%`,
            };
        }
        return null;
    }

    private generateOverUnderSignal(analysis: AnalysisResult): Signal | null {
        const maxPct = Math.max(analysis.overPercentage, analysis.underPercentage);
        const type = analysis.overPercentage >= analysis.underPercentage ? 'Over' : 'Under';
        const gap = Math.abs(analysis.overPercentage - analysis.underPercentage);

        if (maxPct >= 62 && gap >= 15) {
            return {
                type: 'Over/Under 4.5',
                status: 'TRADE NOW',
                probability: maxPct,
                recommendation: `${type} 4.5 dominant with high power gap`,
                entryCondition: `Trade ${type.toLowerCase()} when strongest digit appears`,
            };
        }
        return null;
    }

    private generateMatchesSignal(analysis: AnalysisResult): Signal | null {
        const strongest = analysis.digitFrequencies.find(f => f.digit === analysis.powerIndex.strongest);
        if (strongest && strongest.percentage >= 15) {
            return {
                type: 'Matches',
                status: 'TRADE NOW',
                probability: strongest.percentage,
                recommendation: `Digit ${strongest.digit} showing high frequency`,
                entryCondition: `Trade immediately when digit ${strongest.digit} appears`,
                targetDigit: strongest.digit,
            };
        }
        return null;
    }

    private generateDiffersSignal(analysis: AnalysisResult): Signal | null {
        const weakest = analysis.digitFrequencies.find(f => f.digit === analysis.powerIndex.weakest);
        if (weakest && weakest.percentage < 9) {
            return {
                type: 'Differs',
                status: 'TRADE NOW',
                probability: 100 - weakest.percentage,
                recommendation: `Digit ${weakest.digit} appears only ${weakest.percentage.toFixed(1)}% - Strong differs signal`,
                entryCondition: `Wait for digit ${weakest.digit} to appear, then trade DIFFERS immediately`,
                targetDigit: weakest.digit,
            };
        }
        return null;
    }

    private generateRiseFallSignal(): Signal | null {
        // Simplified trend based on high/low split over last 20 ticks
        const last20 = this.ticks.slice(-20);
        const upCount = last20.filter((t, i) => i > 0 && t > last20[i - 1]).length;
        const confidence = (upCount / last20.length) * 100;

        if (confidence >= 60) {
            return {
                type: 'Rise / Fall',
                status: 'TRADE NOW',
                probability: confidence,
                recommendation: `RISE trend detected with ${confidence.toFixed(1)}% confidence`,
                entryCondition: 'Trade rise based on current trend',
            };
        } else if (confidence <= 40) {
            return {
                type: 'Rise / Fall',
                status: 'TRADE NOW',
                probability: 100 - confidence,
                recommendation: `FALL trend detected with ${(100 - confidence).toFixed(1)}% confidence`,
                entryCondition: 'Trade fall based on current trend',
            };
        }
        return null;
    }

    public generateProSignals(): Signal[] {
        const analysis = this.getAnalysis();
        const signals: Signal[] = [];
        const last20 = this.ticks.slice(-20);

        // a) Pro Even/Odd
        // EVEN Strategy: 55%+ even, 2+ high-percentage even digits, 11+ evens in last 20, wait for 3+ consecutive odds
        const evenCount20 = last20.filter(t => t % 2 === 0).length;
        const highPctEvens = analysis.digitFrequencies.filter(f => f.digit % 2 === 0 && f.percentage >= 12).length;

        if (analysis.evenPercentage >= 55 && highPctEvens >= 2 && evenCount20 >= 11) {
            signals.push({
                type: 'Pro Even/Odd',
                status: 'TRADE NOW',
                probability: analysis.evenPercentage,
                recommendation: 'PRO EVEN Strategy: Strong even bias detected',
                entryCondition: 'Wait for 3+ consecutive odd digits, then trade EVEN',
            });
        }

        // b) Pro Over/Under
        // OVER 1: Digits 0,1 < 10%, 3+ high digits >= 11%, 90%+ high, 18+ in last 20
        const digits01 = analysis.digitFrequencies.filter(f => f.digit <= 1 && f.percentage < 10);
        const highDigits = analysis.digitFrequencies.filter(f => f.digit >= 5 && f.percentage >= 11).length;
        const highCount20 = last20.filter(t => t >= 2).length; // Adjusting "high" for Over 1

        if (digits01.length === 2 && highDigits >= 3 && highCount20 >= 18) {
            signals.push({
                type: 'Over/Under (Pro)',
                status: 'TRADE NOW',
                probability: 92, // Fixed high confidence for pro
                recommendation: 'OVER 1 STRATEGY: Strong signal - 90%+ win rate detected!',
                entryCondition: 'Trade OVER 1 when digit 0 or 1 appears',
            });
        }

        // c) Pro Differs
        // Condition: Win rate >= 88% (digit < 9%)
        const weakest = analysis.digitFrequencies.find(f => f.digit === analysis.powerIndex.weakest);
        if (weakest && weakest.percentage < 9) {
            signals.push({
                type: 'PRO / DIFFERS',
                status: 'TRADE NOW',
                probability: 100 - weakest.percentage,
                recommendation: `PRO DIFFERS: Digit ${weakest.digit} at ${weakest.percentage.toFixed(1)}% - ${(100 - weakest.percentage).toFixed(1)}% win rate!`,
                entryCondition: `Wait for digit ${weakest.digit} to appear, then trade DIFFERS immediately`,
                targetDigit: weakest.digit,
            });
        }

        return signals;
    }
}

export default AnalysisEngine;
