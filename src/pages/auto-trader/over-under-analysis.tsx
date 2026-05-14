import React, { useMemo } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { Localize } from '@deriv-com/translations';

const OverUnderAnalysis = observer(() => {
    const { auto_trader } = useStore();
    const { digit_stats } = auto_trader;
    const [selectedDigit, setSelectedDigit] = React.useState(5);

    const { overCount, underCount, evenCount, oddCount, total } = useMemo(() => {
        let over = 0,
            under = 0,
            even = 0,
            odd = 0,
            sum = 0;
        digit_stats.forEach(stat => {
            sum += stat.count;
            if (stat.digit > selectedDigit) over += stat.count;
            if (stat.digit < selectedDigit) under += stat.count;
            if (stat.digit % 2 === 0) even += stat.count;
            else odd += stat.count;
        });
        return { overCount: over, underCount: under, evenCount: even, oddCount: odd, total: sum };
    }, [digit_stats, selectedDigit]);

    const overProb = total > 0 ? (overCount / total) * 100 : 0;
    const underProb = total > 0 ? (underCount / total) * 100 : 0;
    const evenProb = total > 0 ? (evenCount / total) * 100 : 0;
    const oddProb = total > 0 ? (oddCount / total) * 100 : 0;

    const matchesProb = digit_stats[selectedDigit]?.percentage || 0;
    const differsProb = 100 - matchesProb;

    const is_strategy_active = auto_trader.active_strategy === 'OVER_UNDER';
    const { strategy_status, trade_message, is_market_unstable, is_running, setActiveStrategy } = auto_trader;

    const toggleStrategy = () => {
        if (is_strategy_active && is_running) {
            auto_trader.is_running = false;
            setActiveStrategy(null);
        } else {
            setActiveStrategy('OVER_UNDER');
            auto_trader.is_running = true;
        }
    };

    return (
        <div className='over-under-analysis'>
            <div className='over-under-analysis__header_group'>
                <div className='over-under-analysis__title'>
                    <Localize i18n_default_text='Over / Under Strategy & Analysis' />
                </div>
                <button
                    className={classNames('btn-strategy', { 'btn-stop': is_strategy_active && is_running })}
                    onClick={toggleStrategy}
                >
                    {is_strategy_active && is_running ? 'STOP STRATEGY' : 'START AUTO STRATEGY'}
                </button>
            </div>

            {is_strategy_active && (
                <div className={classNames('strategy-status-panel', { unstable: is_market_unstable })}>
                    <div className='status-row'>
                        <span className='label'>Status:</span>
                        <span className={classNames('value', strategy_status.toLowerCase())}>{strategy_status}</span>
                    </div>
                    <div className='message'>{trade_message}</div>
                </div>
            )}

            <div className='over-under-analysis__selector-label'>
                <Localize i18n_default_text='Select Digit to Analyze (Manual):' />
            </div>
            <div className='over-under-analysis__digit-selector'>
                {Array.from({ length: 10 }, (_, i) => (
                    <div
                        key={i}
                        className={classNames('digit-item', {
                            'digit-item--selected': selectedDigit === i,
                        })}
                        onClick={() => setSelectedDigit(i)}
                    >
                        {i}
                    </div>
                ))}
            </div>

            <div className='over-under-analysis__results'>
                <div className='analysis-section'>
                    <div className='analysis-section__title'>
                        <Localize i18n_default_text='Over / Under' />
                    </div>
                    <div className='analysis-section__cards'>
                        <div
                            className={classNames('probability-card', {
                                'probability-card--dominant': underProb > overProb,
                            })}
                        >
                            <div className='label'>UNDER {selectedDigit}</div>
                            <div className='value'>{underProb.toFixed(1)}%</div>
                        </div>
                        <div
                            className={classNames('probability-card', {
                                'probability-card--dominant': overProb > underProb,
                            })}
                        >
                            <div className='label'>OVER {selectedDigit}</div>
                            <div className='value'>{overProb.toFixed(1)}%</div>
                        </div>
                    </div>
                </div>

                <div className='analysis-section'>
                    <div className='analysis-section__title'>
                        <Localize i18n_default_text='Even / Odd' />
                    </div>
                    <div className='analysis-section__cards'>
                        <div
                            className={classNames('probability-card', {
                                'probability-card--dominant': evenProb > oddProb,
                            })}
                        >
                            <div className='label'>EVEN</div>
                            <div className='value'>{evenProb.toFixed(1)}%</div>
                        </div>
                        <div
                            className={classNames('probability-card', {
                                'probability-card--dominant': oddProb > evenProb,
                            })}
                        >
                            <div className='label'>ODD</div>
                            <div className='value'>{oddProb.toFixed(1)}%</div>
                        </div>
                    </div>
                </div>

                <div className='analysis-section'>
                    <div className='analysis-section__title'>
                        <Localize i18n_default_text='Matches / Differs' />
                    </div>
                    <div className='analysis-section__cards'>
                        <div
                            className={classNames('probability-card', {
                                'probability-card--dominant': matchesProb > 10,
                            })}
                        >
                            <div className='label'>MATCHES {selectedDigit}</div>
                            <div className='value'>{matchesProb.toFixed(1)}%</div>
                        </div>
                        <div
                            className={classNames('probability-card', {
                                'probability-card--dominant': differsProb > 90,
                            })}
                        >
                            <div className='label'>DIFFERS {selectedDigit}</div>
                            <div className='value'>{differsProb.toFixed(1)}%</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default OverUnderAnalysis;
