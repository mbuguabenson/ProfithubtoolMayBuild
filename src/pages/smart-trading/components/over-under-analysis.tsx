import { useMemo } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import QuickSettings from './quick-settings';
import './over-under-analysis.scss';

const OverUnderAnalysis = observer(() => {
    const { smart_trading } = useStore();
    const { ticks, current_price, last_digit, symbol, setSymbol, markets } = smart_trading;

    const analysis = useMemo(() => {
        if (ticks.length === 0) return null;

        const total = ticks.length;
        const underDigits = ticks.filter(d => d < 5);
        const overDigits = ticks.filter(d => d >= 5);

        const underPercent = (underDigits.length / total) * 100;
        const overPercent = (overDigits.length / total) * 100;

        // Digit stats
        const digitsInfo = Array.from({ length: 10 }, (_, digit) => {
            const digitTicks = ticks.filter(d => d === digit);
            const count = digitTicks.length;
            const percent = (count / total) * 100;
            const lastSeen = ticks.lastIndexOf(digit);
            const gap = lastSeen === -1 ? total : ticks.length - 1 - lastSeen;

            return {
                digit,
                count,
                percent,
                gap,
                isUnder: digit < 5,
            };
        });

        return {
            underPercent,
            overPercent,
            underCount: underDigits.length,
            overCount: overDigits.length,
            total,
            digitsInfo,
        };
    }, [ticks]);

    return (
        <div className='over-under-analysis'>
            {/* Premium Market Header */}
            <div className='premium-market-header'>
                <div className='market-select-glass'>
                    <label>ANALYSIS MARKET</label>
                    <select value={symbol} onChange={e => setSymbol(e.target.value)}>
                        {markets.map(g => (
                            <optgroup key={g.group} label={g.group}>
                                {g.items.map(i => (
                                    <option key={i.value} value={i.value}>
                                        {i.label}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>
                <div className='price-display-glass'>
                    <span className='lbl'>LIVE PRICE</span>
                    <span className='val'>{current_price || '0.0000'}</span>
                </div>
                <div className='digit-display-glass'>
                    <span className='lbl'>LAST DIGIT</span>
                    <div
                        className={classNames('digit-box', {
                            under: last_digit !== null && last_digit < 5,
                            over: last_digit !== null && last_digit >= 5,
                        })}
                    >
                        {last_digit ?? '-'}
                    </div>
                </div>
            </div>

            <QuickSettings />

            <div className='tab-header'>
                <h2 className='tab-title'>Advanced Over/Under Hub</h2>
            </div>

            {/* Top Summary Grid */}
            <div className='top-analysis-grid'>
                <div
                    className={classNames('analysis-card under', {
                        dominator: (analysis?.underPercent ?? 0) > (analysis?.overPercent ?? 0) + 5,
                    })}
                >
                    <div className='card-label'>UNDER 5 DOMINANCE</div>
                    <div className='percentage'>{analysis?.underPercent.toFixed(1) ?? '0.0'}%</div>
                    <div className='appeared-count'>Active Volume: {analysis?.underCount ?? 0} ticks</div>
                </div>
                <div
                    className={classNames('analysis-card over', {
                        dominator: (analysis?.overPercent ?? 0) > (analysis?.underPercent ?? 0) + 5,
                    })}
                >
                    <div className='card-label'>OVER 4 DOMINANCE</div>
                    <div className='percentage'>{analysis?.overPercent.toFixed(1) ?? '0.0'}%</div>
                    <div className='appeared-count'>Active Volume: {analysis?.overCount ?? 0} ticks</div>
                </div>
            </div>

            {/* All Digits Grid */}
            <div className='all-digits-section'>
                <h3 className='section-title'>Neon Frequency Heatmap</h3>
                <div className='digits-grid'>
                    {analysis?.digitsInfo.map(d => (
                        <div
                            key={d.digit}
                            className={classNames('digit-card', {
                                under: d.isUnder,
                                over: !d.isUnder,
                                current: d.digit === last_digit,
                            })}
                        >
                            <div className='digit-number'>{d.digit}</div>
                            <div className='percent'>{d.percent.toFixed(1)}%</div>
                            <div className='gap-info'>Gap: {d.gap} ticks</div>
                            <div className='type-badge'>{d.isUnder ? 'UNDER' : 'OVER'}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Visual Timeline */}
            <div className='visual-timeline'>
                <div className='timeline-title'>Live High-Energy Stream</div>
                <div className='timeline-grid'>
                    {ticks.slice(-40).map((digit, idx) => (
                        <div
                            key={idx}
                            className={classNames('timeline-box', {
                                under: digit < 5,
                                over: digit >= 5,
                                latest: idx === ticks.slice(-40).length - 1,
                            })}
                        >
                            {digit}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

export default OverUnderAnalysis;
