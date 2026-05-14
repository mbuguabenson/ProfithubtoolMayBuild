import { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import QuickSettings from './quick-settings';
import './even-odd-tab.scss';

const EvenOddTab = observer(() => {
    const { analysis, smart_trading } = useStore();
    const {
        symbol,
        setSymbol,
        markets,
        current_price,
        last_digit,
        eo_selected_condition,
        eo_target_side,
        eo_intelligence,
        eo_pattern_streak,
        eo_auto_trade_enabled,
        eo_run_counter,
        eo_cycle_pause,
        trade_journal,
    } = analysis;

    const intel = eo_intelligence;
    const is_active =
        intel &&
        ((eo_selected_condition === 1 && intel.conditions.c1) ||
            (eo_selected_condition === 2 && intel.conditions.c2) ||
            (eo_selected_condition === 3 && intel.conditions.c3) ||
            (eo_selected_condition === 4 && intel.conditions.c4));

    const conditions = [
        { id: 1, label: 'Rank Alignment', desc: 'Most/2nd/Least digits all match target side' },
        { id: 2, label: 'The Bounce', desc: '2+ Opposites followed by 1 Target confirmation' },
        { id: 3, label: 'Exhaustion', desc: 'Power > 60% with decreasing trend + 2 confirmation ticks' },
        { id: 4, label: 'Elite Pro', desc: 'Consecutive appearance of a Most/2nd/Least digit' },
    ];

    return (
        <div className='even-odd-tab nexus-theme eo-nexus'>
            {/* Nexus Header */}
            <div className='nexus-header'>
                <div className='market-control'>
                    <div className='select-wrapper'>
                        <label>ACTIVE MARKET</label>
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
                    <div className='price-ticker'>
                        <span className='label'>SPOT</span>
                        <span className='value'>{current_price}</span>
                        <div className={classNames('last-digit-box', intel?.last_side?.toLowerCase())}>
                            {last_digit ?? '-'}
                        </div>
                    </div>
                </div>

                <div className='nexus-controls'>
                    <div className='control-item auto-toggle'>
                        <label>STRATEGIC AUTO</label>
                        <div
                            className={classNames('nexus-switch', { active: eo_auto_trade_enabled })}
                            onClick={() => (analysis.eo_auto_trade_enabled = !eo_auto_trade_enabled)}
                        >
                            <div className='knob'></div>
                            <span className='label'>{eo_auto_trade_enabled ? 'ON' : 'OFF'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* EO Strategic Dashboard */}
            <div className={classNames('nexus-signal-dashboard', { 'signal-active': is_active })}>
                <div className='condition-selector-ribbon'>
                    {conditions.map(c => (
                        <button
                            key={c.id}
                            className={classNames('cond-btn', { active: eo_selected_condition === c.id })}
                            onClick={() => (analysis.eo_selected_condition = c.id)}
                            title={c.desc}
                        >
                            <span className='num'>{c.id}</span>
                            <span className='txt'>{c.label}</span>
                        </button>
                    ))}
                </div>

                <div className='dashboard-grid eo-grid'>
                    {/* Pattern Insights */}
                    <div className='intel-box patterns'>
                        <div className='side-label'>MARKET INTELLIGENCE</div>
                        <div className='streak-display'>
                            <div className='streak-label'>CURRENT STREAK</div>
                            <div className={classNames('streak-value', eo_pattern_streak?.type?.toLowerCase())}>
                                {eo_pattern_streak?.count ?? 0} {eo_pattern_streak?.type ?? 'WAITING'}
                            </div>
                        </div>
                        <div className='pattern-pills'>
                            <div className={classNames('pill', { active: eo_pattern_streak?.count >= 3 })}>
                                {eo_pattern_streak?.count >= 3 ? `🔥 ${eo_pattern_streak.count} STREAK` : 'NO STREAK'}
                            </div>
                            <div className={classNames('pill', { active: intel?.conditions.c2 })}>
                                {intel?.conditions.c2 ? '⚡ BOUNCE READY' : 'WAITING BOUNCE'}
                            </div>
                        </div>
                    </div>

                    {/* Execution Center */}
                    <div
                        className={classNames('execution-center', {
                            'auto-active': eo_auto_trade_enabled,
                            'cycle-pause': eo_cycle_pause,
                        })}
                    >
                        {eo_cycle_pause ? (
                            <div className='cycle-pause-state'>
                                <div className='nexus-loader'></div>
                                <div className='title'>CYCLE COMPLETE</div>
                                <div className='meta'>Re-analysing market for next 15 ticks...</div>
                            </div>
                        ) : is_active ? (
                            <div className='active-signal-info'>
                                <div className='signal-title'>
                                    {eo_auto_trade_enabled ? 'AUTO EXECUTING' : 'STRATEGIC ENTRY MET'}
                                </div>
                                <div className='condition-meta'>
                                    <span className='label'>LOGIC {eo_selected_condition}:</span>
                                    <span className='val'>
                                        {conditions.find(c => c.id === eo_selected_condition)?.label}
                                    </span>
                                </div>
                                {!eo_auto_trade_enabled && (
                                    <button
                                        className='btn-execute-nexus'
                                        onClick={() => {
                                            analysis.recordEOTrade();
                                            smart_trading.manualTrade(
                                                eo_target_side === 'EVEN' ? 'DIGITEVEN' : 'DIGITODD'
                                            );
                                        }}
                                    >
                                        TRADE {eo_target_side} NOW
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className='scanning-state'>
                                <div className='scan-line'></div>
                                <span>AWAITING LOGIC {eo_selected_condition}...</span>
                                <small>
                                    {eo_target_side} Bias Scanning | {eo_auto_trade_enabled ? 'AUTO ON' : 'AUTO OFF'}
                                </small>
                            </div>
                        )}

                        <div className='cycle-progress-container'>
                            <div className='progress-label'>
                                <span>CYCLE PROGRESS</span>
                                <span>{eo_run_counter}/7</span>
                            </div>
                            <div className='progress-track'>
                                <div
                                    className='progress-fill'
                                    style={{ width: `${(eo_run_counter / 7) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Elite Stats */}
                    <div className='intel-box ranks'>
                        <div className='side-label'>ELITE DIGIT RANKINGS</div>
                        <div className='rank-list'>
                            <div className='rank-item gold'>
                                <span>MOST</span>
                                <div className='digit'>{intel?.ranks?.most ?? '-'}</div>
                            </div>
                            <div className='rank-item silver'>
                                <span>2ND</span>
                                <div className='digit'>{intel?.ranks?.second_most ?? '-'}</div>
                            </div>
                            <div className='rank-item bronze'>
                                <span>LEAST</span>
                                <div className='digit'>{intel?.ranks?.least ?? '-'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pattern Journal */}
            <div className='nexus-journal'>
                <div className='journal-header'>
                    <h3>STRATEGIC PATTERN JOURNAL</h3>
                    <div className='counts'>Real-Time Stream</div>
                </div>
                <div className='journal-table-wrapper'>
                    <table className='journal-table'>
                        <thead>
                            <tr>
                                <th>TIME</th>
                                <th>DIGIT</th>
                                <th>SIDE</th>
                                <th>PATTERN</th>
                                <th>SIGNAL</th>
                                <th>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* We can show a live stream of the last 10 ticks with patterns */}
                            <tr className='active-tick'>
                                <td>LIVE</td>
                                <td>{last_digit ?? '-'}</td>
                                <td>
                                    <span className={classNames('badge', intel?.last_side?.toLowerCase())}>
                                        {intel?.last_side ?? '-'}
                                    </span>
                                </td>
                                <td>
                                    {eo_pattern_streak?.count} {eo_pattern_streak?.type}
                                </td>
                                <td>{is_active ? 'ENTRY' : 'SCAN'}</td>
                                <td>
                                    <span className='status-scanning'>MONITORING</span>
                                </td>
                            </tr>
                            {trade_journal.map(t => (
                                <tr key={t.id}>
                                    <td>{t.timestamp}</td>
                                    <td>
                                        <div className='mini-digit'>{t.last_digit}</div>
                                    </td>
                                    <td>
                                        <span className={classNames('badge', t.type?.toLowerCase())}>{t.type}</span>
                                    </td>
                                    <td>{t.tier.toUpperCase()}</td>
                                    <td>{t.signal_power.toFixed(1)}%</td>
                                    <td>
                                        <span className='status-ok'>EXECUTED</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
});

export default EvenOddTab;
