import { useEffect, useMemo } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import QuickSettings from './quick-settings';
import './matches-tab.scss';

// Shared interfaces
interface DigitFrequency {
    digit: number;
    count: number;
    percentage: number;
    gap: number;
    momentum: number;
}

interface MatchProbability {
    digit: number;
    probability: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    factors: {
        frequency: number;
        momentum: number;
        gap: number;
        streak: number;
    };
}

// Shared utility: Analyze frequency
const analyzeFrequency = (digits: number[]): DigitFrequency[] => {
    const counts = new Array(10).fill(0);
    const lastSeen = new Array(10).fill(-1);
    const recent20 = digits.slice(-20);
    const recentCounts = new Array(10).fill(0);

    digits.forEach((d, i) => {
        counts[d]++;
        lastSeen[d] = i;
    });

    recent20.forEach(d => recentCounts[d]++);

    return Array.from({ length: 10 }, (_, digit) => {
        const count = counts[digit];
        const percentage = digits.length > 0 ? (count / digits.length) * 100 : 0;
        const gap = lastSeen[digit] === -1 ? digits.length : digits.length - 1 - lastSeen[digit];
        const recentPercentage = recent20.length > 0 ? (recentCounts[digit] / 20) * 100 : 0;
        const momentum = recentPercentage - percentage;

        return { digit, count, percentage, gap, momentum };
    });
};

// Calculate match probability
const calculateMatchProbability = (digit: number, digits: number[]): MatchProbability => {
    if (digits.length === 0) {
        return {
            digit,
            probability: 10,
            confidence: 'LOW',
            factors: { frequency: 0, momentum: 0, gap: 0, streak: 0 },
        };
    }

    const freq = analyzeFrequency(digits);
    const digitFreq = freq.find(f => f.digit === digit)!;

    // Factor 1: Overall frequency (40%)
    const frequencyScore = digitFreq.percentage;

    // Factor 2: Recent momentum (30%)
    const momentumScore = Math.max(0, digitFreq.momentum + 10);

    // Factor 3: Gap/Overdue (20%)
    const expectedGap = 10;
    const gapScore = digitFreq.gap > expectedGap ? Math.min((digitFreq.gap / expectedGap) * 10, 20) : 0;

    // Factor 4: Streak detection (10%)
    const lastThree = digits.slice(-3);
    const streakCount = lastThree.filter(d => d === digit).length;
    const streakScore = streakCount * 5;

    // Calculate weighted probability
    const probability = frequencyScore * 0.4 + momentumScore * 0.3 + gapScore * 0.2 + streakScore * 0.1;

    // Determine confidence level
    let confidence: MatchProbability['confidence'];
    if (probability >= 15) confidence = 'HIGH';
    else if (probability >= 10) confidence = 'MEDIUM';
    else confidence = 'LOW';

    return {
        digit,
        probability,
        confidence,
        factors: {
            frequency: frequencyScore,
            momentum: momentumScore,
            gap: gapScore,
            streak: streakScore,
        },
    };
};

// Get top matches
const getTopMatches = (digits: number[], count: number = 3): MatchProbability[] => {
    const probabilities: MatchProbability[] = [];

    for (let digit = 0; digit < 10; digit++) {
        probabilities.push(calculateMatchProbability(digit, digits));
    }

    return probabilities.sort((a, b) => b.probability - a.probability).slice(0, count);
};

