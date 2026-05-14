// AI Prediction Engine for Deriv Last Digit Analysis
// Implements Neural Pattern Recognition, Multi-Step Prediction, Anomaly Detection, and Backtesting

export interface Pattern {
    sequence: number[];
    frequency: number;
    confidence: number;
    lastSeen: number;
    successRate: number;
}

export interface MultiStepPrediction {
    step: number;
    digit: number;
    probability: number;
    confidence: 'very_high' | 'high' | 'medium' | 'low';
    method: string;
}

export interface Anomaly {
    type: 'frequency' | 'volatility' | 'pattern' | 'distribution';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedDigits: number[];
    recommendation: string;
}

export interface BacktestResult {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    truePositives: number;
    falsePositives: number;
    trueNegatives: number;
    falseNegatives: number;
    profitLoss: number;
}

/**
 * Neural Pattern Recognizer
 * Analyzes sequences of digits to detect patterns and predict next digits
 */
export class NeuralPatternRecognizer {
    private patterns: Map<string, Pattern> = new Map();
    private windowSizes = [2, 3, 4, 5]; // Analyze sequences of different lengths

    /**
     * Train on historical data
     */
    train(digits: number[]): void {
        this.windowSizes.forEach(windowSize => {
            for (let i = 0; i <= digits.length - windowSize; i++) {
                const sequence = digits.slice(i, i + windowSize);
                const key = sequence.join(',');

                const existing = this.patterns.get(key);
                if (existing) {
                    existing.frequency++;
                    existing.lastSeen = i;
                } else {
                    this.patterns.set(key, {
                        sequence,
                        frequency: 1,
                        confidence: 0,
                        lastSeen: i,
                        successRate: 0,
                    });
                }
            }
        });

        // Calculate confidence scores
        this.patterns.forEach(pattern => {
            // Temporal decay: recent patterns weighted higher
            const recency = (pattern.lastSeen / digits.length) * 100;
            const frequency = (pattern.frequency / digits.length) * 1000;
            pattern.confidence = frequency * 0.6 + recency * 0.4;
        });
    }

    /**
     * Detect patterns in recent data
     */
    detectPatterns(recentDigits: number[], minConfidence: number = 60): Pattern[] {
        const detected: Pattern[] = [];

        this.windowSizes.forEach(windowSize => {
            if (recentDigits.length < windowSize) return;

            const recentSequence = recentDigits.slice(-windowSize);
            const key = recentSequence.join(',');
            const pattern = this.patterns.get(key);

            if (pattern && pattern.confidence >= minConfidence) {
                detected.push(pattern);
            }
        });

        return detected.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Predict next digit based on patterns
     */
    predictNext(recentDigits: number[]): Map<number, number> {
        const predictions = new Map<number, number>();

        // Check all learned patterns
        this.patterns.forEach(pattern => {
            const seqLength = pattern.sequence.length;
            if (recentDigits.length < seqLength - 1) return;

            // Check if current digits match pattern prefix
            const recent = recentDigits.slice(-(seqLength - 1));
            const patternPrefix = pattern.sequence.slice(0, -1);

            if (JSON.stringify(recent) === JSON.stringify(patternPrefix)) {
                const nextDigit = pattern.sequence[seqLength - 1];
                const weight = pattern.confidence;
                predictions.set(nextDigit, (predictions.get(nextDigit) || 0) + weight);
            }
        });

        return predictions;
    }
}

/**
 * Multi-Step Predictor
 * Predicts next N digits using ensemble methods
 */
export class MultiStepPredictor {
    private patternRecognizer: NeuralPatternRecognizer;
    private markovChain: number[][];

    constructor(historicalDigits: number[]) {
        this.patternRecognizer = new NeuralPatternRecognizer();
        this.patternRecognizer.train(historicalDigits);
        this.markovChain = this.buildEnhancedMarkov(historicalDigits);
    }

    /**
     * Build Markov chain with neural weighting
     */
    private buildEnhancedMarkov(digits: number[]): number[][] {
        const transitions = Array(10)
            .fill(0)
            .map(() => Array(10).fill(0));
        const neuralWeights = Array(10)
            .fill(0)
            .map(() => Array(10).fill(0));

        // Count transitions
        for (let i = 0; i < digits.length - 1; i++) {
            const from = digits[i];
            const to = digits[i + 1];

            // Apply temporal decay (recent transitions weighted more)
            const weight = Math.pow(0.99, digits.length - 1 - i);
            transitions[from][to] += weight;
            neuralWeights[from][to] += weight;
        }

        // Convert to probabilities with neural enhancement
        return transitions.map((row, from) => {
            const total = row.reduce((sum, count) => sum + count, 0);
            return row.map((count, to) => {
                const baseProb = total > 0 ? (count / total) * 100 : 0;
                const neuralBoost = neuralWeights[from][to] / 10;
                return Math.min(baseProb + neuralBoost, 100);
            });
        });
    }

