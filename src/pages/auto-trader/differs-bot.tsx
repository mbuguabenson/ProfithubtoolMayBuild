import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { Localize } from '@deriv-com/translations';

const DiffersBot = observer(() => {
    const { auto_trader } = useStore();
    const {
        active_strategy,
        setActiveStrategy,
        strategy_status,
        trade_message,
        is_market_unstable,
        strategy_target_digit,
        is_running,
    } = auto_trader;

    const is_active = active_strategy === 'DIFFERS';

    const toggleStrategy = () => {
        if (is_active && is_running) {
            auto_trader.is_running = false;
            setActiveStrategy(null);
        } else {
            setActiveStrategy('DIFFERS');
            auto_trader.is_running = true;
        }
    };

    return (
        <div className={classNames('differs-bot', { 'differs-bot--active': is_active })}>
            <div className='differs-bot__title'>
                <Localize i18n_default_text='Differs Strategy (Low Power & Decreasing)' />
            </div>

            <div className='differs-bot__info'>
                <div className='info-item'>
                    <div className='label'>Strategy Status</div>
                    <div className={classNames('value status-text', strategy_status.toLowerCase())}>
                        {is_active ? strategy_status : 'IDLE'}
                    </div>
                </div>
                <div className='info-item'>
                    <div className='label'>Target Digit</div>
                    <div className='value highlight'>
                        {strategy_target_digit !== null ? strategy_target_digit : '-'}
                    </div>
                </div>
            </div>

            {is_active && (
                <div className={classNames('differs-bot__message', { unstable: is_market_unstable })}>
                    {trade_message}
                </div>
            )}

            <div className='differs-bot__controls'>
                <button
                    className={classNames('btn-start', { 'btn-stop': is_active && is_running })}
                    onClick={toggleStrategy}
                >
                    {is_active && is_running ? 'STOP STRATEGY' : 'START DIFFERS STRATEGY'}
                </button>
            </div>

            <div className='differs-bot__note'>
                <Localize i18n_default_text='Selects digits 2-7 with <10% power & decreasing trend. Entries on extreme digits.' />
            </div>
        </div>
    );
});

export default DiffersBot;
