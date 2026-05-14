import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import {
    LabelPairedChartMixedCaptionRegularIcon,
    LabelPairedCircleInfoCaptionRegularIcon,
} from '@deriv/quill-icons/LabelPaired';
import { runInAction } from 'mobx';

const StrategyTile = observer(({ strategy }: { strategy: any }) => {
    const { smart_trading } = useStore();
    const { calculateProbabilities, digit_stats, current_price, toggleStrategy } = smart_trading;
    const probs = calculateProbabilities();

    const renderAnalysis = () => {
        switch (strategy.id) {
            case 'even_odd_digits':
                return (
                    <div className='analysis-pattern'>
                        {smart_trading.ticks.slice(-8).map((t, i) => (
                            <span key={i} className={`digit-box ${t % 2 === 0 ? 'even' : 'odd'}`}>
                                {t % 2 === 0 ? 'E' : 'O'}
                            </span>
                        ))}
                    </div>
                );
            case 'even_odd_percentages':
                return (
                    <div className='analysis-bar'>
                        <div className='bar-item even' style={{ width: `${probs.even}%` }}>
                            Even: {probs.even.toFixed(2)}%
                        </div>
                        <div className='bar-item odd' style={{ width: `${probs.odd}%` }}>
                            Odd: {probs.odd.toFixed(2)}%
                        </div>
                    </div>
                );
            case 'over_under_digits':
                return (
                    <div className='analysis-digits'>
                        {smart_trading.ticks.slice(-8).map((t, i) => (
                            <span key={i} className={`digit-box ${t > 5 ? 'over' : 'under'}`}>
                                {t > 5 ? 'U' : 'D'}
                            </span>
                        ))}
                    </div>
                );
            case 'over_under_percentages':
                return (
                    <div className='analysis-bar'>
                        <div className='bar-item over' style={{ width: `${probs.over}%` }}>
                            Over 5: {probs.over.toFixed(2)}%
                        </div>
                        <div className='bar-item under' style={{ width: `${probs.under}%` }}>
                            Under 5: {probs.under.toFixed(2)}%
                        </div>
                    </div>
                );
            case 'matches_differs': {
                const stat = digit_stats.find(s => s.digit === strategy.target_digit);
                return (
                    <div className='analysis-bar'>
                        <div className='bar-item match' style={{ width: `${stat?.percentage || 0}%` }}>
                            Matches: {(stat?.percentage || 0).toFixed(2)}%
                        </div>
                        <div className='bar-item differ' style={{ width: `${100 - (stat?.percentage || 0)}%` }}>
                            Differs: {(100 - (stat?.percentage || 0)).toFixed(2)}%
                        </div>
                    </div>
                );
            }
            default:
                return null;
        }
    };

    return (
        <div className={`strategy-tile ${strategy.status}`}>
            <div className='tile-header'>
                <div className='title-group'>
                    <LabelPairedChartMixedCaptionRegularIcon className='icon' />
                    <h3>{strategy.title}</h3>
                </div>
                <LabelPairedCircleInfoCaptionRegularIcon className='info-icon' />
            </div>

            <div className='market-info'>
                <span className='symbol-name'>Volatility 100 Index</span>
                <span className='price'>{current_price}</span>
            </div>

            <div className='analysis-section'>{renderAnalysis()}</div>

            <div className='config-section'>
                {strategy.id === 'even_odd_digits' && (
                    <>
                        <div className='config-row'>
                            <span>Check if the last</span>
                            <input
                                type='number'
                                value={strategy.check_last_x}
                                onChange={e => runInAction(() => (strategy.check_last_x = parseInt(e.target.value)))}
                            />
                            <span>digits are</span>
                            <select
                                value={strategy.target_pattern}
                                onChange={e => runInAction(() => (strategy.target_pattern = e.target.value))}
                            >
                                <option value='Even'>Even</option>
                                <option value='Odd'>Odd</option>
                            </select>
                        </div>
                        <div className='config-row'>
                            <span>Then trade</span>
                            <span className='highlight'>{strategy.target_pattern}</span>
                        </div>
                    </>
                )}

                {strategy.id === 'even_odd_percentages' && (
                    <>
                        <div className='config-row'>
                            <span>If</span>
                            <select
                                value={strategy.target_side}
                                onChange={e => runInAction(() => (strategy.target_side = e.target.value))}
                            >
                                <option value='Even'>Even%</option>
                                <option value='Odd'>Odd%</option>
                            </select>
                            <select
                                value={strategy.target_op || '>='}
                                onChange={e => runInAction(() => (strategy.target_op = e.target.value))}
                            >
                                <option value='>='>&gt;=</option>
                                <option value='<='>&lt;=</option>
                            </select>
                            <input
                                type='number'
                                value={strategy.threshold_pct}
                                onChange={e => runInAction(() => (strategy.threshold_pct = parseInt(e.target.value)))}
                            />
                            <span>%</span>
                        </div>
                        <div className='config-row'>
                            <span>Then trade</span>
                            <span className='highlight'>{strategy.target_side}</span>
                        </div>
                    </>
                )}

                {strategy.id === 'over_under_digits' && (
                    <>
                        <div className='config-row'>
                            <span>Check if the last</span>
                            <input
                                type='number'
                                value={strategy.check_last_x}
                                onChange={e => runInAction(() => (strategy.check_last_x = parseInt(e.target.value)))}
                            />
                            <span>digits are</span>
                            <select
                                value={strategy.condition}
                                onChange={e => runInAction(() => (strategy.condition = e.target.value))}
                            >
                                <option value='Greater than'>Greater than</option>
                                <option value='Less than'>Less than</option>
                            </select>
                            <input
                                type='number'
                                value={strategy.threshold_val}
                                onChange={e => runInAction(() => (strategy.threshold_val = parseInt(e.target.value)))}
                            />
                        </div>
                        <div className='config-row'>
                            <span>Then trade</span>
                            <span className='highlight'>{strategy.trade_target}</span>
                            <span>prediction</span>
                            <input
                                type='number'
                                value={strategy.prediction}
                                onChange={e => runInAction(() => (strategy.prediction = parseInt(e.target.value)))}
                            />
                        </div>
                    </>
                )}

                {strategy.id === 'over_under_percentages' && (
                    <>
                        <div className='config-row'>
                            <span>If Digit</span>
                            <input
                                type='number'
                                value={strategy.target_digit}
                                onChange={e => runInAction(() => (strategy.target_digit = parseInt(e.target.value)))}
                            />
                            <select
                                value={strategy.target_type}
                                onChange={e => runInAction(() => (strategy.target_type = e.target.value))}
                            >
                                <option value='Over %'>Over %</option>
                                <option value='Under %'>Under %</option>
                            </select>
                            <span>is &gt;= than</span>
                            <input
                                type='number'
                                value={strategy.threshold_pct}
                                onChange={e => runInAction(() => (strategy.threshold_pct = parseInt(e.target.value)))}
                            />
                            <span>%</span>
                        </div>
                        <div className='config-row'>
                            <span>Then trade</span>
                            <span className='highlight'>{strategy.trade_target}</span>
                        </div>
                    </>
                )}

                {strategy.id === 'rise_fall' && (
                    <>
                        <div className='config-row'>
                            <span>If</span>
                            <select
                                value={strategy.target_side}
                                onChange={e => runInAction(() => (strategy.target_side = e.target.value))}
                            >
                                <option value='Rise'>Rise%</option>
                                <option value='Fall'>Fall%</option>
                            </select>
                            <span>is &gt;= than</span>
                            <input
                                type='number'
                                value={strategy.threshold_pct}
                                onChange={e => runInAction(() => (strategy.threshold_pct = parseInt(e.target.value)))}
                            />
                            <span>%</span>
                        </div>
                        <div className='config-row'>
                            <span>Then trade</span>
                            <span className='highlight'>{strategy.target_side}</span>
                        </div>
                    </>
                )}

                {strategy.id === 'matches_differs' && (
                    <>
                        <div className='config-row'>
                            <span>If Digit</span>
                            <input
                                type='number'
                                value={strategy.target_digit}
                                onChange={e => runInAction(() => (strategy.target_digit = parseInt(e.target.value)))}
                            />
                            <select
                                value={strategy.target_type}
                                onChange={e => runInAction(() => (strategy.target_type = e.target.value))}
                            >
                                <option value='Matches %'>Matches %</option>
                                <option value='Differs %'>Differs %</option>
                            </select>
                            <span>is &gt;= than</span>
                            <input
                                type='number'
                                value={strategy.threshold_pct}
                                onChange={e => runInAction(() => (strategy.threshold_pct = parseInt(e.target.value)))}
                            />
                            <span>%</span>
                        </div>
                        <div className='config-row'>
                            <span>Then trade</span>
                            <span className='highlight'>{strategy.trade_target}</span>
                        </div>
                    </>
                )}
            </div>

            <div className='params-grid'>
                <div className='param-item'>
                    <label>Ticks</label>
                    <input type='number' value={strategy.ticks} readOnly />
                </div>
                <div className='param-item'>
                    <label>Stake</label>
                    <input type='number' value={strategy.stake} readOnly />
                </div>
                <div className='param-item'>
                    <label>Martingale</label>
                    <input type='number' value={strategy.martingale} readOnly />
                </div>
            </div>

            <button
                className={`start-btn ${strategy.is_active ? 'active' : ''}`}
                onClick={() => toggleStrategy(strategy.id)}
            >
                {strategy.is_active ? 'Stop Auto Trade' : 'Start Auto Trading'}
            </button>

            <div className='status-bar'>
                <span className='status-dot'></span>
                {strategy.is_active ? (strategy.status === 'trading' ? 'Trading...' : 'Waiting...') : 'Ready'}
            </div>
        </div>
    );
});

export default StrategyTile;
