import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { 
    Activity, 
    TrendingUp, 
    ShieldAlert, 
    Zap, 
    Layers, 
    Target,
    ChevronRight,
    AlertCircle,
    Info,
    ArrowUpRight,
    Search,
    Globe
} from 'lucide-react';
import { useStore } from '@/hooks/useStore';
import './account-flipper.scss';

// --- Sub-components ---

const AnalysisCard = ({ analysis }: { analysis: any }) => (
    <div className='analysis-card'>
        <div className='card-header'>
            <div className='title-group'>
                <span className='title'>{analysis.threshold}</span>
                <span className='subtitle'>Multiplier: x{analysis.expectedPayout.toFixed(1)}</span>
            </div>
            <span className={`strength strength--${analysis.strength.toLowerCase().replace(' ', '-')}`}>
                {analysis.strength}
            </span>
        </div>
        
        <div className='metrics-bars'>
            <div className='bar-group'>
                <div className='bar-label'>
                    <span>UNDER</span>
                    <span>{analysis.underPercent.toFixed(1)}%</span>
                </div>
                <div className='bar-track'>
                    <div className='bar-fill bar-fill--under' style={{ width: `${analysis.underPercent}%` }} />
                </div>
            </div>
            
            <div className='bar-group'>
                <div className='bar-label'>
                    <span>OVER</span>
                    <span>{analysis.overPercent.toFixed(1)}%</span>
                </div>
                <div className='bar-track'>
                    <div className='bar-fill bar-fill--over' style={{ width: `${analysis.overPercent}%` }} />
                </div>
            </div>
        </div>

        <div className='card-footer'>
            <div className='stat'>
                <span className='label'>Confidence</span>
                <div className='value-with-dot'>
                    <div className='dot' style={{ backgroundColor: analysis.confidence > 70 ? '#10b981' : analysis.confidence > 40 ? '#f59e0b' : '#ef4444' }} />
                    <span className='value'>{analysis.confidence.toFixed(0)}%</span>
                </div>
            </div>
            <div className='stat'>
                <span className='label'>Expected Value</span>
                <span className={`value ${analysis.expectedPayout > 0 ? 'pos' : 'neg'}`}>
                    {analysis.expectedPayout > 0 ? '+' : ''}{analysis.expectedPayout.toFixed(2)}
                </span>
            </div>
        </div>
    </div>
);

const HeatmapCell = ({ value, i, j }: { value: number; i: number; j: number }) => {
    const intensity = value / 20; // Scale 0-20%
    return (
        <div 
            className='heatmap-cell'
            style={{ 
                backgroundColor: `rgba(72, 140, 251, ${intensity})`,
                boxShadow: intensity > 0.6 ? `0 0 10px rgba(72, 140, 251, ${intensity * 0.5})` : 'none',
                color: intensity > 0.5 ? '#fff' : 'rgba(255,255,255,0.4)'
            }}
            title={`${i} → ${j}: ${value.toFixed(1)}%`}
        >
            {value >= 12 ? value.toFixed(0) : ''}
        </div>
    );
};

const RecommendationCard = ({ rec }: { rec: any }) => (
    <div className={`rec-card ${rec.action !== 'WAIT' ? 'rec-card--active' : ''}`}>
        <div className='rec-header'>
            <div className='threshold-tag'>{rec.threshold}</div>
            <div className={`action action--${rec.action.toLowerCase()}`}>
                {rec.action === 'WAIT' ? (
                    <div className='wait-pulse'>
                        <div className='dot' />
                        SCANNING
                    </div>
                ) : (
                    <div className='action-text'>
                        <Zap size={14} />
                        {rec.action}
                    </div>
                )}
            </div>
        </div>
        
        {rec.action !== 'WAIT' ? (
            <div className='rec-body'>
                <div className='rec-stats'>
                    <div className='row'>
                        <span className='label'>Recommended Stake</span>
                        <span className='value'>${rec.stake.toFixed(2)}</span>
                    </div>
                    <div className='row'>
                        <span className='label'>Advantage Margin</span>
                        <span className='value pos'>+{rec.confidence.toFixed(1)}%</span>
                    </div>
                </div>
                <div className='reasoning-box'>
                    {rec.reasoning.map((r: string, i: number) => (
                        <div key={i} className='reason'>
                            <ChevronRight size={10} />
                            {r}
                        </div>
                    ))}
                </div>
                <button className='btn-execute'>
                    EXECUTE SIGNAL
                    <ArrowUpRight size={14} />
                </button>
            </div>
        ) : (
            <div className='rec-empty'>
                <div className='icon-wrap'><Search size={24} /></div>
                <p>Waiting for statistical edge...</p>
            </div>
        )}
    </div>
);

