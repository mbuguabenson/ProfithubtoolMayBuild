import { observer } from 'mobx-react-lite';
import ToggleSwitch from '@/components/shared_ui/toggle-switch';
import { useStore } from '@/hooks/useStore';
import DigitCracker from '@/pages/digit-cracker';
import AutomatedTradingView from './components/automated-trading-view';
import BulkTradingView from './components/bulk-trading-view';
import MarketSelector from './components/market-selector';
import SCPTab from './components/scp-tab';
import SignalCentreTab from './components/signal-centre-tab';
import VSenseTurboTab from './components/vsense-turbo-tab';
import MoneyMakerUltraTab from './money-maker-ultra-tab';
import './smart-trading.scss';

const SmartTrading = observer(() => {
    const { smart_trading } = useStore();
    const {
        calculateProbabilities,
        dominance,
        consecutive_even,
        consecutive_odd,
        first_digit_stats,
        is_speedbot_running,
        speedbot_contract_type,
        speedbot_prediction,
        speedbot_stake,
        toggleSpeedbot,
        alternate_even_odd,
        alternate_on_loss,
        recovery_mode,
        ticks_processed,
        wins,
        losses,
        session_pl,
        current_streak,
        current_stake,
        last_digit,
        resetStats,
        active_subtab,
    } = smart_trading;

    const probs = calculateProbabilities();

    const contract_types = [
        { value: 'DIGITEVEN', label: 'Even' },
        { value: 'DIGITODD', label: 'Odd' },
        { value: 'DIGITOVER', label: 'Over' },
        { value: 'DIGITUNDER', label: 'Under' },
        { value: 'DIGITMATCH', label: 'Match' },
        { value: 'DIGITDIFF', label: 'Diff' },
    ];

    return (
        <div className='smart-trading'>
            <div className='smart-trading__sub-tabs'>
                {[
                    { id: 'speed', label: 'Speed Trade' },
                    { id: 'vsense_turbo', label: 'VSense Turbo' },
                    { id: 'money_maker_ultra', label: 'Money Maker Ultra' },
                    { id: 'digit_cracker', label: 'Digit Cracker' },
                    { id: 'automated', label: 'SmartAuto' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        className={`sub-tab-btn ${active_subtab === tab.id ? 'active' : ''}`}
                        onClick={() => smart_trading.setActiveSubtab(tab.id as any)}
                    >
                        {tab.label}
                        {active_subtab === tab.id && <div className='active-indicator' />}
                    </button>
                ))}
            </div>

            {active_subtab === 'signal_centre' && <SignalCentreTab />}
            {active_subtab === 'bulk' && <BulkTradingView />}
            {active_subtab === 'scp' && <SCPTab />}
            {active_subtab === 'vsense_turbo' && <VSenseTurboTab />}
            {active_subtab === 'money_maker_ultra' && <MoneyMakerUltraTab />}
            {active_subtab === 'digit_cracker' && <DigitCracker />}
            {active_subtab === 'automated' && <AutomatedTradingView />}

            {/^(speed|vsense_turbo)$/.test(active_subtab) && (
                <>
                    <div className='smart-trading__analytics'>
                        <div className='analytics-card dominance-card'>
                            <h3>Market Dominance</h3>
                            <div className={`dominance-indicator ${dominance.toLowerCase()}`}>
                                <span className='dominance-text'>{dominance} DOMINANT</span>
                                <div className='glow-effect'></div>
                            </div>
                            <div className='streaks'>
                                <div className='streak-item'>
                                    <span>Even Streak:</span>
                                    <span className='value'>{consecutive_even}</span>
                                </div>
                                <div className='streak-item'>
                                    <span>Odd Streak:</span>
                                    <span className='value'>{consecutive_odd}</span>
                                </div>
                            </div>
                        </div>

                        <div className='analytics-card probability-card'>
                            <h3>Probability Analysis</h3>
                            <div className='prob-wrapper'>
                                <div className='prob-item'>
                                    <div className='label-row'>
                                        <span>EVEN / ODD</span>
                                        <span>
                                            {probs.even.toFixed(1)}% / {probs.odd.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className='dual-bar'>
                                        <div className='bar even' style={{ width: `${probs.even}%` }}></div>
                                        <div className='bar odd' style={{ width: `${probs.odd}%` }}></div>
                                    </div>
                                </div>

                                <div className='prob-item'>
                                    <div className='label-row'>
                                        <span>UNDER (0-3) / OVER (6-9)</span>
                                        <span>
                                            {probs.under.toFixed(1)}% / {probs.over.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className='dual-bar'>
                                        <div className='bar under' style={{ width: `${probs.under}%` }}></div>
                                        <div className='bar over' style={{ width: `${probs.over}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className='analytics-card distribution-card circular-style'>
                            <h3>Digit Distribution Analysis</h3>
                            <div className='digit-grid-wrapper'>
                                {(() => {
                                    // Calculate ranks
                                    const statsWithRank = [...first_digit_stats]
                                        .sort((a, b) => b.percentage - a.percentage)
                                        .map((s, i) => ({ ...s, rank: i + 1 }));

                                    // Sort back by digit for display
                                    const displayStats = statsWithRank.sort((a, b) => a.digit - b.digit);
                                    const group1 = displayStats.slice(0, 5);
                                    const group2 = displayStats.slice(5, 10);

                                    const renderGroup = (group: typeof displayStats) => (
                                        <div className='digit-row'>
                                            {group.map(stat => {
                                                const isCurrent = stat.digit === last_digit;
                                                const dashArray = 140;
                                                const dashOffset = dashArray - (dashArray * stat.percentage) / 100;

                                                let strokeColor = '#6b7280';
                                                if (stat.rank === 1) strokeColor = '#00ff41';
                                                else if (stat.rank === 2) strokeColor = '#ffd700';
                                                else if (stat.rank === 10) strokeColor = '#ff073a';

                                                const finalColor = isCurrent ? '#ff9f00' : strokeColor;

                                                return (
                                                    <div
                                                        key={stat.digit}
                                                        className={`digit-card ${isCurrent ? 'current' : ''}`}
                                                        data-rank={stat.rank}
                                                    >
                                                        <div
                                                            className='digit-circle'
                                                            style={{
                                                                borderColor: finalColor,
                                                                boxShadow: `0 0 12px ${finalColor}40`,
                                                            }}
                                                        >
                                                            <svg width='50' height='50' viewBox='0 0 50 50'>
                                                                <circle className='bg-circle' cx='25' cy='25' r='22' />
                                                                <circle
                                                                    className='progress-circle'
                                                                    cx='25'
                                                                    cy='25'
                                                                    r='22'
                                                                    style={{ stroke: finalColor }}
                                                                    strokeDasharray={dashArray}
                                                                    strokeDashoffset={dashOffset}
                                                                />
                                                            </svg>
                                                            <span
                                                                className='digit-number'
                                                                style={{ color: finalColor }}
                                                            >
                                                                {stat.digit}
                                                            </span>
                                                        </div>
                                                        <div className='digit-info'>
                                                            <div className='percentage'>
                                                                {stat.percentage.toFixed(1)}%
                                                            </div>
                                                            <div className='rank'>#{stat.rank}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );

                                    return (
                                        <>
                                            {renderGroup(group1)}
                                            {renderGroup(group2)}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    <div className='smart-trading__logic-toggles'>
                        <div className='logic-card'>
                            <div className='toggle-group'>
                                <label>Alternate Even and Odd</label>
                                <ToggleSwitch
                                    id='alternate_even_odd'
                                    is_enabled={alternate_even_odd}
                                    handleToggle={() => (smart_trading.alternate_even_odd = !alternate_even_odd)}
                                />
                            </div>
                        </div>
                        <div className='logic-card'>
                            <div className='toggle-group'>
                                <label>Alternate on Loss</label>
                                <ToggleSwitch
                                    id='alternate_on_loss'
                                    is_enabled={alternate_on_loss}
                                    handleToggle={() => (smart_trading.alternate_on_loss = !alternate_on_loss)}
                                />
                            </div>
                        </div>
                        <div className='logic-card'>
                            <div className='toggle-group'>
                                <label>
                                    <span className='icon'>🔄</span> Recovery Mode
                                </label>
                                <ToggleSwitch
                                    id='recovery_mode'
                                    is_enabled={recovery_mode}
                                    handleToggle={() => (smart_trading.recovery_mode = !recovery_mode)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className='smart-trading__stats-bar'>
                        <div className='stat-item'>Ticks Processed: {ticks_processed}</div>
                        <div className='stat-item'>Last Digit: {last_digit ?? '-'}</div>
                        <div className='stat-item'>
                            Session P/L:
                            <span className={session_pl >= 0 ? 'profit' : 'loss'}>
                                {session_pl >= 0 ? '+' : ''}
                                {session_pl.toFixed(2)}
                            </span>
                        </div>
                        <div className='stat-item'>
                            Wins: <span className='profit'>{wins}</span> | Losses:{' '}
                            <span className='loss'>{losses}</span>
                        </div>
                        <div className='stat-item'>Win Rate: {((wins / (wins + losses || 1)) * 100).toFixed(1)}%</div>
                        <div className='stat-item'>Streak: {current_streak}</div>
                        <div className='stat-item'>Current Stake: {current_stake.toFixed(2)}</div>
                        <button className='btn-reset-stats' onClick={resetStats}>
                            <span className='icon'>🔄</span> Reset Stats
                        </button>
                    </div>

                    <div className='smart-trading__settings'>
                        <div className='settings-card'>
                            <div className='setting-item'>
                                <label>Market</label>
                                <MarketSelector />
                            </div>
                            <div className='setting-item'>
                                <label>Contract Type</label>
                                <select
                                    value={speedbot_contract_type}
                                    onChange={e => (smart_trading.speedbot_contract_type = e.target.value)}
                                >
                                    {contract_types.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {['DIGITOVER', 'DIGITUNDER', 'DIGITMATCH', 'DIGITDIFF'].includes(
                                speedbot_contract_type
                            ) && (
                                <div className='setting-item'>
                                    <label>Prediction (0-9)</label>
                                    <input
                                        type='number'
                                        min='0'
                                        max='9'
                                        value={speedbot_prediction}
                                        onChange={e => (smart_trading.speedbot_prediction = parseInt(e.target.value))}
                                    />
                                </div>
                            )}

                            <div className='setting-item'>
                                <label>Stake</label>
                                <input
                                    type='number'
                                    min='0.35'
                                    step='0.1'
                                    value={speedbot_stake}
                                    onChange={e => (smart_trading.speedbot_stake = parseFloat(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className='smart-trading__controls'>
                        <button
                            className={`btn-speed-trade ${is_speedbot_running ? 'running' : ''}`}
                            onClick={toggleSpeedbot}
                        >
                            {is_speedbot_running ? 'STOP SMART TRADING' : 'START TRADING'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
});

export default SmartTrading;
