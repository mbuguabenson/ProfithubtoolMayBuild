export interface PredictionResult {
    digit: number;
    probability: number;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string[];
}

export interface FrequencyData {
    digit: number;
    count: number;
    percentage: number;
    deviation: number;
}

export interface HotColdData {
    hot: FrequencyData[];
    cold: FrequencyData[];
}

export interface RiskMetrics {
    volatility: number;
    momentum: number;
    trendStrength: number;
    overallRisk: 'low' | 'medium' | 'high';
}

export interface TradingSignal {
    action: 'BUY' | 'HOLD' | 'AVOID';
    targetDigit: number;
    confidence: number;
    reasoning: string[];
    riskLevel: 'low' | 'medium' | 'high';
}

export interface Streak {
    digit: number;
    length: number;
    startIndex: number;
    isActive: boolean;
    momentum: number;
}

export interface GapAnalysis {
    digit: number;
    lastSeen: number;
    gap: number;
    overdueScore: number;
}

export class SmartPredictor {
    private digits: number[];

    constructor(digits: number[]) {
        this.digits = digits;
    }

    public predict(): PredictionResult[] {
        if (this.digits.length === 0) return [];

        const freqAnalysis = this.analyzeFrequency();
        const markovChain = this.buildMarkovChain();
        const lastDigit = this.digits[this.digits.length - 1];
        const markovPreds = this.predictNextDigit(lastDigit, markovChain);
        const streaks = this.detectStreaks();
        const gaps = this.analyzeGaps();
        const riskMetrics = this.assessRisk();

        const predictions: PredictionResult[] = [];

        for (let digit = 0; digit < 10; digit++) {
            const frequency = freqAnalysis.frequencies[digit].percentage;
            const markovProb = markovPreds.find(p => p.digit === digit)?.probability || 0;
            const activeStreak = streaks.find(s => s.digit === digit && s.isActive);
            const streakMomentum = activeStreak ? activeStreak.momentum : 0;
            const gapData = gaps.find(g => g.digit === digit);
            const gapOverdue = gapData?.overdueScore || 0;

            const confidence = this.calculateConfidence(digit, {
                frequency,
                markovProb,
                streakMomentum,
                gapOverdue,
                volatility: riskMetrics.volatility,
            });

            const reasoning: string[] = [];
            if (frequency > 12) reasoning.push(`High frequency (${frequency.toFixed(1)}%)`);
            if (markovProb > 15) reasoning.push(`Strong Markov probability (${markovProb.toFixed(1)}%)`);
            if (activeStreak) reasoning.push(`Active streak (${activeStreak.length} consecutive)`);
            if (gapOverdue > 80) reasoning.push(`Highly overdue (${gapData?.gap} ticks)`);
            if (riskMetrics.volatility < 30) reasoning.push('Low volatility environment');

            predictions.push({
                digit,
                probability: confidence.score,
                confidence: confidence.level,
                reasoning: reasoning.length > 0 ? reasoning : ['Standard distribution analysis'],
            });
        }

        return predictions.sort((a, b) => b.probability - a.probability).slice(0, 5);
    }

    public getHotCold(): HotColdData {
        const analysis = this.analyzeFrequency();
        return {
            hot: analysis.hot,
            cold: analysis.cold,
        };
    }

    public getRiskMetrics(): RiskMetrics {
        return this.assessRisk();
    }

    public getTradingSignal(): TradingSignal {
        const predictions = this.predict();
        if (predictions.length === 0) {
            return {
                action: 'HOLD',
                targetDigit: 0,
                confidence: 0,
                reasoning: ['No data available'],
                riskLevel: 'low',
            };
        }
        const topPrediction = predictions[0];
        const risk = this.getRiskMetrics();

        let action: 'BUY' | 'HOLD' | 'AVOID';
        if (topPrediction.confidence === 'high' && topPrediction.probability >= 70) {
            action = 'BUY';
        } else if (topPrediction.confidence === 'medium' || topPrediction.probability >= 50) {
            action = 'HOLD';
        } else {
            action = 'AVOID';
        }

        return {
            action,
            targetDigit: topPrediction.digit,
            confidence: topPrediction.probability,
            reasoning: topPrediction.reasoning,
            riskLevel: risk.overallRisk,
        };
    }

    private analyzeFrequency() {
        const counts = new Array(10).fill(0);
        this.digits.forEach(d => counts[d]++);

        const frequencies = counts.map((count, digit) => ({
            digit,
            count,
            percentage: (count / this.digits.length) * 100,
            deviation: Math.abs(count - this.digits.length / 10),
        }));

        const average = this.digits.length / 10;
        const stdDev = this.calculateStdDev(counts, average);

        const hot = frequencies.filter(f => f.count > average + stdDev);
        const cold = frequencies.filter(f => f.count < average - stdDev);

        return { frequencies, hot, cold, average, stdDev };
    }

