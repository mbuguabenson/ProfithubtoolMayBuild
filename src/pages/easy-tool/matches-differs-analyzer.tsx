import { useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { Localize } from '@deriv-com/translations';
import './matches-differs-analyzer.scss';
import { calculatePatternStats } from './analysis-utils';

interface Props {
    selected_digit: number;
    ticks: number[];
}

const MatchesDiffersAnalyzer = observer(({ selected_digit, ticks }: Props) => {
    // Explicitly define return type structure for clarity if needed, but inference is fine.
    const stats = useMemo(() => {
        const sample_size = 50;
        const slice = ticks.slice(-sample_size);
        const actual_sample = slice.length || 1;
        const all_stats = calculatePatternStats(slice);

        // Analyze Previous Window for Trend
        const prev_slice = ticks.slice(-sample_size - 1, -1);

        // Calculate percentages for selected digit
        const count_matches = slice.filter(t => t === selected_digit).length;
        const pct_matches = (count_matches / actual_sample) * 100;
        const pct_differs = 100 - pct_matches;

        // Previous percentage for trend
        const prev_count = prev_slice.filter(t => t === selected_digit).length;
        const prev_pct = (prev_count / (prev_slice.length || 1)) * 100;

        const momentum_slice = slice.slice(-10);
        const count_momentum = momentum_slice.filter(t => t === selected_digit).length;
        const pct_momentum = (count_momentum / (momentum_slice.length || 1)) * 100;

        // --- Differs Strategy Logic ---
        // 1. Digit Scope: 2-7
        const is_valid_scope = selected_digit >= 2 && selected_digit <= 7;

        // 2. Rankings: Not Most, Not 2nd Most, Not Least
        const is_not_most = selected_digit !== all_stats.most_frequent;
        const is_not_2nd_most = selected_digit !== all_stats.second_most_frequent;
        const is_not_least = selected_digit !== all_stats.least_frequent;

        // 3. Condition: Below 10% and Decreasing
        const is_below_10 = pct_matches < 10;
        const is_decreasing = pct_matches < prev_pct; // Power decreasing

        // 4. Entry Point: Digit decreases in power AND (Least or Most appearing digit appears)
        const last_digit = slice[slice.length - 1];
        const is_entry_trigger = last_digit === all_stats.most_frequent || last_digit === all_stats.least_frequent;

        let signal_status: 'WAIT' | 'TRADE' | 'UNSTABLE' | 'NONE' = 'NONE';
        let signal_message = '';

        if (!is_valid_scope) {
            signal_message = 'Select Digit 2-7 for Differs Strategy';
        } else if (pct_matches > 10) {
            signal_status = 'WAIT';
            signal_message = 'Wait... Match % > 10%';
        } else if (pct_matches > prev_pct) {
            signal_status = 'UNSTABLE';
            signal_message = 'Unstable - Match Power Increasing';
        } else if (is_not_most && is_not_2nd_most && is_not_least && is_below_10 && is_decreasing) {
            if (is_entry_trigger) {
                signal_status = 'TRADE';
                signal_message = 'Trade DIFFERS - Power Low & Decreasing';
            } else {
                signal_status = 'WAIT';
                signal_message = 'Wait for Entry (Most/Least Reversal)';
            }
        }

        const confidence = pct_matches * 5 + pct_momentum * 2;
        let confidence_level = 'LOW';
        if (confidence > 40) confidence_level = 'MODERATE';
        if (confidence > 70) confidence_level = 'HIGH';
        if (confidence > 100) confidence_level = 'EXTREME';

        const grid_data = slice
            .map(t => {
                if (t === selected_digit) return { label: 'M', type: 'match' };
                return { label: 'D', type: 'differ' };
            })
            .reverse();

        return {
            pct_matches: pct_matches.toFixed(1),
            pct_differs: pct_differs.toFixed(1),
            count_matches,
            pct_momentum: pct_momentum.toFixed(1),
            count_momentum,
            confidence: Math.min(confidence, 100).toFixed(1),
            confidence_level,
            signal_status,
            signal_message,
            grid_data,
            is_valid_scope,
        };
    }, [selected_digit, ticks]);

    return (
        <div className='matches-differs-analyzer'>
            <div className='analyzer-power-card'>
                <div className='power-card__header'>
                    <Localize
                        i18n_default_text='Digit {{digit}} Match Prediction Power'
                        values={{ digit: selected_digit }}
                    />
                </div>

                {/* Signal Banner */}
                {stats.signal_status !== 'NONE' && (
                    <div className={`analysis-signal-banner status-${stats.signal_status.toLowerCase()}`}>
                        <span className='b-icon'>
                            {stats.signal_status === 'TRADE' && '🚀'}
                            {stats.signal_status === 'WAIT' && '⏳'}
                            {stats.signal_status === 'UNSTABLE' && '⚠️'}
                        </span>
                        <span className='b-text'>{stats.signal_message}</span>
                    </div>
                )}

                <div className='power-card__metrics'>
                    <div className='metric-item'>
                        <span className='l'>
                            Match Freq <span className='sub'>(Last 50)</span>
                        </span>
                        <span className='v matches'>{stats.pct_matches}%</span>
                        <span className='sub-v'>{stats.count_matches} times</span>
                    </div>
                    <div className='metric-item'>
                        <span className='l'>
                            Momentum <span className='sub'>(Last 10)</span>
                        </span>
                        <span className='v'>{stats.pct_momentum}%</span>
                        <span className='sub-v'>{stats.count_momentum} recent</span>
                    </div>
                </div>

                <div className='power-card__confidence'>
                    <div className='confidence-header'>
                        <span className='l'>Match Confidence</span>
                        <span className={`confidence-tag ${stats.confidence_level.toLowerCase()}`}>
                            {stats.confidence_level}
                        </span>
                    </div>
                    <div className='confidence-track'>
                        <div className='bar' style={{ width: `${stats.confidence}%` }}></div>
                    </div>
                    <div className='confidence-value'>{stats.confidence}% Probability</div>
                </div>
            </div>

            <div className='analyzer-ou-bars'>
                <div className='ou-bar-item md'>
                    <span className='l'>Matches</span>
                    <div className='track'>
                        <div className='bar matches' style={{ width: `${stats.pct_matches}%` }}></div>
                    </div>
                    <span className='v'>{stats.pct_matches}%</span>
                </div>
                <div className='ou-bar-item md'>
                    <span className='l'>Differs</span>
                    <div className='track'>
                        <div className='bar differs' style={{ width: `${stats.pct_differs}%` }}></div>
                    </div>
                    <span className='v'>{stats.pct_differs}%</span>
                </div>
            </div>

            <div className='analyzer-info-bar'>
                <Localize
                    i18n_default_text='Digit {{digit}} hit {{count}} times in last 50 ticks'
                    values={{ digit: selected_digit, count: stats.count_matches }}
                />
            </div>

            <div className='analyzer-pattern-grid'>
                <div className='grid-header'>
                    <Localize
                        i18n_default_text='Last 50 Digits (M = Match, D = Differ for Digit {{digit}})'
                        values={{ digit: selected_digit }}
                    />
                </div>
                <div className='grid-items'>
                    {stats.grid_data.map((item, index) => (
                        <div key={index} className={`grid-block ${item.type}`}>
                            {item.label}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

export default MatchesDiffersAnalyzer;
