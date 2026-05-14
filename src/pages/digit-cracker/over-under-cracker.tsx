import { useMemo,useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import './over-under-cracker.scss';

// ─── Types ────────────────────────────────────────────────────────────────────
type TComparatorOp = '>' | '>=' | '==' | '<' | '<=';
type TTradeTarget = 'over' | 'under' | 'both';
type TEntryMode = 'entry1_highest' | 'entry2_streak' | 'entry3_reversal' | 'entry4_rank';

interface TOUConfig {
    comparator_op: TComparatorOp;
    probability_target: 'over' | 'under' | 'either';
    threshold_pct: number;
    trade_target: TTradeTarget;
    selected_entry: TEntryMode;
    // Secondary condition
    secondary_enabled: boolean;
    secondary_last_x: number;
    secondary_side: 'over' | 'under';
    secondary_prediction: number;
    secondary_then: TTradeTarget;
    secondary_prediction2: number;
    // Execution
    stake: number;
    ticks: number;
    martingale: number;
}

// ─── Analysis Engine ──────────────────────────────────────────────────────────
function analyzeOverUnder(ticks: number[]) {
    const UNDER_DIGITS = [0, 1, 2, 3, 4];
    const OVER_DIGITS = [5, 6, 7, 8, 9];

    const last15 = ticks.slice(-15);
    const pattern_last15 = last15.map(d => (d >= 5 ? 'O' : 'U'));

    // Frequency across all ticks
    const freq: Record<number, number> = {};
    for (let i = 0; i <= 9; i++) freq[i] = 0;
    ticks.forEach(d => freq[d]++);

    const sorted_all = Object.entries(freq)
        .map(([d, c]) => ({ digit: parseInt(d), count: c }))
        .sort((a, b) => b.count - a.count);

    const highest_digit = sorted_all[0]?.digit ?? null;
    const second_highest_digit = sorted_all[1]?.digit ?? null;
    const lowest_digit = sorted_all[sorted_all.length - 1]?.digit ?? null;

    // Over / Under group analysis
    const under_group = UNDER_DIGITS.map(d => ({ digit: d, count: freq[d] })).sort((a, b) => b.count - a.count);
    const over_group = OVER_DIGITS.map(d => ({ digit: d, count: freq[d] })).sort((a, b) => b.count - a.count);

    const highest_in_under = under_group[0]?.digit ?? null;
    const highest_in_over = over_group[0]?.digit ?? null;

    // Percentages
    const total = ticks.length || 1;
    const under_count = ticks.filter(d => d <= 4).length;
    const over_count = total - under_count;
    const under_pct = (under_count / total) * 100;
    const over_pct = (over_count / total) * 100;

    // Per-digit percentages in each group
    const under_digit_pcts = under_group.map(g => ({
        digit: g.digit,
        pct: (g.count / total) * 100,
    }));
    const over_digit_pcts = over_group.map(g => ({
        digit: g.digit,
        pct: (g.count / total) * 100,
    }));

    const recommended_market: 'over' | 'under' = over_pct >= under_pct ? 'over' : 'under';
    const recommended_pct = Math.max(over_pct, under_pct);

    // Best prediction for market
    const best_over_prediction = highest_in_over; // Highest digit in over group
    const best_under_prediction = highest_in_under; // Highest digit in under group

    // Suggested entry digit
    const suggested_over_entry = highest_in_over;
    const suggested_under_entry = highest_in_under;

    // Last 7 ticks check for pre-condition
    const last7 = ticks.slice(-7);
    const last7_all_under = last7.length === 7 && last7.every(d => d <= 4);
    const last7_all_over = last7.length === 7 && last7.every(d => d >= 5);

    return {
        under_pct,
        over_pct,
        highest_digit,
        second_highest_digit,
        lowest_digit,
        highest_in_under,
        highest_in_over,
        pattern_last15,
        recommended_market,
        recommended_pct,
        best_over_prediction,
        best_under_prediction,
        suggested_over_entry,
        suggested_under_entry,
        under_digit_pcts,
        over_digit_pcts,
        last7_all_under,
        last7_all_over,
    };
}

// ─── Entry Evaluator ──────────────────────────────────────────────────────────
function evalOUEntry(
    mode: TEntryMode,
    ticks: number[],
    target: TTradeTarget,
    highestInOver: number | null,
    highestInUnder: number | null
): boolean {
    if (ticks.length < 7) return false;
    const last = ticks[ticks.length - 1];

    switch (mode) {
        case 'entry1_highest': {
            // Trade Over: last tick IS the highest digit in over group
            // Trade Under: last tick IS the highest digit in under group
            if (target === 'over') return last === highestInOver;
            if (target === 'under') return last === highestInUnder;
            return last === highestInOver || last === highestInUnder;
        }
        case 'entry2_streak': {
            // If last 5 digits are all over/under, start when highest digit appears
            const last5 = ticks.slice(-5);
            if (target === 'over') {
                const streak = last5.every(d => d >= 5);
                return streak && last === highestInOver;
            }
            if (target === 'under') {
                const streak = last5.every(d => d <= 4);
                return streak && last === highestInUnder;
            }
            return false;
        }
        case 'entry3_reversal': {
            // Reversal: if highest market is over, trade under (and vice versa)
            // Entry when last tick switches to the trade side
            if (target === 'over') return last >= 5; // first over tick after streak
            if (target === 'under') return last <= 4;
            return false;
        }
        case 'entry4_rank': {
            // If top 3 digits (highest, 2nd highest, lowest) are all on the trade side,
            // trade when any of them appears in next 3 ticks
            const freq: Record<number, number> = {};
            for (let i = 0; i <= 9; i++) freq[i] = 0;
            ticks.forEach(d => freq[d]++);
            const sorted = Object.entries(freq)
                .map(([d, c]) => ({ digit: parseInt(d), count: c }))
                .sort((a, b) => b.count - a.count);
            const top3 = [sorted[0].digit, sorted[1].digit, sorted[sorted.length - 1].digit];
            const allOver = top3.every(d => d >= 5);
            const allUnder = top3.every(d => d <= 4);
            if (target === 'over' && allOver) return top3.includes(last);
            if (target === 'under' && allUnder) return top3.includes(last);
            return false;
        }
        default:
            return false;
    }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
const PatternDots = ({ pattern }: { pattern: string[] }) => (
    <div className='ou-pattern-row'>
        {pattern.map((p, i) => (
            <span key={i} className={`ou-dot ${p === 'O' ? 'over' : 'under'}`}>
                {p}
            </span>
        ))}
    </div>
);

const PowerBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className='ou-power-bar'>
        <div className='ou-power-bar__labels'>
            <span>{label}</span>
            <span style={{ color }}>{value.toFixed(1)}%</span>
        </div>
        <div className='ou-power-bar__track'>
            <div className='ou-power-bar__fill' style={{ width: `${value}%`, background: color }} />
        </div>
    </div>
);

const DigitBadge = ({ digit, label, color }: { digit: number | null; label: string; color: string }) => (
    <div className='ou-digit-badge'>
        <span className='ou-digit-badge__label'>{label}</span>
        <span className='ou-digit-badge__value' style={{ color, textShadow: `0 0 10px ${color}` }}>
            {digit ?? '-'}
        </span>
        {digit !== null && <span className='ou-digit-badge__side'>{digit >= 5 ? 'OVER' : 'UNDER'}</span>}
    </div>
);

const DigitGroupList = ({
    items,
    color,
    title,
}: {
    items: { digit: number; pct: number }[];
    color: string;
    title: string;
}) => (
    <div className='ou-group-list'>
        <div className='ou-group-list__title' style={{ color }}>
            {title}
        </div>
        {items.map(item => (
            <div key={item.digit} className='ou-group-list__row'>
                <span className='ou-group-list__digit' style={{ color }}>
                    {item.digit}
                </span>
                <div className='ou-group-list__bar-track'>
                    <div className='ou-group-list__bar-fill' style={{ width: `${item.pct * 5}%`, background: color }} />
                </div>
                <span className='ou-group-list__pct'>{item.pct.toFixed(1)}%</span>
            </div>
        ))}
    </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
const OverUnderCracker = observer(() => {
    const { digit_cracker, client } = useStore();
    const { ticks, markets, symbol, last_digit, trade_engine } = digit_cracker;

    const [config, setConfig] = useState<TOUConfig>({
        comparator_op: '>=',
        probability_target: 'over',
        threshold_pct: 55,
        trade_target: 'over',
        selected_entry: 'entry1_highest',
        secondary_enabled: false,
        secondary_last_x: 5,
        secondary_side: 'over',
        secondary_prediction: 5,
        secondary_then: 'over',
        secondary_prediction2: 5,
        stake: 1,
        ticks: 5,
        martingale: 2.0,
    });

    const analysis = useMemo(() => analyzeOverUnder(ticks), [ticks]);

    const entryTriggered = useMemo(
        () =>
            evalOUEntry(
                config.selected_entry,
                ticks,
                config.trade_target,
                analysis.highest_in_over,
                analysis.highest_in_under
            ),
        [config.selected_entry, config.trade_target, ticks, analysis.highest_in_over, analysis.highest_in_under]
    );

    // Pre-condition: last 7 ticks must be opposite of trade target
    const preConditionMet =
        config.trade_target === 'over'
            ? analysis.last7_all_under
            : config.trade_target === 'under'
              ? analysis.last7_all_over
              : true;

    const prob_value =
        config.probability_target === 'over'
            ? analysis.over_pct
            : config.probability_target === 'under'
              ? analysis.under_pct
              : Math.max(analysis.over_pct, analysis.under_pct);

    const conditionMet = (() => {
        const op = config.comparator_op;
        const val = prob_value;
        const th = config.threshold_pct;
        if (op === '>') return val > th;
        if (op === '>=') return val >= th;
        if (op === '==') return Math.abs(val - th) < 0.5;
        if (op === '<') return val < th;
        if (op === '<=') return val <= th;
        return false;
    })();

    const shouldTrade = conditionMet && entryTriggered && preConditionMet;

    const set = (key: keyof TOUConfig, val: any) => setConfig(prev => ({ ...prev, [key]: val }));

    const availableMarkets = markets.flatMap(g => g.items);

    const bestPrediction =
        config.trade_target === 'over'
            ? analysis.best_over_prediction
            : config.trade_target === 'under'
              ? analysis.best_under_prediction
              : null;

    const suggestedEntry =
        config.trade_target === 'over' ? analysis.suggested_over_entry : analysis.suggested_under_entry;

    const ENTRY_META: Record<TEntryMode, { label: string; desc: string }> = {
        entry1_highest: {
            label: 'Entry 1 — Highest Digit Appears',
            desc: 'Enter when the highest-appearing digit from the chosen side (Over: 5-9 | Under: 0-4) appears as the latest tick.',
        },
        entry2_streak: {
            label: 'Entry 2 — Streak Then Peak',
            desc: 'Wait for 5 consecutive digits on the chosen side, then enter when the highest digit on that side appears.',
        },
        entry3_reversal: {
            label: 'Entry 3 — Market Reversal',
            desc: 'If the dominant market is Over, trade Under (reverse) when the first tick on the opposite side appears.',
        },
        entry4_rank: {
            label: 'Entry 4 — Rank Alignment',
            desc: 'If the highest, 2nd highest, and lowest appearing digits are all on the same side, enter when any of them appears in the next 3 ticks.',
        },
    };

    return (
        <div className='ou-cracker'>
            {/* Header */}
            <div className='ou-cracker__header'>
                <h2>Over / Under Intelligence</h2>
                <div className='ou-market-select'>
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

            {/* Probability Bars */}
            <div className='ou-section glass-panel'>
                <div className='ou-section__title'>Market Power</div>
                <PowerBar label='Under (0–4)' value={analysis.under_pct} color='#f59e0b' />
                <PowerBar label='Over (5–9)' value={analysis.over_pct} color='#6366f1' />
                <div className='ou-recommendation'>
                    <span>Recommended Market:</span>
                    <span
                        className='ou-recommendation__badge'
                        style={{
                            background:
                                analysis.recommended_market === 'over'
                                    ? 'linear-gradient(135deg,#4f46e5,#818cf8)'
                                    : 'linear-gradient(135deg,#b45309,#f59e0b)',
                        }}
                    >
                        {analysis.recommended_market.toUpperCase()} — {analysis.recommended_pct.toFixed(1)}%
                    </span>
                    {bestPrediction !== null && (
                        <span className='ou-recommendation__suggest'>
                            Best Prediction: <strong style={{ color: '#00c6ff' }}>{bestPrediction}</strong>
                        </span>
                    )}
                </div>
                {suggestedEntry !== null && (
                    <div className='ou-entry-suggest'>
                        ⚡ Suggested Entry Digit:{' '}
                        <span
                            style={{
                                color: config.trade_target === 'over' ? '#818cf8' : '#f59e0b',
                                fontWeight: 900,
                                fontSize: '1.2rem',
                            }}
                        >
                            {suggestedEntry}
                        </span>
                        <span style={{ fontSize: '0.7rem', opacity: 0.6, marginLeft: '0.4rem' }}>
                            (highest in {config.trade_target === 'over' ? 'Over 5–9' : 'Under 0–4'})
                        </span>
                    </div>
                )}
            </div>

            {/* Last 15 Pattern */}
            <div className='ou-section glass-panel'>
                <div className='ou-section__title'>Last 15 Digits — Over / Under Pattern</div>
                <PatternDots pattern={analysis.pattern_last15} />
                <div className='ou-pattern-legend'>
                    <span className='ou-dot over'>O</span> Over (5-9) &nbsp;|&nbsp;
                    <span className='ou-dot under'>U</span> Under (0-4)
                </div>
            </div>

            {/* Digit Rankings */}
            <div className='ou-section glass-panel'>
                <div className='ou-section__title'>Digit Frequency Rankings</div>
                <div className='ou-digit-badges-row'>
                    <DigitBadge digit={analysis.highest_digit} label='🥇 Highest' color='#f59e0b' />
                    <DigitBadge digit={analysis.second_highest_digit} label='🥈 2nd Highest' color='#94a3b8' />
                    <DigitBadge digit={analysis.lowest_digit} label='🔻 Lowest' color='#f43f5e' />
                    <DigitBadge
                        digit={last_digit}
                        label='⚡ Last Tick'
                        color={last_digit !== null && last_digit >= 5 ? '#6366f1' : '#f59e0b'}
                    />
                </div>
                <div className='ou-group-cols'>
                    <DigitGroupList title='Under Group (0–4)' color='#f59e0b' items={analysis.under_digit_pcts} />
                    <DigitGroupList title='Over Group (5–9)' color='#818cf8' items={analysis.over_digit_pcts} />
                </div>
            </div>

            {/* Pre-trade Check */}
            <div className='ou-section glass-panel'>
                <div className='ou-section__title'>Pre-Trade Safety Check</div>
                <div className='ou-pretrade-desc'>
                    Before auto-trading, the last 7 ticks must be on the <strong>opposite</strong> side of your trade
                    target. (Trading Over → last 7 must be Under; Trading Under → last 7 must be Over.)
                </div>
                <div className={`ou-pretrade-status ${preConditionMet ? 'met' : 'not-met'}`}>
                    {preConditionMet
                        ? `✅ Pre-Condition Met — ${config.trade_target === 'over' ? 'Last 7 are all Under' : 'Last 7 are all Over'}`
                        : `⏳ Waiting… (need 7 consecutive ${config.trade_target === 'over' ? 'Under' : 'Over'} ticks)`}
                </div>
            </div>

            {/* Trade Condition */}
            <div className='ou-section glass-panel'>
                <div className='ou-section__title'>Trade Condition</div>

                {/* Primary condition */}
                <div className='ou-condition-row'>
                    <span>If</span>
                    <select
                        className='ou-select'
                        value={config.probability_target}
                        onChange={e => set('probability_target', e.target.value)}
                    >
                        <option value='over'>Over %</option>
                        <option value='under'>Under %</option>
                        <option value='either'>Either %</option>
                    </select>
                    <select
                        className='ou-select'
                        value={config.comparator_op}
                        onChange={e => set('comparator_op', e.target.value)}
                    >
                        <option value='>'>{'>'}</option>
                        <option value='>='>{'>='}</option>
                        <option value='=='>{'=='}</option>
                        <option value='<'>{'<'}</option>
                        <option value='<='>{'<='}</option>
                    </select>
                    <input
                        className='ou-input'
                        type='number'
                        min='0'
                        max='100'
                        step='0.5'
                        value={config.threshold_pct}
                        onChange={e => set('threshold_pct', parseFloat(e.target.value))}
                    />
                    <span>%</span>
                </div>
                <div className='ou-condition-row' style={{ marginTop: '0.5rem' }}>
                    <span>Then buy</span>
                    <select
                        className='ou-select'
                        value={config.trade_target}
                        onChange={e => set('trade_target', e.target.value)}
                    >
                        <option value='over'>Over</option>
                        <option value='under'>Under</option>
                        <option value='both'>Both (Alternate)</option>
                    </select>
                    {bestPrediction !== null && <span className='ou-prediction-chip'>Digit {bestPrediction}</span>}
                </div>
                <div className={`ou-condition-status ${conditionMet ? 'met' : 'not-met'}`}>
                    <span className='ou-condition-status__dot' />
                    {config.probability_target.toUpperCase()} {prob_value.toFixed(1)}% {config.comparator_op}{' '}
                    {config.threshold_pct}% → {conditionMet ? '✅ Condition Met' : '⏳ Condition Not Met'}
                </div>

                {/* Secondary condition */}
                <div className='ou-secondary-divider'>
                    <button
                        className={`ou-secondary-toggle ${config.secondary_enabled ? 'on' : ''}`}
                        onClick={() => set('secondary_enabled', !config.secondary_enabled)}
                    >
                        {config.secondary_enabled ? '— Remove' : '+ Add'} Secondary Condition
                    </button>
                </div>
                {config.secondary_enabled && (
                    <div className='ou-secondary-condition'>
                        <div className='ou-condition-row'>
                            <span>If last</span>
                            <input
                                className='ou-input'
                                type='number'
                                min='1'
                                max='20'
                                value={config.secondary_last_x}
                                onChange={e => set('secondary_last_x', parseInt(e.target.value))}
                                style={{ width: 52 }}
                            />
                            <span>digits are</span>
                            <select
                                className='ou-select'
                                value={config.secondary_side}
                                onChange={e => set('secondary_side', e.target.value)}
                            >
                                <option value='over'>Over</option>
                                <option value='under'>Under</option>
                            </select>
                            <input
                                className='ou-input'
                                type='number'
                                min='0'
                                max='9'
                                value={config.secondary_prediction}
                                onChange={e => set('secondary_prediction', parseInt(e.target.value))}
                                style={{ width: 52 }}
                                placeholder='Digit'
                            />
                        </div>
                        <div className='ou-condition-row' style={{ marginTop: '0.4rem' }}>
                            <span>Then buy</span>
                            <select
                                className='ou-select'
                                value={config.secondary_then}
                                onChange={e => set('secondary_then', e.target.value)}
                            >
                                <option value='over'>Over</option>
                                <option value='under'>Under</option>
                                <option value='both'>Both</option>
                            </select>
                            <span>Digit</span>
                            <input
                                className='ou-input'
                                type='number'
                                min='0'
                                max='9'
                                value={config.secondary_prediction2}
                                onChange={e => set('secondary_prediction2', parseInt(e.target.value))}
                                style={{ width: 52 }}
                            />
                        </div>
                        {/* Live secondary evaluation */}
                        {(() => {
                            const lastX = ticks.slice(-config.secondary_last_x);
                            const secMet =
                                lastX.length === config.secondary_last_x &&
                                lastX.every(d => (config.secondary_side === 'over' ? d >= 5 : d <= 4));
                            return (
                                <div
                                    className={`ou-condition-status ${secMet ? 'met' : 'not-met'}`}
                                    style={{ marginTop: '0.6rem' }}
                                >
                                    <span className='ou-condition-status__dot' />
                                    Secondary: {secMet ? '✅ Triggered' : '⏳ Not Triggered'}
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>

            {/* Entry Condition */}
            <div className='ou-section glass-panel'>
                <div className='ou-section__title'>Entry Condition</div>
                <div className='ou-entry-tabs'>
                    {(Object.keys(ENTRY_META) as TEntryMode[]).map(key => (
                        <button
                            key={key}
                            className={`ou-entry-tab-btn ${config.selected_entry === key ? 'active' : ''}`}
                            onClick={() => set('selected_entry', key)}
                        >
                            {ENTRY_META[key].label}
                        </button>
                    ))}
                </div>
                <div className='ou-entry-desc'>{ENTRY_META[config.selected_entry].desc}</div>
                <div className={`ou-entry-signal ${entryTriggered ? 'triggered' : ''}`}>
                    {entryTriggered ? '🟢 Entry Signal Active' : '🔴 Entry Condition Not Satisfied'}
                </div>
            </div>

            {/* Execution */}
            <div className='ou-section glass-panel'>
                <div className='ou-section__title'>Execution Settings</div>
                <div className='ou-exec-grid'>
                    <div className='ou-exec-field'>
                        <label>Stake ($)</label>
                        <input
                            className='ou-input'
                            type='number'
                            min='0.35'
                            step='0.01'
                            value={config.stake}
                            onChange={e => set('stake', parseFloat(e.target.value))}
                        />
                    </div>
                    <div className='ou-exec-field'>
                        <label>Ticks</label>
                        <input
                            className='ou-input'
                            type='number'
                            min='1'
                            max='10'
                            value={config.ticks}
                            onChange={e => set('ticks', parseInt(e.target.value))}
                        />
                    </div>
                    <div className='ou-exec-field'>
                        <label>Martingale ×</label>
                        <input
                            className='ou-input'
                            type='number'
                            min='1'
                            step='0.1'
                            value={config.martingale}
                            onChange={e => set('martingale', parseFloat(e.target.value))}
                        />
                    </div>
                </div>

                <div className={`ou-trade-signal ${shouldTrade ? 'active' : ''}`}>
                    {shouldTrade
                        ? `🚀 TRADE ${config.trade_target.toUpperCase()} — Digit ${bestPrediction ?? '?'} — All Conditions Met`
                        : '⏸ Waiting for all conditions…'}
                </div>

                <div className='ou-exec-btns'>
                    <button
                        className={`ou-btn-primary ${trade_engine?.over_under_config?.is_running ? 'active' : ''}`}
                        onClick={() => trade_engine?.toggleStrategy('over_under')}
                    >
                        {trade_engine?.over_under_config?.is_running ? '⏹ Stop Auto-Trade' : '▶ Start Auto-Trade'}
                    </button>
                    <button
                        className='ou-btn-secondary'
                        disabled={trade_engine?.is_executing}
                        onClick={() => trade_engine?.executeManualTrade('over_under', symbol, client.currency || 'USD')}
                    >
                        Manual Trade
                    </button>
                </div>
            </div>
        </div>
    );
});

export default OverUnderCracker;