    private buildMarkovChain(): number[][] {
        const transitions = Array(10)
            .fill(0)
            .map(() => Array(10).fill(0));
        for (let i = 0; i < this.digits.length - 1; i++) {
            const current = this.digits[i];
            const next = this.digits[i + 1];
            transitions[current][next]++;
        }

        return transitions.map(row => {
            const total = row.reduce((sum, count) => sum + count, 0);
            return row.map(count => (total > 0 ? (count / total) * 100 : 0));
        });
    }

    private predictNextDigit(lastDigit: number, markovChain: number[][]): { digit: number; probability: number }[] {
        const probabilities = markovChain[lastDigit] || new Array(10).fill(0);
        return probabilities.map((prob, digit) => ({ digit, probability: prob }));
    }

    private detectStreaks(): Streak[] {
        const streaks: Streak[] = [];
        let currentStreak: Streak | null = null;

        for (let i = 0; i < this.digits.length; i++) {
            const digit = this.digits[i];
            if (!currentStreak || currentStreak.digit !== digit) {
                if (currentStreak && currentStreak.length >= 2) streaks.push(currentStreak);
                currentStreak = {
                    digit,
                    length: 1,
                    startIndex: i,
                    isActive: i === this.digits.length - 1,
                    momentum: 0,
                };
            } else {
                currentStreak.length++;
                currentStreak.isActive = i === this.digits.length - 1;
            }
        }

        if (currentStreak && currentStreak.length >= 2) streaks.push(currentStreak);
        streaks.forEach(s => (s.momentum = s.length * (s.isActive ? 2 : 1)));
        return streaks.sort((a, b) => b.momentum - a.momentum);
    }

    private analyzeGaps(): GapAnalysis[] {
        const gaps: GapAnalysis[] = [];
        for (let digit = 0; digit < 10; digit++) {
            let lastSeen = -1;
            for (let i = this.digits.length - 1; i >= 0; i--) {
                if (this.digits[i] === digit) {
                    lastSeen = i;
                    break;
                }
            }
            const gap = lastSeen === -1 ? this.digits.length : this.digits.length - 1 - lastSeen;
            const expectedFreq = this.digits.length / 10;
            const overdueScore = gap > expectedFreq ? (gap / (expectedFreq || 1)) * 100 : 0;
            gaps.push({ digit, lastSeen, gap, overdueScore });
        }
        return gaps.sort((a, b) => b.overdueScore - a.overdueScore);
    }

    private assessRisk(): RiskMetrics {
        const frequencies = this.analyzeFrequency().frequencies;
        const freqValues = frequencies.map(f => f.percentage);
        const volatility = this.calculateStdDev(freqValues, 10) * 10;

        const recent20 = this.digits.slice(-20);
        const previous20 = this.digits.slice(-40, -20);

        const getSimpleFreq = (d: number[]) => {
            const c = new Array(10).fill(0);
            d.forEach(v => c[v]++);
            return c.map(v => (v / (d.length || 1)) * 100);
        };

        const recentFreq = getSimpleFreq(recent20);
        const prevFreq = getSimpleFreq(previous20);

        let totalChange = 0;
        for (let i = 0; i < 10; i++) totalChange += Math.abs(recentFreq[i] - prevFreq[i]);
        const momentum = (totalChange / 10) * 10;

        const streaks = this.detectStreaks();
        const maxStreak = Math.max(...streaks.map(s => s.length), 0);
        const trendStrength = Math.min(maxStreak * 20, 100);

        const overallScore = volatility * 0.4 + momentum * 0.35 + trendStrength * 0.25;
        let overallRisk: 'low' | 'medium' | 'high';
        if (overallScore < 40) overallRisk = 'low';
        else if (overallScore < 70) overallRisk = 'medium';
        else overallRisk = 'high';

        return {
            volatility: Math.round(volatility),
            momentum: Math.round(momentum),
            trendStrength: Math.round(trendStrength),
            overallRisk,
        };
    }

    private calculateConfidence(
        digit: number,
        factors: {
            frequency: number;
            markovProb: number;
            streakMomentum: number;
            gapOverdue: number;
            volatility: number;
        }
    ) {
        const weights = { frequency: 0.3, markovProb: 0.25, streakMomentum: 0.2, gapOverdue: 0.15, volatility: 0.1 };
        const normalized = {
            frequency: Math.min(factors.frequency * 10, 100),
            markovProb: factors.markovProb,
            streakMomentum: Math.min(factors.streakMomentum * 20, 100),
            gapOverdue: Math.min(factors.gapOverdue, 100),
            volatility: 100 - Math.min(factors.volatility, 100),
        };
        const score =
            normalized.frequency * weights.frequency +
            normalized.markovProb * weights.markovProb +
            normalized.streakMomentum * weights.streakMomentum +
            normalized.gapOverdue * weights.gapOverdue +
            normalized.volatility * weights.volatility;
        let level: 'high' | 'medium' | 'low';
        if (score >= 70) level = 'high';
        else if (score >= 50) level = 'medium';
        else level = 'low';
        return { score, level };
    }

    private calculateStdDev(values: number[], average: number): number {
        const squareDiffs = values.map(value => {
            const diff = value - average;
            return diff * diff;
        });
        const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / values.length;
        return Math.sqrt(avgSquareDiff);
    }
}
