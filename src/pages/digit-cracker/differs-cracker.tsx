import { useMemo,useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import './differs-cracker.scss';

// ─── Constants ────────────────────────────────────────────────────────────────
const EDGE_DIGITS = [0, 1, 8, 9]; // Always excluded
const ELIGIBLE_DIGITS = [2, 3, 4, 5, 6, 7]; // Only valid predictions

// ─── Types ────────────────────────────────────────────────────────────────────
interface TDigitProfile {
    digit: number;
    pct: number;
    pct_last25: number;
    pct_prev25: number;
    delta: number;
    is_increasing: boolean;
    is_decreasing: boolean;
    in_last7: boolean;
    in_last25: boolean;
    is_excluded: boolean;
    is_candidate: boolean;
    is_best: boolean;
}

interface TEntryReport {
    triggered: boolean;
    stage: string;
    stage_index: number;
}

interface TDiffersConfig {
    manual_prediction: number | null;
    auto_prediction: boolean;
    stake: number;
    ticks: number;
    martingale: number;
}

// ─── Analysis Engine ──────────────────────────────────────────────────────────
function analyzeDiffers(ticks: number[]) {
    const total = ticks.length || 1;

    const freq: Record<number, number> = {};
    for (let i = 0; i <= 9; i++) freq[i] = 0;
    ticks.forEach(d => freq[d]++);

    // Sort to find rank positions
    const sorted = [...Object.entries(freq)]
        .map(([d, c]) => ({ digit: parseInt(d), count: c }))
        .sort((a, b) => b.count - a.count);

    const most_appearing = sorted[0]?.digit ?? -1;
    const second_most_appearing = sorted[1]?.digit ?? -1;
    const least_appearing = sorted[sorted.length - 1]?.digit ?? -1;

    // Percentages over full sample
    const pcts: Record<number, number> = {};
    for (let i = 0; i <= 9; i++) pcts[i] = (freq[i] / total) * 100;

    // Trend: compare last 25 vs previous 25
    const last25 = ticks.slice(-25);
    const prev25 = ticks.slice(-50, -25);
    const last7 = ticks.slice(-7);

    const f25: Record<number, number> = {};
    const fp25: Record<number, number> = {};
    for (let i = 0; i <= 9; i++) {
        f25[i] = 0;
        fp25[i] = 0;
    }
    last25.forEach(d => f25[d]++);
    prev25.forEach(d => fp25[d]++);

    const pct25 = (d: number) => (last25.length > 0 ? (f25[d] / last25.length) * 100 : 0);
    const pctP25 = (d: number) => (prev25.length > 0 ? (fp25[d] / prev25.length) * 100 : 0);

    // Increasing = appeared more in last 25 than previous 25
    const increasing_digits = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => pct25(d) > pctP25(d)));

    // Excluded set
    const excluded_set = new Set([...EDGE_DIGITS, most_appearing, second_most_appearing, least_appearing]);
    // Also exclude any increasing digit from 2-7
    ELIGIBLE_DIGITS.forEach(d => {
        if (increasing_digits.has(d)) excluded_set.add(d);
    });

    // Build profiles for all 10 digits
    const profiles: TDigitProfile[] = [];
    let best_candidate: number | null = null;
    let best_candidate_pct = Infinity;

    for (let d = 0; d <= 9; d++) {
        const p25 = pct25(d);
        const pp25 = pctP25(d);
        const delta = p25 - pp25;
        const is_increasing = delta > 0;
        const is_decreasing = delta < 0;
        const in_last7 = last7.includes(d);
        const in_last25 = f25[d] > 0;
        const is_excluded = excluded_set.has(d);

        // A candidate must:
        // - be in 2-7
        // - not be excluded
        // - have < 10% overall appearance
        // - be decreasing in trend
        // - NOT be increasing in last 25
        const is_candidate =
            ELIGIBLE_DIGITS.includes(d) && !is_excluded && pcts[d] < 10 && is_decreasing && !increasing_digits.has(d);

        profiles.push({
            digit: d,
            pct: pcts[d],
            pct_last25: p25,
            pct_prev25: pp25,
            delta,
            is_increasing,
            is_decreasing,
            in_last7,
            in_last25,
            is_excluded,
            is_candidate,
            is_best: false,
        });

        if (is_candidate && pcts[d] < best_candidate_pct) {
            best_candidate = d;
            best_candidate_pct = pcts[d];
        }
    }

    // Mark best
    if (best_candidate !== null) {
        profiles[best_candidate].is_best = true;
    }

    return {
        profiles,
        most_appearing,
        second_most_appearing,
        least_appearing,
        excluded_set,
        best_candidate,
        last25,
        last7,
        increasing_digits,
    };
}

