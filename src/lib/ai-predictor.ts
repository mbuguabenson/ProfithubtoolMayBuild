export interface Prediction {
    digit: number;
    probability: number;
}

export interface AIPredictionResult {
    predictions: Prediction[];
    topPrediction: { digit: number; confidence: number };
    secondPrediction: { digit: number; confidence: number };
    explanation: string;
}

class AIPredictor {
    private history: number[] = [];
    public maxTicks: number;

    constructor(maxTicks = 100) {
        this.maxTicks = maxTicks;
    }

    public addData(digit: number): void {
        this.history.push(digit);
        if (this.history.length > this.maxTicks) {
            this.history.shift();
        }
    }

    public predict(): AIPredictionResult | null {
        if (this.history.length < 20) return null;

        const frequencies = Array(10).fill(0);
        this.history.forEach(d => frequencies[d]++);

        const recent = this.history.slice(-10);
        const recentFreqs = Array(10).fill(0);
        recent.forEach(d => recentFreqs[d]++);

        // Transition probabilities (what usually follows the last digit)
        const lastDigit = this.history[this.history.length - 1];
        const transitions = Array(10).fill(0);
        let transitionTotal = 0;
        for (let i = 0; i < this.history.length - 1; i++) {
            if (this.history[i] === lastDigit) {
                transitions[this.history[i + 1]]++;
                transitionTotal++;
            }
        }

        // Calculate scores based on weights
        const scores = Array(10)
            .fill(0)
            .map((_, digit) => {
                // 1. Overall Frequency (30%)
                const freqScore = (frequencies[digit] / this.history.length) * 30;

                // 2. Recent Appearance (25%)
                const recentScore = (recentFreqs[digit] / recent.length) * 25;

                // 3. Pattern Continuation (20%)
                const transitionScore = transitionTotal > 0 ? (transitions[digit] / transitionTotal) * 20 : 2;

                // 4. Absence Penalty (15%) - Give slight boost to digits not seen in last 10
                const absenceScore = recentFreqs[digit] === 0 ? 8 : 2;

                // 5. Randomness (10%)
                const randomScore = Math.random() * 10;

                return freqScore + recentScore + transitionScore + absenceScore + randomScore;
            });

        const totalScore = scores.reduce((a, b) => a + b, 0);
        const predictions: Prediction[] = scores.map((score, digit) => ({
            digit,
            probability: (score / totalScore) * 100,
        }));

        const sorted = [...predictions].sort((a, b) => b.probability - a.probability);

        const top = sorted[0];
        const second = sorted[1];

        return {
            predictions: sorted,
            topPrediction: { digit: top.digit, confidence: Math.round(top.probability) },
            secondPrediction: { digit: second.digit, confidence: Math.round(second.probability) },
            explanation: `Model favors digit ${top.digit} at ${top.probability.toFixed(1)}% based on historical frequency and transition patterns after ${lastDigit}.`,
        };
    }
}

export default AIPredictor;
