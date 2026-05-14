import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import ToggleSwitch from '@/components/shared_ui/toggle-switch';
import './bulk-trading-view.scss';

const BulkTradingView = observer(() => {
    const { smart_trading } = useStore();
    const {
        calculateProbabilities,
        current_streak,
        session_pl,
        is_bulk_trading,
        executeBulkTrade,
        speedbot_stake,
        speedbot_contract_type,
        use_martingale,
        martingale_multiplier,
        alternate_even_odd,
        alternate_on_loss,
        take_profit,
        stop_loss,
    } = smart_trading;

    const probs = calculateProbabilities();

    const streak_history = ['E', 'E', 'O', 'O', 'O', 'E', 'E', 'O']; // Mock history for now, can be dynamic later

    return (
        <div className='bulk-trading-view'>
            <div className='bulk-trading-view__analysis'>
                <div className='analysis-header'>
                    <h3>Even/Odd Analysis</h3>
                    <div className='current-streak'>
                        Current Streak: <span className='streak-val'>{current_streak || '1x odd'}</span>
                    </div>
                </div>

                <div className='streak-boxes'>
                    {streak_history.map((s, i) => (
                        <div key={i} className={`streak-box ${s === 'E' ? 'even' : 'odd'}`}>
                            {s}
                        </div>
                    ))}
                </div>

                <div className='percentage-bars'>
                    <div className='bar-wrapper even'>
                        <div className='bar-label'>
                            <span className='icon'>⬛</span> Even
                        </div>
                        <div className='bar-value'>{probs.even.toFixed(2)}%</div>
                        <div className='bar-fill' style={{ width: `${probs.even}%` }}></div>
                    </div>
                    <div className='bar-wrapper odd'>
                        <div className='bar-label'>
                            <span className='icon'>▲</span> Odd
                        </div>
                        <div className='bar-value'>{probs.odd.toFixed(2)}%</div>
                        <div className='bar-fill' style={{ width: `${probs.odd}%` }}></div>
                    </div>
                </div>
            </div>

            <div className='bulk-trading-view__bot-section'>
                <div className='bot-card'>
                    <h2>Turbo Speed AI Bot</h2>

                    <div className='bot-grid'>
                        <div className='bot-field'>
                            <label>Trade Option:</label>
                            <select
                                value={speedbot_contract_type}
                                onChange={e => (smart_trading.speedbot_contract_type = e.target.value)}
                            >
                                <option value='DIGITEVEN'>Even</option>
                                <option value='DIGITODD'>Odd</option>
                            </select>
                        </div>

                        <div className='bot-field'>
                            <label>Stake:</label>
                            <input
                                type='number'
                                value={speedbot_stake}
                                onChange={e => (smart_trading.speedbot_stake = parseFloat(e.target.value))}
                            />
                        </div>

                        <div className='bot-action'>
                            <button
                                className={`btn-start-auto ${is_bulk_trading ? 'running' : ''}`}
                                onClick={executeBulkTrade}
                            >
                                {is_bulk_trading ? '⏹ STOP AUTO' : '▶ START AUTO TRADE'}
                            </button>
                        </div>

                        <div className='bot-field'>
                            <label>Take Profit ($):</label>
                            <input
                                type='number'
                                value={take_profit}
                                onChange={e => (smart_trading.take_profit = parseFloat(e.target.value))}
                            />
                        </div>

                        <div className='bot-field'>
                            <label>Stop Loss ($):</label>
                            <input
                                type='number'
                                value={stop_loss}
                                onChange={e => (smart_trading.stop_loss = parseFloat(e.target.value))}
                            />
                        </div>

                        <div className='bot-stat'>
                            <span className='label'>$ P/L:</span>
                            <span className={`value ${session_pl >= 0 ? 'profit' : 'loss'}`}>
                                ${session_pl.toFixed(2)}
                            </span>
                        </div>

                        <div className='bot-toggle'>
                            <label>Alternate Even and Odd:</label>
                            <ToggleSwitch
                                id='bulk_alt_even_odd'
                                is_enabled={alternate_even_odd}
                                handleToggle={() => (smart_trading.alternate_even_odd = !alternate_even_odd)}
                            />
                        </div>

                        <div className='bot-toggle'>
                            <label>Alternate on Loss:</label>
                            <ToggleSwitch
                                id='bulk_alt_loss'
                                is_enabled={alternate_on_loss}
                                handleToggle={() => (smart_trading.alternate_on_loss = !alternate_on_loss)}
                            />
                        </div>

                        <div className='bot-toggle'>
                            <label>Use Martingale:</label>
                            <ToggleSwitch
                                id='bulk_use_martingale'
                                is_enabled={use_martingale}
                                handleToggle={() => (smart_trading.use_martingale = !use_martingale)}
                            />
                        </div>

                        <div className='bot-toggle'>
                            <label>Compounding Martingale:</label>
                            <ToggleSwitch
                                id='bulk_use_compounding'
                                is_enabled={smart_trading.use_compounding}
                                handleToggle={() => (smart_trading.use_compounding = !smart_trading.use_compounding)}
                            />
                        </div>

                        <div className='bot-field'>
                            <label>Multiplier:</label>
                            <input
                                type='number'
                                value={martingale_multiplier}
                                step='0.05'
                                onChange={e => (smart_trading.martingale_multiplier = parseFloat(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className='bot-footer'>Configure your settings and click Start to begin auto trading.</div>
                </div>
            </div>
        </div>
    );
});

export default BulkTradingView;
