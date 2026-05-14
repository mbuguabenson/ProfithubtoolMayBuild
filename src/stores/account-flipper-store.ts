import { action, makeObservable, observable, runInAction, computed } from 'mobx';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import RootStore from './root-store';

export type TThresholdKey = '3-6' | '2-7' | '1-8';

export interface ThresholdConfig {
    under: number[];
    over: number[];
    current: number[];
    name: string;
    multiplier: number;
}

export const THRESHOLDS: Record<TThresholdKey, ThresholdConfig> = {
    '3-6': {
        under: [0, 1, 2, 3],
        over: [6, 7, 8, 9],
        current: [4, 5],
        name: 'Over 3 / Under 6',
        multiplier: 2.6
    },
    '2-7': {
        under: [0, 1, 2],
        over: [7, 8, 9],
        current: [3, 4, 5, 6],
        name: 'Over 2 / Under 7',
        multiplier: 3.5
    },
    '1-8': {
        under: [0, 1],
        over: [8, 9],
        current: [2, 3, 4, 5, 6, 7],
        name: 'Over 1 / Under 8',
        multiplier: 5.0
    }
};

export interface ThresholdAnalysis {
    threshold: string;
    underPercent: number;
    overPercent: number;
    currentPercent: number;
    underCount: number;
    overCount: number;
    currentCount: number;
    strength: 'VERY STRONG' | 'STRONG' | 'MODERATE' | 'WEAK';
    confidence: number;
    expectedPayout: number;
}

export interface TransitionProbability {
    fromDigit: number;
    toDigit: number;
    probability: number;
    occurrences: number;
}

export interface RiskAssessment {
    volatility: number;
    trendStrength: number;
    confidence: number;
    overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    recommendation: string;
}

export interface EntryRecommendation {
    threshold: string;
    action: 'UNDER' | 'OVER' | 'WAIT';
    confidence: number;
    stake: number;
    expectedValue: number;
    reasoning: string[];
}

export default class AccountFlipperStore {
    root_store: RootStore;

    @observable accessor recent_digits: number[] = [];
    @observable accessor current_price: string | number = 0;
    @observable accessor selected_threshold_key: TThresholdKey = '3-6';
    @observable accessor timeframe: 50 | 100 | 200 = 100;
    @observable accessor base_stake: number = 0.35;
    @observable accessor symbol = 'R_100';

    private tick_subscription: any = null;

    constructor(root_store: RootStore) {
        makeObservable(this);
        this.root_store = root_store;
        this.init();
    }

    @action
    private init() {
        this.waitForApiAndConnect();
    }

    @action
    private waitForApiAndConnect = () => {
        const tryConnect = () => {
            if (api_base.api) {
                this.subscribeToTicks();
            } else {
                setTimeout(tryConnect, 1000);
            }
        };
        tryConnect();
    };

    @action
    private subscribeToTicks() {
        if (!api_base.api || this.tick_subscription) return;

        this.tick_subscription = api_base.api.onMessage().subscribe((msg: any) => {
            if (msg.msg_type === 'tick' && msg.tick.symbol === this.symbol) {
                const digit = parseInt(msg.tick.quote.toString().slice(-1));
                const price = msg.tick.quote;
                runInAction(() => {
                    this.current_price = price;
                    this.recent_digits = [...this.recent_digits, digit].slice(-200);
                });
            }
        });

        // Initial historical data
        api_base.api.send({
            ticks_history: this.symbol,
            adjust_start_time: 1,
            count: 200,
            end: 'latest',
            start: 1,
            style: 'ticks',
        }).then((res: any) => {
            if (res.history) {
                const digits = res.history.prices.map((p: any) => parseInt(p.toString().slice(-1)));
                runInAction(() => {
                    this.recent_digits = digits;
                });
            }
        }).catch((err: any) => {
            console.error('[AccountFlipper] Failed to fetch history:', err);
        });
    }

    @action
    setSymbol(sym: string) {
        if (this.symbol === sym) return;
        this.symbol = sym;
        this.recent_digits = [];
        this.current_price = 0;
        if (this.tick_subscription) {
            this.tick_subscription.unsubscribe();
            this.tick_subscription = null;
        }
        this.subscribeToTicks();
    }

    @computed
    get current_digit(): number {
        return this.recent_digits.length > 0 ? this.recent_digits[this.recent_digits.length - 1] : 0;
    }

    @computed
    get all_analyses(): ThresholdAnalysis[] {
        return Object.keys(THRESHOLDS).map(key => 
            this.analyzeThreshold(this.recent_digits.slice(-this.timeframe), THRESHOLDS[key as TThresholdKey])
        );
    }

    @computed
    get correlation_matrix(): number[][] {
        const digits = this.recent_digits.slice(-this.timeframe);
        const matrix: number[][] = Array(10).fill(null).map(() => Array(10).fill(0));
        const counts: number[][] = Array(10).fill(null).map(() => Array(10).fill(0));
        
        if (digits.length < 2) return matrix;

        for (let i = 0; i < digits.length - 1; i++) {
            const current = digits[i];
            const next = digits[i + 1];
            counts[current][next]++;
        }
        
        for (let i = 0; i < 10; i++) {
            const totalTransitions = counts[i].reduce((sum, count) => sum + count, 0);
            for (let j = 0; j < 10; j++) {
                if (totalTransitions > 0) {
                    matrix[i][j] = (counts[i][j] / totalTransitions) * 100;
                }
            }
        }
        return matrix;
    }

