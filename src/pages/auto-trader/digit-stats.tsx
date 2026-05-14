import { useEffect, useMemo } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { Localize } from '@deriv-com/translations';

const DigitStats = observer(() => {
    const { smart_trading, app } = useStore();
    const { digit_stats, stats_sample_size, setStatsSampleSize, updateDigitStats, symbol, last_digit } = smart_trading;
    const { api_helpers_store } = app;

    useEffect(() => {
        if (!api_helpers_store?.ticks_service || !symbol) return;

        let is_mounted = true;
        const { ticks_service } = api_helpers_store;
        let listenerKey: string | null = null;

        const monitorTicks = async () => {
            try {
                // Request enough ticks to cover the largest sample size
                const callback = (ticks: { quote: string | number }[]) => {
                    if (is_mounted && ticks && ticks.length > 0) {
                        const latest = ticks[ticks.length - 1];
                        // Convert quotes to digits - Access store ACTIVE SYMBOLS safely
                        const active_symbols = smart_trading.active_symbols_data;
                        const decimals =
                            active_symbols && active_symbols[symbol]?.pip
                                ? String(active_symbols[symbol].pip).split('.')[1]?.length || 2
                                : 2;

                        const digits = ticks.map(t => {
                            const quote_val = t.quote;
                            let quote_str: string;
                            if (typeof quote_val === 'number') {
                                quote_str = quote_val.toFixed(decimals);
                            } else {
                                quote_str = String(quote_val);
                            }
                            const digit = parseInt(quote_str[quote_str.length - 1]);
                            return isNaN(digit) ? 0 : digit;
                        });

                        // Pass ALL digits to store
                        updateDigitStats(digits, latest.quote);
                    }
                };

                const key = await ticks_service.monitor({ symbol, callback });

                if (is_mounted) {
                    listenerKey = key;
                } else {
                    ticks_service.stopMonitor({ symbol, key });
                }
            } catch (error: any) {
                if (error?.code !== 'AlreadySubscribed' && error?.message !== 'AlreadySubscribed') {
                    console.error(`Error monitoring ticks for ${symbol}:`, JSON.stringify(error, null, 2));
                }
            }
        };

        monitorTicks();

        return () => {
            is_mounted = false;
            if (listenerKey) {
                ticks_service.stopMonitor({ symbol, key: listenerKey });
            }
        };
    }, [stats_sample_size, updateDigitStats, api_helpers_store?.ticks_service, symbol]);

    // ... (rest of logic) ...

    const maxCount = useMemo(() => Math.max(...digit_stats.map(s => s.count)), [digit_stats]);
    const minCount = useMemo(() => Math.min(...digit_stats.map(s => s.count)), [digit_stats]);

    return (
        <div className='digit-stats'>
            <div
                className='digit-stats__header'
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}
            >
                <div className='digit-stats__title' style={{ marginBottom: 0 }}>
                    <Localize i18n_default_text='Digit Distribution' />
                </div>
                <div className='stats-controls'>
                    <select
                        value={stats_sample_size}
                        onChange={e => setStatsSampleSize(Number(e.target.value))}
                        className='premium-select'
                        style={{
                            background: 'rgba(255,255,255,0.05)', // Transparent look
                            color: 'var(--text-prominent)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '0.3rem 0.8rem', // Reduced padding
                            borderRadius: '6px',
                            cursor: 'pointer',
                            outline: 'none',
                            fontSize: '1.1rem', // Reduced font
                        }}
                    >
                        <option value={25}>25 Ticks</option>
                        <option value={50}>50 Ticks</option>
                        <option value={100}>100 Ticks</option>
                        <option value={500}>500 Ticks</option>
                        <option value={1000}>1000 Ticks</option>
                    </select>
                </div>
            </div>
            <div className='digit-stats__grid'>
                {digit_stats.map(stat => {
                    const is_active = last_digit === stat.digit;
                    const radius = 42;
                    const circumference = 2 * Math.PI * radius;
                    const offset = circumference - (stat.percentage / 100) * circumference;

                    return (
                        <div
                            key={stat.digit}
                            className={classNames('digit-ring', {
                                'digit-ring--active': is_active,
                                highest: stat.count === maxCount && maxCount > minCount,
                                lowest: stat.count === minCount && maxCount > minCount,
                            })}
                        >
                            <svg width='100' height='100'>
                                <circle className='bg' cx='50' cy='50' r={radius} />
                                <circle
                                    className='progress'
                                    cx='50'
                                    cy='50'
                                    r={radius}
                                    strokeDasharray={circumference}
                                    strokeDashoffset={offset}
                                />
                            </svg>
                            <div className='digit-ring__info'>
                                <div className='digit-ring__label'>{stat.digit}</div>
                                <div className='digit-ring__percentage'>{stat.percentage.toFixed(1)}%</div>
                            </div>
                            {is_active && <div className='active-cursor' />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default DigitStats;
