import { useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { Area, AreaChart, LabelList, ResponsiveContainer } from 'recharts';
import { useStore } from '@/hooks/useStore';
import './revamped-trading.scss';

const SCPTab = observer(() => {
    const { smart_trading, common } = useStore();
    const [active_strategy, setActiveStrategy] = useState<'EVENODD' | 'OVERUNDER' | 'DIFFERS' | 'RISEFALL' | 'MATCHES'>(
        'EVENODD'
    );

    const { is_socket_opened, latency } = common;

    const { symbol, digit_stats, ticks, current_price, last_digit, setSymbol, calculateProbabilities } = smart_trading;

    // --- LOGIC: Frequency Ranks ---
    const sortedStats = useMemo(() => {
        return [...digit_stats].sort((a, b) => b.count - a.count);
    }, [digit_stats]);

    const statsMap = useMemo(() => {
        const most = sortedStats[0]?.digit;
        const second = sortedStats[1]?.digit;
        const least = [...sortedStats].reverse().find(s => s.count > 0)?.digit ?? sortedStats[9]?.digit;

        return { most, second, least };
    }, [sortedStats]);

    // --- LOGIC: Line Chart Data ---
    const chartData = useMemo(() => {
        return ticks.slice(-15).map((val, idx) => ({ id: idx, value: val }));
    }, [ticks]);

    // --- LOGIC: Last 20 Digits ---
    const last20 = useMemo(() => ticks.slice(-20), [ticks]);

    // --- LOGIC: Streak/Pattern (Even/Odd) ---
    const streakInfo = useMemo(() => {
        if (ticks.length === 0) return { side: 'NONE', count: 0 };
        const lastSide = ticks[ticks.length - 1] % 2 === 0 ? 'EVEN' : 'ODD';
        let count = 0;
        for (let i = ticks.length - 1; i >= 0; i--) {
            const side = ticks[i] % 2 === 0 ? 'EVEN' : 'ODD';
            if (side === lastSide) count++;
            else break;
        }
        return { side: lastSide, count };
    }, [ticks]);

    const probs = calculateProbabilities();

    const handleStart = () => {
        if (smart_trading.scp_status === 'idle') {
            smart_trading.runScpBot({
                market: symbol,
                strategyId: active_strategy,
                stake: 0.35, // Defaults
                targetProfit: 1,
                stopLossPct: 50,
                analysisMinutes: 1,
            });
        } else {
            smart_trading.setScpStatus('idle');
        }
    };

    return (
        <div className='revamped-smart-auto'>
            {/* 1. COMPACT HEADER */}
            <div className='glass-card revamped-header'>
                <div className='header-item'>
                    <label>MARKET</label>
                    <select
                        value={symbol}
                        onChange={e => setSymbol(e.target.value)}
                        className='mono val'
                        style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
                    >
                        {Object.values(smart_trading.active_symbols_data)
                            .filter(s => s.symbol.startsWith('R_') || s.symbol.startsWith('1HZ'))
                            .map(s => (
                                <option key={s.symbol} value={s.symbol} style={{ background: '#111' }}>
                                    {s.display_name}
                                </option>
                            ))}
                    </select>
                </div>
                <div className='header-item'>
                    <label>MARKET PRICE</label>
                    <span className='val'>{current_price || '0.0000'}</span>
                </div>
                <div className='header-item last-digit-item'>
                    <label>LAST DIGIT</label>
                    <div className='digit-preview'>{last_digit ?? '-'}</div>
                </div>
                <div className='header-item connection-status-item'>
                    <label>CONNECTION</label>
                    <div className={classNames('status-indicator', { 'is-online': is_socket_opened })}>
                        <span className='pulse-dot' />
                        <span className='status-text'>{is_socket_opened ? 'CONNECTED' : 'OFFLINE'}</span>
                        {is_socket_opened && <span className='latency'>{latency}ms</span>}
                    </div>
                </div>
            </div>

            {/* 2. DIGIT DISTRIBUTION (BARS) */}
            <div className='glass-card distribution-section'>
                <div className='section-header'>
                    <span className='title'>DIGIT FREQUENCY SPECTRUM</span>
                    <span className='subtitle'>Live Analytics (0-9)</span>
                </div>
                <div className='digit-bar-grid'>
                    {digit_stats.map(stat => {
                        const isMost = stat.digit === statsMap.most;
                        const isSecond = stat.digit === statsMap.second;
                        const isLeast = stat.digit === statsMap.least;
                        const isLive = stat.digit === last_digit;

                        let color = 'rgba(255, 255, 255, 0.05)';
                        if (isMost)
                            color = '#10b981'; // Green
                        else if (isSecond)
                            color = '#fbbf24'; // Yellow
                        else if (isLeast) color = '#f43f5e'; // Red

                        // Current live digit always orange
                        const barColor = isLive ? '#f59e0b' : color;

                        return (
                            <div key={stat.digit} className={classNames('bar-container', { active: isLive })}>
                                <div
                                    className='bar-fill'
                                    style={{
                                        height: `${(stat.count / Math.max(...digit_stats.map(s => s.count), 1)) * 100}%`,
                                        background: barColor,
                                        boxShadow: isLive || isMost ? `0 0 15px ${barColor}60` : 'none',
                                    }}
                                />
                                <span className='digit-num'>{stat.digit}</span>
                                {isLive && <div className='cursor-point'>▲</div>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 3. SHARP LINE CHART */}
            <div className='glass-card line-chart-section'>
                <div className='section-header'>
                    <span className='title'>TICK VELOCITY</span>
                    <span className='subtitle'>Last 15 Ticks Analysis</span>
                </div>
                <ResponsiveContainer width='100%' height='100%'>
                    <AreaChart data={chartData} margin={{ top: 25, right: 10, left: 10, bottom: 10 }}>
                        <defs>
                            <linearGradient id='glowGradient' x1='0' y1='0' x2='0' y2='1'>
                                <stop offset='5%' stopColor='#6366f1' stopOpacity={0.4} />
                                <stop offset='95%' stopColor='#6366f1' stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type='stepAfter'
                            dataKey='value'
                            stroke='#6366f1'
                            strokeWidth={3}
                            fillOpacity={1}
                            fill='url(#glowGradient)'
                            isAnimationActive={true}
                            animationDuration={300}
                        >
                            <LabelList dataKey='value' position='top' offset={12} className='chart-label' fill='#fff' />
                        </Area>
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* 4. STATISTICAL ANALYSIS */}
            <div className='analysis-grid'>
                <div className='glass-card analysis-card'>
                    <span className='card-title'>Even / Odd</span>
                    <div className='pct-row'>
                        <span className='lbl'>EVEN</span>
                        <span className='val' style={{ color: '#3b82f6' }}>
                            {probs.even.toFixed(1)}%
                        </span>
                    </div>
                    <div className='mini-track'>
                        <div className='fill' style={{ width: `${probs.even}%`, background: '#3b82f6' }} />
                    </div>
                    <div className='pct-row'>
                        <span className='lbl'>ODD</span>
                        <span className='val' style={{ color: '#ec4899' }}>
                            {probs.odd.toFixed(1)}%
                        </span>
                    </div>
                </div>
                <div className='glass-card analysis-card'>
                    <span className='card-title'>Over 5-9 / Under 0-4</span>
                    <div className='pct-row'>
                        <span className='lbl'>OVER (5-9)</span>
                        <span className='val' style={{ color: '#f43f5e' }}>
                            {probs.over.toFixed(1)}%
                        </span>
                    </div>
                    <div className='mini-track'>
                        <div className='fill' style={{ width: `${probs.over}%`, background: '#f43f5e' }} />
                    </div>
                    <div className='pct-row'>
                        <span className='lbl'>UNDER (0-4)</span>
                        <span className='val' style={{ color: '#10b981' }}>
                            {probs.under.toFixed(1)}%
                        </span>
                    </div>
                </div>
                <div className='glass-card analysis-card'>
                    <span className='card-title'>Matches / Differs</span>
                    <div className='pct-row'>
                        <span className='lbl'>MATCHES</span>
                        <span className='val' style={{ color: '#8b5cf6' }}>
                            {probs.matches.toFixed(1)}%
                        </span>
                    </div>
                    <div className='pct-row'>
                        <span className='lbl'>DIFFERS</span>
                        <span className='val' style={{ color: '#94a3b8' }}>
                            {probs.differs.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* 5. LAST 20 DIGITS CHART */}
            <div className='glass-card last-20-grid'>
                {last20.map((d, i) => (
                    <div key={i} className={classNames('digit-box', { live: i === last20.length - 1 })}>
                        {d}
                    </div>
                ))}
            </div>

            {/* 6. STRATEGY SPECIFIC CARDS */}
            {active_strategy === 'EVENODD' && (
                <div className='glass-card strategy-content-card'>
                    <div className='card-title'>Even / Odd Strategy Monitor</div>
                    <div className='eo-grid'>
                        {ticks.slice(-25).map((d, i) => (
                            <div key={i} className={classNames('eo-box', d % 2 === 0 ? 'E' : 'O')}>
                                {d % 2 === 0 ? 'E' : 'O'}
                            </div>
                        ))}
                    </div>
                    <div className='metrics-row'>
                        <div className='m-item'>
                            <span className='lbl'>Current Streak</span>
                            <span className='val' style={{ color: streakInfo.side === 'EVEN' ? '#3b82f6' : '#ec4899' }}>
                                {streakInfo.count}x {streakInfo.side}
                            </span>
                        </div>
                        <div className='m-item'>
                            <span className='lbl'>Market Bias</span>
                            <span className='val'>
                                {Math.abs(probs.even - probs.odd) > 10 ? 'High Imbalance' : 'Balanced'}
                            </span>
                        </div>
                    </div>
                    <div className='logic-block'>
                        Advanced Analysis Logic: Monitoring Even/Odd deviation from the 50/50 mean. Detected{' '}
                        {streakInfo.count} consecutive ticks. Recommended action:
                        {streakInfo.count > 4 ? ' Immediate Contra-Trade Enabled' : ' Wait for Signal Strength > 55%'}.
                    </div>
                </div>
            )}

            {active_strategy === 'OVERUNDER' && (
                <div className='glass-card strategy-content-card' style={{ borderLeftColor: '#f43f5e' }}>
                    <div className='card-title'>Over / Under Strategy Monitor</div>
                    <div className='eo-grid'>
                        {ticks.slice(-25).map((d, i) => (
                            <div
                                key={i}
                                className={classNames('eo-box', d >= 5 ? 'O' : 'U')}
                                style={{ borderLeftColor: d >= 5 ? '#f43f5e' : '#10b981' }}
                            >
                                {d >= 5 ? 'O' : 'U'}
                            </div>
                        ))}
                    </div>
                    <div className='metrics-row'>
                        <div className='m-item'>
                            <span className='lbl'>Dominance</span>
                            <span className='val' style={{ color: probs.over > probs.under ? '#f43f5e' : '#10b981' }}>
                                {probs.over > probs.under ? 'OVER (5-9)' : 'UNDER (0-4)'}
                            </span>
                        </div>
                        <div className='m-item'>
                            <span className='lbl'>Stability Score</span>
                            <span className='val'>{Math.abs(probs.over - 50) < 5 ? 'Stable' : 'Volatile'}</span>
                        </div>
                    </div>
                    <div className='logic-block'>
                        Over/Under Logic: Analyzing pressure on the extremities (0, 9). Currently{' '}
                        {probs.over.toFixed(0)}% Over vs {probs.under.toFixed(0)}% Under.
                        {probs.under > 60 ? ' High Probability Under (0-4) Signal' : ' Awaiting Trend Confirmation'}.
                    </div>
                </div>
            )}

            {active_strategy === 'DIFFERS' && (
                <div className='glass-card strategy-content-card' style={{ borderLeftColor: '#fbbf24' }}>
                    <div className='card-title'>Differs Digit Strategy Monitor</div>
                    <div className='metrics-row'>
                        <div className='m-item'>
                            <span className='lbl'>Safest Digit</span>
                            <span className='val' style={{ color: '#10b981' }}>
                                {statsMap.least}
                            </span>
                        </div>
                        <div className='m-item'>
                            <span className='lbl'>Risk Level</span>
                            <span
                                className='val'
                                style={{
                                    color: (digit_stats[statsMap.least]?.percentage ?? 0) > 12 ? '#f43f5e' : '#10b981',
                                }}
                            >
                                {(digit_stats[statsMap.least]?.percentage ?? 0).toFixed(1)}% Frequency
                            </span>
                        </div>
                    </div>
                    <div className='logic-block'>
                        Differs Logic: Identifying the digit with the lowest historical frequency. Targeting Digit{' '}
                        {statsMap.least} with an avoidance probability of{' '}
                        {(100 - (digit_stats[statsMap.least]?.percentage || 0)).toFixed(1)}%.
                    </div>
                </div>
            )}
            {active_strategy === 'RISEFALL' && (
                <div className='glass-card strategy-content-card' style={{ borderLeftColor: '#8b5cf6' }}>
                    <div className='card-title'>Rise & Fall Strategy Monitor</div>
                    <div className='metrics-row'>
                        <div className='m-item'>
                            <span className='lbl'>Primary Trend</span>
                            <span className='val' style={{ color: probs.riseProb > 50 ? '#10b981' : '#f43f5e' }}>
                                {probs.riseProb > probs.fallProb ? (
                                    <>
                                        Rising <span style={{ fontSize: '10px' }}>({probs.riseProb.toFixed(0)}%)</span>
                                    </>
                                ) : (
                                    <>
                                        Falling <span style={{ fontSize: '10px' }}>({probs.fallProb.toFixed(0)}%)</span>
                                    </>
                                )}
                            </span>
                        </div>
                        <div className='m-item'>
                            <span className='lbl'>Momentum</span>
                            <span className='val'>{Math.abs(probs.riseProb - 50) > 15 ? 'Strong' : 'Weak'}</span>
                        </div>
                    </div>
                    <div className='logic-block'>
                        Rise & Fall Logic: Measuring price velocity over the last 50 ticks. A{' '}
                        {probs.riseProb > probs.fallProb ? 'Bullish' : 'Bearish'} bias is currently detected.
                        {Math.abs(probs.riseProb - 50) > 10
                            ? ' High Momentum Entry Signal'
                            : ' Awaiting directional breakout'}
                        .
                    </div>
                </div>
            )}

            {active_strategy === 'MATCHES' && (
                <div className='glass-card strategy-content-card' style={{ borderLeftColor: '#ec4899' }}>
                    <div className='card-title'>Digit Matches Strategy Monitor</div>
                    <div className='metrics-row'>
                        <div className='m-item'>
                            <span className='lbl'>Hot Target</span>
                            <span className='val' style={{ color: '#ec4899' }}>
                                {statsMap.most}
                            </span>
                        </div>
                        <div className='m-item'>
                            <span className='lbl'>Match Probability</span>
                            <span className='val' style={{ color: '#ec4899' }}>
                                {digit_stats[statsMap.most]?.percentage.toFixed(1)}% Frequency
                            </span>
                        </div>
                    </div>
                    <div className='logic-block'>
                        Matches Logic: Scanning for high-frequency repetition of Digit {statsMap.most}. Current strategy
                        aims for an immediate match within the next 3 ticks based on {digit_stats[statsMap.most]?.count}{' '}
                        recent occurrences.
                    </div>
                </div>
            )}

            {/* 7. LAUNCH CONTROL */}
            <button
                className={classNames('action-btn', { running: smart_trading.scp_status !== 'idle' })}
                onClick={handleStart}
                style={{
                    width: '100%',
                    padding: '24px',
                    borderRadius: '16px',
                    border: 'none',
                    background:
                        smart_trading.scp_status === 'idle'
                            ? 'linear-gradient(135deg, #6366f1, #a855f7)'
                            : 'linear-gradient(135deg, #ef4444, #f43f5e)',
                    color: '#fff',
                    fontWeight: '900',
                    fontSize: '20px',
                    letterSpacing: '3px',
                    cursor: 'pointer',
                    marginTop: '20px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }}
            >
                {smart_trading.scp_status === 'idle' ? 'START AUTO-TRADER' : 'TERMINATE ENGINE'}
            </button>

            {/* 8. STICKY STRATEGY BAR */}
            <div className='sticky-strategy-bar'>
                {[
                    { id: 'EVENODD', label: 'Even Odd' },
                    { id: 'OVERUNDER', label: 'Over Under' },
                    { id: 'DIFFERS', label: 'Differs' },
                    { id: 'RISEFALL', label: 'Rise & Fall' },
                    { id: 'MATCHES', label: 'Matches' },
                ].map(strat => (
                    <button
                        key={strat.id}
                        className={classNames({ active: active_strategy === strat.id })}
                        onClick={() => setActiveStrategy(strat.id as any)}
                    >
                        {strat.label}
                    </button>
                ))}
            </div>
        </div>
    );
});

export default SCPTab;
