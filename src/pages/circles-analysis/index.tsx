import { useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { LabelList, Line, LineChart, ResponsiveContainer } from 'recharts';
import { useStore } from '@/hooks/useStore';
import './circles-analysis.scss';

const CirclesAnalysis = observer(() => {
    const { analysis, common, smart_auto } = useStore();
    const [view_strategy, setViewStrategy] = useState<'even_odd' | 'over_under' | 'differs' | 'matches' | 'rise_fall'>(
        'even_odd'
    );
    const logContainerRef = useRef<HTMLDivElement>(null);

    const { is_socket_opened, latency } = common;
    const {
        symbol,
        digit_stats,
        ticks,
        current_price,
        last_digit,
        setSymbol,
        percentages,
        markets,
        total_ticks,
        setTotalTicks,
    } = analysis;

    // --- LOGIC: Frequency Ranks ---
    const sortedStats = useMemo(() => [...digit_stats].sort((a, b) => b.count - a.count), [digit_stats]);
    const statsMap = useMemo(() => {
        const most = sortedStats[0]?.digit;
        const second = sortedStats[1]?.digit;
        const least = [...sortedStats].reverse().find(s => s.count > 0)?.digit ?? sortedStats[9]?.digit;
        return { most, second, least };
    }, [sortedStats]);

    // --- LOGIC: Highest Digits by Segment ---
    const highestEven = useMemo(
        () => [...digit_stats].filter(s => s.digit % 2 === 0).sort((a, b) => b.count - a.count)[0]?.digit,
        [digit_stats]
    );
    const highestOdd = useMemo(
        () => [...digit_stats].filter(s => s.digit % 2 !== 0).sort((a, b) => b.count - a.count)[0]?.digit,
        [digit_stats]
    );
    const highestOver = useMemo(
        () => [...digit_stats].filter(s => s.digit >= 5).sort((a, b) => b.count - a.count)[0]?.digit,
        [digit_stats]
    );
    const highestUnder = useMemo(
        () => [...digit_stats].filter(s => s.digit < 5).sort((a, b) => b.count - a.count)[0]?.digit,
        [digit_stats]
    );

    // --- LOGIC: Signals & Predictions ---
    const signalData = useMemo(() => {
        let prediction = '';
        let confidence = 0;
        let status = 'SCANNING';
        let reason = 'Analyzing market frequency distribution...';

        if (view_strategy === 'even_odd') {
            const even = percentages.even;
            const odd = percentages.odd;
            prediction = even > odd ? 'EVEN' : 'ODD';
            confidence = Math.abs(even - odd) + 50;
            if (confidence > 65) status = 'STRONG SIGNAL';
            else status = 'WAITING';
            reason = `Even/Odd distribution deviating from 50/50 mean (${Math.max(even, odd).toFixed(1)}%).`;
        } else if (view_strategy === 'over_under') {
            const over = percentages.over;
            const under = percentages.under;
            prediction = over > under ? 'OVER' : 'UNDER';
            confidence = Math.abs(over - under) + 50;
            status = confidence > 65 ? 'STRONG SIGNAL' : 'WAITING';
            reason = `Market depth leaning towards ${prediction} zone. Capacity: ${Math.max(over, under).toFixed(0)}%.`;
        } else if (view_strategy === 'differs') {
            prediction = `Digit ${statsMap.least}`;
            confidence = 100 - (digit_stats[statsMap.least]?.percentage || 0);
            status = 'SAFE ENTRY';
            reason = `Digit ${statsMap.least} has the lowest historical frequency (${(digit_stats[statsMap.least]?.percentage || 0).toFixed(1)}%).`;
        } else if (view_strategy === 'matches') {
            prediction = `Digit ${statsMap.most}`;
            confidence = (digit_stats[statsMap.most]?.percentage || 0) * 5;
            status = 'SCANNING FOR MATCH';
            reason = `Targeting high-frequency Digit ${statsMap.most} for potential repetition.`;
        }

        return { prediction, confidence: Math.min(confidence, 99), status, reason };
    }, [percentages, digit_stats, statsMap, view_strategy]);

    // --- LOGIC: Chart Data & History ---
    const chartData = useMemo(() => ticks.slice(-15).map((val, idx) => ({ id: idx, value: val })), [ticks]);
    const last60History = useMemo(() => {
        const lastTicks = ticks.slice(-60);
        if (view_strategy === 'even_odd') return lastTicks.map(d => (d % 2 === 0 ? 'E' : 'O'));
        if (view_strategy === 'over_under') return lastTicks.map(d => (d >= 5 ? 'O' : 'U'));
        return [];
    }, [ticks, view_strategy]);

    const currentStreak = useMemo(() => {
        if (ticks.length === 0) return { count: 0, val: '' };
        let count = 0,
            lastVal = '';
        if (view_strategy === 'even_odd') {
            lastVal = ticks[ticks.length - 1] % 2 === 0 ? 'EVEN' : 'ODD';
            for (let i = ticks.length - 1; i >= 0; i--)
                if ((ticks[i] % 2 === 0 ? 'EVEN' : 'ODD') === lastVal) count++;
                else break;
        } else if (view_strategy === 'over_under') {
            lastVal = ticks[ticks.length - 1] >= 5 ? 'OVER' : 'UNDER';
            for (let i = ticks.length - 1; i >= 0; i--)
                if ((ticks[i] >= 5 ? 'OVER' : 'UNDER') === lastVal) count++;
                else break;
        }
        return { count, val: lastVal };
    }, [ticks, view_strategy]);

    useEffect(() => {
        if (logContainerRef.current) logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }, [smart_auto.logs.length]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeConfig = (smart_auto as any)[`${view_strategy}_config` as keyof typeof smart_auto];
    const handleConfigChange = (key: string, value: any) => smart_auto.updateConfig(view_strategy, key as any, value);

    const contractOptions = [
        { value: 'DIGITEVEN', label: 'DIGIT EVEN' },
        { value: 'DIGITODD', label: 'DIGIT ODD' },
        { value: 'DIGITOVER', label: 'DIGIT OVER' },
        { value: 'DIGITUNDER', label: 'DIGIT UNDER' },
        { value: 'DIGITMATCH', label: 'DIGIT MATCH' },
        { value: 'DIGITDIFF', label: 'DIGIT DIFF' },
        { value: 'CALL', label: 'RISE' },
        { value: 'PUT', label: 'FALL' },
    ];

    return (
        <div className='smart-auto-v3'>
            {/* 1. TOP STRATEGY SELECTOR */}
            <div className='strategy-tabs-row'>
                {[
                    { id: 'even_odd', label: 'EVEN ODD' },
                    { id: 'over_under', label: 'OVER UNDER' },
                    { id: 'differs', label: 'DIFFERS' },
                    { id: 'matches', label: 'MATCHES' },
                    { id: 'rise_fall', label: 'RISE FALL' },
                ].map(strat => (
                    <button
                        key={strat.id}
                        className={classNames('strat-tab', { active: view_strategy === strat.id })}
                        onClick={() => setViewStrategy(strat.id as any)}
                    >
                        {strat.label}
                    </button>
                ))}
            </div>

            {/* 2. COMMAND HEADER */}
            <div className='glass-pod command-header'>
                <div className='h-group'>
                    <label>ACTIVE MARKET</label>
                    <select value={symbol} onChange={e => setSymbol(e.target.value)} className='market-select'>
                        {markets.map(g => (
                            <optgroup key={g.group} label={g.group}>
                                {g.items.map(item => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>
                <div className='h-group'>
                    <label>HISTORY TICKS</label>
                    <input
                        type='number'
                        value={total_ticks}
                        onChange={e => setTotalTicks(parseInt(e.target.value))}
                        className='depth-input num'
                    />
                </div>
                <div className='h-group'>
                    <label>MARKET PRICE</label>
                    <div className='price-display num'>{current_price || '0.000'}</div>
                </div>
                <div className='h-group'>
                    <label>LAST DIGIT</label>
                    <div
                        className={classNames('digit-preview num', {
                            even: last_digit !== null && last_digit % 2 === 0,
                            odd: last_digit !== null && last_digit % 2 !== 0,
                        })}
                    >
                        {last_digit ?? '-'}
                    </div>
                </div>
                <div className='h-group connection'>
                    <div className={classNames('connection-badge', { online: is_socket_opened })}>
                        <div className='pulse-dot' />
                        <span>{is_socket_opened ? 'LIVE' : 'OFFLINE'}</span>
                        <span className='latency num'>{latency}ms</span>
                    </div>
                </div>
            </div>

            {/* 3. MAIN COMMAND WORKSPACE */}
            <div className='command-workspace'>
                {/* LEFT: ANALYTICAL ENGINE */}
                <div className='analysis-column'>
                    <div className='glass-pod stats-panel'>
                        <div className='panel-head'>
                            <h3>Digit Frequency Spectrum</h3>
                        </div>
                        <div className='frequency-bars-v3'>
                            {digit_stats.map(stat => {
                                const isLive = stat.digit === last_digit;
                                return (
                                    <div
                                        key={stat.digit}
                                        className={classNames('bar-item', {
                                            most: stat.digit === statsMap.most,
                                            second: stat.digit === statsMap.second,
                                            least: stat.digit === statsMap.least,
                                            live: isLive,
                                        })}
                                    >
                                        <div className='bar-pct num'>{stat.percentage.toFixed(1)}%</div>
                                        <div className='bar-track'>
                                            <div
                                                className='bar-fill'
                                                style={{
                                                    height: `${(stat.count / Math.max(...digit_stats.map(s => s.count), 1)) * 100}%`,
                                                }}
                                            />
                                        </div>
                                        <div className='bar-label num'>{stat.digit}</div>
                                        {isLive && <div className='live-cursor'>▲</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className='intelligence-grid'>
                        <div className='glass-pod intel-card'>
                            <label>EVEN / ODD PERCENTAGE</label>
                            <div className='dual-stat-bar'>
                                <div className='side ev' style={{ width: `${percentages.even}%` }}>
                                    <span>E {percentages.even.toFixed(0)}%</span>
                                </div>
                                <div className='side od' style={{ width: `${percentages.odd}%` }}>
                                    <span>O {percentages.odd.toFixed(0)}%</span>
                                </div>
                            </div>
                            <div className='hot-digits'>
                                <div className='hot-item'>
                                    HOT E: <span className='ev num'>{highestEven}</span>
                                </div>
                                <div className='hot-item'>
                                    HOT O: <span className='od num'>{highestOdd}</span>
                                </div>
                            </div>
                        </div>
                        <div className='glass-pod intel-card'>
                            <label>OVER (5-9) / UNDER (0-4)</label>
                            <div className='dual-stat-bar ou'>
                                <div className='side ov' style={{ width: `${percentages.over}%` }}>
                                    <span>O {percentages.over.toFixed(0)}%</span>
                                </div>
                                <div className='side un' style={{ width: `${percentages.under}%` }}>
                                    <span>U {percentages.under.toFixed(0)}%</span>
                                </div>
                            </div>
                            <div className='hot-digits'>
                                <div className='hot-item'>
                                    HOT OV: <span className='ov num'>{highestOver}</span>
                                </div>
                                <div className='hot-item'>
                                    HOT UN: <span className='un num'>{highestUnder}</span>
                                </div>
                            </div>
                        </div>
                        <div className='glass-pod intel-card'>
                            <label>MATCH / DIFFER TARGETS</label>
                            <div className='target-info'>
                                <div className='t-row'>
                                    <span className='lbl'>MATCH DIGIT:</span>{' '}
                                    <span className='val m num'>{statsMap.most}</span>
                                </div>
                                <div className='t-row'>
                                    <span className='lbl'>DIFFER DIGIT:</span>{' '}
                                    <span className='val d num'>{statsMap.least}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className='grid-row'>
                        <div className='glass-pod velocity-panel'>
                            <div className='panel-head'>
                                <h3>Tick Velocity</h3>
                                <p>Real-time 15-Tick Trajectory</p>
                            </div>
                            <div className='chart-container'>
                                <ResponsiveContainer width='100%' height={150}>
                                    <LineChart data={chartData}>
                                        <Line
                                            type='monotone'
                                            dataKey='value'
                                            stroke='#06b6d4'
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: '#06b6d4', stroke: '#fff' }}
                                            animationDuration={300}
                                        >
                                            <LabelList
                                                dataKey='value'
                                                position='top'
                                                offset={10}
                                                className='num'
                                                style={{ fill: '#fff', fontWeight: 700 }}
                                            />
                                        </Line>
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className='glass-pod strategy-monitor'>
                            <div className='panel-head'>
                                <h3>Pattern Tracking (60)</h3>
                                <div className='streak-pill' data-side={currentStreak.val}>
                                    {currentStreak.count}x {currentStreak.val}
                                </div>
                            </div>
                            <div className='history-strip large'>
                                {last60History.map((code, i) => (
                                    <div key={i} className={classNames('hist-box num', code)}>
                                        {code}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className='glass-pod last-digits-panel'>
                        <div className='panel-head'>
                            <h3>Last {ticks.length > 20 ? 40 : 20} Digits History</h3>
                        </div>
                        <div className='digits-grid-v3'>
                            {ticks.slice(ticks.length > 20 ? -40 : -20).map((d, i, arr) => (
                                <div
                                    key={i}
                                    className={classNames('digit-cell num', {
                                        live: i === arr.length - 1,
                                        even: d % 2 === 0,
                                        odd: d % 2 !== 0,
                                    })}
                                >
                                    {d}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT: COMMAND & CONTROL */}
                <div className='control-column'>
                    <div className='glass-pod signal-intel-card'>
                        <div className='panel-head'>
                            <h3>Signal Intelligence</h3>
                        </div>
                        <div className='signal-main'>
                            <div className='sig-result'>
                                <label>SUGGESTED PREDICTION</label>
                                <div className='val num'>{signalData.prediction}</div>
                            </div>
                            <div className='sig-confidence'>
                                <label>CONFIDENCE</label>
                                <div className='strength-track'>
                                    <div className='fill' style={{ width: `${signalData.confidence}%` }} />
                                    <span className='pct num'>{signalData.confidence.toFixed(2)}%</span>
                                </div>
                            </div>
                        </div>
                        <div className='sig-status'>
                            <div className='status-dot' data-state={signalData.status} />
                            <span>Entry Status: {signalData.status}</span>
                        </div>
                        <div className='logic-insight v2'>
                            <label>Reasoning</label>
                            <p>{signalData.reason}</p>
                        </div>
                    </div>

                    <div className='glass-pod config-panel'>
                        <div className='panel-head'>
                            <h3>Global Config</h3>
                        </div>
                        <div className='config-grid'>
                            <div className='input-field'>
                                <label>BASE STAKE ($)</label>
                                <input
                                    type='number'
                                    value={activeConfig.stake}
                                    onChange={e => handleConfigChange('stake', parseFloat(e.target.value))}
                                    className='num'
                                />
                            </div>
                            <div className='input-field'>
                                <label>STOP LOSS ($)</label>
                                <input
                                    type='number'
                                    value={activeConfig.max_loss}
                                    onChange={e => handleConfigChange('max_loss', parseFloat(e.target.value))}
                                    className='num'
                                />
                            </div>
                        </div>
                    </div>

                    {/* MANUAL OVERRIDES PANEL */}
                    <div className='glass-pod manual-override-panel'>
                        <div className='panel-head'>
                            <h3>Manual Overrides</h3>
                        </div>
                        <div className='config-grid'>
                            <div className='input-field'>
                                <label>CONTRACT TYPE</label>
                                <select
                                    value={activeConfig.manual_contract_type}
                                    onChange={e => handleConfigChange('manual_contract_type', e.target.value)}
                                >
                                    {contractOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className='input-field'>
                                <label>PREDICTION</label>
                                <input
                                    type='number'
                                    value={activeConfig.manual_prediction}
                                    onChange={e => handleConfigChange('manual_prediction', parseInt(e.target.value))}
                                    className='num'
                                />
                            </div>
                        </div>
                        <div className='config-grid mart-row'>
                            <div className='toggle-field'>
                                <label>MARTINGALE</label>
                                <input
                                    type='checkbox'
                                    checked={activeConfig.manual_use_martingale}
                                    onChange={e => handleConfigChange('manual_use_martingale', e.target.checked)}
                                />
                            </div>
                            <div className='input-field'>
                                <label>MULTIPLIER</label>
                                <input
                                    type='number'
                                    step='0.1'
                                    value={activeConfig.manual_multiplier}
                                    onChange={e => handleConfigChange('manual_multiplier', parseFloat(e.target.value))}
                                    className='num'
                                />
                            </div>
                        </div>
                    </div>

                    <div className='glass-pod execution-panel'>
                        <div className='panel-head'>
                            <h3>Execution Control</h3>
                        </div>
                        <div className='btn-stack'>
                            <button
                                className={classNames('exec-btn manual', {
                                    active: activeConfig.is_running && !activeConfig.is_auto,
                                })}
                                onClick={() => smart_auto.toggleBot(view_strategy, 'manual')}
                                disabled={smart_auto.is_executing}
                            >
                                <div className='icon'>⚡</div>
                                <div className='label'>
                                    <span>MANUAL TRADE</span>
                                    <small>Uses Overrides Below</small>
                                </div>
                            </button>
                            <button
                                className={classNames('exec-btn auto', {
                                    active: activeConfig.is_running && activeConfig.is_auto,
                                })}
                                onClick={() => smart_auto.toggleBot(view_strategy, 'auto')}
                                disabled={smart_auto.is_executing && !activeConfig.is_running}
                            >
                                <div className='icon'>🤖</div>
                                <div className='label'>
                                    <span>INITIALIZE AUTO</span>
                                    <small>Algorithmic Strategy</small>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className='glass-pod stats-summary-panel'>
                        <div className='stat-mini'>
                            <label>SESSION P/L</label>
                            <span
                                className={classNames('val num', {
                                    pos: smart_auto.session_profit > 0,
                                    neg: smart_auto.session_profit < 0,
                                })}
                            >
                                {smart_auto.session_profit > 0 ? '+' : ''}
                                {smart_auto.session_profit.toFixed(2)}
                            </span>
                        </div>
                        <div className='stat-mini'>
                            <label>STATUS</label>
                            <span className='val status num'>{smart_auto.bot_status}</span>
                        </div>
                    </div>

                    <div className='glass-pod telemetry-panel'>
                        <div className='panel-head'>
                            <h3>Telemetry Log</h3>
                            <button className='clear-btn' onClick={() => smart_auto.clearLogs()}>
                                CLEAR
                            </button>
                        </div>
                        <div className='log-container' ref={logContainerRef}>
                            {smart_auto.logs.length === 0 && <div className='empty-log'>Awaiting transmission...</div>}
                            {smart_auto.logs.map((log, i) => (
                                <div key={i} className={classNames('log-entry', log.type)}>
                                    <span className='time num'>
                                        {new Date(log.timestamp).toLocaleTimeString([], {
                                            hour12: false,
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit',
                                        })}
                                    </span>
                                    <span className='msg'>{log.message}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default CirclesAnalysis;
