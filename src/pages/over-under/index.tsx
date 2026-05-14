import React, { useMemo, useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { 
    Zap, 
    TrendingUp,
    TrendingDown,
    Clock
} from 'lucide-react';
import { 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    ResponsiveContainer
} from 'recharts';
import { useStore } from '@/hooks/useStore';
import './over-under.scss';

const DIGIT_COLORS = [
    '#9333ea', '#ef4444', '#6366f1', '#10b981', '#ec4899', // 0-4
    '#3b82f6', '#488cfb', '#22d3ee', '#8b5cf6', '#d946ef'  // 5-9
];

const DigitDistributionCircle = ({ item, color, isActive, onClick }: { item: any; color: string; isActive: boolean; onClick: () => void }) => {
    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (item.percent / 100) * circumference;

    return (
        <div className={`dist-circle-item ${isActive ? 'active' : ''}`} onClick={onClick}>
            {item.digit === 9 && <div className='now-badge'>NOW</div>}
            <div className='svg-wrap'>
                <svg width='56' height='56' viewBox='0 0 60 60'>
                    <circle className='bg' cx='30' cy='30' r={radius} fill='none' stroke='rgba(255,255,255,0.05)' strokeWidth='4' />
                    <circle 
                        className='progress' 
                        cx='30' cy='30' r={radius} 
                        fill='none' stroke={color} 
                        strokeWidth='4' 
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap='round'
                        transform='rotate(-90 30 30)'
                    />
                </svg>
                <div className='label-inner'>
                    <span className='digit'>{item.digit}</span>
                    <span className='pct'>{item.percent.toFixed(1)}%</span>
                </div>
            </div>
            <span className='count'>n={item.count}</span>
        </div>
    );
};

const OverUnderTab = observer(() => {
    const { over_under } = useStore();
    const [isStuck, setIsStuck] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (over_under.recent_digits.length < 5) {
                setIsStuck(true);
            }
        }, 10000);
        return () => clearTimeout(timer);
    }, [over_under.recent_digits.length]);

    const { 
        recent_digits, 
        selected_digit,
        analysis, 
        prediction, 
        digit_distribution,
        group_stats,
        symbol,
        current_price,
        setSymbol,
        setSelectedDigit,
        active_symbols,
        confirmed_ticks,
        phase,
        phase2_ticks,
        selected_digit_power,
        selected_digit_analysis
    } = over_under;

    const chartData = useMemo(() => {
        return recent_digits.slice(-15).map((d, i) => ({ value: d, index: i }));
    }, [recent_digits]);

    const isStrong = prediction.confidence !== 'LOW' && prediction.prediction !== 'WAIT';

    if (recent_digits.length < 5) {
        return (
            <div className='over-under-loading'>
                <div className='loading-hud'>
                    <div className='circle-outer' />
                    <div className='circle-inner' />
                    <div className='icon-wrap'><Zap size={32} /></div>
                </div>
                <h3>CONSOLIDATING ANALYTICS</h3>
                <p>Merging high-fidelity data streams...</p>
                {isStuck && (
                    <button 
                        className='force-refresh-btn'
                        onClick={() => {
                            setIsStuck(false);
                            over_under.setSymbol(over_under.symbol);
                        }}
                    >
                        🔄 Refresh Connection
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className='over-under-tab comprehensive-dashboard'>
            
            {/* 1. Header Section (Image Layout) */}
            <section className='replica-card header-card'>
                <div className='header-top'>
                    <span className='app-icon'>💰</span>
                    <h2 className='title'>Advanced Over/Under</h2>
                </div>
                <div className='status-row'>
                    <div className={`status-badge ${isStrong ? 'active' : 'neutral'}`}>
                        {isStrong ? prediction.prediction : `PHASE ${phase}`}
                    </div>
                    {phase === 2 && (
                        <div className='phase-counter'>
                            <Clock size={12} /> {phase2_ticks}/20 TICKS
                        </div>
                    )}
                    <div className='market-switch-wrap'>
                        <select 
                            value={symbol} 
                            onChange={(e) => setSymbol(e.target.value)}
                            className='symbol-select-minimal'
                        >
                            {active_symbols.map(s => (
                                <option key={s.symbol} value={s.symbol}>{s.display_name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>

            {/* 2. Global Digits Distribution (Circle Layout) */}
            <section className='replica-card dist-section'>
                <h4 className='card-title'>Digits Distribution (0–9)</h4>
                <div className='dist-row'>
                    {digit_distribution.map((item, i) => (
                        <DigitDistributionCircle 
                            key={i} 
                            item={item} 
                            color={DIGIT_COLORS[i]} 
                            isActive={selected_digit === i}
                            onClick={() => setSelectedDigit(i)}
                        />
                    ))}
                </div>
            </section>

            {/* 3. Last 20 Digits Strip (Image Layout) */}
            <section className='replica-card history-card'>
                <h4 className='card-title'>Last 20 Digits Feed</h4>
                <div className='digits-strip'>
                    {recent_digits.slice(-20).map((d, i) => (
                        <div 
                            key={i} 
                            className='digit-box'
                            style={{ background: DIGIT_COLORS[d] }}
                        >
                            {d}
                        </div>
                    ))}
                </div>
            </section>

            {/* 4. MAIN DASHBOARD GRID */}
            <div className='main-dashboard-grid'>
                
                {/* LEFT: Analysis & Charts */}
                <div className='grid-col col-main'>
                    {/* Analysis Split Section */}
                    <section className='replica-card analysis-card'>
                        <div className='split-row'>
                            {/* Under Section */}
                            <div className='split-col under'>
                                <div className='percentage-val'>{analysis?.underPercent?.toFixed(1) || '0.0'}%</div>
                                <div className='label-row'>
                                    <span className='label'>Under (0-4)</span>
                                    <TrendingDown size={14} className='icon-slant' />
                                </div>
                                <div className='strongest'>Strongest Digit: {group_stats?.highestUnder?.digit ?? 'N/A'}</div>
                                <div className='progress-track'>
                                    <div className='fill' style={{ width: `${analysis?.underPercent ?? 0}%` }} />
                                </div>
                                <div className='contracts-box'>
                                    <span className='title'>Predicted Under Contracts:</span>
                                    <div className='tag-row'>
                                        <div className='tag'>Under 6</div>
                                        <div className='tag'>Under 7</div>
                                        <div className='tag'>Under 8</div>
                                    </div>
                                </div>
                            </div>

                            {/* Over Section */}
                            <div className='split-col over'>
                                <div className='percentage-val'>{analysis?.overPercent?.toFixed(1) ?? '0.0'}%</div>
                                <div className='label-row'>
                                    <span className='label'>Over (5-9)</span>
                                    <TrendingUp size={14} className='icon-slant' />
                                </div>
                                <div className='strongest'>Strongest Digit: {group_stats?.highestOver?.digit ?? 'N/A'}</div>
                                <div className='progress-track'>
                                    <div className='fill' style={{ width: `${analysis?.overPercent ?? 0}%` }} />
                                </div>
                                <div className='contracts-box'>
                                    <span className='title'>Predicted Over Contracts:</span>
                                    <div className='tag-row'>
                                        <div className='tag'>Over 3</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Charts Section */}
                    <section className='replica-card chart-section'>
                        <h4 className='card-title'>Market Trend Visualization</h4>
                        <div className='chart-container-replica'>
                            <ResponsiveContainer width='100%' height={180}>
                                <LineChart data={chartData}>
                                    <XAxis hide />
                                    <YAxis domain={[0, 9]} hide />
                                    <Line 
                                        type='monotone' 
                                        dataKey='value' 
                                        stroke='#a78bfa' 
                                        strokeWidth={4} 
                                        dot={{ r: 4, fill: '#fff', stroke: '#a78bfa', strokeWidth: 2 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </section>
                </div>

                {/* RIGHT: Targeted Digit Analysis */}
                <div className='grid-col col-side'>
                    <section className='replica-card prediction-power-card'>
                        <h4 className='power-title'>Digit {selected_digit} Power Analysis</h4>
                        
                        <div className='power-digit-selector-mini'>
                            {Array.from({ length: 10 }).map((_, i) => (
                                <button 
                                    key={i} 
                                    className={`sel-btn-mini ${selected_digit === i ? 'active' : ''}`}
                                    onClick={() => setSelectedDigit(i)}
                                    style={{ '--color': DIGIT_COLORS[i] } as React.CSSProperties}
                                >
                                    {i}
                                </button>
                            ))}
                        </div>

                        <div className='power-metrics-grid'>
                            <div className='metric'>
                                <span className='l'>Frequency</span>
                                <span className='v'>{selected_digit_power?.frequency?.toFixed(1) || '0.0'}%</span>
                            </div>
                            <div className='metric'>
                                <span className='l'>Momentum</span>
                                <span className='v'>{selected_digit_power?.momentum?.toFixed(1) || '0.0'}%</span>
                            </div>
                        </div>

                        <div className='group-bars-mini-replica'>
                            <div className='bar over'>
                                <div className='fill' style={{ width: `${selected_digit_analysis?.overPercent || 0}%` }} />
                                <span className='label'>Over ({selected_digit + 1}-9)</span>
                                <span className='val'>{selected_digit_analysis?.overPercent?.toFixed(1) || '0.0'}%</span>
                            </div>
                            <div className='bar under'>
                                <div className='fill' style={{ width: `${selected_digit_analysis?.underPercent || 0}%` }} />
                                <span className='label'>Under (0-{selected_digit - 1 >= 0 ? selected_digit - 1 : 0})</span>
                                <span className='val'>{selected_digit_analysis?.underPercent?.toFixed(1) || '0.0'}%</span>
                            </div>
                        </div>

                        <div className='pattern-squares-mini'>
                            {recent_digits.slice(-20).map((d, i) => {
                                let type = d < 5 ? 'U' : 'O';
                                if (d === selected_digit) type = 'C';
                                return (
                                    <div key={i} className={`pat-square pat--${type}`}>{type}</div>
                                );
                            })}
                        </div>
                    </section>

                    <section className='replica-card best-predictions-box'>
                        <h4 className='card-title'>Best Targets</h4>
                        <div className='prediction-tags-flex'>
                            <div className='tag-item primary'>
                                <span className='l'>Target 1</span>
                                <span className='v'>{prediction.prediction === 'OVER' ? 'Over 1' : 'Under 8'}</span>
                            </div>
                            <div className='tag-item secondary'>
                                <span className='l'>Target 2</span>
                                <span className='v'>{prediction.prediction === 'OVER' ? 'Over 0' : 'Under 9'}</span>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            {/* 5. Metrics Triple Section (Image Layout) */}
            <section className='metrics-grid-replica'>
                <div className='metric-card purple'>
                    <span className='title'>Market Power</span>
                    <span className='value'>{analysis?.marketPower?.toFixed(1) || '0.0'}%</span>
                </div>
                <div className='metric-card orange'>
                    <span className='title'>Volatility</span>
                    <span className='value'>{ ((analysis?.volatility || 0) * 10).toFixed(1) }%</span>
                </div>
                <div className='metric-card blue'>
                    <span className='title'>Confirmed Ticks</span>
                    <span className='value'>{confirmed_ticks || 0}</span>
                </div>
            </section>

            {/* 6. Info Footer Section (Image Layout) */}
            <section className='replica-card info-card'>
                <p className='info-text'>
                    <strong>Advanced Intelligence Engine:</strong> Analyzing market sentiment across all digits. High frequency signals trigger orange "RUN NOW" indicators. Trade confidence is calculated from over/under dominance and digit momentum.
                </p>
                <div className='meta-footer'>
                    <span>Price: {current_price}</span>
                    <span>•</span>
                    <span>Symbol: {symbol}</span>
                </div>
            </section>
        </div>
    );
});

export default OverUnderTab;