const AccountFlipper = observer(() => {
    const { account_flipper, marketkiller } = useStore();
    const { 
        recent_digits, 
        selected_threshold_key, 
        timeframe, 
        current_digit,
        current_price,
        symbol,
        all_analyses,
        correlation_matrix,
        transition_probabilities,
        risk_assessment,
        entry_recommendations,
        setThreshold,
        setTimeframe,
        setStake,
        setSymbol,
        base_stake
    } = account_flipper;

    const availableSymbols = [
        { symbol: 'R_10', display_name: 'Volatility 10 Index' },
        { symbol: 'R_25', display_name: 'Volatility 25 Index' },
        { symbol: 'R_50', display_name: 'Volatility 50 Index' },
        { symbol: 'R_75', display_name: 'Volatility 75 Index' },
        { symbol: 'R_100', display_name: 'Volatility 100 Index' },
        { symbol: '1HZ10V', display_name: 'Volatility 10 (1s) Index' },
        { symbol: '1HZ100V', display_name: 'Volatility 100 (1s) Index' },
    ];

    if (recent_digits.length < 15) {
        return (
            <div className='flipper-loading'>
                <div className='loading-hud'>
                    <div className='circle-outer' />
                    <div className='circle-inner' />
                    <div className='icon-wrap'><Globe size={32} className='animate-pulse' /></div>
                </div>
                <h3>Syncing Quantum Data</h3>
                <p>Building statistical matrices for {symbol} ({recent_digits.length}/15)</p>
            </div>
        );
    }

    return (
        <div className='account-flipper'>
            {/* Top Command Bar */}
            <div className='flipper-top-bar'>
                <div className='market-selector-group'>
                    <div className='icon-wrap'><Globe size={18} /></div>
                    <select 
                        value={symbol} 
                        onChange={(e) => setSymbol(e.target.value)}
                        className='market-select'
                    >
                        {availableSymbols.map(s => (
                            <option key={s.symbol} value={s.symbol}>{s.display_name}</option>
                        ))}
                    </select>
                </div>

                <div className='market-stats'>
                    <div className='stat-block'>
                        <span className='label'>LIVE PRICE</span>
                        <div className='value price-value'>
                            <span className='currency'>$</span>
                            {current_price}
                        </div>
                    </div>
                    <div className='stat-divider' />
                    <div className='stat-block'>
                        <span className='label'>LAST DIGIT</span>
                        <div className='value digit-value glowing'>
                            {current_digit}
                        </div>
                    </div>
                </div>

                <div className='action-controls'>
                    <div className='input-group'>
                        <span className='label'>STAKE</span>
                        <input 
                            type='number' 
                            value={base_stake} 
                            onChange={(e) => setStake(parseFloat(e.target.value))}
                            className='dark-input'
                        />
                    </div>
                    <div className='input-group'>
                        <span className='label'>TIME</span>
                        <select 
                            value={timeframe} 
                            onChange={(e) => setTimeframe(parseInt(e.target.value) as any)}
                            className='dark-select'
                        >
                            <option value={50}>50 Ticks</option>
                            <option value={100}>100 Ticks</option>
                            <option value={200}>200 Ticks</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Grid Layout */}
            <div className='flipper-content-grid'>
                {/* Left Column: Recommendations & Risk */}
                <div className='content-col content-col--left'>
                    <div className='section-header'>
                        <Target size={18} />
                        <span>QUANTUM SIGNALS</span>
                    </div>
                    <div className='rec-list'>
                        {entry_recommendations.map(rec => (
                            <RecommendationCard key={rec.threshold} rec={rec} />
                        ))}
                    </div>

                    <div className='risk-monitor'>
                        <div className='section-header'>
                            <ShieldAlert size={18} />
                            <span>RISK MONITOR</span>
                        </div>
                        <div className='risk-card'>
                            <div className='risk-metrics'>
                                <div className='metric-row'>
                                    <div className='label-group'>
                                        <span>VOLATILITY</span>
                                        <span>{risk_assessment.volatility.toFixed(1)}%</span>
                                    </div>
                                    <div className='progress-track'>
                                        <div className='progress-fill' style={{ width: `${risk_assessment.volatility}%`, background: risk_assessment.volatility > 60 ? '#ef4444' : '#3b82f6' }} />
                                    </div>
                                </div>
                                <div className='metric-row'>
                                    <div className='label-group'>
                                        <span>TREND POWER</span>
                                        <span>{risk_assessment.trendStrength.toFixed(1)}%</span>
                                    </div>
                                    <div className='progress-track'>
                                        <div className='progress-fill' style={{ width: `${risk_assessment.trendStrength}%`, background: '#10b981' }} />
                                    </div>
                                </div>
                            </div>
                            <div className={`risk-badge risk-badge--${risk_assessment.overallRisk.toLowerCase()}`}>
                                <div className='badge-icon'><Info size={14} /></div>
                                <div className='badge-text'>
                                    <span className='level'>{risk_assessment.overallRisk} RISK</span>
                                    <span className='desc'>{risk_assessment.recommendation}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Matrices & Comparisons */}
                <div className='content-col content-col--right'>
                    <div className='tabs-row'>
                        {all_analyses.map(analysis => (
                            <button 
                                key={analysis.threshold}
                                className={`tab-pill ${selected_threshold_key === analysis.threshold.split('Over ')[1].replace(' / Under ', '-') ? 'active' : ''}`}
                                onClick={() => {
                                    const key = analysis.threshold.split('Over ')[1].replace(' / Under ', '-') as any;
                                    setThreshold(key);
                                }}
                            >
                                {analysis.threshold}
                            </button>
                        ))}
                    </div>

                    <div className='threshold-analysis-grid'>
                        {all_analyses.map(a => (
                            <AnalysisCard key={a.threshold} analysis={a} />
                        ))}
                    </div>

                    <div className='matrix-container'>
                        <div className='matrix-box'>
                            <div className='section-header'>
                                <Layers size={18} />
                                <span>CORRELATION MATRIX</span>
                            </div>
                            <div className='matrix-scroll'>
                                <div className='correlation-grid'>
                                    <div className='corner' />
                                    {Array.from({ length: 10 }).map((_, i) => (
                                        <div key={`h-${i}`} className='label label--h'>{i}</div>
                                    ))}
                                    {correlation_matrix.map((row, i) => (
                                        <React.Fragment key={`row-${i}`}>
                                            <div className='label label--v'>{i}</div>
                                            {row.map((val, j) => (
                                                <HeatmapCell key={`${i}-${j}`} value={val} i={i} j={j} />
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className='transition-box'>
                            <div className='section-header'>
                                <TrendingUp size={18} />
                                <span>TOP TRANSITIONS FROM {current_digit}</span>
                            </div>
                            <div className='transition-list'>
                                {transition_probabilities.slice(0, 5).map(trans => (
                                    <div key={trans.toDigit} className='trans-item'>
                                        <div className='path'>
                                            <span className='digit digit--curr'>{trans.fromDigit}</span>
                                            <ChevronRight size={14} className='arrow' />
                                            <span className='digit digit--next'>{trans.toDigit}</span>
                                        </div>
                                        <div className='bar-group'>
                                            <div className='bar-track'>
                                                <div className='bar-fill' style={{ width: `${trans.probability}%` }} />
                                            </div>
                                            <div className='meta'>
                                                <span className='pct'>{trans.probability.toFixed(1)}%</span>
                                                <span className='count'>{trans.occurrences}x</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default AccountFlipper;
