import { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import QuickSettings from './quick-settings';
import './over-under-tab.scss';

// Analysis Interfaces
interface OverUnderAnalysis {
    selectedDigit: number;
    underDigits: number[];
    overDigits: number[];
    currentDigits: number[];
    underPercent: number;
    overPercent: number;
    currentPercent: number;
    underCount: number;
    overCount: number;
    currentCount: number;
    total: number;
}

interface DigitPower {
    frequency: number;
    momentum: number;
    gap: number;
    powerScore: number;
    strength: 'VERY STRONG' | 'STRONG' | 'MODERATE' | 'WEAK';
}

interface Confidence {
    level: 'VERY HIGH' | 'HIGH' | 'MEDIUM' | 'LOW';
    percent: number;
    difference: number;
}

interface Prediction {
    prediction: 'UNDER' | 'OVER' | 'CURRENT' | 'WAIT';
    confidence: string;
    reasoning: string;
}

// Analysis Functions
const analyzeOverUnder = (digits: number[], threshold: number): OverUnderAnalysis => {
    const underDigits = digits.filter(d => d < threshold);
    const overDigits = digits.filter(d => d > threshold);
    const currentDigits = digits.filter(d => d === threshold);
    const total = digits.length || 1;

    return {
        selectedDigit: threshold,
        underDigits,
        overDigits,
        currentDigits,
        underPercent: (underDigits.length / total) * 100,
        overPercent: (overDigits.length / total) * 100,
        currentPercent: (currentDigits.length / total) * 100,
        underCount: underDigits.length,
        overCount: overDigits.length,
        currentCount: currentDigits.length,
        total,
    };
};

const calculateDigitPower = (digit: number, recentDigits: number[]): DigitPower => {
    if (recentDigits.length === 0) {
        return { frequency: 0, momentum: 0, gap: 0, powerScore: 0, strength: 'WEAK' };
    }

    // Frequency in overall sample
    const frequency = recentDigits.filter(d => d === digit).length;
    const frequencyPercent = (frequency / recentDigits.length) * 100;

    // Momentum in recent 25 ticks
    const recent = recentDigits.slice(-25);
    const recentCount = recent.filter(d => d === digit).length;
    const momentum = recent.length > 0 ? (recentCount / recent.length) * 100 : 0;

    // Gap since last appearance
    const lastIndex = recentDigits.lastIndexOf(digit);
    const gap = lastIndex >= 0 ? recentDigits.length - lastIndex - 1 : recentDigits.length;

    // Combined score (weighted)
    const powerScore = frequencyPercent * 0.5 + momentum * 0.4 - gap * 0.1;

    const strength: DigitPower['strength'] =
        powerScore >= 15 ? 'VERY STRONG' : powerScore >= 10 ? 'STRONG' : powerScore >= 5 ? 'MODERATE' : 'WEAK';

    return {
        frequency: frequencyPercent,
        momentum,
        gap,
        powerScore,
        strength,
    };
};

const calculateConfidence = (analysis: OverUnderAnalysis): Confidence => {
    const maxPercent = Math.max(analysis.underPercent, analysis.overPercent);
    const difference = Math.abs(analysis.underPercent - analysis.overPercent);

    const level: Confidence['level'] =
        maxPercent >= 65
            ? 'VERY HIGH'
            : maxPercent >= 60
              ? 'HIGH'
              : maxPercent >= 55 || difference >= 20
                ? 'MEDIUM'
                : 'LOW';

    return {
        level,
        percent: maxPercent,
        difference,
    };
};

const generatePrediction = (analysis: OverUnderAnalysis, power: DigitPower, confidence: Confidence): Prediction => {
    // Determine dominant side
    const dominant =
        analysis.underPercent > analysis.overPercent
            ? 'UNDER'
            : analysis.overPercent > analysis.underPercent
              ? 'OVER'
              : 'BALANCED';

    // Check if current digit is hot
    const isCurrentHot = power.strength === 'VERY STRONG' || power.strength === 'STRONG';

    // Generate prediction
    if (isCurrentHot && power.powerScore >= 12) {
        return {
            prediction: 'CURRENT',
            confidence: 'HIGH',
            reasoning: `Digit ${analysis.selectedDigit} is ${power.strength.toLowerCase()} (${power.powerScore.toFixed(1)}% power)`,
        };
    }

    if (dominant !== 'BALANCED' && confidence.level !== 'LOW') {
        return {
            prediction: dominant as 'UNDER' | 'OVER',
            confidence: confidence.level,
            reasoning: `${dominant} has ${confidence.percent.toFixed(1)}% dominance with ${confidence.difference.toFixed(1)}% lead`,
        };
    }

    return {
        prediction: 'WAIT',
        confidence: 'LOW',
        reasoning: `Market building trend at ${confidence.percent.toFixed(1)}%`,
    };
};

const OverUnderTab = observer(() => {
    const { analysis, smart_trading } = useStore();
    const {
        symbol,
        setSymbol,
        markets,
        current_price,
        last_digit,
        is_loading,
        is_cycling_enabled,
        ou_auto_trade_enabled,
        current_tier,
        nexus_signal,
        signal_age,
        run_counter,
        is_reanalyzing,
        trade_journal,
    } = analysis;

    const current_signal = nexus_signal;
    const is_active = current_signal && signal_age < 7 && run_counter < 7 && !is_reanalyzing;

    const tiers = [
        { id: 'balanced', label: 'Balanced (U6/O3)', desc: 'Standard safety' },
        { id: 'aggressive', label: 'Aggressive (U7/O2)', desc: 'Reduced safety' },
        { id: 'pro', label: 'Pro (U8/O1)', desc: 'High profit' },
        { id: 'extreme', label: 'Extreme (U9/O0)', desc: 'Max risk' },
    ];

    return (
        <div className='over-under-tab nexus-theme'>
            {/* Nexus Header */}
            <div className='nexus-header'>
                <div className='market-control'>
                    <div className='select-wrapper'>
                        <label>ACTIVE MARKET</label>
                        <select value={symbol} onChange={e => setSymbol(e.target.value)}>
                            {markets.map(group => (
                                <optgroup key={group.group} label={group.group}>
                                    {group.items.map(item => (
                                        <option key={item.value} value={item.value}>
                                            {item.label}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                    <div className='price-ticker'>
                        <span className='label'>SPOT</span>
                        <span className='value'>{current_price}</span>
                        <div className='last-digit-box'>{last_digit ?? '-'}</div>
                    </div>
                </div>

                <div className='nexus-controls'>
                    <div className='control-item auto-toggle'>
                        <label>STRATEGIC AUTO</label>
                        <div
                            className={classNames('nexus-switch', { active: ou_auto_trade_enabled })}
                            onClick={() => (analysis.ou_auto_trade_enabled = !ou_auto_trade_enabled)}
                        >
                            <div className='knob'></div>
                            <span className='label'>{ou_auto_trade_enabled ? 'ON' : 'OFF'}</span>
                        </div>
                    </div>
                    <div className='control-item'>
                        <label>AUTO CYCLE</label>
                        <div
                            className={classNames('cycle-toggle', { active: is_cycling_enabled })}
                            onClick={() => (analysis.is_cycling_enabled = !is_cycling_enabled)}
                        >
                            <span className='icon'>🔄</span>
                            {is_cycling_enabled ? 'ON' : 'OFF'}
                        </div>
                    </div>
                    <div className='control-item tier-selector'>
                        <label>STRATEGIC TIER</label>
                        <div className='tier-buttons'>
                            {tiers.map(t => (
                                <button
                                    key={t.id}
                                    className={classNames('tier-btn', { active: current_tier === t.id })}
                                    onClick={() => (analysis.current_tier = t.id as any)}
                                    title={t.desc}
                                >
                                    {t.id.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Strategic Signal Dashboard */}
            <div className={classNames('nexus-signal-dashboard', { 'signal-active': is_active })}>
                <div className='dashboard-grid'>
                    {/* Under Intelligence */}
                    <div
                        className={classNames('intel-box under', {
                            active: is_active && current_signal.under.power >= 55,
                        })}
                    >
                        <div className='side-label'>UNDER {current_signal?.under.prediction ?? '-'} POWER</div>
                        <div className='power-value'>{current_signal?.under.power.toFixed(1) ?? '0.0'}%</div>
                        <div className='power-bar-wrapper'>
                            <div className='power-bar' style={{ width: `${current_signal?.under.power ?? 0}%` }} />
                        </div>
                        <div className='top-digit-info'>
                            Top Digit: <span className='digit'>{current_signal?.under.top_digit ?? '-'}</span>(
                            {current_signal?.under.top_digit_pct.toFixed(0) ?? 0}%)
                        </div>
                    </div>

                    {/* Execution Center */}
                    <div className='execution-center'>
                        {is_reanalyzing ? (
                            <div className='reanalyzing-pulse'>
                                <div className='spinner'></div>
                                <span>RE-ANALYZING MARKET...</span>
                                <small>7 RUN LIMIT REACHED</small>
                            </div>
                        ) : is_active ? (
                            <div className='active-signal-info'>
                                <div className='signal-title'>HOT SIGNAL DETECTED</div>
                                <div className='window-meta'>
                                    <div className='meta-item'>
                                        <span>WINDOW</span>
                                        <div className='age-dots'>
                                            {[...Array(7)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={classNames('dot', { active: i < signal_age })}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className='meta-item'>
                                        <span>RUNS</span>
                                        <div className='runs-count'>{7 - run_counter}/7</div>
                                    </div>
                                </div>
                                <button
                                    className='btn-execute-nexus'
                                    onClick={() => {
                                        const type =
                                            current_signal.under.power > current_signal.over.power ? 'UNDER' : 'OVER';
                                        const pred =
                                            type === 'UNDER'
                                                ? current_signal.under.prediction
                                                : current_signal.over.prediction;
                                        analysis.recordTrade(type, pred);
                                        smart_trading.manualTrade(type === 'UNDER' ? 'DIGITUNDER' : 'DIGITOVER', pred);
                                    }}
                                >
                                    EXECUTE NOW
                                </button>
                            </div>
                        ) : (
                            <div className='scanning-state'>
                                <div className='scan-line'></div>
                                <span>SCANNING FOR 55% BIAS...</span>
                                <small>Tier: {current_tier.toUpperCase()}</small>
                            </div>
                        )}
                    </div>

                    {/* Over Intelligence */}
                    <div
                        className={classNames('intel-box over', {
                            active: is_active && current_signal.over.power >= 55,
                        })}
                    >
                        <div className='side-label'>OVER {current_signal?.over.prediction ?? '-'} POWER</div>
                        <div className='power-value'>{current_signal?.over.power.toFixed(1) ?? '0.0'}%</div>
                        <div className='power-bar-wrapper'>
                            <div className='power-bar' style={{ width: `${current_signal?.over.power ?? 0}%` }} />
                        </div>
                        <div className='top-digit-info'>
                            Top Digit: <span className='digit'>{current_signal?.over.top_digit ?? '-'}</span>(
                            {current_signal?.over.top_digit_pct.toFixed(0) ?? 0}%)
                        </div>
                    </div>

                    {/* Overall Progress Tracker */}
                    <div className='cycle-progress-container'>
                        <div className='progress-label'>
                            <span>7-RUN CYCLE PROGRESS</span>
                            <span>{run_counter}/7</span>
                        </div>
                        <div className='progress-track'>
                            <div className='progress-fill' style={{ width: `${(run_counter / 7) * 100}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Journal */}
            <div className='nexus-journal'>
                <div className='journal-header'>
                    <h3>STRATEGIC JOURNAL</h3>
                    <div className='counts'>Last 50 Records</div>
                </div>
                <div className='journal-table-wrapper'>
                    <table className='journal-table'>
                        <thead>
                            <tr>
                                <th>TIME</th>
                                <th>MARKET</th>
                                <th>STRATEGY</th>
                                <th>POWER</th>
                                <th>L-DIGIT</th>
                                <th>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trade_journal.map(t => (
                                <tr key={t.id}>
                                    <td>{t.timestamp}</td>
                                    <td>{t.market}</td>
                                    <td>
                                        <span className='badge tier'>{t.tier.toUpperCase()}</span> {t.type}{' '}
                                        {t.prediction}
                                    </td>
                                    <td>{t.signal_power.toFixed(1)}%</td>
                                    <td>
                                        <div className='mini-digit'>{t.last_digit}</div>
                                    </td>
                                    <td>
                                        <span className='status-ok'>EXECUTED</span>
                                    </td>
                                </tr>
                            ))}
                            {trade_journal.length === 0 && (
                                <tr>
                                    <td colSpan={6} className='empty'>
                                        Await signal for journal entry...
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
});

export default OverUnderTab;
