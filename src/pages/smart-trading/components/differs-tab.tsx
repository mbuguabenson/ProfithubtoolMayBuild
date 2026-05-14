import { useEffect, useMemo } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import QuickSettings from './quick-settings';
import './differs-tab.scss';

// Shared interfaces
interface DigitFrequency {
    digit: number;
    count: number;
    percentage: number;
    gap: number;
    momentum: number;
}

interface DifferProbability {
    digit: number;
    differProbability: number;
    confidence: 'STRONG' | 'MEDIUM' | 'WEAK';
    reasoning: string[];
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
        const recentPercentage = (recentCounts[digit] / 20) * 100;
        const momentum = recentPercentage - percentage;

        return { digit, count, percentage, gap, momentum };
    });
};

// Calculate differ probability
const calculateDifferProbability = (digit: number, digits: number[]): DifferProbability => {
    if (digits.length === 0) {
        return {
            digit,
            differProbability: 90,
            confidence: 'MEDIUM',
            reasoning: ['Insufficient data'],
        };
    }

    const freq = analyzeFrequency(digits);
    const digitFreq = freq.find(f => f.digit === digit)!;

    // Base non-appearance probability
    const baseNonAppearance = 100 - digitFreq.percentage;

    // Zero-gap bonus
    const gapBonus = digitFreq.gap === 0 ? 15 : digitFreq.gap === 1 ? 10 : digitFreq.gap === 2 ? 5 : 0;

    // Overfrequency bonus
    const avgFreq = 10;
    const overfrequency = Math.max(0, digitFreq.percentage - avgFreq);
    const hotBonus = overfrequency * 2;

    // Streak bonus
    const recent3 = digits.slice(-3);
    const streakCount = recent3.filter(d => d === digit).length;
    const streakBonus = streakCount * 5;

    // Calculate total
    let differProbability = baseNonAppearance + gapBonus + hotBonus + streakBonus;
    differProbability = Math.min(differProbability, 95);

    // Determine confidence
    let confidence: DifferProbability['confidence'];
    if (differProbability >= 85) confidence = 'STRONG';
    else if (differProbability >= 75) confidence = 'MEDIUM';
    else confidence = 'WEAK';

    // Generate reasoning
    const reasoning: string[] = [];
    if (digitFreq.gap === 0) reasoning.push('Just appeared (low repeat chance)');
    else if (digitFreq.gap === 1) reasoning.push('Appeared recently');
    if (overfrequency > 3) reasoning.push(`Hot digit (+${overfrequency.toFixed(1)}% over avg)`);
    if (streakCount >= 2) reasoning.push(`Streak detected (${streakCount} in last 3)`);
    if (digitFreq.percentage < 8) reasoning.push('Cold digit (avoid differing)');
    if (reasoning.length === 0) reasoning.push('Standard probability analysis');

    return { digit, differProbability, confidence, reasoning };
};

// Get top differs
const getTopDiffers = (digits: number[], count: number = 3): DifferProbability[] => {
    const differs: DifferProbability[] = [];

    for (let digit = 0; digit < 10; digit++) {
        differs.push(calculateDifferProbability(digit, digits));
    }

    return differs.sort((a, b) => b.differProbability - a.differProbability).slice(0, count);
};

