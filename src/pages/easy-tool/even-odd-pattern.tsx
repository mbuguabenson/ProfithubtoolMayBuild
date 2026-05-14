import { useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { Localize } from '@deriv-com/translations';

import { calculatePatternStats, getEvenOddStats, isDigitPowerIncreasing } from './analysis-utils';
import './even-odd-pattern.scss';

const EvenOddPattern = observer(() => {
    const { smart_trading } = useStore();
    const { ticks, stats_sample_size } = smart_trading;

    const analysis = useMemo(() => {
        const slice = ticks.slice(-stats_sample_size);
        const { even_pct, odd_pct, even_count, odd_count } = getEvenOddStats(slice);
        const stats = calculatePatternStats(slice);

        // Analyze Previous Window for Trend
        const prev_slice = ticks.slice(-stats_sample_size - 1, -1);
        const prev_stats = getEvenOddStats(prev_slice);

        const is_even_increasing = even_pct > prev_stats.even_pct;
        const is_odd_increasing = odd_pct > prev_stats.odd_pct;

        // Logic for Signals
        let signal_status: 'WAIT' | 'TRADE' | 'UNSTABLE' | 'NONE' = 'NONE';
        let signal_message = '';
        let entry_point_found = false;

        // --- Even Strategy Logic ---
        // 1. Ranking Check: Most, 2nd Most, Least should be Even
        const top_3 = stats.sorted_digits.slice(0, 3);
        const lowest_1 = stats.sorted_digits[stats.sorted_digits.length - 1];

        const is_most_even = stats.most_frequent % 2 === 0;
        const is_2nd_most_even = stats.second_most_frequent % 2 === 0;
        const is_least_even = stats.least_frequent % 2 === 0;

        // 2. Entry Point Check: 2+ consecutive Odd digits -> Then (Most or Least Even digit appears)
        const last_digit = slice[slice.length - 1];
        const second_last = slice[slice.length - 2];
        const third_last = slice[slice.length - 3];

        // E.g. Odd, Odd, Even(Most/Least)
        const two_consecutive_odds = second_last % 2 !== 0 && third_last % 2 !== 0;
        const entry_trigger_digit = last_digit === stats.most_frequent || last_digit === stats.least_frequent;

        if (is_most_even && is_2nd_most_even && is_least_even && even_pct >= 55) {
            // Basic Conditions Met
            if (two_consecutive_odds && last_digit % 2 === 0 && entry_trigger_digit && is_even_increasing) {
                signal_status = 'TRADE';
                signal_message = 'Trade EVEN - Perfect setup + Entry';
                entry_point_found = true;
            } else {
                signal_status = 'WAIT';
                signal_message = 'Wait for Entry (2 Odds + Reversal)';
            }
        }

        // --- Odd Strategy Logic (Vice Versa) ---
        const is_most_odd = stats.most_frequent % 2 !== 0;
        const is_2nd_most_odd = stats.second_most_frequent % 2 !== 0;
        const is_least_odd = stats.least_frequent % 2 !== 0;

        if (is_most_odd && is_2nd_most_odd && is_least_odd && odd_pct >= 55) {
            const two_consecutive_evens = second_last % 2 === 0 && third_last % 2 === 0;
            const entry_trigger_digit_odd = last_digit === stats.most_frequent || last_digit === stats.least_frequent;

            if (two_consecutive_evens && last_digit % 2 !== 0 && entry_trigger_digit_odd && is_odd_increasing) {
                signal_status = 'TRADE';
                signal_message = 'Trade ODD - Perfect setup + Entry';
                entry_point_found = true;
            } else if (signal_status === 'NONE') {
                // Don't overwrite if Even is waiting
                signal_status = 'WAIT';
                signal_message = 'Wait for Entry (2 Evens + Reversal)';
            }
        }

        return {
            even_pct: even_pct.toFixed(1),
            odd_pct: odd_pct.toFixed(1),
            signal_status,
            signal_message,
            entry_point_found,
            stats,
            pattern: slice.map(d => ({
                label: d % 2 === 0 ? 'E' : 'O',
                type: d % 2 === 0 ? 'even' : 'odd',
            })),
        };
    }, [ticks, stats_sample_size]);

    return (
        <div className='even-odd-pattern'>
            <div className='pattern-title-group'>
                <h3 className='pattern-title'>
                    <Localize i18n_default_text='Even/Odd Pattern' />
                </h3>
                <div className='pattern-title-underline'></div>
            </div>

            {/* Signal Display */}
            {analysis.signal_status !== 'NONE' && (
                <div className={`signal-banner status-${analysis.signal_status.toLowerCase()}`}>
                    <div className='signal-main'>
                        <span className='status-icon'>
                            {analysis.signal_status === 'TRADE' && '🚀'}
                            {analysis.signal_status === 'WAIT' && '⏳'}
                        </span>
                        <span className='status-text'>{analysis.signal_message}</span>
                    </div>
                </div>
            )}

            <div className='pattern-progress-wrapper'>
                <div className='pattern-progress-bar'>
                    <div className='progress-fill even' style={{ width: `${analysis.even_pct}%` }}></div>
                    <div className='progress-fill odd' style={{ width: `${analysis.odd_pct}%` }}></div>
                </div>
                <div className='progress-labels'>
                    <span>{analysis.even_pct}% EVEN</span>
                    <span>{analysis.odd_pct}% ODD</span>
                </div>
            </div>

            <div className='pattern-summary-cards'>
                <div className={`summary-card even ${Number(analysis.even_pct) > 55 ? 'signal-active' : ''}`}>
                    <span className='percentage'>{analysis.even_pct}%</span>
                    <span className='label'>
                        <Localize i18n_default_text='EVEN' />
                    </span>
                    {analysis.signal_status === 'TRADE' && analysis.even_pct > analysis.odd_pct && (
                        <div className='signal-badge pulse'>
                            <Localize i18n_default_text='HIGH SIGNAL' />
                        </div>
                    )}
                </div>
                <div className={`summary-card odd ${Number(analysis.odd_pct) > 55 ? 'signal-active' : ''}`}>
                    <span className='percentage'>{analysis.odd_pct}%</span>
                    <span className='label'>
                        <Localize i18n_default_text='ODD' />
                    </span>
                    {analysis.signal_status === 'TRADE' && analysis.odd_pct > analysis.even_pct && (
                        <div className='signal-badge pulse'>
                            <Localize i18n_default_text='HIGH SIGNAL' />
                        </div>
                    )}
                </div>
            </div>

            <div className='pattern-history-section'>
                <div className='section-label'>
                    <Localize i18n_default_text='Last {{count}} Digits Pattern' values={{ count: stats_sample_size }} />
                </div>
                <div className='pattern-grid'>
                    {analysis.pattern.map((item, index) => (
                        <div key={index} className={`pattern-circle ${item.type}`}>
                            {item.label}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

export default EvenOddPattern;
