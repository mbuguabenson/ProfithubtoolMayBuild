import { useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { observer as globalObserver } from '@/external/bot-skeleton';
import './signal-centre-tab.scss';

/* ─────────────────────── CONSTANTS ─────────────────────── */

const CONTINUOUS_INDICES = [
    { symbol: 'R_10', label: 'Volatility 10 Index' },
    { symbol: 'R_25', label: 'Volatility 25 Index' },
    { symbol: 'R_50', label: 'Volatility 50 Index' },
    { symbol: 'R_75', label: 'Volatility 75 Index' },
    { symbol: 'R_100', label: 'Volatility 100 Index' },
    { symbol: '1HZ10V', label: 'Volatility 10 (1s)' },
    { symbol: '1HZ25V', label: 'Volatility 25 (1s)' },
    { symbol: '1HZ50V', label: 'Volatility 50 (1s)' },
    { symbol: '1HZ75V', label: 'Volatility 75 (1s)' },
    { symbol: '1HZ100V', label: 'Volatility 100 (1s)' },
];

const TRADE_TYPES = [
    { id: 'EVENODD', label: 'Even / Odd', icon: '⚖️', color: '#6366f1' },
    { id: 'OVERUNDER', label: 'Over / Under', icon: '📊', color: '#f59e0b' },
    { id: 'MATCHES', label: 'Matches', icon: '🎯', color: '#8b5cf6' },
    { id: 'RISEFALL', label: 'Rise / Fall', icon: '📈', color: '#10b981' },
    { id: 'DIFFERS', label: 'Differs', icon: '🎯', color: '#ec4899' },
];

const SIGNAL_VALIDITY_SECONDS = 45;

/* ─────────────────────── ANALYSIS HELPERS ─────────────────────── */

interface MarketAnalysis {
    symbol: string;
    label: string;
    ticks: number[];
    evenPct: number;
    oddPct: number;
    overPct: number;
    underPct: number;
    risePct: number;
    fallPct: number;
    differsBest: number;
    matchesBest: number;
    highestDigit: number;
    secondHighestDigit: number;
    lowestDigit: number;
    highestUnderDigit: number; // 0-4
    highestOverDigit: number; // 5-9
    mostIncreasingDigit: number;
    freqMap: Record<number, number>;
    powerTrend: Record<number, number>; // 1 = increasing, 0 = stable, -1 = decreasing
    deviation: number;
    confidence: number;
    signal: string;
    entry: string;
    tradeType: string;
    prediction: number | number[] | null;
    score: number;
}

function analyseMarket(
    symbol: string, 
    label: string, 
    digits: number[], 
    tradeType: string,
    thresholds: { eo: number, ou: number, rf: number } = { eo: 7, ou: 7, rf: 8 }
): MarketAnalysis {
    const last15 = digits.slice(-15);
    const prev15 = digits.slice(-30, -15);
    const total15 = last15.length || 1;

    // Digit frequency for last 15
    const freq15: Record<number, number> = {};
    for (let d = 0; d < 10; d++) freq15[d] = 0;
    last15.forEach(d => freq15[d]++);

    const sorted15 = Object.entries(freq15).sort((a, b) => b[1] - a[1]);
    const highestDigit = Number(sorted15[0][0]);
    const secondHighestDigit = Number(sorted15[1][0]);
    const lowestDigit = Number(sorted15[sorted15.length - 1][0]);

    // Power trend: compare freq in last 15 vs previous 15
    const freqPrev: Record<number, number> = {};
    for (let d = 0; d < 10; d++) freqPrev[d] = 0;
    prev15.forEach(d => freqPrev[d]++);

    const powerTrend: Record<number, number> = {};
    let maxIncrease = -100;
    let mostIncreasingDigit = highestDigit;

    for (let d = 0; d < 10; d++) {
        const diff = freq15[d] - freqPrev[d];
        powerTrend[d] = diff > 0 ? 1 : diff < 0 ? -1 : 0;
        if (diff > maxIncrease) {
            maxIncrease = diff;
            mostIncreasingDigit = d;
        }
    }
    const last = digits;
    const total = digits.length || 1;

    const even = last.filter((d: number) => d % 2 === 0).length;
    const odd = total - even;
    const over = last.filter((d: number) => d >= 5).length;
    const under = total - over;

    const evenPct = (even / total) * 100;
    const oddPct = (odd / total) * 100;
    const overPct = (over / total) * 100;
    const underPct = (under / total) * 100;

    let rises = 0, falls = 0;
    for (let i = 1; i < last.length; i++) {
        if (last[i] > last[i - 1]) rises++;
        else if (last[i] < last[i - 1]) falls++;
    }
    const rf_total = rises + falls || 1;
    const risePct = (rises / rf_total) * 100;
    const fallPct = (falls / rf_total) * 100;

    const freq: Record<number, number> = {};
    for (let d = 0; d < 10; d++) freq[d] = 0;
    last.forEach((d: number) => { if (d >= 0 && d <= 9) freq[d]++; });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    const matchesBest = Number(sorted[0][0]);
    const differsBest = Number(sorted[sorted.length - 1][0]);

    let deviation = 0, signal = 'STANDBY', entry = '', prediction: number | number[] | null = null, score = 0;

    switch (tradeType) {
        case 'EVENODD': {
            const dom = evenPct > oddPct ? 'EVEN' : 'ODD';
            deviation = Math.abs(evenPct - oddPct);
            score = Math.min(deviation * 3, 100);
            if (deviation >= thresholds.eo) { signal = dom === 'EVEN' ? 'BUY EVEN' : 'BUY ODD'; entry = dom; }
            break;
        }
        case 'OVERUNDER': {
            // New logic for Over/Under: 15-tick based
            const overDigits = last15.filter(d => d >= 5);
            const underDigits = last15.filter(d => d < 5);
            
            const ouFreq: Record<number, number> = {};
            for (let d = 0; d < 10; d++) ouFreq[d] = 0;
            last15.forEach(d => ouFreq[d]++);
            
            const sortedUnder = Object.entries(ouFreq).filter(([d]) => Number(d) < 5).sort((a, b) => b[1] - a[1]);
            const sortedOver = Object.entries(ouFreq).filter(([d]) => Number(d) >= 5).sort((a, b) => b[1] - a[1]);
            
            const highestUnderDigit = Number(sortedUnder[0][0]);
            const highestOverDigit = Number(sortedOver[0][0]);
            
            const ovPct = (overDigits.length / total15) * 100;
            const unPct = (underDigits.length / total15) * 100;
            
            deviation = Math.abs(ovPct - unPct);
            score = Math.min(deviation * 8, 100);
            
            if (deviation >= 15) {
                const dom = ovPct > unPct ? 'OVER' : 'UNDER';
                signal = dom === 'OVER' ? `BUY OVER ${highestOverDigit}` : `BUY UNDER ${highestUnderDigit}`;
                entry = `H-Under: ${highestUnderDigit} | H-Over: ${highestOverDigit}`;
                prediction = dom === 'OVER' ? highestOverDigit : highestUnderDigit;
            }
            break;
        }
        case 'MATCHES': {
            // New logic for Matches: 15-tick based
            const hPct = (freq15[highestDigit] / total15) * 100;
            deviation = hPct - 10;
            score = Math.min(deviation * 10, 100);
            
            // Multiple predictions: Top 3 (Highest, 2nd Highest, Most Increasing)
            const preds = Array.from(new Set([highestDigit, secondHighestDigit, mostIncreasingDigit]));
            
            if (hPct >= 15) { // Match probability trigger
                signal = `MATCH ${highestDigit}`;
                entry = `Ranked: H:${highestDigit} 2nd:${secondHighestDigit} L:${lowestDigit} | Incr:${mostIncreasingDigit}`;
                prediction = preds;
            }
            break;
        }
        case 'DIFFERS': {
            // Updated Differs: focus on highest and increasing (since they are likely to repeat, so we avoid them? No, user says "analyse highest and increasing" maybe to suggest what to avoid)
            // But wait, user said "Now on differs should analyse the highest and increasing power digits. Since this is an indication of highest increasing"
            // Usually on differs we avoid the most frequent.
            const mostDigit = highestDigit;
            deviation = (freq15[mostDigit] / total15) * 100;
            score = Math.min(deviation * 8, 100);
            if (deviation >= 15) {
                signal = `DIFFER ${mostDigit}`;
                entry = `Avoid ${mostDigit} (Power Increasing)`;
                prediction = mostDigit;
            }
            break;
        }
    }

    const confidence = Math.min(score * (Math.min(total, 120) / 120), 100);

    const sortedUnder = Object.entries(freq15).filter(([d]) => Number(d) < 5).sort((a, b) => b[1] - a[1]);
    const sortedOver = Object.entries(freq15).filter(([d]) => Number(d) >= 5).sort((a, b) => b[1] - a[1]);
    const highestUnderDigit = Number(sortedUnder[0][0]);
    const highestOverDigit = Number(sortedOver[0][0]);

    return {
        symbol, label, ticks: last, evenPct, oddPct, overPct, underPct, risePct, fallPct,
        differsBest, matchesBest, highestDigit, secondHighestDigit, lowestDigit, 
        highestUnderDigit, highestOverDigit, mostIncreasingDigit,
        freqMap: freq15, powerTrend, deviation, confidence,
        signal: signal || 'STANDBY', entry, tradeType, prediction, score,
    };
}

/* ─────────────────────── MAIN COMPONENT ─────────────────────── */

const SignalCentreTab = observer(() => {
    const { common, smart_trading } = useStore();
    const { is_socket_opened } = common;
    const currency = smart_trading?.root_store?.client?.currency || 'USD';

    // ── Local state ──
    const [tradeType, setTradeType] = useState<string>('EVENODD');
    const [isScanning, setIsScanning] = useState(false);
    const [scanPhase, setScanPhase] = useState<string>('STANDBY');
    const [scanningIndex, setScanningIndex] = useState(-1);
    const [analyses, setAnalyses] = useState<MarketAnalysis[]>([]);
    const [bestSignal, setBestSignal] = useState<MarketAnalysis | null>(null);
    const [validity, setValidity] = useState(0);

    // Bot settings
    const [stake, setStake] = useState(1.0);
    const [tp, setTp] = useState(10);
    const [sl, setSl] = useState(10);
    const [martingale] = useState(false);
    const [martingaleMultiplier] = useState(2.0);
    const [isBotRunning, setIsBotRunning] = useState(false);
    const [botLog, setBotLog] = useState<string[]>([]);
    const [botPL, setBotPL] = useState(0);
    const [botWins, setBotWins] = useState(0);
    const [botLosses, setBotLosses] = useState(0);
    const [ticks, setTicks] = useState(1);
    const [bulkTrades, setBulkTrades] = useState(1);
    const [compoundStake, setCompoundStake] = useState(false);
    const [alternateMarket, setAlternateMarket] = useState(false);
    const [alternateAfterLosses, setAlternateAfterLosses] = useState(3);
    const [alternateMarketSymbol, setAlternateMarketSymbol] = useState('R_10');
    const [alternateTradeType, setAlternateTradeType] = useState('EVENODD');
    const [consecutiveLosses, setConsecutiveLosses] = useState(0);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [activeDashboardTab, setActiveDashboardTab] = useState<'SUMMARY' | 'TRANSACTIONS' | 'JOURNAL'>('SUMMARY');

    const [useMultipleMatches, setUseMultipleMatches] = useState(false);
    const [matchPredictions, setMatchPredictions] = useState<number[]>([0]);
    const [manualPrediction, setManualPrediction] = useState<number | null>(null);
    const [evenOddThreshold, setEvenOddThreshold] = useState(7);
    const [overUnderThreshold, setOverUnderThreshold] = useState(7);
    const [riseFallThreshold, setRiseFallThreshold] = useState(8);
    const [isReversal, setIsReversal] = useState(false);
    const [nextTicksToTrade, setNextTicksToTrade] = useState(0);
    const [showAdvanced, setShowAdvanced] = useState(false);


    const subsRef = useRef<Map<string, () => void>>(new Map());
    const scanRef = useRef(false);
    const validityRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const botRef = useRef(false);
    const botStakeRef = useRef(1.0);

    const api_base_ref = useRef<any>(null);
    useEffect(() => {
        import('@/external/bot-skeleton').then(mod => {
            api_base_ref.current = mod.api_base.api;
        });
    }, []);

    const subscribeSymbol = useCallback((sym: string): Promise<number[]> => {
        return new Promise(resolve => {
            if (!api_base_ref.current) { resolve([]); return; }
            const acc: number[] = [];
            const api = api_base_ref.current;
            
            const doRequest = async () => {
                try {
                    const resp = await api.send({
                        ticks_history: sym,
                        count: 120,
                        end: 'latest',
                        style: 'ticks',
                        subscribe: 1,
                    });
                    
                    const hist = resp.history || resp.ticks_history;
                    if (hist?.prices) {
                        hist.prices.forEach((p: any) => {
                            const s = String(p);
                            const dig = parseInt(s[s.length - 1]);
                            if (!isNaN(dig)) acc.push(dig);
                        });
                    }

                    const streamId = resp.subscription?.id;
                    const sub = api.onMessage().subscribe((msg: any) => {
                        if (msg.msg_type === 'tick' && msg.tick?.symbol === sym) {
                            const s = String(msg.tick.quote);
                            const dig = parseInt(s[s.length - 1]);
                            if (!isNaN(dig)) {
                                acc.push(dig);
                                if (acc.length > 120) acc.shift();
                            }
                        }
                    });


                    subsRef.current.set(sym, () => {
                        sub.unsubscribe();
                        if (streamId) api.send({ forget: streamId }).catch(() => {});
                    });

                    resolve([...acc]);
                } catch (err) { resolve([]); }
            };
            doRequest();
        });
    }, []);

    const clearAllSubs = useCallback(() => {
        subsRef.current.forEach(unsub => unsub());
        subsRef.current.clear();
    }, []);

    const startValidity = useCallback(() => {
        setValidity(SIGNAL_VALIDITY_SECONDS);
        if (validityRef.current) clearInterval(validityRef.current);
        validityRef.current = setInterval(() => {
            setValidity(v => {
                if (v <= 1) {
                    clearInterval(validityRef.current!);
                    setBestSignal(null);
                    setScanPhase('STANDBY');
                    return 0;
                }
                return v - 1;
            });
        }, 1000);
    }, []);

    const runScan = useCallback(async () => {
        if (isScanning) return;
        clearAllSubs();
        setIsScanning(true);
        scanRef.current = true;
        setBestSignal(null);
        setAnalyses([]);
        setScanPhase('SCANNING');
        
        const results: MarketAnalysis[] = [];
        for (let i = 0; i < CONTINUOUS_INDICES.length; i++) {
            if (!scanRef.current) break;
            const { symbol, label } = CONTINUOUS_INDICES[i];
            setScanningIndex(i);
            const digits = await subscribeSymbol(symbol);
            if (digits.length >= 20) {
                const analysis = analyseMarket(symbol, label, digits, tradeType, {
                    eo: evenOddThreshold,
                    ou: overUnderThreshold,
                    rf: riseFallThreshold
                });
                results.push(analysis);
                setAnalyses([...results]);
            }
            await new Promise(r => setTimeout(r, 600));
        }

        const found = results.filter(r => r.signal !== 'STANDBY').sort((a, b) => b.confidence - a.confidence)[0] || null;
        if (found) {
            setBestSignal(found);
            setScanPhase('SIGNAL_FOUND');
            startValidity();
        } else {
            setScanPhase('NO_SIGNAL');
        }
        setIsScanning(false);
        setScanningIndex(-1);
    }, [isScanning, tradeType, subscribeSymbol, clearAllSubs, startValidity]);

    const stopScan = useCallback(() => {
        scanRef.current = false;
        setIsScanning(false);
        setScanPhase('STANDBY');
        clearAllSubs();
    }, [clearAllSubs]);

    const executeTrade = useCallback(async (analysis: MarketAnalysis, stakeAmt: number, customPrediction?: number) => {
        if (!api_base_ref.current || !is_socket_opened) return null;
        const api = api_base_ref.current;
        let contractType = '';
        let barrier: number | undefined;

        switch (analysis.tradeType) {
            case 'EVENODD': contractType = analysis.entry === 'EVEN' ? 'DIGITEVEN' : 'DIGITODD'; break;
            case 'OVERUNDER': 
                contractType = analysis.entry === 'OVER' ? 'DIGITOVER' : 'DIGITUNDER';
                barrier = Array.isArray(analysis.prediction) ? analysis.prediction[0] : (analysis.prediction ?? 4);
                break;
            case 'MATCHES':
                contractType = 'DIGITMATCH';
                barrier = customPrediction ?? (Array.isArray(analysis.prediction) ? analysis.prediction[0] : (analysis.prediction ?? 0));
                break;
            case 'RISEFALL': contractType = analysis.entry === 'RISE' ? 'CALL' : 'PUT'; break;
            case 'DIFFERS':
                contractType = 'DIGITDIFF';
                barrier = Array.isArray(analysis.prediction) ? analysis.prediction[0] : (analysis.prediction ?? 0);
                break;
        }

        try {
            const req: any = {
                proposal: 1, amount: stakeAmt, basis: 'stake', contract_type: contractType,
                currency: currency, duration: ticks, duration_unit: 't', symbol: analysis.symbol,
            };
            if (barrier !== undefined) req.barrier = barrier;
            const resp = await api.send(req);
            if (resp.error) {
                addLog(`❌ Proposal Error: ${resp.error.message}`);
                globalObserver.emit('Error', resp.error);
                return null;
            }

            globalObserver.emit('contract.status', { id: 'contract.purchase_sent' });

            const buy = await api.send({ buy: resp.proposal.id, price: stakeAmt });
            if (buy.error) {
                addLog(`❌ Buy Error: ${buy.error.message}`);
                globalObserver.emit('Error', buy.error);
                return null;
            }

            globalObserver.emit('contract.status', { id: 'contract.purchase_received', buy: buy.buy });
            return buy.buy?.contract_id || null;
        } catch (e: any) { 
            addLog(`❌ Execution Exception: ${e.message || e}`);
            return null; 
        }
    }, [is_socket_opened, ticks, currency]);



    const waitForResult = (id: string | number): Promise<{
        status: string, 
        profit: number, 
        entry?: string, 
        exit?: string, 
        buyId?: string, 
        sellId?: string, 
        lastDigit?: number | null
    } | null> => {
        return new Promise(resolve => {
            const api = api_base_ref.current;
            if (!api) { resolve(null); return; }
            
            // Subscribe to POC for this contract
            api.send({ proposal_open_contract: 1, contract_id: id, subscribe: 1 });

            const sub = api.onMessage().subscribe((msg: any) => {
                const poc = msg.proposal_open_contract;
                if (poc && poc.contract_id == id && poc.is_sold) {
                    sub.unsubscribe();
                    globalObserver.emit('bot.contract', poc);
                    globalObserver.emit('contract.status', { id: 'contract.sold', contract: poc });
                    resolve({ 
                        status: poc.status, 
                        profit: parseFloat(poc.profit || '0'),
                        entry: poc.entry_tick_display_value,
                        exit: poc.exit_tick_display_value,
                        buyId: poc.transaction_ids?.buy,
                        sellId: poc.transaction_ids?.sell,
                        lastDigit: poc.exit_tick_display_value ? parseInt(poc.exit_tick_display_value.slice(-1)) : null
                    });
                }
            });


            
            // Timeout after 30 seconds
            setTimeout(() => { 
                sub.unsubscribe(); 
                resolve(null); 
            }, 30000);
        });
    };


    const addLog = (msg: string) => {
        const ts = new Date().toLocaleTimeString();
        setBotLog(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 50));
    };

    const runBotLoop = useCallback(async () => {
        if (!bestSignal || !isBotRunning) return;
        botRef.current = true;
        botStakeRef.current = stake;
        let runningPL = 0;
        setConsecutiveLosses(0);
        addLog(`🤖 Bot Started | Strategy: ${tradeType} | Stake: ${stake}`);

        while (botRef.current) {
            // Re-fetch digits to check for pattern/power changes
            const sym = bestSignal.symbol;
            const digits = await subscribeSymbol(sym);
            if (digits.length < 30) { await new Promise(r => setTimeout(r, 2000)); continue; }

            const analysis = analyseMarket(sym, bestSignal.label, digits, tradeType, {
                eo: evenOddThreshold,
                ou: overUnderThreshold,
                rf: riseFallThreshold
            });

            let shouldTrade = false;
            let currentAnalysis = analysis;

            if (tradeType === 'MATCHES') {
                const target = manualPrediction !== null ? manualPrediction : analysis.highestDigit;
                const isIncreasing = analysis.powerTrend[target] === 1;
                const last5 = digits.slice(-5);
                const patternMatch = last5.some(d => d === analysis.highestDigit || d === analysis.secondHighestDigit || d === analysis.lowestDigit);
                
                if (isIncreasing || patternMatch) shouldTrade = true;
            } else if (tradeType === 'OVERUNDER') {
                const last5 = digits.slice(-5);
                const isOverDom = last5.filter(d => d >= 5).length >= 3;
                const isUnderDom = last5.filter(d => d < 5).length >= 3;
                const lastTick = digits[digits.length - 1];

                // Trigger if highest digit appears on chosen side
                const targetDigit = analysis.prediction as number;
                const patternMatch = (analysis.entry.includes('OVER') && isOverDom) || (analysis.entry.includes('UNDER') && isUnderDom);
                
                if (patternMatch && lastTick === targetDigit) {
                    shouldTrade = true;
                }

                // "If trading over the hishest, 2nd highest and lowest are over then trade over when the digits appear in then next three ticks."
                if (analysis.highestDigit >= 5 && analysis.secondHighestDigit >= 5 && analysis.lowestDigit >= 5) {
                    if (patternMatch && nextTicksToTrade === 0) setNextTicksToTrade(3);
                }

                if (nextTicksToTrade > 0) {
                    shouldTrade = true;
                    setNextTicksToTrade(prev => prev - 1);
                }

                if (isReversal) {
                    currentAnalysis = { 
                        ...analysis, 
                        entry: analysis.entry.includes('OVER') ? 'UNDER' : 'OVER',
                        prediction: analysis.entry.includes('OVER') ? analysis.highestUnderDigit : analysis.highestOverDigit
                    };
                }
            } else {
                shouldTrade = analysis.signal !== 'STANDBY';
            }

            if (!shouldTrade) {
                // addLog(`⏳ Waiting for Entry Condition...`);
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            // Override with manual prediction if set
            if (manualPrediction !== null) {
                currentAnalysis = { ...analysis, prediction: manualPrediction };
            }

            if (alternateMarket && consecutiveLosses >= alternateAfterLosses) {
                addLog(`🔄 Recovery Mode: Switching to ${alternateMarketSymbol} (${alternateTradeType})`);
                currentAnalysis = { 
                    ...analysis, 
                    symbol: alternateMarketSymbol, 
                    tradeType: alternateTradeType,
                    prediction: 0
                };
            }

            const currentStake = botStakeRef.current;
            const ids: string[] = [];

            if (tradeType === 'MATCHES' && useMultipleMatches) {
                const preds = Array.isArray(currentAnalysis.prediction) ? currentAnalysis.prediction : [currentAnalysis.prediction ?? 0];
                for (const pred of preds.slice(0, 3)) {
                    for (let i = 0; i < bulkTrades; i++) {
                        const id = await executeTrade(currentAnalysis, currentStake, Number(pred));
                        if (id) ids.push(id);
                        await new Promise(r => setTimeout(r, 300)); 
                    }
                }
            } else {
                for (let i = 0; i < bulkTrades; i++) {
                    const id = await executeTrade(currentAnalysis, currentStake);
                    if (id) ids.push(id);
                    await new Promise(r => setTimeout(r, 300));
                }
            }

            if (ids.length === 0) {
                addLog('⚠️ Execution failed - retrying...');
                await new Promise(r => setTimeout(r, 2000));
                continue;
            }

            addLog(`📤 ${ids.length} Trade(s) placed on ${currentAnalysis.symbol}`);
            const results = await Promise.all(ids.map(id => waitForResult(id!)));
            let batchP = 0, batchW = 0, batchL = 0;
            results.forEach(res => {
                if (!res) return;
                batchP += res.profit;
                if (res.status === 'won') batchW++; else batchL++;
                
                setTransactions(prev => [{
                    id: res.buyId || Math.random().toString(36).substr(2, 9),
                    time: new Date().toLocaleTimeString(),
                    symbol: currentAnalysis.symbol,
                    type: currentAnalysis.tradeType,
                    stake: currentStake,
                    profit: res.profit,
                    status: res.status,
                    entry: res.entry,
                    exit: res.exit,
                    lastDigit: res.lastDigit,
                    power: currentAnalysis.confidence
                }, ...prev].slice(0, 100));
            });

            runningPL += batchP;
            setBotWins(prev => prev + batchW);
            setBotLosses(prev => prev + batchL);
            setBotPL(runningPL);

            if (batchP > 0) {
                setConsecutiveLosses(0);
                addLog(`✅ Wins: ${batchW}, Losses: ${batchL} | Net: +${batchP.toFixed(2)}`);
                if (compoundStake) {
                    botStakeRef.current = parseFloat((botStakeRef.current + batchP).toFixed(2));
                    addLog(`📈 Compounding → Stake: ${botStakeRef.current}`);
                } else botStakeRef.current = stake;
                
                if (runningPL >= tp) { 
                    addLog(`🏆 Take Profit hit! Total P/L: ${runningPL.toFixed(2)}`); 
                    break; 
                }
            } else {
                setConsecutiveLosses(prev => prev + 1);
                addLog(`❌ Wins: ${batchW}, Losses: ${batchL} | Net: ${batchP.toFixed(2)}`);
                if (martingale) {
                    botStakeRef.current = Math.min(currentStake * martingaleMultiplier, 500);
                    addLog(`📉 Martingale → Stake: ${botStakeRef.current.toFixed(2)}`);
                } else botStakeRef.current = stake;

                if (Math.abs(runningPL) >= sl && runningPL < 0) { 
                    addLog(`🛑 Stop Loss hit! Total P/L: ${runningPL.toFixed(2)}`); 
                    break;
                }
            }
            await new Promise(r => setTimeout(r, 1000));
        }
        setIsBotRunning(false);
        botRef.current = false;
    }, [bestSignal, isBotRunning, stake, tp, sl, martingale, martingaleMultiplier, bulkTrades, compoundStake, alternateMarket, alternateAfterLosses, alternateMarketSymbol, alternateTradeType, consecutiveLosses, executeTrade, tradeType, useMultipleMatches, matchPredictions]);

    const handleManualTrade = useCallback(async () => {
        if (!bestSignal) return;
        const currentStake = stake;
        addLog(`⚡ Manual Trade | Strategy: ${tradeType} | Stake: ${currentStake}`);
        
        let currentAnalysis = bestSignal;
        if (manualPrediction !== null) {
            currentAnalysis = { ...bestSignal, prediction: manualPrediction };
        }
        
        const ids: string[] = [];

        if (tradeType === 'MATCHES' && useMultipleMatches) {
            const preds = Array.isArray(currentAnalysis.prediction) ? currentAnalysis.prediction : [currentAnalysis.prediction ?? 0];
            for (const pred of preds.slice(0, 3)) {
                for (let i = 0; i < bulkTrades; i++) {
                    const id = await executeTrade(currentAnalysis, currentStake, Number(pred));
                    if (id) ids.push(id);
                    await new Promise(r => setTimeout(r, 300)); 
                }
            }
        } else {
            for (let i = 0; i < bulkTrades; i++) {
                const id = await executeTrade(currentAnalysis, currentStake);
                if (id) ids.push(id);
                await new Promise(r => setTimeout(r, 300));
            }
        }

        if (ids.length === 0) {
            addLog('⚠️ Manual execution failed.');
            return;
        }

        addLog(`📤 ${ids.length} Manual Trade(s) placed`);
        const results = await Promise.all(ids.map(id => waitForResult(id!)));
        
        let batchP = 0;
        results.forEach(res => {
            if (!res) return;
            batchP += res.profit;
            setTransactions(prev => [{
                id: res.buyId || Math.random().toString(36).substr(2, 9),
                time: new Date().toLocaleTimeString(),
                symbol: currentAnalysis.symbol,
                type: currentAnalysis.tradeType,
                stake: currentStake,
                profit: res.profit,
                status: res.status,
                entry: res.entry,
                exit: res.exit,
                lastDigit: res.lastDigit,
                power: currentAnalysis.confidence
            }, ...prev].slice(0, 100));
        });

        addLog(`✅ Manual Trade Complete | Net: ${batchP > 0 ? '+' : ''}${batchP.toFixed(2)}`);
    }, [bestSignal, stake, tradeType, manualPrediction, useMultipleMatches, bulkTrades, executeTrade]);

    useEffect(() => {
        if (isBotRunning) runBotLoop();
    }, [isBotRunning, runBotLoop]);

    return (
        <div className={classNames('signal-centre', tradeType.toLowerCase())}>
            <div className='sc-header'>
                <div className='sc-header__title'>
                    <span className='sc-header__icon'>📡</span>
                    <div>
                        <h1>Market Scanner</h1>
                        <p>AI-Powered Market Scanner · All Continuous Indices</p>
                    </div>
                </div>
                <div className='sc-header__status'>
                    <span className={classNames('sc-status-dot', { online: is_socket_opened })} />
                    <span>{is_socket_opened ? 'LIVE' : 'OFFLINE'}</span>
                </div>
            </div>

            <div className='sc-trade-type'>
                <div className='sc-trade-type__label'>Preferred Strategy</div>
                <div className='sc-trade-type__buttons'>
                    {TRADE_TYPES.map(t => (
                        <button
                            key={t.id}
                            className={classNames('sc-type-btn', { active: tradeType === t.id })}
                            style={{ '--accent': t.color } as any}
                            onClick={() => { setTradeType(t.id); setBestSignal(null); setAnalyses([]); setScanPhase('STANDBY'); }}
                            disabled={isScanning}
                        >
                            <span className='sc-type-btn__icon'>{t.icon}</span>
                            <span className='sc-type-btn__label'>{t.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className='sc-scan-controls'>
                <div className='sc-scan-phase'>
                    <div className={classNames('sc-phase-badge', scanPhase.toLowerCase())}>
                        <span className='sc-phase-dot' />
                        {scanPhase.replace('_', ' ')}
                    </div>
                </div>
                <div className='sc-scan-btns'>
                    {!isScanning ? (
                        <button className='sc-btn sc-btn--scan' onClick={runScan} disabled={!is_socket_opened}>
                            🔍 Start Scanning
                        </button>
                    ) : (
                        <button className='sc-btn sc-btn--stop' onClick={stopScan}>
                            ⛔ Stop Scan
                        </button>
                    )}
                </div>
            </div>

            {(isScanning || analyses.length > 0) && (
                <div className='sc-market-grid'>
                    {CONTINUOUS_INDICES.map((m, idx) => {
                        const analysis = analyses.find(a => a.symbol === m.symbol);
                        const isActive = scanningIndex === idx;
                        return (
                            <div 
                                key={m.symbol} 
                                className={classNames('sc-market-card', tradeType.toLowerCase(), { active: isActive, complete: !!analysis })}
                                onClick={() => { if (analysis) { setBestSignal(analysis); setScanPhase('SIGNAL_FOUND'); startValidity(); } }}
                            >
                                <div className='sc-market-card__header'>
                                    <span className='sc-market-card__name'>{m.label}</span>
                                    <span className='sc-market-card__sym'>{m.symbol}</span>
                                </div>
                                {analysis ? (
                                    <div className='sc-market-stats'>
                                        {tradeType === 'EVENODD' && (
                                            <div className='sc-strategy-specific-stats'>
                                                <div className='sc-stat-bar-group'>
                                                    <div className='sc-stat-label'>EVEN {analysis.evenPct.toFixed(1)}%</div>
                                                    <div className='sc-stat-progress'><div className='fill' style={{ width: `${analysis.evenPct}%` }} /></div>
                                                </div>
                                                <div className='sc-stat-bar-group'>
                                                    <div className='sc-stat-label'>ODD {analysis.oddPct.toFixed(1)}%</div>
                                                    <div className='sc-stat-progress'><div className='fill' style={{ width: `${analysis.oddPct}%` }} /></div>
                                                </div>
                                            </div>
                                        )}
                                        {tradeType === 'OVERUNDER' && (
                                            <div className='sc-strategy-specific-stats'>
                                                <div className='sc-stat-label'>UNDER (0-4): <span className='val'>{analysis.underPct.toFixed(1)}%</span></div>
                                                <div className='sc-stat-progress'><div className='fill' style={{ width: `${analysis.underPct}%` }} /></div>
                                                <div className='sc-stat-label mt-2'>OVER (5-9): <span className='val'>{analysis.overPct.toFixed(1)}%</span></div>
                                                <div className='sc-stat-progress'><div className='fill' style={{ width: `${analysis.overPct}%` }} /></div>
                                                <div className='sc-stat-label mt-2'>H-UNDER: <span className='val'>{analysis.highestUnderDigit}</span></div>
                                                <div className='sc-stat-label'>H-OVER: <span className='val'>{analysis.highestOverDigit}</span></div>
                                            </div>
                                        )}
                                        {tradeType === 'RISEFALL' && (
                                            <div className='sc-strategy-specific-stats'>
                                                <div className='sc-stat-bar-group'>
                                                    <div className='sc-stat-label'>RISE {analysis.risePct.toFixed(1)}%</div>
                                                    <div className='sc-stat-progress'><div className='fill' style={{ width: `${analysis.risePct}%` }} /></div>
                                                </div>
                                                <div className='sc-stat-bar-group'>
                                                    <div className='sc-stat-label'>FALL {analysis.fallPct.toFixed(1)}%</div>
                                                    <div className='sc-stat-progress'><div className='fill' style={{ width: `${analysis.fallPct}%` }} /></div>
                                                </div>
                                            </div>
                                        )}
                                        {tradeType === 'MATCHES' && (
                                            <div className='sc-strategy-specific-stats'>
                                                <div className='sc-stat-label'>HIGHEST: <span className='val'>{analysis.highestDigit}</span> <span className={classNames('trend', { up: analysis.powerTrend[analysis.highestDigit] === 1 })}>{analysis.powerTrend[analysis.highestDigit] === 1 ? '▲' : ''}</span></div>
                                                <div className='sc-stat-label'>2nd HIGH: <span className='val'>{analysis.secondHighestDigit}</span></div>
                                                <div className='sc-stat-label'>LOWEST: <span className='val'>{analysis.lowestDigit}</span></div>
                                                <div className='sc-stat-label'>POWER: <span className='val'>{analysis.confidence.toFixed(1)}%</span></div>
                                            </div>
                                        )}
                                        {tradeType === 'DIFFERS' && (
                                            <div className='sc-strategy-specific-stats'>
                                                <div className='sc-stat-label'>SAFEST: <span className='val'>{analysis.differsBest}</span></div>
                                                <div className='sc-stat-label'>CONFIDENCE: <span className='val'>{analysis.confidence.toFixed(1)}%</span></div>
                                            </div>
                                        )}
                                        <div className='sc-market-card__footer'>
                                            <div className='sc-confidence-badge'>{analysis.confidence.toFixed(0)}% POWER</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className='sc-market-loading'>
                                        {isActive ? (
                                            <div className='sc-loader-ring'>
                                                <div />
                                                <span>SCANNING</span>
                                            </div>
                                        ) : 'PENDING'}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {bestSignal && (
                <div className='sc-best-signal'>
                    <div className='sc-best-signal__header'>
                        <span className='sc-best-signal__icon'>🚀</span>
                        <div>
                            <h2>{bestSignal.label}</h2>
                            <p>Suggested: <strong>{bestSignal.signal}</strong></p>
                        </div>
                        <div className='sc-best-signal__validity'>{validity}s</div>
                    </div>
                    <div className='sc-suggestion-banner'>
                        <div className='sc-suggestion-banner__label'>PRO SUGGESTION:</div>
                        <div className='sc-suggestion-banner__content'>
                            {tradeType === 'OVERUNDER' ? (
                                <div className='sc-manual-prediction-selector'>
                                    <span className='sc-pred-type'>{bestSignal.entry}</span>
                                    <div className='sc-digit-pills'>
                                        {(Array.isArray(bestSignal.prediction) ? bestSignal.prediction : [bestSignal.prediction ?? 0]).map(d => (
                                            <button 
                                                key={d} 
                                                className={classNames('sc-digit-pill', { active: manualPrediction === d })}
                                                onClick={() => setManualPrediction(d === manualPrediction ? null : d)}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                    <small>(Click digit to lock manually)</small>
                                </div>
                            ) : bestSignal.entry}
                        </div>
                    </div>
                </div>
            )}

            <div className='sc-bot-panel'>
                <div className='sc-bot-inputs'>
                    <div className='sc-bot-field'>
                        <label>Stake (USD)</label>
                        <input type='number' value={stake} onChange={e => setStake(parseFloat(e.target.value))} />
                    </div>
                    <div className='sc-bot-field'>
                        <label>TP / SL</label>
                        <div className='sc-input-group'>
                            <input type='number' value={tp} onChange={e => setTp(parseFloat(e.target.value))} placeholder='TP' />
                            <input type='number' value={sl} onChange={e => setSl(parseFloat(e.target.value))} placeholder='SL' />
                        </div>
                    </div>
                    <div className='sc-bot-field'>
                        <label>Ticks</label>
                        <select value={ticks} onChange={e => setTicks(parseInt(e.target.value))}>
                            {[1, 2, 3, 4, 5].map(t => <option key={t} value={t}>{t} Ticks</option>)}
                        </select>
                    </div>
                    <div className='sc-bot-field'>
                        <label>Bulk</label>
                        <input type='number' value={bulkTrades} min='1' max='10' onChange={e => setBulkTrades(parseInt(e.target.value))} />
                    </div>
                </div>
                <div className='sc-bot-toggles'>
                    <button className={classNames('sc-toggle-btn', { active: compoundStake })} onClick={() => setCompoundStake(!compoundStake)}>
                        🔄 Compounding
                    </button>
                    <button className={classNames('sc-toggle-btn', { active: alternateMarket })} onClick={() => setAlternateMarket(!alternateMarket)}>
                        🔀 Recovery Mode
                    </button>
                    <button className={classNames('sc-toggle-btn', { active: useMultipleMatches })} onClick={() => setUseMultipleMatches(!useMultipleMatches)}>
                        🎯 Multiple Predictions
                    </button>
                    <button className={classNames('sc-toggle-btn', { active: isReversal })} onClick={() => setIsReversal(!isReversal)}>
                        🔄 Reversal
                    </button>
                    <button className={classNames('sc-toggle-btn', { active: showAdvanced })} onClick={() => setShowAdvanced(!showAdvanced)}>
                        ⚙️ Advanced
                    </button>
                </div>

                {showAdvanced && (
                    <div className='sc-advanced-settings'>
                        <div className='sc-bot-inputs'>
                            <div className='sc-bot-field'>
                                <label>EO Threshold %</label>
                                <input type='number' value={evenOddThreshold} onChange={e => setEvenOddThreshold(parseInt(e.target.value))} min={1} max={50} />
                            </div>
                            <div className='sc-bot-field'>
                                <label>OU Threshold %</label>
                                <input type='number' value={overUnderThreshold} onChange={e => setOverUnderThreshold(parseInt(e.target.value))} min={1} max={50} />
                            </div>
                            <div className='sc-bot-field'>
                                <label>RF Threshold %</label>
                                <input type='number' value={riseFallThreshold} onChange={e => setRiseFallThreshold(parseInt(e.target.value))} min={1} max={50} />
                            </div>
                        </div>
                    </div>
                )}

                {alternateMarket && (
                    <div className='sc-recovery-panel'>
                        <div className='sc-bot-inputs'>
                            <div className='sc-bot-field'>
                                <label>Switch After Losses</label>
                                <input type='number' value={alternateAfterLosses} onChange={e => setAlternateAfterLosses(parseInt(e.target.value))} min={1} />
                            </div>
                            <div className='sc-bot-field'>
                                <label>Recovery Market</label>
                                <select value={alternateMarketSymbol} onChange={e => setAlternateMarketSymbol(e.target.value)}>
                                    {CONTINUOUS_INDICES.map(m => <option key={m.symbol} value={m.symbol}>{m.label}</option>)}
                                </select>
                            </div>
                            <div className='sc-bot-field'>
                                <label>Recovery Strategy</label>
                                <select value={alternateTradeType} onChange={e => setAlternateTradeType(e.target.value)}>
                                    {TRADE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {tradeType === 'MATCHES' && (
                    <div className='sc-matches-multi-panel'>
                        <button 
                            className={classNames('sc-toggle-btn', { active: useMultipleMatches })} 
                            onClick={() => setUseMultipleMatches(!useMultipleMatches)}
                        >
                            🎯 Multiple Predictions
                        </button>
                        
                        {useMultipleMatches && (
                            <div className='sc-multi-fields'>
                                <div className='sc-bot-field'>
                                    <label>Count</label>
                                    <input 
                                        type='number' 
                                        min='1' 
                                        max='5' 
                                        value={matchPredictions.length} 
                                        onChange={e => {
                                            const n = Math.max(1, Math.min(5, parseInt(e.target.value) || 1));
                                            setMatchPredictions(prev => {
                                                const next = [...prev];
                                                if (n > next.length) {
                                                    while (next.length < n) next.push(0);
                                                } else {
                                                    next.length = n;
                                                }
                                                return next;
                                            });
                                        }} 
                                    />
                                </div>
                                <div className='sc-digit-inputs'>
                                    {matchPredictions.map((digit, i) => (
                                        <input
                                            key={i}
                                            type='number'
                                            min='0'
                                            max='9'
                                            value={digit}
                                            onChange={e => {
                                                const val = parseInt(e.target.value) || 0;
                                                setMatchPredictions(prev => {
                                                    const next = [...prev];
                                                    next[i] = val;
                                                    return next;
                                                });
                                            }}
                                            placeholder={`#${i+1}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className='sc-execution-actions' style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button
                        className={classNames('sc-run-btn', { running: isBotRunning })}
                        onClick={() => setIsBotRunning(!isBotRunning)}
                        disabled={!bestSignal && !isBotRunning}
                        style={{ flex: 1 }}
                    >
                        {isBotRunning ? '⛔ STOP AUTO-TRADE' : bestSignal ? '🚀 START AUTO-TRADE' : '🔍 Scan for Signal'}
                    </button>
                    <button
                        className='sc-run-btn manual'
                        onClick={handleManualTrade}
                        disabled={!bestSignal || isBotRunning}
                        style={{ flex: 1, background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)', boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)' }}
                    >
                        ⚡ MANUAL ENTRY
                    </button>
                </div>
            </div>

            <div className='sc-dashboard'>
                <div className='sc-dashboard__tabs'>
                    {(['SUMMARY', 'TRANSACTIONS', 'JOURNAL'] as const).map(t => (
                        <button 
                            key={t} 
                            className={classNames('sc-dash-tab', { active: activeDashboardTab === t })}
                            onClick={() => setActiveDashboardTab(t)}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <div className='sc-dashboard__content'>
                    {activeDashboardTab === 'SUMMARY' && (
                        <div className='sc-summary-grid'>
                            <div className='sc-summary-item'>
                                <label>Total Stake</label>
                                <span>{(botWins + botLosses) * stake} {currency}</span>
                            </div>
                            <div className='sc-summary-item'>
                                <label>Contracts Won</label>
                                <span className='won'>{botWins}</span>
                            </div>
                            <div className='sc-summary-item'>
                                <label>Contracts Lost</label>
                                <span className='lost'>{botLosses}</span>
                            </div>
                            <div className='sc-summary-item'>
                                <label>Total P/L</label>
                                <span className={classNames('pl', { win: botPL > 0, loss: botPL < 0 })}>
                                    {botPL.toFixed(2)} {currency}
                                </span>
                            </div>
                            <div className='sc-summary-item'>
                                <label>No. of Runs</label>
                                <span>{botWins + botLosses}</span>
                            </div>
                        </div>
                    )}

                    {activeDashboardTab === 'TRANSACTIONS' && (
                        <div className='sc-table-wrapper'>
                            <table className='sc-table'>
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Entry/Exit Spot</th>
                                        <th>Buy Price</th>
                                        <th>P/L</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map(tx => (
                                        <tr key={tx.id}>
                                            <td>{tx.type}</td>
                                            <td>{tx.entry || '-'} / {tx.exit || '-'}</td>
                                            <td>{tx.stake.toFixed(2)}</td>
                                            <td className={tx.status}>{tx.profit.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeDashboardTab === 'JOURNAL' && (
                        <div className='sc-journal-view'>
                            <div className='sc-table-wrapper'>
                                <table className='sc-table sc-table--journal'>
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Last Digit</th>
                                            <th>Market</th>
                                            <th>Power</th>
                                            <th>Entry/Exit</th>
                                            <th>Result</th>
                                            <th>ID</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.map(tx => (
                                            <tr key={tx.id}>
                                                <td>{tx.time}</td>
                                                <td><span className='sc-digit-badge'>{tx.lastDigit ?? '-'}</span></td>
                                                <td>{tx.symbol}</td>
                                                <td>{tx.power.toFixed(1)}%</td>
                                                <td>{tx.entry || '-'} / {tx.exit || '-'}</td>
                                                <td className={tx.status}>{tx.status.toUpperCase()}</td>
                                                <td className='sc-tx-id'>{tx.id}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className='sc-log-view'>
                                {botLog.map((log, i) => <div key={i} className='sc-log-line'>{log}</div>)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default SignalCentreTab;
