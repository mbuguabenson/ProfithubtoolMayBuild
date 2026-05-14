import { useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { Localize } from '@deriv-com/translations';
import './advanced-ou-analyzer.scss';

interface Props {
    selected_digit: number;
    ticks: number[];
}

const AdvancedOUAnalyzer = observer(({ selected_digit, ticks }: Props) => {
    const stats = useMemo(() => {
        const sample_size = 50;
        const slice = ticks.slice(-sample_size);
        const actual_sample = slice.length || 1;

        const count_selected = slice.filter(t => t === selected_digit).length;
        const pct_selected = (count_selected / actual_sample) * 100;

        const momentum_slice = slice.slice(-10);
        const actual_momentum_sample = momentum_slice.length || 1;
        const count_momentum = momentum_slice.filter(t => t === selected_digit).length;
        const pct_momentum = (count_momentum / actual_momentum_sample) * 100;

        // Confidence formula: weighted average of frequency and momentum
        const confidence = pct_selected * 0.7 + pct_momentum * 0.3;

        const over_ticks = slice.filter(t => t > selected_digit);
        const under_ticks = slice.filter(t => t < selected_digit);
        const total_ou = over_ticks.length + under_ticks.length || 1;

        const pct_over = (over_ticks.length / total_ou) * 100;
        const pct_under = (under_ticks.length / total_ou) * 100;

        const grid_data = slice
            .map(t => {
                if (t > selected_digit) return { label: 'O', type: 'over' };
                if (t < selected_digit) return { label: 'U', type: 'under' };
                return { label: 'C', type: 'current' };
            })
            .reverse();

        let confidence_level = 'LOW';
        if (confidence > 15) confidence_level = 'MODERATE';
        if (confidence > 30) confidence_level = 'HIGH';
        if (confidence > 50) confidence_level = 'EXTREME';

        return {
            pct_selected: pct_selected.toFixed(1),
            count_selected,
            pct_momentum: pct_momentum.toFixed(1),
            count_momentum,
            confidence: confidence.toFixed(1),
            confidence_level,
            pct_over: pct_over.toFixed(1),
            pct_under: pct_under.toFixed(1),
            grid_data,
            over_range: selected_digit < 9 ? `${selected_digit + 1}-9` : 'NONE',
            under_range: selected_digit > 0 ? `0-${selected_digit - 1}` : 'NONE',
        };
    }, [selected_digit, ticks]);

    return (
        <div className='advanced-ou-analyzer'>
            <div className='analyzer-power-card'>
                <div className='power-card__header'>
                    <Localize i18n_default_text='Digit {{digit}} Prediction Power' values={{ digit: selected_digit }} />
                </div>

                <div className='power-card__metrics'>
                    <div className='metric-item'>
                        <span className='l'>
                            Frequency <span className='sub'>(Last 50)</span>
                        </span>
                        <span className='v'>{stats.pct_selected}%</span>
                        <span className='sub-v'>{stats.count_selected} times</span>
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
                        <span className='l'>Prediction Confidence</span>
                        <span className={`confidence-tag ${stats.confidence_level.toLowerCase()}`}>
                            {stats.confidence_level}
                        </span>
                    </div>
                    <div className='confidence-track'>
                        <div className='bar' style={{ width: `${stats.confidence}%` }}></div>
                    </div>
                    <div className='confidence-value'>{stats.confidence}% Confidence</div>
                </div>
            </div>

            <div className='analyzer-ou-bars'>
                <div className='ou-bar-item'>
                    <span className='l'>Over ({stats.over_range})</span>
                    <div className='track'>
                        <div className='bar over' style={{ width: `${stats.pct_over}%` }}></div>
                    </div>
                    <span className='v'>{stats.pct_over}%</span>
                </div>
                <div className='ou-bar-item'>
                    <span className='l'>Under ({stats.under_range})</span>
                    <div className='track'>
                        <div className='bar under' style={{ width: `${stats.pct_under}%` }}></div>
                    </div>
                    <span className='v'>{stats.pct_under}%</span>
                </div>
            </div>

            <div className='analyzer-info-bar'>
                <Localize
                    i18n_default_text='Digit {{digit}} appeared {{count}} times ({{pct}}%)'
                    values={{ digit: selected_digit, count: stats.count_selected, pct: stats.pct_selected }}
                />
            </div>

            <div className='analyzer-pattern-grid'>
                <div className='grid-header'>
                    <Localize
                        i18n_default_text='Last 50 Digits (U = Under, O = Over, C = Current Digit {{digit}})'
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

export default AdvancedOUAnalyzer;