const MatchesTab = observer(() => {
    const { smart_trading, app } = useStore();
    const { ticks, current_price, last_digit, symbol, setSymbol, markets, active_symbols_data } = smart_trading;
    const ticks_service = app.api_helpers_store?.ticks_service;

    const { speedbot_prediction } = smart_trading;

    useEffect(() => {
        smart_trading.speedbot_contract_type = 'DIGITMATCH';
    }, [smart_trading]);

    useEffect(() => {
        if (!ticks_service || !symbol) return;

        let is_mounted = true;
        let listenerKey: string | null = null;

        const monitorTicks = async () => {
            const callback = (ticks_data: { quote: string | number }[]) => {
                if (is_mounted && ticks_data && ticks_data.length > 0) {
                    const latest = ticks_data[ticks_data.length - 1];
                    const symbol_info = active_symbols_data[symbol];

                    const last_digits = ticks_data.slice(-200).map(t => {
                        let quote_str = String(t.quote || '0');
                        if (symbol_info && typeof t.quote === 'number') {
                            const decimals = Math.abs(Math.log10(symbol_info.pip));
                            quote_str = t.quote.toFixed(decimals);
                        }
                        const digit = parseInt(quote_str[quote_str.length - 1]);
                        return isNaN(digit) ? 0 : digit;
                    });
                    smart_trading.updateDigitStats(last_digits, latest.quote);
                }
            };

            listenerKey = await ticks_service.monitor({ symbol, callback });
        };

        monitorTicks();

        return () => {
            is_mounted = false;
            if (listenerKey) ticks_service.stopMonitor({ symbol, key: listenerKey });
        };
    }, [symbol, ticks_service, smart_trading, active_symbols_data]);

    // Calculate matches
    const topMatches = useMemo(() => getTopMatches(ticks, 3), [ticks]);

    const allMatches = useMemo(() => {
        const matches: MatchProbability[] = [];
        for (let i = 0; i < 10; i++) {
            matches.push(calculateMatchProbability(i, ticks));
        }
        return matches;
    }, [ticks]);

    const frequencies = useMemo(() => analyzeFrequency(ticks), [ticks]);

    return (
        <div className='matches-tab'>
            {/* Header */}
            <div className='premium-market-header'>
                <div className='market-select-glass'>
                    <label>MARKET</label>
                    <select value={symbol} onChange={e => setSymbol(e.target.value)}>
                        {markets.map(group => (
                            <optgroup key={group.group} label={group.group}>
                                {group.items.map(item => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>

                <div className='price-display-glass'>
                    <span className='lbl'>LIVE PRICE</span>
                    <span className='val'>{current_price}</span>
                </div>

                <div className='digit-display-glass'>
                    <span className='lbl'>LAST DIGIT</span>
                    <div className='digit-box'>{last_digit !== null ? last_digit : '-'}</div>
                </div>
            </div>

            <QuickSettings />

            {/* Title */}
            <div className='tab-header'>
                <h2 className='tab-title'>Matches Analysis</h2>
            </div>

            {/* Top 3 Matches */}
            <div className='top-matches-grid'>
                {topMatches.map((match, index) => {
                    const freq = frequencies.find(f => f.digit === match.digit);
                    const label = index === 0 ? 'Most Appearing' : index === 1 ? '2nd Most' : '3rd Most';

                    return (
                        <div
                            key={match.digit}
                            className={classNames('match-card', {
                                active: speedbot_prediction === match.digit,
                                high: match.confidence === 'HIGH',
                                medium: match.confidence === 'MEDIUM',
                            })}
                            onClick={() => (smart_trading.speedbot_prediction = match.digit)}
                        >
                            <div className='card-label'>{label}</div>
                            <div className='digit-display'>{match.digit}</div>
                            <div className='percentage'>{match.probability.toFixed(1)}%</div>
                            <div className='appeared-count'>Appeared {freq?.count || 0} times</div>
                        </div>
                    );
                })}
            </div>

            {/* Scan Digit Feature */}
            <div className='scan-feature-section'>
                <div className='feature-title'>Scan Digit Feature</div>
                <div className='feature-text'>
                    Digit to Match: <strong>{topMatches[0]?.digit ?? '-'}</strong> appeared{' '}
                    {frequencies.find(f => f.digit === topMatches[0]?.digit)?.count || 0} times,{' '}
                    {topMatches[0]?.probability.toFixed(1)}%
                </div>
                <div className='action-buttons-row'>
                    <button className='scan-btn'>Scan Last 12 Ticks</button>
                    <button
                        className={classNames('manual-trade-btn', { executing: smart_trading.is_executing })}
                        onClick={() => smart_trading.manualTrade('DIGITMATCH', speedbot_prediction)}
                    >
                        {smart_trading.is_executing ? 'EXECUTING...' : 'MANUAL TRADE'}
                    </button>
                </div>
            </div>

            {/* All Digits Grid */}
            <div className='all-digits-section'>
                <h3 className='section-title'>All Digits Match Analysis</h3>
                <div className='digits-grid'>
                    {allMatches.map(match => {
                        const freq = frequencies.find(f => f.digit === match.digit);
                        const isHot = freq && freq.percentage > 11;
                        const isCold = freq && freq.percentage < 9;

                        return (
                            <div
                                key={match.digit}
                                className={classNames('digit-card', {
                                    hot: isHot,
                                    cold: isCold,
                                    active: speedbot_prediction === match.digit,
                                })}
                                onClick={() => (smart_trading.speedbot_prediction = match.digit)}
                            >
                                <div className='digit-number'>{match.digit}</div>
                                <div className='match-percent'>{match.probability.toFixed(1)}%</div>
                                <div className='gap-info'>Gap: {freq?.gap || 0}</div>
                                <div className='confidence-badge'>{match.confidence}</div>
                                <div className='status-label'>{isHot ? 'Hot' : isCold ? 'Cold' : 'Neutral'}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {/* Visual Timeline - Last 40 Digits */}
            <div className='visual-timeline'>
                <div className='timeline-title'>Last 40 Digits (Boxes updating live)</div>
                <div className='timeline-grid'>
                    {ticks.slice(-40).map((digit, idx) => {
                        const isLatest = idx === ticks.slice(-40).length - 1;
                        const isMatch = digit === speedbot_prediction;

                        return (
                            <div
                                key={idx}
                                className={classNames('timeline-box', {
                                    latest: isLatest,
                                    match: isMatch,
                                })}
                                title={`Digit: ${digit}`}
                            >
                                {digit}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

export default MatchesTab;
