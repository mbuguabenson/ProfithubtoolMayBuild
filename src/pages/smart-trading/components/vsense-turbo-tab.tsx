import { useEffect, useMemo } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import ToggleSwitch from '@/components/shared_ui/toggle-switch';
import { useStore } from '@/hooks/useStore';
import './vsense-turbo-tab.scss';

const VSenseTurboTab = observer(() => {
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
        active_symbols_data,
        v_sense_signals,
        is_turbo_bot_running,
        turbo_bot_state,
        turbo_settings,
        turbo_cooldown_ticks,
        turbo_last_signal,
        wins,
        losses,
        session_pl,
        is_connected,
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

            try {
                listenerKey = await ticks_service.monitor({ symbol, callback });
            } catch (error) {
                console.error('VSenseTurbo: Failed to monitor tick history', error);
            }
        };

        monitorTicks();

        return () => {
            is_mounted = false;
            if (listenerKey) ticks_service.stopMonitor({ symbol, key: listenerKey });
        };
    }, [symbol, ticks_service, updateDigitStats, active_symbols_data]);

    const total_trades = wins + losses;
    const win_rate = total_trades > 0 ? (wins / total_trades) * 100 : 0;

    const handleToggleBulk = () => {
        smart_trading.turbo_settings = {
            ...turbo_settings,
            is_bulk_enabled: !turbo_settings.is_bulk_enabled,
        };
    };

    const handleRiskChange = (risk: number) => {
        smart_trading.turbo_settings = {
            ...turbo_settings,
            max_risk: risk,
        };
    };

    const getStateIcon = () => {
        switch (turbo_bot_state) {
            case 'STOPPED':
                return '📡';
            case 'LISTENING':
                return '🎧';
            case 'SETUP':
                return '⚙️';
            case 'EXECUTING':
                return '🔥';
            case 'COOLDOWN':
                return '⏳';
            default:
                return '🛰️';
        }
    };

    const probs = calculateProbabilities();
    const chart_data = useMemo(() => ticks.slice(-15).map((val, idx) => ({ name: idx, value: val })), [ticks]);

    const max_count = Math.max(...digit_stats.map(s => s.count), 1);
    const getDigitColor = (digit: number) => `var(--digit-${digit % 10})`;

    return (
        <div className='vsense-turbo-tab'>
            {/* Mission Header */}
            <div className='card status-mission-header'>
                <div className='state-monitor'>
                    <div className={classNames('status-indicator', turbo_bot_state)}>{getStateIcon()}</div>
                    <div className='state-text'>
                        <div className='label'>Mission Status</div>
                        <div className='value'>
                            {turbo_bot_state === 'COOLDOWN' ? `COOLDOWN (${turbo_cooldown_ticks}t)` : turbo_bot_state}
                        </div>
                    </div>
                </div>

                <div className='market-controls-wrapper'>
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
                    <div className='price-info'>
                        <div className='stat'>
                            <span className='lbl'>LIVE PRICE</span>
                            <span className='val'>{current_price}</span>
                        </div>
                        <div className='stat'>
                            <span className='lbl'>LAST DIGIT</span>
                            <div className={classNames('digit-box', `d-${last_digit}`)}>{last_digit}</div>
                        </div>
                    </div>
                </div>

                <div className='main-controls'>
                    <button
                        className={classNames('btn-mission', is_turbo_bot_running ? 'stop' : 'start')}
                        onClick={smart_trading.toggleTurboBot}
                        disabled={!is_connected}
                    >
                        {is_turbo_bot_running ? (
                            <>
                                <span>⏹</span> ABORT MISSION
                            </>
                        ) : (
                            <>
                                <span>🚀</span> INITIATE TURBO
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className='main-layout-grid'>
                {/* Left Section: Frequency and Charts */}
                <div className='analysis-section'>
                    <div className='card frequency-card'>
                        <div className='intel-header'>
                            <h3>Digit Frequency Analysis</h3>
                            <span className='v-sense-tag'>V-SENSE™ ENABLED</span>
                        </div>
                        <div className='digit-freq-circles'>
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
                                    <span className='count-label'>{stat.count} T</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className='card trend-card'>
                        <h3>Real-time Digit Trend</h3>
                        <div className='chart-container-premium'>
                            <ResponsiveContainer width='100%' height={200}>
                                <LineChart data={chart_data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid
                                        strokeDasharray='3 3'
                                        vertical={false}
                                        stroke='rgba(255,255,255,0.05)'
                                    />
                                    <XAxis dataKey='name' hide />
                                    <YAxis domain={[0, 9]} ticks={[0, 2, 4, 6, 8, 9]} hide />
                                    <Line
                                        type='monotone'
                                        dataKey='value'
                                        stroke='#8b5cf6'
                                        strokeWidth={3}
                                        dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4, stroke: '#fff' }}
                                        isAnimationActive={true}
                                    >
                                        <LabelList
                                            dataKey='value'
                                            position='top'
                                            offset={10}
                                            fill='#fff'
                                            fontSize={10}
                                            fontWeight={700}
                                        />
                                    </Line>
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className='vsense-signals-dashboard'>
                        <div className='vsense-signals-grid'>
                            {v_sense_signals.map((sig, i) => (
                                <div key={i} className={classNames('vsense-card', sig.status.toLowerCase())}>
                                    <div className='card-top'>
                                        <span className='strategy-name'>{sig.strategy}</span>
                                        <span className='status-badge'>{sig.status}</span>
                                    </div>
                                    <div className='card-main'>
                                        <div className='target-info'>
                                            <span className='lbl'>TARGET</span>
                                            <span className='val'>
                                                {sig.targetDigit !== undefined ? sig.targetDigit : sig.targetSide}
                                            </span>
                                        </div>
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
                                    <div className='reasoning-tooltip'>
                                        {sig.reasoning.map((r, idx) => (
                                            <p key={idx}>{r}</p>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Section: Controls and Stats */}
                <div className='controls-section'>
                    <div className='card intelligence-board'>
                        <div className='intel-header'>
                            <h3>Intelligence Feed</h3>
                        </div>
                        <div className='signal-scooter'>
                            <div className='last-event'>LAST TRIGGER EVENT</div>
                            <div className='event-value'>{turbo_last_signal || 'Searching for patterns...'}</div>
                        </div>

                        <div className='distribution-minified'>
                            <div className='stat-row'>
                                <span>Even/Odd</span>
                                <div className='mini-bar'>
                                    <div className='fill blue' style={{ width: `${probs.even}%` }} />
                                    <div className='fill pink' style={{ width: `${probs.odd}%` }} />
                                </div>
                            </div>
                            <div className='stat-row'>
                                <span>High/Low</span>
                                <div className='mini-bar'>
                                    <div className='fill green' style={{ width: `${probs.under}%` }} />
                                    <div className='fill red' style={{ width: `${probs.over}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className='card execution-settings'>
                        <div className='setting-group'>
                            <label>Execution Mode</label>
                            <div className='toggle-row'>
                                <span>Bulk Burst Mode</span>
                                <ToggleSwitch
                                    id='turbo_bulk_v2'
                                    is_enabled={turbo_settings.is_bulk_enabled}
                                    handleToggle={handleToggleBulk}
                                />
                            </div>
                        </div>

                        <div className='setting-group'>
                            <label>Account Risk Strategy</label>
                            <div className='risk-selector'>
                                <button
                                    className={classNames('risk-btn', { active: turbo_settings.max_risk === 0.02 })}
                                    onClick={() => handleRiskChange(0.02)}
                                >
                                    STEADY (2%)
                                </button>
                                <button
                                    className={classNames('risk-btn', { active: turbo_settings.max_risk === 0.05 })}
                                    onClick={() => handleRiskChange(0.05)}
                                >
                                    AGGRESSIVE (5%)
                                </button>
                            </div>
                        </div>

                        <div className='performance-summary'>
                            <div className='perf-header'>PERFORMANCE SCAN</div>
                            <div className='metric-grid'>
                                <div className='metric-box'>
                                    <span className='lbl'>NET REVENUE</span>
                                    <span className={classNames('val', session_pl >= 0 ? 'profit' : 'loss')}>
                                        {session_pl >= 0 ? '+' : ''}${session_pl.toFixed(2)}
                                    </span>
                                </div>
                                <div className='metric-box'>
                                    <span className='lbl'>WIN RATE</span>
                                    <span className='val'>{win_rate.toFixed(1)}%</span>
                                </div>
                                <div className='metric-box'>
                                    <span className='lbl'>EXECUTIONS</span>
                                    <span className='val'>{total_trades}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className='card alert-card'>
                        <div className='alert-title'>⚠️ SAFETY PROTOCOL</div>
                        <p>Real-time termination active on primary loss detection.</p>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default VSenseTurboTab;
