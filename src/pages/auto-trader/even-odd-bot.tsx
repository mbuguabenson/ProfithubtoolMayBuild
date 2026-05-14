import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { Localize } from '@deriv-com/translations';

const EvenOddBot = observer(() => {
    const { auto_trader } = useStore();
    const { digit_stats } = auto_trader;

    const { evenCount, oddCount, total } = React.useMemo(() => {
        let even = 0;
        let odd = 0;
        let sum = 0;
        digit_stats.forEach(stat => {
            sum += stat.count;
            if (stat.digit % 2 === 0) even += stat.count;
            else odd += stat.count;
        });
        return { evenCount: even, oddCount: odd, total: sum };
    }, [digit_stats]);

    const evenProb = total > 0 ? (evenCount / total) * 100 : 0;
    const oddProb = total > 0 ? (oddCount / total) * 100 : 0;

    const is_active = auto_trader.active_strategy === 'EVEN_ODD';
    const { strategy_status, trade_message, is_running, setActiveStrategy } = auto_trader;

    const toggleStrategy = () => {
        if (is_active && is_running) {
            auto_trader.is_running = false;
            setActiveStrategy(null);
        } else {
            setActiveStrategy('EVEN_ODD');
            auto_trader.is_running = true;
        }
    };

    return (
        <div className={classNames('even-odd-bot', { 'ev-bot--active': is_active })}>
            <div className='even-odd-bot__title'>
                <Localize i18n_default_text='Even / Odd Strategy (Trend Following)' />
            </div>

            <div className='even-odd-bot__stats'>
                <div className={`side-card ${evenProb > oddProb ? 'dominant' : ''}`}>
                    <div className='label'>EVEN</div>
                    <div className='value'>{evenProb.toFixed(1)}%</div>
                </div>
                <div className={`side-card ${oddProb > evenProb ? 'dominant' : ''}`}>
                    <div className='label'>ODD</div>
                    <div className='value'>{oddProb.toFixed(1)}%</div>
                </div>
            </div>

            {is_active && (
                <div className='match-diff-bot__message'>
                    <span className={classNames('status-label', strategy_status.toLowerCase())}>{strategy_status}</span>
                    <span className='msg-content'>{trade_message}</span>
                </div>
            )}

            <div className='even-odd-bot__controls'>
                <button
                    className={classNames('btn-start', { 'btn-stop': is_active && is_running })}
                    onClick={toggleStrategy}
                >
                    {is_active && is_running ? 'STOP STRATEGY' : 'START EVEN/ODD STRATEGY'}
                </button>
            </div>
        </div>
    );
});

export default EvenOddBot;
