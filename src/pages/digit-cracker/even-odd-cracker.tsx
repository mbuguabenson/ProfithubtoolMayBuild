import { useMemo,useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import './even-odd-cracker.scss';

// ─── Types ────────────────────────────────────────────────────────────────────
type TComparatorOp = '>' | '>=' | '==' | '<' | '<=';
type TTradeTarget = 'even' | 'odd' | 'both';
type TMarketPower = 'even' | 'odd' | 'either';
type TEntryCondition = 'entry1_rank' | 'entry2_reversal' | 'entry3_reversal_power' | 'entry4_predict';

interface TEvenOddConfig {
    comparator_op: TComparatorOp;
    probability_target: TMarketPower;
    threshold_pct: number;
    trade_target: TTradeTarget;
    selected_entry: TEntryCondition;
    stake: number;
}

// ─── Market Power Analysis ────────────────────────────────────────────────────
function analyzeEvenOdd(ticks: number[]) {
    if (ticks.length === 0) {
        return {
            even_pct: 50,
            odd_pct: 50,
            highest_digit: null as number | null,
            lowest_digit: null as number | null,
            second_highest_digit: null as number | null,
            pattern_last15: [] as string[],
            recommended_market: 'even' as 'even' | 'odd',
            recommended_pct: 50,
        };
    }

    const last15 = ticks.slice(-15);
    const pattern_last15 = last15.map(d => (d % 2 === 0 ? 'E' : 'O'));

    // Frequency counts per digit
    const freq: Record<number, number> = {};
    for (let i = 0; i <= 9; i++) freq[i] = 0;
    ticks.forEach(d => freq[d]++);

    // Sort by count descending
    const sorted = Object.entries(freq)
        .map(([digit, count]) => ({ digit: parseInt(digit), count }))
        .sort((a, b) => b.count - a.count);

    const highest_digit = sorted[0]?.digit ?? null;
    const second_highest_digit = sorted[1]?.digit ?? null;
    const lowest_digit = sorted[sorted.length - 1]?.digit ?? null;

    const total = ticks.length;
    const even_count = ticks.filter(d => d % 2 === 0).length;
    const odd_count = total - even_count;
    const even_pct = (even_count / total) * 100;
    const odd_pct = (odd_count / total) * 100;

    const recommended_market: 'even' | 'odd' = even_pct >= odd_pct ? 'even' : 'odd';
    const recommended_pct = Math.max(even_pct, odd_pct);

    return {
        even_pct,
        odd_pct,
        highest_digit,
        lowest_digit,
        second_highest_digit,
        pattern_last15,
        recommended_market,
        recommended_pct,
    };
}

// ─── Entry Condition Evaluator ────────────────────────────────────────────────
function evalEntryCondition(condition: TEntryCondition, ticks: number[], trade_target: TTradeTarget): boolean {
    if (ticks.length < 5) return false;

    switch (condition) {
        case 'entry1_rank': {
            // If the most appearing, 2nd most, and least digit are aligned by even/odd,
            // and the trade target is the dominant side
            const freq: Record<number, number> = {};
            for (let i = 0; i <= 9; i++) freq[i] = 0;
            ticks.forEach(d => freq[d]++);
            const sorted = Object.entries(freq)
                .map(([d, c]) => ({ digit: parseInt(d), count: c }))
                .sort((a, b) => b.count - a.count);
            const most = sorted[0].digit;
            const second = sorted[1].digit;
            const least = sorted[sorted.length - 1].digit;
            const target_is_even = trade_target === 'even';
            // All three must fall on same parity side as trade target
            return [most, second, least].every(d => (d % 2 === 0) === target_is_even);
        }
        case 'entry2_reversal': {
            // If trading even: last 2+ digits are all odd, then most recent is even → entry
            const last5 = ticks.slice(-5);
            const last = last5[last5.length - 1];
            const prev2 = last5.slice(-3, -1);
            if (trade_target === 'even') {
                return last % 2 === 0 && prev2.every(d => d % 2 !== 0);
            } else if (trade_target === 'odd') {
                return last % 2 !== 0 && prev2.every(d => d % 2 === 0);
            }
            return false;
        }
        case 'entry3_reversal_power': {
            // Highest digit is even with >60% and has been decreasing; wait for consecutive evens then start
            const freq: Record<number, number> = {};
            for (let i = 0; i <= 9; i++) freq[i] = 0;
            ticks.forEach(d => freq[d]++);
            const sorted = Object.entries(freq)
                .map(([d, c]) => ({ digit: parseInt(d), count: c }))
                .sort((a, b) => b.count - a.count);
            const top = sorted[0];
            const top_pct = (top.count / ticks.length) * 100;
            if (top_pct < 60) return false;
            const top_is_even = top.digit % 2 === 0;
            const recent5 = ticks.slice(-5);
            const consecutive_same = recent5.every(d => (d % 2 === 0) === top_is_even);
            return consecutive_same;
        }
        case 'entry4_predict': {
            // If in the last 2 ticks the least appearing digit showed up consecutively, start trading
            const freq: Record<number, number> = {};
            for (let i = 0; i <= 9; i++) freq[i] = 0;
            ticks.forEach(d => freq[d]++);
            const least_digit = Object.entries(freq)
                .map(([d, c]) => ({ digit: parseInt(d), count: c }))
                .sort((a, b) => a.count - b.count)[0].digit;
            const last2 = ticks.slice(-2);
            return last2.every(d => d === least_digit);
        }
        default:
            return false;
    }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const PatternDots = ({ pattern }: { pattern: string[] }) => (
    <div className='eo-pattern-row'>
        {pattern.map((p, i) => (
            <span key={i} className={`eo-dot ${p === 'E' ? 'even' : 'odd'}`}>
                {p}
            </span>
        ))}
    </div>
);

const PowerBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className='eo-power-bar'>
        <div className='eo-power-bar__labels'>
            <span>{label}</span>
            <span style={{ color }}>{value.toFixed(1)}%</span>
        </div>
        <div className='eo-power-bar__track'>
            <div
                className='eo-power-bar__fill'
                style={{ width: `${value}%`, background: color, boxShadow: `0 0 8px ${color}` }}
            />
        </div>
    </div>
);

const DigitBadge = ({ digit, label, color }: { digit: number | null; label: string; color: string }) => (
    <div className='eo-digit-badge'>
        <span className='eo-digit-badge__label'>{label}</span>
        <span className='eo-digit-badge__value' style={{ color, textShadow: `0 0 10px ${color}` }}>
            {digit ?? '-'}
        </span>
        {digit !== null && <span className='eo-digit-badge__parity'>{digit % 2 === 0 ? 'EVEN' : 'ODD'}</span>}
    </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────

const EvenOddCracker = observer(() => {
    const { digit_cracker, client } = useStore();
    const { ticks, markets, symbol, last_digit, trade_engine } = digit_cracker;

    const [config, setConfig] = useState<TEvenOddConfig>({
        comparator_op: '>=',
        probability_target: 'even',
        threshold_pct: 55,
        trade_target: 'even',
        selected_entry: 'entry1_rank',
        stake: 1,
    });

    const analysis = useMemo(() => analyzeEvenOdd(ticks), [ticks]);

    const entryTriggered = useMemo(
        () => evalEntryCondition(config.selected_entry, ticks, config.trade_target),
        [config.selected_entry, ticks, config.trade_target]
    );

    const prob_value =
        config.probability_target === 'even'
            ? analysis.even_pct
            : config.probability_target === 'odd'
              ? analysis.odd_pct
              : Math.max(analysis.even_pct, analysis.odd_pct);

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

    const shouldTrade = conditionMet && entryTriggered;

    const set = (key: keyof TEvenOddConfig, val: any) => setConfig(prev => ({ ...prev, [key]: val }));

    const availableMarkets = markets.flatMap(g => g.items);

    const ENTRY_LABELS: Record<TEntryCondition, string> = {
        entry1_rank: 'Entry 1 — Rank Alignment',
        entry2_reversal: 'Entry 2 — Streak Reversal',
        entry3_reversal_power: 'Entry 3 — Power Reversal',
        entry4_predict: 'Entry 4 — Least Digit Repeat',
    };

    const ENTRY_DESCRIPTIONS: Record<TEntryCondition, string> = {
        entry1_rank:
            'Start when the most appearing, 2nd most appearing, and least appearing digits are all on the same parity as the trade target.',
        entry2_reversal:
            'Start when 2+ consecutive opposite digits appear, followed by a single digit on the target parity (e.g., OOE for Even).',
        entry3_reversal_power:
            'Start when the top digit has >60% and 5 consecutive recent digits are all on the dominant parity side.',
        entry4_predict: 'Start when the least-appearing digit appears consecutively in the last 2 ticks.',
    };

    return (
        <div className='eo-cracker'>
            {/* Header */}
            <div className='eo-cracker__header'>
                <h2>Even / Odd Intelligence</h2>
                <div className='eo-market-select'>
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

            {/* Live Pattern */}
            <div className='eo-section glass-panel'>
                <div className='eo-section__title'>Last 15 Digits — Pattern Recognition</div>
                <PatternDots pattern={analysis.pattern_last15} />
                <div className='eo-pattern-legend'>
                    <span className='eo-dot even'>E</span> Even &nbsp;|&nbsp;
                    <span className='eo-dot odd'>O</span> Odd
                </div>
            </div>

            {/* Digit Rankings */}
            <div className='eo-section glass-panel'>
                <div className='eo-section__title'>Digit Frequency Rankings</div>
                <div className='eo-digit-badges-row'>
                    <DigitBadge digit={analysis.highest_digit} label='🥇 Highest' color='#f59e0b' />
                    <DigitBadge digit={analysis.second_highest_digit} label='🥈 2nd Highest' color='#94a3b8' />
                    <DigitBadge digit={analysis.lowest_digit} label='🔻 Lowest' color='#f43f5e' />
                    <DigitBadge
                        digit={last_digit}
                        label='⚡ Last Tick'
                        color={last_digit !== null && last_digit % 2 === 0 ? '#00c6ff' : '#38ef7d'}
                    />
                </div>
            </div>

            {/* Power Bars */}
            <div className='eo-section glass-panel'>
                <div className='eo-section__title'>Market Power</div>
                <PowerBar label='Even' value={analysis.even_pct} color='#00c6ff' />
                <PowerBar label='Odd' value={analysis.odd_pct} color='#38ef7d' />
                <div className='eo-recommendation'>
                    <span>Recommended Market:</span>
                    <span
                        className='eo-recommendation__badge'
                        style={{
                            background:
                                analysis.recommended_market === 'even'
                                    ? 'linear-gradient(135deg,#0072ff,#00c6ff)'
                                    : 'linear-gradient(135deg,#11998e,#38ef7d)',
                        }}
                    >
                        {analysis.recommended_market.toUpperCase()} — {analysis.recommended_pct.toFixed(1)}%
                    </span>
                </div>
            </div>

            {/* Condition Builder */}
            <div className='eo-section glass-panel'>
                <div className='eo-section__title'>Trade Condition</div>
                <div className='eo-condition-row'>
                    <span>If</span>
                    <select
                        className='eo-select'
                        value={config.probability_target}
                        onChange={e => set('probability_target', e.target.value)}
                    >
                        <option value='even'>Even %</option>
                        <option value='odd'>Odd %</option>
                        <option value='either'>Either %</option>
                    </select>
                    <select
                        className='eo-select'
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
                        className='eo-input'
                        type='number'
                        min='0'
                        max='100'
                        step='0.5'
                        value={config.threshold_pct}
                        onChange={e => set('threshold_pct', parseFloat(e.target.value))}
                    />
                    <span>%</span>
                </div>
                <div className='eo-condition-row' style={{ marginTop: '0.75rem' }}>
                    <span>Then trade</span>
                    <select
                        className='eo-select'
                        value={config.trade_target}
                        onChange={e => set('trade_target', e.target.value)}
                    >
                        <option value='even'>Even</option>
                        <option value='odd'>Odd</option>
                        <option value='both'>Both (Alternate)</option>
                    </select>
                </div>
                <div className={`eo-condition-status ${conditionMet ? 'met' : 'not-met'}`}>
                    <span className='eo-condition-status__dot' />
                    {config.probability_target.toUpperCase()} {prob_value.toFixed(1)}% {config.comparator_op}{' '}
                    {config.threshold_pct}% → {conditionMet ? '✅ Condition Met' : '⏳ Condition Not Met'}
                </div>
            </div>

            {/* Entry Condition */}
            <div className='eo-section glass-panel'>
                <div className='eo-section__title'>Entry Condition</div>
                <div className='eo-entry-tabs'>
                    {(Object.keys(ENTRY_LABELS) as TEntryCondition[]).map(key => (
                        <button
                            key={key}
                            className={`eo-entry-tab-btn ${config.selected_entry === key ? 'active' : ''}`}
                            onClick={() => set('selected_entry', key)}
                        >
                            {ENTRY_LABELS[key]}
                        </button>
                    ))}
                </div>
                <div className='eo-entry-desc'>{ENTRY_DESCRIPTIONS[config.selected_entry]}</div>
                <div className={`eo-entry-signal ${entryTriggered ? 'triggered' : ''}`}>
                    {entryTriggered ? '🟢 Entry Signal Active' : '🔴 Entry Condition Not Satisfied'}
                </div>
            </div>

            {/* Trade Panel */}
            <div className='eo-section glass-panel'>
                <div className='eo-section__title'>Execution</div>
                <div className='eo-exec-row'>
                    <label>Stake ($)</label>
                    <input
                        className='eo-input'
                        type='number'
                        min='0.35'
                        step='0.01'
                        value={config.stake}
                        onChange={e => set('stake', parseFloat(e.target.value))}
                    />
                </div>
                <div className={`eo-trade-signal ${shouldTrade ? 'active' : ''}`}>
                    {shouldTrade
                        ? `🚀 TRADE ${config.trade_target.toUpperCase()} — Signal Ready`
                        : '⏸ Waiting for combined signal…'}
                </div>
                <div className='eo-exec-btns'>
                    <button
                        className={`eo-btn-primary ${trade_engine?.even_odd_config?.is_running ? 'active' : ''}`}
                        onClick={() => trade_engine?.toggleStrategy('even_odd')}
                    >
                        {trade_engine?.even_odd_config?.is_running ? '⏹ Stop Auto-Trade' : '▶ Start Auto-Trade'}
                    </button>
                    <button
                        className='eo-btn-secondary'
                        disabled={trade_engine?.is_executing}
                        onClick={() => trade_engine?.executeManualTrade('even_odd', symbol, client.currency || 'USD')}
                    >
                        Manual Trade
                    </button>
                </div>
            </div>
        </div>
    );
});

export default EvenOddCracker;