    /**
     * Predict next N digits
     */
    predictNextN(recentDigits: number[], steps: number = 5): MultiStepPrediction[] {
        const predictions: MultiStepPrediction[] = [];
        const currentDigits = [...recentDigits];

        for (let step = 1; step <= steps; step++) {
            // Method 1: Pattern-based prediction
            const patternPreds = this.patternRecognizer.predictNext(currentDigits);

            // Method 2: Enhanced Markov chain
            const lastDigit = currentDigits[currentDigits.length - 1];
            const markovProbs = this.markovChain[lastDigit];

            // Method 3: Frequency analysis
            const freqAnalysis = this.analyzeFrequency(currentDigits);

            // Ensemble voting: combine all methods
            const ensemble = new Map<number, number>();
            for (let digit = 0; digit < 10; digit++) {
                const patternScore = patternPreds.get(digit) || 0;
                const markovScore = markovProbs[digit] || 0;
                const freqScore = freqAnalysis[digit] || 0;

                // Weighted combination
                const totalScore = patternScore * 0.5 + markovScore * 0.35 + freqScore * 0.15;

                ensemble.set(digit, totalScore);
            }

            // Get best prediction
            const sorted = Array.from(ensemble.entries()).sort((a, b) => b[1] - a[1]);

            const [predictedDigit, score] = sorted[0];

            // Determine confidence level
            let confidence: 'very_high' | 'high' | 'medium' | 'low';
            if (score >= 80) confidence = 'very_high';
            else if (score >= 65) confidence = 'high';
            else if (score >= 50) confidence = 'medium';
            else confidence = 'low';

            predictions.push({
                step,
                digit: predictedDigit,
                probability: score,
                confidence,
                method: 'Ensemble (Pattern + Markov + Frequency)',
            });

            // Add predicted digit to sequence for next iteration
            currentDigits.push(predictedDigit);

            // Confidence degrades with each step
            if (confidence === 'low' && step >= 3) break;
        }

        return predictions;
    }

    private analyzeFrequency(digits: number[]): number[] {
        const counts = new Array(10).fill(0);
        digits.forEach(d => counts[d]++);
        const total = digits.length;
        return counts.map(count => (count / total) * 100);
    }
}

/**
 * Anomaly Detector
 * Detects unusual patterns and market behavior
 */
export class AnomalyDetector {
    private baselineFrequency: number[] = new Array(10).fill(10);
    private baselineVolatility: number = 0;

    /**
     * Establish baseline from historical data
     */
    calibrate(historicalDigits: number[]): void {
        // Calculate baseline frequency
        const counts = new Array(10).fill(0);
        historicalDigits.forEach(d => counts[d]++);
        this.baselineFrequency = counts.map(c => (c / historicalDigits.length) * 100);

        // Calculate baseline volatility
        const stdDev = this.calculateStdDev(this.baselineFrequency, 10);
        this.baselineVolatility = stdDev;
    }

    /**
     * Detect anomalies in recent data
     */
    detect(recentDigits: number[]): Anomaly[] {
        const anomalies: Anomaly[] = [];

        // 1. Frequency Anomalies
        const currentFreq = this.analyzeFrequency(recentDigits);
        currentFreq.forEach((freq, digit) => {
            const baseline = this.baselineFrequency[digit];
            const deviation = Math.abs(freq - baseline);
            const percentChange = (deviation / baseline) * 100;

            if (percentChange > 50) {
                anomalies.push({
                    type: 'frequency',
                    severity: percentChange > 100 ? 'critical' : percentChange > 75 ? 'high' : 'medium',
                    description: `Digit ${digit} appearing ${percentChange.toFixed(0)}% ${
                        freq > baseline ? 'above' : 'below'
                    } normal rate`,
                    affectedDigits: [digit],
                    recommendation:
                        freq > baseline
                            ? `Consider differing from digit ${digit}`
                            : `Consider matching digit ${digit} (overdue)`,
                });
            }
        });

        // 2. Volatility Anomalies
        const currentVolatility = this.calculateStdDev(currentFreq, 10);
        const volatilityChange = Math.abs(currentVolatility - this.baselineVolatility);

        if (volatilityChange > this.baselineVolatility * 0.5) {
            anomalies.push({
                type: 'volatility',
                severity: volatilityChange > this.baselineVolatility ? 'high' : 'medium',
                description: `Market volatility ${
                    currentVolatility > this.baselineVolatility ? 'increased' : 'decreased'
                } by ${((volatilityChange / this.baselineVolatility) * 100).toFixed(0)}%`,
                affectedDigits: [],
                recommendation:
                    currentVolatility > this.baselineVolatility
                        ? 'Reduce stake size due to high volatility'
                        : 'Stable market conditions detected',
            });
        }

        // 3. Pattern Anomalies (unusual sequences)
        const patterns = this.detectUnusualPatterns(recentDigits);
        patterns.forEach(pattern => {
            anomalies.push({
                type: 'pattern',
                severity: 'medium',
                description: `Unusual pattern detected: ${pattern}`,
                affectedDigits: [],
                recommendation: 'Monitor for pattern continuation',
            });
        });

        // 4. Distribution Anomalies (skewed distribution)
        const uniformityScore = this.calculateUniformity(currentFreq);
        if (uniformityScore < 0.7) {
            const dominant = currentFreq.indexOf(Math.max(...currentFreq));
            anomalies.push({
                type: 'distribution',
                severity: uniformityScore < 0.5 ? 'high' : 'medium',
                description: `Non-uniform distribution detected (uniformity: ${(uniformityScore * 100).toFixed(0)}%)`,
                affectedDigits: [dominant],
                recommendation: `Digit ${dominant} is dominating - consider differing`,
            });
        }

        return anomalies.sort((a, b) => {
            const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            return severityOrder[b.severity] - severityOrder[a.severity];
        });
    }