const DiffersTab = observer(() => {
    const { smart_trading, app } = useStore();
    const { ticks, current_price, last_digit, symbol, setSymbol, markets, active_symbols_data } = smart_trading;
    const ticks_service = app.api_helpers_store?.ticks_service;

    const { speedbot_prediction, is_speedbot_running, toggleSpeedbot } = smart_trading;

    useEffect(() => {
        smart_trading.speedbot_contract_type = 'DIGITDIFF';
        // Default to top differ if no prediction set
        if (typeof speedbot_prediction !== 'number') {
            // Optional: default to top differ?
        }
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

    // Calculate differs
    const topDiffers = useMemo(() => getTopDiffers(ticks, 3), [ticks]);

    const allDiffers = useMemo(() => {
        const differs: DifferProbability[] = [];
        for (let i = 0; i < 10; i++) {
            differs.push(calculateDifferProbability(i, ticks));
        }
        return differs;
    }, [ticks]);

    const frequencies = useMemo(() => analyzeFrequency(ticks), [ticks]);

    // Get signal text
    const signalText = useMemo(() => {
        if (topDiffers.length === 0) return '';
        const top = topDiffers[0];
        const freq = frequencies.find(f => f.digit === top.digit);
        if (!freq) return '';

        const reasons = [];
        if (freq.gap < 3) reasons.push('decreasing');
        if (top.differProbability < 80) reasons.push('<10% power');

        const digitRange = topDiffers.map(d => d.digit).join(', ');
        return `DIFFERS signal on digit ${top.digit} at ${top.differProbability.toFixed(
            1
        )}% (${reasons.join(', ')}, digits ${digitRange} only)`;
    }, [topDiffers, frequencies]);

    return (
        <div className='differs-tab'>
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
                <h2 className='tab-title'>Differs Analysis</h2>
            </div>

            {/* Top 3 Differs */}
            <div className='top-differs-grid'>
                {topDiffers.map((differ, index) => {
                    const freq = frequencies.find(f => f.digit === differ.digit);
                    const label = index === 0 ? 'Least Appearing' : index === 1 ? '2nd Least' : '3rd Least';

                    return (
                        <div
                            key={differ.digit}
                            className={classNames('differ-card', {
                                active: speedbot_prediction === differ.digit,
                                strong: differ.confidence === 'STRONG',
                                medium: differ.confidence === 'MEDIUM',
                            })}
                            onClick={() => (smart_trading.speedbot_prediction = differ.digit)}
                        >
                            <div className='card-label'>{label}</div>
                            <div className='digit-display'>{differ.digit}</div>
                            <div className='percentage'>{differ.differProbability.toFixed(1)}%</div>
                            <div className='appeared-count'>Appeared {freq?.count || 0} times</div>
                        </div>
                    );
                })}
            </div>

            {/* Trade Signal */}
            <div className='trade-signal-section'>
                <div className='action-buttons-row'>
                    <button
                        className={classNames('trade-now-btn', { running: is_speedbot_running })}
                        onClick={toggleSpeedbot}
                    >
                        {is_speedbot_running ? 'STOP AUTO' : 'START AUTO'}
                    </button>
                    <button
                        className={classNames('manual-trade-btn', { executing: smart_trading.is_executing })}
                        onClick={() => smart_trading.manualTrade('DIGITDIFF', speedbot_prediction)}
                    >
                        {smart_trading.is_executing ? 'EXECUTING...' : 'MANUAL TRADE'}
                    </button>
                </div>
                <div className='signal-text'>{signalText}</div>
                {topDiffers[0] && frequencies.find(f => f.digit === topDiffers[0].digit)?.gap === 0 && (
                    <div className='signal-subtext'>
                        Digit {topDiffers[0].digit} has not appeared in 3+ ticks - TRADE DIFFERS NOW
                    </div>
                )}
            </div>

            {/* All Digits Grid */}
            <div className='all-digits-section'>
                <h3 className='section-title'>All Digits Differ Analysis</h3>
                <div className='digits-grid'>
                    {allDiffers.map(differ => {
                        const freq = frequencies.find(f => f.digit === differ.digit);
                        const isZeroGap = freq?.gap === 0;
                        const isHot = freq && freq.percentage > 11;
                        const isCold = freq && freq.percentage < 9;

                        return (
                            <div
                                key={differ.digit}
                                className={classNames('digit-card', {
                                    'zero-gap': isZeroGap,
                                    hot: isHot && !isZeroGap,
                                    cold: isCold && !isZeroGap,
                                    active: speedbot_prediction === differ.digit,
                                })}
                                onClick={() => (smart_trading.speedbot_prediction = differ.digit)}
                            >
                                <div className='digit-number'>{differ.digit}</div>
                                <div className='differ-percent'>{differ.differProbability.toFixed(0)}%</div>
                                <div className='gap-info'>Gap: {freq?.gap || 0}</div>
                                <div className='confidence-badge'>{differ.confidence}</div>
                                {isZeroGap && <div className='zero-gap-badge'>JUST!</div>}
                                <div className='status-label'>
                                    {isZeroGap ? 'Zero Gap!' : isHot ? 'Hot' : isCold ? 'Cold' : 'Neutral'}
                                </div>
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
                        const isTarget = digit === speedbot_prediction;

                        return (
                            <div
                                key={idx}
                                className={classNames('timeline-box', {
                                    latest: isLatest,
                                    target: isTarget,
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

export default DiffersTab;
