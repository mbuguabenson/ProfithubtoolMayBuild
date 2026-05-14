import React, { useEffect } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import MatchesKiller from './components/matches-killer';
import Onetrader from './components/onetrader';
import './marketkiller.scss';

const Marketkiller = observer(() => {
    const { marketkiller } = useStore();
    const { active_subtab, current_price, last_digit, symbol, is_connected, is_running } = marketkiller;

    useEffect(() => {
        // Kickstart the isolated streaming socket hook on mount if valid
        if (marketkiller.root_store.common?.is_socket_opened) {
            marketkiller.is_connected = true;
            marketkiller.subscribeToTicks();
        }

        return () => {
            // Safety cleanup hook
            marketkiller.is_running = false;
        };
    }, []);

    // A unified subset of markets
    const markets = [
        { value: 'R_100', label: 'Volatility 100 Index' },
        { value: 'R_50', label: 'Volatility 50 Index' },
        { value: '1HZ100V', label: 'Vol 100 (1s) Index' },
        { value: 'R_75', label: 'Volatility 75 Index' },
        { value: '1HZ75V', label: 'Vol 75 (1s) Index' },
        { value: 'R_25', label: 'Volatility 25 Index' },
        { value: '1HZ25V', label: 'Vol 25 (1s) Index' },
        { value: 'R_10', label: 'Volatility 10 Index' },
        { value: '1HZ10V', label: 'Vol 10 (1s) Index' },
    ];

    return (
        <div className='marketkiller-wrapper'>
            <div className='mk-global-header'>
                <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '24px' }}>🔪</span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <h2
                                style={{
                                    margin: 0,
                                    color: '#fff',
                                    fontSize: '18px',
                                    fontWeight: 800,
                                    letterSpacing: '2px',
                                }}
                            >
                                MARKETKILLER
                            </h2>
                            <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 'bold' }}>
                                {is_connected ? '● LIVE CONNECTION' : '○ RECONNECTING...'}
                            </span>
                        </div>
                    </div>

                    <div className='mk-market-selector'>
                        <label>ACTIVE STREAM</label>
                        <select value={symbol} onChange={e => marketkiller.setSymbol(e.target.value)}>
                            {markets.map(m => (
                                <option key={m.value} value={m.value}>
                                    {m.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className='mk-live-feed'>
                    <div className='price-display'>
                        <span className='label'>TICK QUOTE</span>
                        <span className='value'>{current_price || '0.000'}</span>
                    </div>
                    <div className='digit-display'>{last_digit !== null ? last_digit : '-'}</div>

                    <button
                        className={classNames('mk-btn-primary', { running: is_running })}
                        onClick={() => marketkiller.toggleEngine()}
                        style={{ marginLeft: '16px', padding: '12px 24px' }}
                    >
                        {is_running ? 'TERMINATE ENGINE' : 'ACTIVATE KILLER'}
                    </button>
                </div>
            </div>

            <div className='mk-sub-nav'>
                <button
                    className={classNames({ active: active_subtab === 'onetrader' })}
                    onClick={() => marketkiller.setActiveSubtab('onetrader')}
                >
                    ONETRADER
                </button>
                <button
                    className={classNames({ active: active_subtab === 'matches' })}
                    onClick={() => marketkiller.setActiveSubtab('matches')}
                >
                    MATCHES KILLER
                </button>
            </div>

            <div className='mk-content'>
                {active_subtab === 'onetrader' && <Onetrader />}
                {active_subtab === 'matches' && <MatchesKiller />}
            </div>
        </div>
    );
});

export default Marketkiller;