    private analyzeFrequency(digits: number[]): number[] {
        const counts = new Array(10).fill(0);
        digits.forEach(d => counts[d]++);
        return counts.map(c => (c / digits.length) * 100);
    }

    private calculateStdDev(values: number[], mean: number): number {
        const squareDiffs = values.map(v => Math.pow(v - mean, 2));
        const avgSquareDiff = squareDiffs.reduce((sum, v) => sum + v, 0) / values.length;
        return Math.sqrt(avgSquareDiff);
    }

    private detectUnusualPatterns(digits: number[]): string[] {
        const patterns: string[] = [];

        // Check for long streaks (5+ same digit)
        let currentStreak = 1;
        for (let i = 1; i < digits.length; i++) {
            if (digits[i] === digits[i - 1]) {
                currentStreak++;
                if (currentStreak >= 5) {
                    patterns.push(`${currentStreak}x consecutive ${digits[i]}s`);
                }
            } else {
                currentStreak = 1;
            }
        }

        // Check for perfect alternation (ABABAB...)
        if (digits.length >= 6) {
            const last6 = digits.slice(-6);
            if (
                last6[0] === last6[2] &&
                last6[2] === last6[4] &&
                last6[1] === last6[3] &&
                last6[3] === last6[5] &&
                last6[0] !== last6[1]
            ) {
                patterns.push(`Perfect alternation: ${last6[0]}-${last6[1]}`);
            }
        }

        // Check for ascending/descending sequences
        if (digits.length >= 4) {
            const last4 = digits.slice(-4);
            const isAscending = last4.every((d, i) => i === 0 || d === last4[i - 1] + 1);
            const isDescending = last4.every((d, i) => i === 0 || d === last4[i - 1] - 1);

            if (isAscending) patterns.push(`Ascending sequence: ${last4.join('-')}`);
            if (isDescending) patterns.push(`Descending sequence: ${last4.join('-')}`);
        }

        return patterns;
    }

    private calculateUniformity(frequencies: number[]): number {
        const ideal = 10; // Perfect uniform distribution
        const deviations = frequencies.map(f => Math.abs(f - ideal));
        const avgDeviation = deviations.reduce((sum, d) => sum + d, 0) / 10;
        return Math.max(0, 1 - avgDeviation / ideal);
    }
}

/**
 * Backtesting Engine
 * Tests predictor accuracy on historical data
 */
export class BacktestingEngine {
    /**
     * Test predictor on historical data
     */
    backtest(
        predictor: MultiStepPredictor,
        testData: number[],
        strategy: 'match' | 'differ' = 'match'
    ): BacktestResult {
        let truePositives = 0;
        let falsePositives = 0;
        const trueNegatives = 0;
        const falseNegatives = 0;
        let profitLoss = 0;

        // Use sliding window to test predictions
        for (let i = 50; i < testData.length - 1; i++) {
            const historical = testData.slice(0, i);
            const actual = testData[i];

            // Get prediction
            const predictions = predictor.predictNextN(historical, 1);
            if (predictions.length === 0) continue;

            const predicted = predictions[0].digit;

            if (strategy === 'match') {
                // MATCH strategy
                if (predicted === actual) {
                    truePositives++;
                    profitLoss += 0.95; // 95% payout
                } else {
                    falsePositives++;
                    profitLoss -= 1.0; // Lost stake
                }
            } else {
                // DIFFER strategy
                if (predicted !== actual) {
                    truePositives++;
                    profitLoss += 0.9; // 90% payout for differs
                } else {
                    falsePositives++;
                    profitLoss -= 1.0;
                }
            }
        }

        // Calculate metrics
        const total = truePositives + falsePositives + trueNegatives + falseNegatives;
        const accuracy = ((truePositives + trueNegatives) / total) * 100;
        const precision = (truePositives / (truePositives + falsePositives)) * 100;
        const recall = (truePositives / (truePositives + falseNegatives)) * 100;
        const f1Score = (2 * precision * recall) / (precision + recall);

        return {
            accuracy,
            precision,
            recall,
            f1Score,
            truePositives,
            falsePositives,
            trueNegatives,
            falseNegatives,
            profitLoss,
        };
    }

    /**
     * Test multiple strategies and compare
     */
    compareStrategies(
        predictor: MultiStepPredictor,
        testData: number[]
    ): { strategy: string; result: BacktestResult }[] {
        return [
            { strategy: 'Match', result: this.backtest(predictor, testData, 'match') },
            { strategy: 'Differ', result: this.backtest(predictor, testData, 'differ') },
        ];
    }
}
