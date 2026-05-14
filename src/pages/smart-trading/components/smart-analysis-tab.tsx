import { useEffect, useMemo } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { useStore } from '@/hooks/useStore';
import './smart-analysis-tab.scss';

const SmartAnalysisTab = observer(() => {
    const { smart_trading, app } = useStore();
    const {
        digit_stats,
        ticks,
        calculateProbabilities,
        symbol,
        setSymbol,
        current_price,
        last_digit,
        markets,
        updateDigitStats,
        smart_analysis_data,
        active_symbols_data,
        v_sense_signals,
    } = smart_trading;
    const ticks_service = app.api_helpers_store?.ticks_service;

    useEffect(() => {
        if (!ticks_service || !symbol) return;

        let is_mounted = true;
        let listenerKey: string | null = null;

        const monitorTicks = async () => {
            const callback = (ticks_data: { quote: string | number }[]) => {
                if (is_mounted && ticks_data && ticks_data.length > 0) {
                    const latest = ticks_data[ticks_data.length - 1];
                    const symbol_info = active_symbols_data[symbol];

                    const last_digits = ticks_data.slice(-100).map(t => {
                        let quote_str = String(t.quote || '0');
                        if (symbol_info && typeof t.quote === 'number') {
                            const decimals = Math.abs(Math.log10(symbol_info.pip));
                            quote_str = t.quote.toFixed(decimals);
                        }
                        const digit = parseInt(quote_str[quote_str.length - 1]);
                        return isNaN(digit) ? 0 : digit;
                    });
                    updateDigitStats(last_digits, latest.quote);
                }
            };

            listenerKey = await ticks_service.monitor({ symbol, callback });
        };

        monitorTicks();

        return () => {
            is_mounted = false;
            if (listenerKey) ticks_service.stopMonitor({ symbol, key: listenerKey });
        };
    }, [symbol, ticks_service, updateDigitStats, active_symbols_data]);

    const probs = calculateProbabilities();
    const last_20_ticks = ticks.slice(-20);

    const chart_data = useMemo(() => ticks.slice(-15).map((val, idx) => ({ name: idx, value: val })), [ticks]);

    const max_count = Math.max(...digit_stats.map(s => s.count), 1);

    const getDigitColor = (digit: number) => {
        return `var(--digit-${digit % 10})`;
    };

    return (
        <div className='smart-analysis-tab'>
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
                    <div className={classNames('digit-box', `d-${last_digit}`)}>{last_digit}</div>
                </div>
            </div>

            <h2 className='section-title'>Digit Frequency Analysis</h2>

            <div className='digit-freq-circles'>
                <div className='circles-row'>
                    {digit_stats.map(stat => (
                        <div key={stat.digit} className='digit-circle-stat'>
                            <div
                                className={classNames('circle-outer', {
                                    'is-max': stat.count === max_count && stat.count > 0,
                                })}
                                style={{ color: getDigitColor(stat.digit) }}
                            >
                                <div className='circle-inner'>
                                    <span className='digit'>{stat.digit}</span>
                                    <span className='pct'>{stat.percentage.toFixed(1)}%</span>
                                </div>
                            </div>
                            <span className='count-label'>{stat.count} Ticks</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className='middle-grid'>
                <div className='glass-card'>
                    <h3>Real-time Digit Trend</h3>
                    <div className='chart-container-premium'>
                        <ResponsiveContainer width='100%' height='100%'>
                            <LineChart data={chart_data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='rgba(255,255,255,0.05)' />
                                <XAxis dataKey='name' hide />
                                <YAxis domain={[0, 9]} ticks={[0, 2, 4, 6, 8, 9]} hide />
                                <Line
                                    type='monotone'
                                    dataKey='value'
                                    stroke='#8b5cf6'
                                    strokeWidth={4}
                                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 6, stroke: '#fff' }}
                                    activeDot={{ r: 8, strokeWidth: 0 }}
                                    isAnimationActive={true}
                                    animationDuration={1000}
                                >
                                    <LabelList
                                        dataKey='value'
                                        position='top'
                                        offset={10}
                                        fill='#fff'
                                        fontSize={12}
                                        fontWeight={700}
                                    />
                                </Line>
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className='glass-card'>
                    <h3>Market Distribution Analysis</h3>
                    <div className='stat-list-premium'>
                        <div className='stat-group'>
                            <div className='group-title'>Even vs Odd Signal</div>
                            <div className='premium-bar-container'>
                                <div className='label-row'>
                                    <span>Even</span>
                                    <span className={classNames({ 'active-val': probs.even >= probs.odd })}>
                                        {probs.even.toFixed(1)}%
                                    </span>
                                    <span>Odd</span>
                                    <span className={classNames({ 'active-val': probs.odd > probs.even })}>
                                        {probs.odd.toFixed(1)}%
                                    </span>
                                </div>
                                <div className='track-wrapper'>
                                    <div
                                        className={classNames('bar-fill blue', { winning: probs.even >= probs.odd })}
                                        style={{ width: `${probs.even}%`, left: 0, position: 'absolute' }}
                                    />
                                    <div
                                        className={classNames('bar-fill pink', { winning: probs.odd > probs.even })}
                                        style={{ width: `${probs.odd}%`, right: 0, position: 'absolute' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className='stat-group'>
                            <div className='group-title'>Over / Under Segments</div>
                            <div className='premium-bar-container'>
                                <div className='label-row'>
                                    <span>Under (0-4)</span>
                                    <span className='active-val'>{probs.under.toFixed(1)}%</span>
                                </div>
                                <div className='track-wrapper'>
                                    <div
                                        className={classNames('bar-fill green', { winning: probs.under >= 40 })}
                                        style={{ width: `${probs.under}%` }}
                                    />
                                </div>
                            </div>
                            <div className='premium-bar-container mt-4'>
                                <div className='label-row'>
                                    <span>Middle (3-6)</span>
                                    <span className='active-val'>{probs.middle.toFixed(1)}%</span>
                                </div>
                                <div className='track-wrapper'>
                                    <div
                                        className={classNames('bar-fill orange', { winning: probs.middle >= 40 })}
                                        style={{ width: `${probs.middle}%` }}
                                    />
                                </div>
                            </div>
                            <div className='premium-bar-container mt-4'>
                                <div className='label-row'>
                                    <span>Over (5-9)</span>
                                    <span className='active-val'>{probs.over.toFixed(1)}%</span>
                                </div>
                                <div className='track-wrapper'>
                                    <div
                                        className={classNames('bar-fill red', { winning: probs.over >= 40 })}
                                        style={{ width: `${probs.over}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className='glass-card timeline-premium'>
                <h3>Live Pattern Sequence</h3>
                <div className='timeline-scroll'>
                    {last_20_ticks.map((digit, idx) => (
                        <div key={idx} className={classNames('digit-node', `d-${digit % 10}`)}>
                            {digit}
                        </div>
                    ))}
                </div>
            </div>

            <div className='bottom-summary-grid'>
                <div className='stat-box-colorful'>
                    <div className='info-col hot'>
                        <div className='lbl'>Hot Digit</div>
                        <div className='val'>
                            {digit_stats.length > 0
                                ? digit_stats.reduce((a, b) => (a.count > b.count ? a : b)).digit
                                : '-'}
                        </div>
                    </div>
                </div>

                <div className='stat-box-colorful'>
                    <div className='info-col cold'>
                        <div className='lbl'>Cold Digit</div>
                        <div className='val'>
                            {digit_stats.length > 0
                                ? digit_stats.reduce((a, b) => (a.count < b.count ? a : b)).digit
                                : '-'}
                        </div>
                    </div>
                </div>

                <div className='stat-box-colorful'>
                    <div className='info-col'>
                        <div className='lbl'>Total Samples</div>
                        <div className='val'>{ticks.length}</div>
                    </div>
                </div>
            </div>

            {v_sense_signals.length > 0 && (
                <div className='vsense-dashboard'>
                    <div className='vsense-header-premium'>
                        <div className='brand'>
                            <span className='logo'>V-SENSE™</span>
                            <span className='tag'>VOLATILITY SMART ENTRY & EXIT</span>
                        </div>
                        <div className='status-pulse'>
                            <span className='dot' /> LIVE INTELLIGENCE ACTIVE
                        </div>
                    </div>

                    <div className='vsense-signals-grid'>
                        {v_sense_signals.map((sig, i) => (
                            <div key={i} className={classNames('vsense-card', sig.status.toLowerCase())}>
                                <div className='card-top'>
                                    <span className='strategy-name'>{sig.strategy}</span>
                                    <span className='status-badge'>{sig.status}</span>
                                </div>
                                <div className='card-main'>
                                    {sig.targetDigit !== undefined && (
                                        <div className='target-info'>
                                            <span className='lbl'>TARGET DIGIT</span>
                                            <span className='val'>{sig.targetDigit}</span>
                                        </div>
                                    )}
                                    {sig.targetSide && (
                                        <div className='target-info'>
                                            <span className='lbl'>TARGET SIDE</span>
                                            <span className='val'>{sig.targetSide}</span>
                                        </div>
                                    )}
                                    <div className='confidence-circle'>
                                        <svg viewBox='0 0 36 36' className='circular-chart'>
                                            <path
                                                className='circle-bg'
                                                d='M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831'
                                            />
                                            <path
                                                className='circle'
                                                strokeDasharray={`${sig.confidence}, 100`}
                                                d='M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831'
                                            />
                                            <text x='18' y='20.35' className='percentage'>
                                                {sig.confidence}%
                                            </text>
                                        </svg>
                                    </div>
                                </div>
                                <div className='card-footer'>
                                    <div className='meta-item'>
                                        <span className='lbl'>TREND</span>
                                        <span className='val'>{sig.powerTrend === 'DOWN' ? '↓' : '↑'}</span>
                                    </div>
                                    <div className='meta-item'>
                                        <span className='lbl'>STRETCH</span>
                                        <span className='val'>{sig.stretch}</span>
                                    </div>
                                    <div className='meta-item'>
                                        <span className='lbl'>DURATION</span>
                                        <span className='val'>{sig.strategy === 'DIFFERS' ? '1 Tick' : '5 Ticks'}</span>
                                    </div>
                                </div>
                                <div className='reasoning-tooltip'>
                                    {sig.reasoning.map((r, idx) => (
                                        <p key={idx}>{r}</p>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {smart_analysis_data && (
                <div className='smart-prediction-grid'>
                    <div className='glass-card signal-card'>
                        <div className='card-header-flex'>
                            <h3>AI STRATEGY SIGNAL</h3>
                            <div
                                className={classNames('signal-badge', smart_analysis_data.signal.action.toLowerCase())}
                            >
                                {smart_analysis_data.signal.action}
                            </div>
                        </div>
                        <div className='signal-body'>
                            <div className='main-prediction'>
                                <span className='lbl'>TARGET DIGIT</span>
                                <span className='val'>{smart_analysis_data.signal.targetDigit}</span>
                            </div>
                            <div className='confidence-gauge'>
                                <div className='gauge-label'>
                                    Confidence: {smart_analysis_data.signal.confidence.toFixed(1)}%
                                </div>
                                <div className='gauge-bar'>
                                    <div
                                        className='fill'
                                        style={{
                                            width: `${smart_analysis_data.signal.confidence}%`,
                                            background:
                                                smart_analysis_data.signal.confidence > 70 ? '#10b981' : '#f97316',
                                        }}
                                    />
                                </div>
                            </div>
                            <ul className='reasoning-list'>
                                {smart_analysis_data.signal.reasoning.map((r, i) => (
                                    <li key={i}>{r}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className='glass-card risk-card'>
                        <h3>RISK & VOLATILITY</h3>
                        <div className='risk-metrics'>
                            <div className='metric-item'>
                                <span className='lbl'>Volatility</span>
                                <div className='metric-bar'>
                                    <div
                                        className='fill'
                                        style={{ width: `${smart_analysis_data.risk.volatility}%` }}
                                    />
                                </div>
                                <span className='val'>{smart_analysis_data.risk.volatility}%</span>
                            </div>
                            <div className='metric-item'>
                                <span className='lbl'>Momentum</span>
                                <div className='metric-bar'>
                                    <div className='fill' style={{ width: `${smart_analysis_data.risk.momentum}%` }} />
                                </div>
                                <span className='val'>{smart_analysis_data.risk.momentum}%</span>
                            </div>
                            <div className='metric-item'>
                                <span className='lbl'>Trend Strength</span>
                                <div className='metric-bar'>
                                    <div
                                        className='fill'
                                        style={{ width: `${smart_analysis_data.risk.trendStrength}%` }}
                                    />
                                </div>
                                <span className='val'>{smart_analysis_data.risk.trendStrength}%</span>
                            </div>
                        </div>
                        <div className={classNames('overall-risk', smart_analysis_data.risk.overallRisk)}>
                            Overall Risk: {smart_analysis_data.risk.overallRisk.toUpperCase()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default SmartAnalysisTab;
