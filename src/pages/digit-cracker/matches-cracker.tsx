import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { runInAction } from 'mobx';
import classNames from 'classnames';
import './matches-cracker.scss';

const MatchesCracker = observer(() => {
    const { digit_cracker, client } = useStore();
    const { digit_stats, trade_engine, matches_config, matches_ranks, last_digit } = digit_cracker;

    if (!trade_engine) return null;

    const elite = [matches_ranks.most, matches_ranks.second, matches_ranks.least].filter(d => d !== null) as number[];

    const getStatus = (prob: number) => {
        if (prob > 14) return 'avoid';
        if (prob > 11) return 'warn';
        return 'clean';
    };

    const toggleCondition = (index: number) => {
        runInAction(() => {
            const next = [...matches_config.enabled_conditions];
            next[index] = !next[index];
            matches_config.enabled_conditions = next;
        });
    };

    return (
        <div className='eo-cracker matches'>
            <div className='eo-cracker__header'>
                <h2>Matches Intelligence</h2>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className={classNames('mic-toggle-row', { active: matches_config.is_auto })} style={{ padding: '0.4rem 0.8rem' }} onClick={() => runInAction(() => matches_config.is_auto = !matches_config.is_auto)}>
                        <span>AUTO-TARGETS</span>
                        <div className={classNames('toggle-switch', { active: matches_config.is_auto })} />
                    </div>
                </div>
            </div>

            {/* 4-Stage Verification Status */}
            <div className='eo-section glass-panel'>
                <div className='eo-section__title'>Entry Gate — 4-Stage Verification</div>
                <div className='eo-entry-signal' style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'none', border: 'none' }}>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                        {[1, 2, 3, 4].map(s => (
                            <div 
                                key={s} 
                                className={classNames('eo-dot', { 
                                    active: matches_config.verification_stage >= s,
                                    even: matches_config.verification_stage >= s 
                                })}
                                style={{ width: '1.8rem', height: '1.8rem', opacity: matches_config.verification_stage >= s ? 1 : 0.3 }}
                            >
                                {s}
                            </div>
                        ))}
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8' }}>
                         {matches_config.verification_status}
                    </div>
                </div>
            </div>

            <div className='mic-side-by-side'>
                {/* Rankings Table */}
                <div className='eo-section glass-panel' style={{ padding: '0' }}>
                    <div className='intel-header' style={{ padding: '1.2rem 1.4rem 0.8rem' }}>
                        <span className='eo-section__title'>Digit Ranking & Power</span>
                    </div>
                    <div className='mic-intel-card' style={{ border: 'none', background: 'none' }}>
                        <div className='intel-header'>
                            <span>Digit</span>
                            <span>Rank</span>
                            <span>Power</span>
                            <span>Status</span>
                        </div>
                        <div className='intel-body'>
                            {digit_stats.slice().sort((a,b) => a.rank - b.rank).map(stat => (
                                <div key={stat.digit} className={classNames('intel-row', { 'is-last': stat.digit === last_digit })}>
                                    <div className='col-digit'>
                                        <span style={{ color: elite.includes(stat.digit) ? '#6366f1' : '#fff' }}>{stat.digit}</span>
                                        {elite[0] === stat.digit && <span style={{ fontSize: '0.6rem', color: '#f59e0b' }}>[MOST]</span>}
                                        {elite[2] === stat.digit && <span style={{ fontSize: '0.6rem', color: '#f43f5e' }}>[LEAST]</span>}
                                    </div>
                                    <div>{stat.rank}</div>
                                    <div style={{ color: stat.is_increasing ? '#10b981' : '#94a3b8' }}>{stat.percentage.toFixed(1)}%</div>
                                    <div>
                                        <span className={classNames('status-badge', getStatus(stat.percentage))}>
                                            {getStatus(stat.percentage)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Configuration */}
                <div className='mic-controls'>
                    <div className='eo-section glass-panel'>
                        <div className='eo-section__title'>Prediction Tunnels (Up to 3)</div>
                        <div className='settings-stack' style={{ display: 'flex', gap: '0.5rem' }}>
                            {[0, 1, 2].map(idx => (
                                <div key={idx} className='eo-exec-row' style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}>
                                    <span style={{ fontSize: '0.6rem', color: '#64748b' }}>#{idx + 1}</span>
                                    <input 
                                        className='eo-input' 
                                        type='number' 
                                        min='0' max='9'
                                        style={{ width: '100%', textAlign: 'center', borderColor: matches_config.is_auto ? 'transparent' : 'rgba(255,255,255,0.1)' }}
                                        disabled={matches_config.is_auto}
                                        value={matches_config.predictions[idx] ?? 0} 
                                        onChange={e => {
                                            const val = parseInt(e.target.value);
                                            runInAction(() => {
                                                const next = [...matches_config.predictions];
                                                next[idx] = isNaN(val) ? 0 : val;
                                                matches_config.predictions = next;
                                            });
                                        }} 
                                    />
                                </div>
                            ))}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.5rem', fontStyle: 'italic' }}>
                            {matches_config.is_auto ? 'Mode: Automated Discovery Active' : 'Mode: Manual Targeting Active'}
                        </div>
                    </div>

                    <div className='eo-section glass-panel'>
                        <div className='eo-section__title'>Strategy Controls</div>
                        <div className='settings-stack' style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <div className='eo-exec-row' style={{ justifyContent: 'space-between' }}>
                                <label>Stake ($)</label>
                                <input 
                                    className='eo-input' 
                                    type='number' 
                                    value={matches_config.stake} 
                                    onChange={e => runInAction(() => matches_config.stake = parseFloat(e.target.value))} 
                                />
                            </div>
                            <div className='eo-exec-row' style={{ justifyContent: 'space-between' }}>
                                <label>Simultaneous Trades</label>
                                <input 
                                    className='eo-input' 
                                    type='number' 
                                    min='1' max='3'
                                    value={matches_config.simultaneous_trades} 
                                    onChange={e => runInAction(() => matches_config.simultaneous_trades = parseInt(e.target.value))} 
                                />
                            </div>
                            <div className='mic-toggle-row' onClick={() => runInAction(() => matches_config.martingale_enabled = !matches_config.martingale_enabled)}>
                                <span>USE MARTINGALE</span>
                                <div className={classNames('toggle-switch', { active: matches_config.martingale_enabled })} />
                            </div>
                            {matches_config.martingale_enabled && (
                                <div className='eo-exec-row' style={{ justifyContent: 'space-between' }}>
                                    <label>Multiplier (x)</label>
                                    <input 
                                        className='eo-input' 
                                        type='number' 
                                        value={matches_config.martingale_multiplier} 
                                        onChange={e => runInAction(() => matches_config.martingale_multiplier = parseFloat(e.target.value))} 
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className='eo-section glass-panel'>
                        <div className='eo-section__title'>Verification Gates</div>
                        <div className='settings-stack' style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <div className='mic-toggle-row' onClick={() => toggleCondition(0)}>
                                <span>C1: MOMENTUM (INCREASING)</span>
                                <div className={classNames('toggle-switch', { active: matches_config.enabled_conditions[0] })} />
                            </div>
                            <div className='mic-toggle-row' onClick={() => toggleCondition(1)}>
                                <span>C2: LOGIC HOLD (DOUBLE INC)</span>
                                <div className={classNames('toggle-switch', { active: matches_config.enabled_conditions[1] })} />
                            </div>
                            <div className='mic-toggle-row' onClick={() => toggleCondition(2)}>
                                <span>C3: POWER THRESHOLD</span>
                                <div className={classNames('toggle-switch', { active: matches_config.enabled_conditions[2] })} />
                            </div>
                            {matches_config.enabled_conditions[2] && (
                                <div className='eo-condition-row' style={{ paddingLeft: '1rem' }}>
                                    <select className='eo-select' value={matches_config.c3_op} onChange={e => runInAction(() => matches_config.c3_op = e.target.value as any)}>
                                        <option value='>'>{'>'}</option>
                                        <option value='>='>{'>='}</option>
                                        <option value='=='>{'=='}</option>
                                    </select>
                                    <input 
                                        className='eo-input' 
                                        type='number' 
                                        value={matches_config.c3_val} 
                                        onChange={e => runInAction(() => matches_config.c3_val = parseFloat(e.target.value))} 
                                    />
                                    <span>%</span>
                                </div>
                            )}
                            <div className='mic-toggle-row' onClick={() => toggleCondition(3)}>
                                <span>C4: RANK ALIGNMENT</span>
                                <div className={classNames('toggle-switch', { active: matches_config.enabled_conditions[3] })} />
                            </div>
                            {matches_config.enabled_conditions[3] && (
                                <div className='eo-exec-row' style={{ paddingLeft: '1rem', justifyContent: 'space-between' }}>
                                    <label>Recent Tick Match Count</label>
                                    <input 
                                        className='eo-input' 
                                        type='number' 
                                        value={matches_config.c1_count} 
                                        onChange={e => runInAction(() => matches_config.c1_count = parseInt(e.target.value))} 
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Execution */}
            <div className='eo-section glass-panel'>
                <div className='eo-section__title'>Execution</div>
                <div className='eo-exec-btns'>
                    <button
                        className={classNames('eo-btn-primary', { active: matches_config.is_running })}
                        onClick={() => trade_engine.toggleStrategy('matches')}
                    >
                        {matches_config.is_running ? '⏹ STOP MATCHES ENGINE' : '▶ ACTIVATE MATCHES ENGINE'}
                    </button>
                    <button
                        className='eo-btn-secondary'
                        disabled={trade_engine.is_executing}
                        onClick={() => trade_engine.executeManualTrade('matches', digit_cracker.symbol, client.currency || 'USD')}
                    >
                        ONE-SHOT TRADE
                    </button>
                </div>
            </div>
        </div>
    );
});

export default MatchesCracker;