    @computed
    get transition_probabilities(): TransitionProbability[] {
        const digits = this.recent_digits.slice(-this.timeframe);
        const fromDigit = this.current_digit;
        const transitions: { [key: number]: number } = {};
        let totalFromDigit = 0;
        
        for (let i = 0; i < digits.length - 1; i++) {
            if (digits[i] === fromDigit) {
                totalFromDigit++;
                const nextDigit = digits[i + 1];
                transitions[nextDigit] = (transitions[nextDigit] || 0) + 1;
            }
        }
        
        return Object.entries(transitions)
            .map(([toDigit, count]) => ({
                fromDigit,
                toDigit: parseInt(toDigit),
                probability: (count / totalFromDigit) * 100,
                occurrences: count
            }))
            .sort((a, b) => b.probability - a.probability);
    }

    @computed
    get risk_assessment(): RiskAssessment {
        const analyses = this.all_analyses;
        const digits = this.recent_digits;
        
        if (digits.length < 50) {
            return { volatility: 0, trendStrength: 0, confidence: 0, overallRisk: 'MEDIUM', recommendation: 'Awaiting data...' };
        }

        const percentages = analyses.flatMap(a => [a.underPercent, a.overPercent]);
        const mean = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
        const variance = percentages.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / percentages.length;
        const volatility = Math.sqrt(variance) * 2;
        
        const short = this.analyzeThreshold(digits.slice(-50), THRESHOLDS[this.selected_threshold_key]);
        const medium = this.analyzeThreshold(digits.slice(-100), THRESHOLDS[this.selected_threshold_key]);
        const long = this.analyzeThreshold(digits, THRESHOLDS[this.selected_threshold_key]);
        
        const trendConsistency = 100 - Math.abs(short.underPercent - medium.underPercent) - 
                                        Math.abs(medium.underPercent - long.underPercent);
        const trendStrength = Math.max(0, trendConsistency);
        
        const avgConfidence = analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length;
        const riskScore = (volatility * 0.4) + ((100 - trendStrength) * 0.3) + ((100 - avgConfidence) * 0.3);
        
        const overallRisk = riskScore < 30 ? 'LOW' : riskScore < 60 ? 'MEDIUM' : 'HIGH';
        const recommendation = overallRisk === 'LOW' ? 'Safe to trade with recommended stakes' :
                               overallRisk === 'MEDIUM' ? 'Trade with caution, reduce stakes' :
                               'High risk - avoid trading or use minimum stakes';
        
        return {
            volatility: Math.min(volatility, 100),
            trendStrength,
            confidence: avgConfidence,
            overallRisk,
            recommendation
        };
    }

    @computed
    get entry_recommendations(): EntryRecommendation[] {
        const analyses = this.all_analyses;
        const risk = this.risk_assessment;
        
        return analyses.map(analysis => {
            const dominant = analysis.underPercent > analysis.overPercent ? 'UNDER' :
                             analysis.overPercent > analysis.underPercent ? 'OVER' : null;
            
            const dominanceMargin = Math.abs(analysis.underPercent - analysis.overPercent);
            const shouldEnter = dominant !== null && dominanceMargin >= 10 && analysis.confidence >= 60 && 
                                analysis.expectedPayout > 0 && risk.overallRisk !== 'HIGH';
            
            const confidenceMultiplier = analysis.confidence / 100;
            const riskMultiplier = risk.overallRisk === 'LOW' ? 1 : 0.5;
            const adjustedStake = this.base_stake * confidenceMultiplier * riskMultiplier;
            
            const reasoning = [
                `${dominant} has ${dominanceMargin.toFixed(1)}% advantage`,
                `Confidence: ${analysis.confidence.toFixed(0)}%`,
                `Expected value: ${analysis.expectedPayout.toFixed(2)}`,
                `Risk level: ${risk.overallRisk}`
            ];
            
            return {
                threshold: analysis.threshold,
                action: shouldEnter ? (dominant as 'UNDER' | 'OVER') : 'WAIT',
                confidence: analysis.confidence,
                stake: shouldEnter ? adjustedStake : 0,
                expectedValue: analysis.expectedPayout,
                reasoning
            };
        });
    }

    private analyzeThreshold(digits: number[], config: ThresholdConfig): ThresholdAnalysis {
        const total = digits.length || 1;
        const underCount = digits.filter(d => config.under.includes(d)).length;
        const overCount = digits.filter(d => config.over.includes(d)).length;
        const currentCount = digits.filter(d => config.current.includes(d)).length;
        
        const underPercent = (underCount / total) * 100;
        const overPercent = (overCount / total) * 100;
        const currentPercent = (currentCount / total) * 100;
        
        const expectedPercent = (config.under.length / 10) * 100;
        const maxPercent = Math.max(underPercent, overPercent);
        const deviation = Math.abs(maxPercent - expectedPercent);
        
        const strength = deviation >= 15 ? 'VERY STRONG' : deviation >= 10 ? 'STRONG' :
                         deviation >= 5 ? 'MODERATE' : 'WEAK';
        
        const sampleSizeConfidence = Math.min(total / 200, 1) * 100;
        const strengthConfidence = deviation * 5;
        const confidence = (sampleSizeConfidence * 0.4) + (strengthConfidence * 0.6);
        
        const winProbability = maxPercent / 100;
        const expectedPayout = (winProbability * config.multiplier) - ((1 - winProbability) * 1);
        
        return {
            threshold: config.name,
            underPercent,
            overPercent,
            currentPercent,
            underCount,
            overCount,
            currentCount,
            strength,
            confidence: Math.min(confidence, 100),
            expectedPayout
        };
    }

    @action
    setThreshold(key: TThresholdKey) {
        this.selected_threshold_key = key;
    }

    @action
    setTimeframe(tf: 50 | 100 | 200) {
        this.timeframe = tf;
    }

    @action
    setStake(stake: number) {
        this.base_stake = stake;
    }
}
