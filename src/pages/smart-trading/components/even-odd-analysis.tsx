import { useMemo } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import QuickSettings from './quick-settings';
import './even-odd-analysis.scss';

const EvenOddAnalysis = observer(() => {
    const { smart_trading } = useStore();
    const { ticks, current_price, last_digit, symbol, setSymbol, markets } = smart_trading;

    const analysis = useMemo(() => {
        if (ticks.length === 0) return null;

        const total = ticks.length;
        const evenDigits = ticks.filter(d => d % 2 === 0);
        const oddDigits = ticks.filter(d => d % 2 !== 0);

        const evenPercent = (evenDigits.length / total) * 100;
        const oddPercent = (oddDigits.length / total) * 100;

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
                isEven: digit % 2 === 0,
            };
        });

        return {
            evenPercent,
            oddPercent,
            evenCount: evenDigits.length,
            oddCount: oddDigits.length,
            total,
            digitsInfo,
        };
    }, [ticks]);

    return (
        <div className='even-odd-analysis'>
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
                            even: last_digit !== null && last_digit % 2 === 0,
                            odd: last_digit !== null && last_digit % 2 !== 0,
                        })}
                    >
                        {last_digit ?? '-'}
                    </div>
                </div>
            </div>

            <QuickSettings />

            <div className='tab-header'>
                <h2 className='tab-title'>Electric Even/Odd Hub</h2>
            </div>

            {/* Top Summary Grid */}
            <div className='top-analysis-grid'>
                <div
                    className={classNames('analysis-card even', {
                        dominator: (analysis?.evenPercent ?? 0) > (analysis?.oddPercent ?? 0) + 5,
                    })}
                >
                    <div className='card-label'>EVEN DOMINANCE</div>
                    <div className='percentage'>{analysis?.evenPercent.toFixed(1) ?? '0.0'}%</div>
                    <div className='appeared-count'>Volume: {analysis?.evenCount ?? 0} ticks</div>
                </div>
                <div
                    className={classNames('analysis-card odd', {
                        dominator: (analysis?.oddPercent ?? 0) > (analysis?.evenPercent ?? 0) + 5,
                    })}
                >
                    <div className='card-label'>ODD DOMINANCE</div>
                    <div className='percentage'>{analysis?.oddPercent.toFixed(1) ?? '0.0'}%</div>
                    <div className='appeared-count'>Volume: {analysis?.oddCount ?? 0} ticks</div>
                </div>
            </div>

            {/* All Digits Grid */}
            <div className='all-digits-section'>
                <h3 className='section-title'>Vibrant Frequency Analysis</h3>
                <div className='digits-grid'>
                    {analysis?.digitsInfo.map(d => (
                        <div
                            key={d.digit}
                            className={classNames('digit-card', {
                                even: d.isEven,
                                odd: !d.isEven,
                                current: d.digit === last_digit,
                            })}
                        >
                            <div className='digit-number'>{d.digit}</div>
                            <div className='percent'>{d.percent.toFixed(1)}%</div>
                            <div className='gap-info'>Last seen {d.gap} ticks ago</div>
                            <div className='type-badge'>{d.isEven ? 'EVEN' : 'ODD'}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Visual Timeline */}
            <div className='visual-timeline'>
                <div className='timeline-title'>Live Neon Stream</div>
                <div className='timeline-grid'>
                    {ticks.slice(-40).map((digit, idx) => (
                        <div
                            key={idx}
                            className={classNames('timeline-box', {
                                even: digit % 2 === 0,
                                odd: digit % 2 !== 0,
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

export default EvenOddAnalysis;
