import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';

const Onetrader = observer(() => {
    const { marketkiller } = useStore();
    const {
        onetrader_settings,
        live_market_ribbon,
        digit_stats,
        last_digit,
        signal_power,
        signal_stability,
        signal_strategy,
        use_signals,
        is_running,
    } = marketkiller;

    const handleSettingChange = (field: keyof typeof onetrader_settings, value: any) => {
        marketkiller.onetrader_settings[field] = value as never;
    };

    const stats = marketkiller.stats_engine.getPercentages();

    return (
        <div className='onetrader-v2-container'>
            {/* 1. Market Activity Ribbon */}
            <div className='mk-ribbon'>
                {live_market_ribbon.map(m => (
                    <div key={m.symbol} className={classNames('ribbon-item', { up: m.is_up, down: !m.is_up })}>
                        <div className='r-symbol'>{m.symbol.replace('R_', 'VOL ')}</div>
                        <div className='r-price'>{m.price}</div>
                        <div className='r-digit'>{m.digit ?? '-'}</div>
                    </div>
                ))}
            </div>

            <div className='onetrader-grid'>
                <div className='analytics-column'>
                    {/* 2. Digit Reactor Grid */}
                    <div className={classNames('mk-glass-card reactors-section', { 'signal-glow': marketkiller.signal_detected })}>
                        <div className='section-header'>
                            <h3>DIGIT DISTRIBUTION REACTOR</h3>
                            <div className='signal-status'>
                                <span className='pulse'></span> LIVE SCANNING
                            </div>
                        </div>
                        <div className='digit-reactor-grid'>
                            {digit_stats.map(stat => {
                                const isCurrent = stat.digit === last_digit;
                                const color = isCurrent ? '#f59e0b' : '#6366f1';
                                return (
                                    <div
                                        key={stat.digit}
                                        className={classNames('reactor-core', { 'is-active': isCurrent })}
                                    >
                                        <svg width='80' height='80' viewBox='0 0 100 100'>
                                            <circle
                                                cx='50'
                                                cy='50'
                                                r='45'
                                                fill='none'
                                                stroke='rgba(255, 255, 255, 0.05)'
                                                strokeWidth='6'
                                            />
                                            <circle
                                                cx='50'
                                                cy='50'
                                                r='45'
                                                fill='none'
                                                stroke={color}
                                                strokeWidth='6'
                                                strokeDasharray={`${(stat.percentage / 100) * 282} 282`}
                                                strokeLinecap='round'
                                                style={{ transition: 'all 0.4s ease' }}
                                            />
                                        </svg>
                                        <div className='core-display'>
                                            <span className='digit'>{stat.digit}</span>
                                            <span className='pct'>{stat.percentage.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 3. Market Behavior Stats */}
                    <div className='mk-glass-card behavior-section'>
                        <h3>BEHAVIOR PROBABILITY</h3>
                        <div className='stats-bars'>
                            <StatProgress
                                label='RISE vs FALL'
                                val1={stats.rise}
                                val2={stats.fall}
                                color1='#10b981'
                                color2='#ef4444'
                            />
                            <StatProgress
                                label='EVEN vs ODD'
                                val1={stats.even}
                                val2={stats.odd}
                                color1='#6366f1'
                                color2='#ec4899'
                            />
                            <StatProgress
                                label='OVER vs UNDER'
                                val1={stats.over}
                                val2={stats.under}
                                color1='#8b5cf6'
                                color2='#3b82f6'
                            />
                            <StatProgress
                                label='MATCH vs DIFFER'
                                val1={stats.match}
                                val2={stats.differ}
                                color1='#f59e0b'
                                color2='#94a3b8'
                            />
                        </div>
                    </div>
                </div>

                <div className='config-column'>
                    {/* 4. Signal Control Center */}
                    <div className={classNames('mk-glass-card signal-card', { 'signal-glow': marketkiller.signal_detected })}>
                        <div className='card-top'>
                            <h3>SIGNAL RADAR</h3>
                            <div
                                className={classNames('mk-toggle', { active: use_signals })}
                                onClick={() => (marketkiller.use_signals = !use_signals)}
                            />
                        </div>
                        <div className='radar-stats'>
                            <div className='radar-metric'>
                                <span className='label'>POWER</span>
                                <span className='value' style={{ color: signal_power > 55 ? '#10b981' : '#f59e0b' }}>
                                    {signal_power.toFixed(1)}%
                                </span>
                            </div>
                            <div className='radar-metric'>
                                <span className='label'>STABILITY</span>
                                <span className='value'>{signal_stability.toFixed(0)}</span>
                            </div>
                        </div>
                        <div className='strategy-selector'>
                            <label>ACTIVE STRATEGY</label>
                            <select
                                value={signal_strategy}
                                onChange={e => (marketkiller.signal_strategy = e.target.value)}
                            >
                                <option value='OVER_4'>Over 4 Strategy</option>
                                <option value='UNDER_5'>Under 5 Strategy</option>
                                <option value='EVEN'>Even Domination</option>
                                <option value='ODD'>Odd Domination</option>
                                <option value='RISE'>Momentum Rise</option>
                                <option value='FALL'>Momentum Fall</option>
                            </select>
                        </div>
                    </div>

                    {/* 5. Trade Configuration */}
                    <div className='mk-glass-card trade-config'>
                        <h3>CORE EXECUTION</h3>
                        <div className='input-stack'>
                            <div className='mk-input-group'>
                                <label>STAKE ($)</label>
                                <input
                                    type='number'
                                    step='0.1'
                                    value={onetrader_settings.stake}
                                    onChange={e => handleSettingChange('stake', parseFloat(e.target.value))}
                                />
                            </div>
                            <div className='mk-input-group'>
                                <label>BULK COUNT</label>
                                <input
                                    type='number'
                                    min='1'
                                    value={onetrader_settings.bulk_count}
                                    onChange={e => handleSettingChange('bulk_count', parseInt(e.target.value))}
                                />
                            </div>
                        </div>
                        <button
                            className={classNames('mk-btn-action', { 'is-running': is_running })}
                            onClick={() => marketkiller.toggleEngine()}
                        >
                            {is_running ? 'TERMINATE ENGINE' : 'ACTIVATE ENGINE'}
                        </button>
                    </div>

                    {/* 6. Multi-Level Recovery */}
                    <div className='mk-glass-card recovery-card'>
                        <div className='card-top'>
                            <h3>SMART RECOVERY CHAIN</h3>
                            <div
                                className={classNames('mk-toggle', { active: onetrader_settings.enable_recovery })}
                                onClick={() =>
                                    handleSettingChange('enable_recovery', !onetrader_settings.enable_recovery)
                                }
                            />
                        </div>
                        <div className='recovery-list'>
                            {onetrader_settings.recovery_chain.map((step, idx) => (
                                <div key={step.id} className='recovery-step'>
                                    <div className='step-tag'>LEVEL {idx + 1}</div>
                                    <div className='step-info'>
                                        {step.symbol} • x{step.stake_multiplier}
                                    </div>
                                    <button
                                        className='remove-step-mini'
                                        onClick={() => marketkiller.removeRecoveryStep(step.id)}
                                        style={{
                                            marginLeft: 'auto',
                                            background: 'none',
                                            border: 'none',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            fontSize: '10px',
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <button className='add-step-btn' onClick={() => marketkiller.addRecoveryStep()}>
                                + ADD RECOVERY LEVEL
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

const StatProgress = ({ label, val1, val2, color1, color2 }: any) => (
    <div className='stat-progress-item'>
        <label>{label}</label>
        <div className='progress-track'>
            <div className='segment' style={{ width: `${val1}%`, background: color1 }} />
            <div className='segment' style={{ width: `${val2}%`, background: color2 }} />
        </div>
        <div className='progress-labels'>
            <span>{val1.toFixed(1)}%</span>
            <span>{val2.toFixed(1)}%</span>
        </div>
    </div>
);

export default Onetrader;
