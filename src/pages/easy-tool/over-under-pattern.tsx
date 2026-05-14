import { useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { Localize } from '@deriv-com/translations';

import { calculatePatternStats, getOverUnderStats, isDigitPowerIncreasing } from './analysis-utils';
import './over-under-pattern.scss';

const OverUnderPattern = observer(() => {
    const { smart_trading } = useStore();
    const { ticks, stats_sample_size } = smart_trading;

    const analysis = useMemo(() => {
        const slice = ticks.slice(-stats_sample_size);
        const { over_pct, under_pct } = getOverUnderStats(slice);
        const stats = calculatePatternStats(slice);

        // Analyze Previous Window for Trend
        const prev_slice = ticks.slice(-stats_sample_size - 1, -1);
        const prev_stats = getOverUnderStats(prev_slice);

        const is_over_increasing = over_pct > prev_stats.over_pct;
        const is_under_increasing = under_pct > prev_stats.under_pct;

        // Logic for Signals
        let signal_status: 'WAIT' | 'TRADE' | 'UNSTABLE' | 'NONE' = 'NONE';
        let signal_message = '';
        let target_prediction = '';

        // Check if market is unstable (power decreasing while high)
        if ((over_pct > 55 && !is_over_increasing) || (under_pct > 55 && !is_under_increasing)) {
            signal_status = 'UNSTABLE';
            signal_message = 'Unstable Market - Power Decreasing';
        } else {
            // Over Logic
            if (over_pct > 52) {
                if (over_pct < 55) {
                    signal_status = 'WAIT';
                    signal_message = 'Wait... Market > 52%';
                } else if (over_pct >= 55 && is_over_increasing) {
                    signal_status = 'TRADE';
                    signal_message = 'Trade Market - Power Increasing';
                    // Suggestion: If Over is strong, safer predictions are lower digits
                    target_prediction = 'Over 1, 2, 3';
                }
            }

            // Under Logic (Priority if Under is stronger)
            if (under_pct > 52 && under_pct > over_pct) {
                if (under_pct < 55) {
                    signal_status = 'WAIT';
                    signal_message = 'Wait... Market > 52%';
                } else if (under_pct >= 55 && is_under_increasing) {
                    signal_status = 'TRADE';
                    signal_message = 'Trade Market - Power Increasing';
                    // Suggestion: If Under is strong (0-4), safer predictions are higher digits in that range?
                    // "Under 4" wins on 0,1,2,3.
                    target_prediction = 'Under 4, 3';
                }
            }
        }

        // Calculate best digits within specific ranges for entry point
        const best_over_digit = [5, 6, 7, 8, 9].reduce((a, b) => (stats.frequencies[a] > stats.frequencies[b] ? a : b));
        const best_under_digit = [0, 1, 2, 3, 4].reduce((a, b) =>
            stats.frequencies[a] > stats.frequencies[b] ? a : b
        );

        return {
            over_pct: over_pct.toFixed(1),
            under_pct: under_pct.toFixed(1),
            stats,
            signal_status,
            signal_message,
            target_prediction,
            best_over_digit,
            best_under_digit,
            pattern: slice.map(d => ({
                label: d > 4 ? 'O' : 'U',
                type: d > 4 ? 'over' : 'under',
            })),
        };
    }, [ticks, stats_sample_size]);

    return (
        <div className='over-under-pattern'>
            <div className='pattern-title-group'>
                <h3 className='pattern-title'>
                    <Localize i18n_default_text='Over/Under Pattern' />
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
                            {analysis.signal_status === 'UNSTABLE' && '⚠️'}
                        </span>
                        <span className='status-text'>{analysis.signal_message}</span>
                    </div>
                    {analysis.signal_status === 'TRADE' && analysis.target_prediction && (
                        <div className='prediction-box'>
                            <span className='label'>Suggestion:</span>
                            <span className='value'>{analysis.target_prediction}</span>
                        </div>
                    )}
                </div>
            )}

            <div className='pattern-progress-wrapper'>
                <div className='pattern-progress-bar'>
                    <div className='progress-fill under' style={{ width: `${analysis.under_pct}%` }}></div>
                    <div className='progress-fill over' style={{ width: `${analysis.over_pct}%` }}></div>
                </div>
                <div className='progress-labels'>
                    <span>{analysis.under_pct}% UNDER 0-4</span>
                    <span>{analysis.over_pct}% OVER 5-9</span>
                </div>
            </div>

            <div className='pattern-summary-cards'>
                <div className={`summary-card over ${Number(analysis.over_pct) > 55 ? 'signal-active' : ''}`}>
                    <span className='percentage'>{analysis.over_pct}%</span>
                    <span className='label'>
                        <Localize i18n_default_text='OVER 5-9' />
                    </span>
                    <div className='card-footer'>
                        <div className='best-digit'>
                            <span>Best:</span>
                            <span className='digit'>{analysis.best_over_digit}</span>
                        </div>
                    </div>
                </div>
                <div className={`summary-card under ${Number(analysis.under_pct) > 55 ? 'signal-active' : ''}`}>
                    <span className='percentage'>{analysis.under_pct}%</span>
                    <span className='label'>
                        <Localize i18n_default_text='UNDER 0-4' />
                    </span>
                    <div className='card-footer'>
                        <div className='best-digit'>
                            <span>Best:</span>
                            <span className='digit'>{analysis.best_under_digit}</span>
                        </div>
                    </div>
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

export default OverUnderPattern;
