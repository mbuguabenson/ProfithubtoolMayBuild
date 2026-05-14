import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { Localize } from '@deriv-com/translations';

const MarketSelector = observer(() => {
    const { auto_trader } = useStore();
    const { symbol, setSymbol, current_price, last_digit, is_connected, markets } = auto_trader;

    return (
        <div className='market-selector'>
            <div className='market-selector__main'>
                <div className='market-selector__dropdown'>
                    <select value={symbol} onChange={e => setSymbol(e.target.value)} className='market-select'>
                        {markets.map(group => (
                            <optgroup key={group.group} label={group.group}>
                                {group.items.map(m => (
                                    <option key={m.value} value={m.value}>
                                        {m.label}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>

                <div className='market-selector__price-info'>
                    <div className='price-display'>
                        <span className='label'>
                            <Localize i18n_default_text='Price:' />
                        </span>
                        <span className='value'>{current_price}</span>
                    </div>
                    <div className='last-digit-display'>
                        <span className='label'>
                            <Localize i18n_default_text='Last Digit:' />
                        </span>
                        <span
                            className={classNames('value', {
                                even: last_digit !== null && last_digit % 2 === 0,
                                odd: last_digit !== null && last_digit % 2 !== 0,
                            })}
                        >
                            {last_digit !== null ? last_digit : '-'}
                        </span>
                    </div>
                </div>
            </div>

            <div className='market-selector__status'>
                <div className={classNames('status-dot', { connected: is_connected })} />
                <span className='status-text'>
                    {is_connected ? (
                        <Localize i18n_default_text='Connected' />
                    ) : (
                        <Localize i18n_default_text='Disconnected' />
                    )}
                </span>
            </div>
        </div>
    );
});

export default MarketSelector;