// ─── Entry Condition Evaluator ────────────────────────────────────────────────
function evalDiffersEntry(ticks: number[], prediction: number | null, excluded_set: Set<number>): TEntryReport {
    if (prediction === null || ticks.length < 10) {
        return { triggered: false, stage: 'Waiting for sufficient tick data...', stage_index: 0 };
    }

    // STAGE 1: An excluded digit must have appeared in the last 3 ticks
    const last3 = ticks.slice(-3);
    const excluded_appeared = last3.some(d => excluded_set.has(d));
    if (!excluded_appeared) {
        return {
            triggered: false,
            stage: 'Stage 1: Waiting for an excluded digit to appear in the last 3 ticks...',
            stage_index: 1,
        };
    }

    // STAGE 2: Chosen prediction must be decreasing in recent windows
    const last10 = ticks.slice(-10);
    const prev10 = ticks.slice(-20, -10);
    const pct_recent = (last10.filter(d => d === prediction).length / Math.max(last10.length, 1)) * 100;
    const pct_older = (prev10.filter(d => d === prediction).length / Math.max(prev10.length, 1)) * 100;
    const is_pred_decreasing = pct_recent <= pct_older;
    if (!is_pred_decreasing) {
        return {
            triggered: false,
            stage: `Stage 2: Prediction ${prediction} is increasing — waiting for it to decrease...`,
            stage_index: 2,
        };
    }

    // STAGE 3: In the last 3 ticks, prediction must NOT appear and must not be rising
    const pred_in_last3 = last3.includes(prediction);
    if (pred_in_last3) {
        return {
            triggered: false,
            stage: `Stage 3: Prediction ${prediction} appeared in last 3 ticks — no clean entry yet...`,
            stage_index: 3,
        };
    }

    // STAGE 4: Check last 7 ticks — prediction must not have appeared
    const last7 = ticks.slice(-7);
    const pred_in_last7 = last7.includes(prediction);
    if (pred_in_last7) {
        return {
            triggered: false,
            stage: `Stage 4: Prediction ${prediction} appeared in last 7 ticks — waiting for clean window...`,
            stage_index: 4,
        };
    }

    return {
        triggered: true,
        stage: `✅ All entry conditions met! Digit ${prediction} is a clean Differs prediction.`,
        stage_index: 5,
    };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
const TrendArrow = ({ delta }: { delta: number }) => {
    if (Math.abs(delta) < 0.5) return <span className='dc-trend neutral'>→</span>;
    return delta > 0 ? (
        <span className='dc-trend up'>↑ +{delta.toFixed(1)}%</span>
    ) : (
        <span className='dc-trend down'>↓ {delta.toFixed(1)}%</span>
    );
};

const DigitRow = ({
    profile,
    is_prediction,
    onClick,
}: {
    profile: TDigitProfile;
    is_prediction: boolean;
    onClick: () => void;
}) => {
    let rowClass = 'dc-digit-row';
    if (profile.is_best) rowClass += ' dc-digit-row--best';
    else if (profile.is_candidate) rowClass += ' dc-digit-row--candidate';
    else if (profile.is_excluded) rowClass += ' dc-digit-row--excluded';
    if (is_prediction) rowClass += ' dc-digit-row--selected';
    if (EDGE_DIGITS.includes(profile.digit)) rowClass += ' dc-digit-row--edge';

    return (
        <div className={rowClass} onClick={onClick}>
            <span className='dc-digit-row__num'>{profile.digit}</span>
            <div className='dc-digit-row__bar-wrap'>
                <div className='dc-digit-row__bar' style={{ width: `${Math.min(profile.pct * 4, 100)}%` }} />
            </div>
            <span className='dc-digit-row__pct'>{profile.pct.toFixed(1)}%</span>
            <span className='dc-digit-row__l25'>{profile.pct_last25.toFixed(1)}%</span>
            <TrendArrow delta={profile.delta} />
            <span className='dc-digit-row__flags'>
                {profile.in_last7 && (
                    <span className='dc-flag l7' title='In last 7 ticks'>
                        L7
                    </span>
                )}
                {profile.in_last25 && (
                    <span className='dc-flag l25' title='In last 25 ticks'>
                        L25
                    </span>
                )}
                {profile.is_best && (
                    <span className='dc-flag best' title='Best prediction'>
                        ★
                    </span>
                )}
                {profile.is_excluded && !EDGE_DIGITS.includes(profile.digit) && (
                    <span className='dc-flag excl' title='Excluded'>
                        ✕
                    </span>
                )}
                {EDGE_DIGITS.includes(profile.digit) && (
                    <span className='dc-flag edge' title='Edge digit — always excluded'>
                        EDGE
                    </span>
                )}
            </span>
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const DiffersCracker = observer(() => {
    const { digit_cracker, client } = useStore();
    const { ticks, markets, symbol, trade_engine } = digit_cracker;

    const [config, setConfig] = useState<TDiffersConfig>({
        manual_prediction: null,
        auto_prediction: true,
        stake: 1,
        ticks: 5,
        martingale: 2.0,
    });

    const analysis = useMemo(() => analyzeDiffers(ticks), [ticks]);

    const active_prediction = config.auto_prediction ? analysis.best_candidate : config.manual_prediction;

    const entry_report = useMemo(
        () => evalDiffersEntry(ticks, active_prediction, analysis.excluded_set),
        [ticks, active_prediction, analysis.excluded_set]
    );

    const set = (key: keyof TDiffersConfig, val: any) => setConfig(prev => ({ ...prev, [key]: val }));

    const availableMarkets = markets.flatMap(g => g.items);

    // Build last 15 pattern
    const last15 = ticks.slice(-15).map(d => ({
        d,
        is_excl: analysis.excluded_set.has(d),
        is_pred: d === active_prediction,
    }));

    return (
        <div className='dc-cracker'>
            {/* Header */}
            <div className='dc-cracker__header'>
                <div>
                    <h2>Differs Intelligence</h2>
                    <p className='dc-cracker__subtitle'>
                        Win when exit digit ≠ prediction &nbsp;·&nbsp; Predictions from 2–7 only
                    </p>
                </div>
                <div className='dc-market-select'>
                    <label>Asset</label>
                    <select value={symbol} onChange={e => digit_cracker.setSymbol(e.target.value)}>
                        {availableMarkets.map(m => (
                            <option key={m.value} value={m.value}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Best Prediction Banner */}
            <div className={`dc-banner ${analysis.best_candidate !== null ? 'active' : 'none'}`}>
                {analysis.best_candidate !== null ? (
                    <>
                        <span className='dc-banner__label'>Auto-Selected Prediction</span>
                        <span className='dc-banner__digit'>{analysis.best_candidate}</span>
                        <span className='dc-banner__detail'>
                            {analysis.profiles[analysis.best_candidate]?.pct.toFixed(1)}% — decreasing — not in last 25
                            (increasing) — clean candidate
                        </span>
                    </>
                ) : (
                    <span className='dc-banner__none'>
                        ⚠ No valid Differs prediction found. Market conditions not suitable yet.
                    </span>
                )}
            </div>

            {/* Last 15 Pattern */}
            <div className='dc-section glass-panel'>
                <div className='dc-section__title'>Last 15 Ticks Pattern</div>
                <div className='dc-pattern-row'>
                    {last15.map((item, i) => (
                        <div
                            key={i}
                            className={`dc-dot ${item.is_pred ? 'pred' : item.is_excl ? 'excl' : 'normal'}`}
                            title={`Digit ${item.d}`}
                        >
                            {item.d}
                        </div>
                    ))}
                </div>
                <div className='dc-pattern-legend'>
                    <span className='dc-dot pred'>P</span> Prediction digit &nbsp;·&nbsp;
                    <span className='dc-dot excl'>X</span> Excluded digit &nbsp;·&nbsp;
                    <span className='dc-dot normal'>N</span> Normal
                </div>
            </div>

            {/* Excluded Summary */}
            <div className='dc-section glass-panel'>
                <div className='dc-section__title'>Excluded Digits — Cannot Be Predictions</div>
                <div className='dc-excl-row'>
                    <div className='dc-excl-chip edge'>
                        <span>Edge (always)</span>
                        <div className='dc-excl-digits'>
                            {EDGE_DIGITS.map(d => (
                                <span key={d}>{d}</span>
                            ))}
                        </div>
                    </div>
                    <div className='dc-excl-chip rank'>
                        <span>Most appearing</span>
                        <div className='dc-excl-digits'>
                            <span>{analysis.most_appearing}</span>
                        </div>
                    </div>
                    <div className='dc-excl-chip rank'>
                        <span>2nd Most</span>
                        <div className='dc-excl-digits'>
                            <span>{analysis.second_most_appearing}</span>
                        </div>
                    </div>
                    <div className='dc-excl-chip rank'>
                        <span>Least</span>
                        <div className='dc-excl-digits'>
                            <span>{analysis.least_appearing}</span>
                        </div>
                    </div>
                    <div className='dc-excl-chip incr'>
                        <span>Increasing (2-7)</span>
                        <div className='dc-excl-digits'>
                            {ELIGIBLE_DIGITS.filter(d => analysis.increasing_digits.has(d)).map(d => (
                                <span key={d}>{d}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Digit Profiles Table */}
            <div className='dc-section glass-panel'>
                <div className='dc-section__title'>
                    Digit Analysis (2–7)
                    <span className='dc-section__legend'>
                        &nbsp;· Pct = overall &nbsp;· L25 = last 25 &nbsp;· Δ = last25 vs prev25
                    </span>
                </div>
                <div className='dc-table-header'>
                    <span>Digit</span>
                    <span>Distribution</span>
                    <span>Pct%</span>
                    <span>L25%</span>
                    <span>Trend Δ</span>
                    <span>Flags</span>
                </div>
                {analysis.profiles
                    .filter(p => ELIGIBLE_DIGITS.includes(p.digit))
                    .map(p => (
                        <DigitRow
                            key={p.digit}
                            profile={p}
                            is_prediction={p.digit === active_prediction}
                            onClick={() => {
                                if (!p.is_excluded) {
                                    set('auto_prediction', false);
                                    set('manual_prediction', p.digit);
                                }
                            }}
                        />
                    ))}
                <p className='dc-table-hint'>
                    Click an eligible row to manually set the prediction. Toggle auto to use the best candidate.
                </p>
            </div>

            {/* Prediction Selector */}
            <div className='dc-section glass-panel'>
                <div className='dc-section__title'>Prediction Selection</div>
                <div className='dc-pred-row'>
                    <button
                        className={`dc-mode-btn ${config.auto_prediction ? 'active' : ''}`}
                        onClick={() => set('auto_prediction', true)}
                    >
                        ⚡ Auto (Best Candidate)
                    </button>
                    <button
                        className={`dc-mode-btn ${!config.auto_prediction ? 'active' : ''}`}
                        onClick={() => set('auto_prediction', false)}
                    >
                        ✎ Manual
                    </button>
                    {!config.auto_prediction && (
                        <select
                            className='dc-select'
                            value={config.manual_prediction ?? ''}
                            onChange={e => set('manual_prediction', parseInt(e.target.value))}
                        >
                            <option value=''>-- Choose 2-7 --</option>
                            {ELIGIBLE_DIGITS.map(d => (
                                <option key={d} value={d} disabled={analysis.excluded_set.has(d)}>
                                    {d}{' '}
                                    {analysis.excluded_set.has(d)
                                        ? '(excluded)'
                                        : analysis.profiles[d]?.is_best
                                          ? '★ best'
                                          : ''}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
                <div className='dc-active-pred'>
                    Active Prediction:{' '}
                    <span className={`dc-active-pred__val ${active_prediction !== null ? 'set' : ''}`}>
                        {active_prediction ?? '—'}
                    </span>
                </div>
            </div>

            {/* Entry Conditions */}
            <div className='dc-section glass-panel'>
                <div className='dc-section__title'>Entry Gate — 4-Stage Verification</div>
                <div className='dc-stages'>
                    {[
                        'Excluded digit appears in last 3 ticks',
                        'Chosen prediction is decreasing (last 10 vs prev 10)',
                        'Prediction absent in last 3 ticks',
                        'Prediction absent in last 7 ticks',
                    ].map((label, i) => {
                        const done = entry_report.stage_index > i + 1;
                        const current = entry_report.stage_index === i + 1;
                        return (
                            <div key={i} className={`dc-stage ${done ? 'done' : current ? 'current' : ''}`}>
                                <span className='dc-stage__icon'>{done ? '✅' : current ? '⏳' : '○'}</span>
                                <span className='dc-stage__label'>
                                    Stage {i + 1}: {label}
                                </span>
                            </div>
                        );
                    })}
                </div>
                <div className={`dc-entry-signal ${entry_report.triggered ? 'triggered' : ''}`}>
                    {entry_report.stage}
                </div>
            </div>

            {/* Execution */}
            <div className='dc-section glass-panel'>
                <div className='dc-section__title'>Execution Settings</div>
                <div className='dc-exec-grid'>
                    <div className='dc-exec-field'>
                        <label>Stake ($)</label>
                        <input
                            className='dc-input'
                            type='number'
                            min='0.35'
                            step='0.01'
                            value={config.stake}
                            onChange={e => set('stake', parseFloat(e.target.value))}
                        />
                    </div>
                    <div className='dc-exec-field'>
                        <label>Ticks</label>
                        <input
                            className='dc-input'
                            type='number'
                            min='1'
                            max='10'
                            value={config.ticks}
                            onChange={e => set('ticks', parseInt(e.target.value))}
                        />
                    </div>
                    <div className='dc-exec-field'>
                        <label>Martingale ×</label>
                        <input
                            className='dc-input'
                            type='number'
                            min='1'
                            step='0.1'
                            value={config.martingale}
                            onChange={e => set('martingale', parseFloat(e.target.value))}
                        />
                    </div>
                </div>

                <div className={`dc-trade-signal ${entry_report.triggered ? 'active' : ''}`}>
                    {entry_report.triggered
                        ? `🚀 DIFFERS ${active_prediction} — Clean Entry Confirmed`
                        : '⏸ Waiting for all entry conditions…'}
                </div>

                <div className='dc-exec-btns'>
                    <button
                        className={`dc-btn-primary ${trade_engine?.differs_config?.is_running ? 'active' : ''}`}
                        onClick={() => trade_engine?.toggleStrategy('differs')}
                    >
                        {trade_engine?.differs_config?.is_running ? '⏹ Stop Auto-Trade' : '▶ Start Auto-Trade'}
                    </button>
                    <button
                        className='dc-btn-secondary'
                        disabled={trade_engine?.is_executing}
                        onClick={() => trade_engine?.executeManualTrade('differs', symbol, client.currency || 'USD')}
                    >
                        Manual Trade
                    </button>
                </div>
            </div>
        </div>
    );
});

export default DiffersCracker;
