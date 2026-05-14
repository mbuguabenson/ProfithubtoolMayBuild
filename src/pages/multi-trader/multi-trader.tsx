import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { observer } from 'mobx-react-lite';
import './multi-trader.scss';

// ─── Types ───────────────────────────────────────────────────────────────────

type TradeType = 'highlow' | 'risefall' | 'evenodd' | 'overunder';
type StatusVariant = 'connected' | 'disconnected' | 'connecting';

interface TradeConfig {
    proposal: number;
    amount: number;
    basis: string;
    currency: string;
    duration: number;
    duration_unit: string;
    contract_type: string;
    label: string;
    strategyId: string;
    selected_tick?: number;
    barrier?: number;
}

interface LogEntry {
    id: number;
    time: string;
    message: string;
    type: 'default' | 'success' | 'error' | 'warning' | 'info';
}

interface TradeResult {
    profit: number;
    message: string;
    strategyId: string;
    stakeUsed: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const APP_ID = 121856;
const WS_URL = `wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const round2 = (n: number) => Math.round(n * 100) / 100;

function getTradeConfigs(type: TradeType, stake: number, ticks: number): TradeConfig[] {
    const common = {
        proposal: 1,
        amount: stake,
        basis: 'stake',
        currency: 'USD',
        duration: ticks,
        duration_unit: 't',
    };
    switch (type) {
        case 'highlow':
            return [
                { ...common, contract_type: 'TICKHIGH', selected_tick: 1, label: 'High Tick',    strategyId: 'highlow_TICKHIGH' },
                { ...common, contract_type: 'TICKLOW',  selected_tick: 1, label: 'Low Tick',     strategyId: 'highlow_TICKLOW'  },
            ];
        case 'risefall':
            return [
                { ...common, contract_type: 'CALL', label: 'Rise', strategyId: 'risefall_CALL' },
                { ...common, contract_type: 'PUT',  label: 'Fall', strategyId: 'risefall_PUT'  },
            ];
        case 'evenodd':
            return [
                { ...common, contract_type: 'DIGITEVEN', label: 'Even Digit', strategyId: 'evenodd_DIGITEVEN' },
                { ...common, contract_type: 'DIGITODD',  label: 'Odd Digit',  strategyId: 'evenodd_DIGITODD'  },
            ];
        case 'overunder':
            return [
                { ...common, contract_type: 'DIGITOVER',  barrier: 5, label: 'Digit Over 5',  strategyId: 'overunder_DIGITOVER'  },
                { ...common, contract_type: 'DIGITUNDER', barrier: 4, label: 'Digit Under 4', strategyId: 'overunder_DIGITUNDER' },
            ];
        default:
            return [];
    }
}

// ─── Component ───────────────────────────────────────────────────────────────

const MultiTrader: React.FC = observer(() => {
    const { client } = useStore();
    // Connection
    const [status, setStatus] = useState<StatusVariant>('disconnected');
    const [statusMsg, setStatusMsg] = useState('Disconnected');
    const wsRef = useRef<WebSocket | null>(null);
    const reqCounter = useRef(1);
    const resolvers   = useRef<Map<number, { resolve: (d: any) => void; reject: (e: any) => void; isSubscription?: boolean }>>(new Map());

    // Config
    const [market,     setMarket]     = useState('V10_1S');
    const [baseStake,  setBaseStake]  = useState(0.5);
    const [ticks,      setTicks]      = useState(5);
    const [martingale, setMartingale] = useState(2.0);
    const [takeProfit, setTakeProfit] = useState(10);
    const [stopLoss,   setStopLoss]   = useState(5);
    const [tradeTypes, setTradeTypes] = useState<TradeType[]>(['highlow']);

    // State
    const [running,  setRunning]  = useState(false);
    const [balance,  setBalance]  = useState<number | null>(null);
    const [totalProfit, setTotalProfit] = useState(0);
    const [totalRounds, setTotalRounds] = useState(0);
    const [roundWins,   setRoundWins]   = useState(0);
    const [totalTrades, setTotalTrades] = useState(0);
    const [maxStake,    setMaxStake]    = useState(0.5);
    const [logs, setLogs] = useState<LogEntry[]>([{ id: 0, time: '', message: 'Awaiting connection…', type: 'default' }]);

    // Mutable refs for trading loop
    const runningRef       = useRef(false);
    const totalProfitRef   = useRef(0);
    const totalRoundsRef   = useRef(0);
    const roundWinsRef     = useRef(0);
    const totalTradesRef   = useRef(0);
    const strategyStakes   = useRef<Record<string, number>>({});
    const logId            = useRef(1);

    // ── Logging ──────────────────────────────────────────────────────────────

    const addLog = useCallback((message: string, type: LogEntry['type'] = 'default') => {
        const entry: LogEntry = {
            id: logId.current++,
            time: new Date().toLocaleTimeString(),
            message,
            type,
        };
        setLogs(prev => [entry, ...prev].slice(0, 300));
    }, []);

    // ── WebSocket helpers ─────────────────────────────────────────────────────

    const sendJSON = useCallback((obj: Record<string, any>): Promise<any> => {
        return new Promise((resolve, reject) => {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                return reject('WebSocket not open');
            }
            const req_id = reqCounter.current++;
            resolvers.current.set(req_id, { resolve, reject });
            wsRef.current.send(JSON.stringify({ ...obj, req_id }));
        });
    }, []);

    const handleMessage = useCallback((raw: MessageEvent) => {
        const data = JSON.parse(raw.data as string);
        const req_id = data.req_id;

        if (req_id && resolvers.current.has(req_id)) {
            const { resolve, reject, isSubscription } = resolvers.current.get(req_id)!;
            if (isSubscription) {
                const poc = data.proposal_open_contract;
                if (poc?.is_sold) { resolve(data); resolvers.current.delete(req_id); }
                else if (data.error) { reject(data.error.message); resolvers.current.delete(req_id); }
                return;
            }
            resolvers.current.delete(req_id);
            if (data.error) reject(data.error.message);
            else resolve(data);
            return;
        }

        if (data.msg_type === 'balance') {
            setBalance(data.balance.balance);
        }
        if (data.msg_type === 'authorize') {
            if (data.error) {
                setStatus('disconnected');
                setStatusMsg(`Auth failed: ${data.error.message}`);
                addLog(`Authorization failed: ${data.error.message}`, 'error');
            } else {
                setStatus('connected');
                setStatusMsg(`✅ ${data.authorize.loginid}`);
                addLog(`Authorized as ${data.authorize.loginid}`, 'success');
                wsRef.current?.send(JSON.stringify({ balance: 1, subscribe: 1 }));
            }
        }
        if (data.error && data.msg_type !== 'authorize') {
            addLog(`[API Error] ${data.error.message}`, 'error');
        }
    }, [addLog]);

    // ── Connect ───────────────────────────────────────────────────────────────

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        const currentToken = client.getToken();
        if (!currentToken) { addLog('Please log in first.', 'error'); return; }

        setStatus('connecting');
        setStatusMsg('Connecting…');

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;
        ws.onopen    = () => { addLog('Connected. Authorizing…', 'info'); ws.send(JSON.stringify({ authorize: currentToken })); };
        ws.onmessage = handleMessage;
        ws.onclose   = () => {
            setStatus('disconnected');
            setStatusMsg('Disconnected ❌');
            if (runningRef.current) { runningRef.current = false; setRunning(false); addLog('Connection lost. Bot stopped.', 'error'); }
        };
        ws.onerror   = () => addLog('WebSocket error — check console.', 'error');
    }, [client, handleMessage, addLog]);

    // ── Strategy stakes init ──────────────────────────────────────────────────

    const initStakes = useCallback((stake: number) => {
        strategyStakes.current = {};
        tradeTypes.forEach(type => {
            getTradeConfigs(type, stake, ticks).forEach(c => {
                strategyStakes.current[c.strategyId] = stake;
            });
        });
    }, [tradeTypes, ticks]);

    // ── Track contract ────────────────────────────────────────────────────────

    const trackContract = useCallback((contractId: number, strategyId: string, label: string, stakeUsed: number): Promise<TradeResult> => {
        return new Promise((resolve, reject) => {
            const req_id = reqCounter.current++;
            resolvers.current.set(req_id, {
                isSubscription: true,
                resolve: (data: any) => {
                    const poc  = data.proposal_open_contract;
                    const profit = parseFloat(poc.profit);
                    const status = poc.status.toUpperCase();
                    const entry  = poc.entry_tick_display_value  || 'N/A';
                    const exit   = poc.exit_tick_display_value   || 'N/A';
                    resolve({
                        profit,
                        strategyId,
                        stakeUsed,
                        message: `[${strategyId.toUpperCase()} - ${label}] ${status} (${profit >= 0 ? '+' : ''}${profit.toFixed(2)} USD) | Entry: ${entry} | Exit: ${exit}`,
                    });
                },
                reject,
            });
            wsRef.current?.send(JSON.stringify({ proposal_open_contract: 1, contract_id: contractId, subscribe: 1, req_id }));
        });
    }, []);

    // ── Core trading loop ─────────────────────────────────────────────────────

    const placeTrades = useCallback(async (
        _market: string, _baseStake: number, _ticks: number,
        _martingale: number, _takeProfit: number, _stopLoss: number,
        _tradeTypes: TradeType[],
    ) => {
        if (!runningRef.current || wsRef.current?.readyState !== WebSocket.OPEN) {
            runningRef.current = false; setRunning(false); return;
        }

        try {
            // TP / SL check
            if (totalProfitRef.current >= _takeProfit) {
                addLog(`TAKE PROFIT hit! Profit: ${totalProfitRef.current.toFixed(2)} USD`, 'success');
                runningRef.current = false; setRunning(false); return;
            }
            if (totalProfitRef.current <= -Math.abs(_stopLoss)) {
                addLog(`STOP LOSS hit! Loss: ${Math.abs(totalProfitRef.current).toFixed(2)} USD`, 'error');
                runningRef.current = false; setRunning(false); return;
            }

            // Build all configs with current stakes
            const allConfigs: (TradeConfig & { symbol: string })[] = [];
            _tradeTypes.forEach(type => {
                getTradeConfigs(type, _baseStake, _ticks).forEach(cfg => {
                    const stake = strategyStakes.current[cfg.strategyId] ?? _baseStake;
                    allConfigs.push({ ...cfg, amount: stake, symbol: _market });
                });
            });

            if (allConfigs.length === 0) { addLog('No trade types selected.', 'warning'); runningRef.current = false; setRunning(false); return; }

            setMaxStake(Math.max(...allConfigs.map(c => c.amount)));
            addLog(`Round start — ${allConfigs.length} trades on ${_market}`, 'info');

            // Propose
            const proposalResults = await Promise.all(
                allConfigs.map(({ label, strategyId, ...apiConfig }) => sendJSON({ ...apiConfig }))
            );

            // Buy
            const buyPromises: Promise<any>[]  = [];
            const buyMeta: { config: TradeConfig; idx: number }[] = [];
            proposalResults.forEach((res, i) => {
                if (res.error) { addLog(`[${allConfigs[i].strategyId}] Proposal failed: ${res.error.message}`, 'warning'); return; }
                const id = res.proposal?.id;
                if (id) {
                    buyMeta.push({ config: allConfigs[i], idx: buyPromises.length });
                    buyPromises.push(sendJSON({ buy: id, price: allConfigs[i].amount }));
                }
            });

            if (buyPromises.length === 0) { addLog('All proposals failed. Waiting 5s…', 'error'); await new Promise(r => setTimeout(r, 5000)); if (runningRef.current) placeTrades(_market, _baseStake, _ticks, _martingale, _takeProfit, _stopLoss, _tradeTypes); return; }

            addLog(`Buying ${buyPromises.length} contracts…`);
            const buyResults = await Promise.all(buyPromises);

            // Track
            const trackPromises: Promise<TradeResult>[] = [];
            let bought = 0;
            buyMeta.forEach(({ config, idx }) => {
                const contractId = buyResults[idx]?.buy?.contract_id;
                if (contractId) { trackPromises.push(trackContract(contractId, config.strategyId, config.label, config.amount)); bought++; }
                else addLog(`[${config.strategyId}] Buy failed.`, 'error');
            });

            totalTradesRef.current += bought;
            setTotalTrades(totalTradesRef.current);
            addLog(`Tracking ${bought} contracts…`);

            const results = await Promise.all(trackPromises);

            // Process results
            let roundProfit = 0;
            let roundWon    = false;
            results.forEach(r => {
                roundProfit += r.profit;
                addLog(r.message, r.profit >= 0 ? 'success' : 'error');
                if (r.profit > 0) {
                    strategyStakes.current[r.strategyId] = _baseStake;
                    addLog(`[${r.strategyId}] WIN → stake reset to ${_baseStake.toFixed(2)}`, 'success');
                    roundWon = true;
                } else {
                    const newStake = round2(r.stakeUsed * _martingale);
                    strategyStakes.current[r.strategyId] = newStake;
                    addLog(`[${r.strategyId}] LOSS → stake ×${_martingale} = ${newStake.toFixed(2)}`, 'error');
                }
            });

            totalProfitRef.current += roundProfit;
            totalRoundsRef.current++;
            if (roundWon) roundWinsRef.current++;
            setTotalProfit(totalProfitRef.current);
            setTotalRounds(totalRoundsRef.current);
            setRoundWins(roundWinsRef.current);
            setMaxStake(Math.max(...Object.values(strategyStakes.current)));

            addLog(`Round P/L: ${roundProfit >= 0 ? '+' : ''}${roundProfit.toFixed(2)} | Total: ${totalProfitRef.current >= 0 ? '+' : ''}${totalProfitRef.current.toFixed(2)} USD`,
                   roundProfit >= 0 ? 'success' : 'warning');

            await new Promise(r => setTimeout(r, 1500));
            if (runningRef.current) placeTrades(_market, _baseStake, _ticks, _martingale, _takeProfit, _stopLoss, _tradeTypes);

        } catch (err: any) {
            const msg = String(err).replace('Error: ', '');
            addLog(`CRITICAL ERROR: ${msg}. Resetting stakes, pausing 5s…`, 'error');
            initStakes(_baseStake);
            await new Promise(r => setTimeout(r, 5000));
            if (runningRef.current) placeTrades(_market, _baseStake, _ticks, _martingale, _takeProfit, _stopLoss, _tradeTypes);
        }
    }, [sendJSON, trackContract, addLog, initStakes]);

    // ── Start / Stop ──────────────────────────────────────────────────────────

    const startBot = useCallback(() => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) { addLog('Not connected.', 'error'); return; }
        const stake = round2(Math.max(0.5, baseStake));
        initStakes(stake);
        totalProfitRef.current = 0; totalRoundsRef.current = 0; roundWinsRef.current = 0; totalTradesRef.current = 0;
        setTotalProfit(0); setTotalRounds(0); setRoundWins(0); setTotalTrades(0);
        runningRef.current = true;
        setRunning(true);
        addLog('Bot started with independent Martingale per strategy!', 'success');
        placeTrades(market, stake, ticks, martingale, takeProfit, stopLoss, tradeTypes);
    }, [baseStake, market, ticks, martingale, takeProfit, stopLoss, tradeTypes, initStakes, placeTrades, addLog]);

    const stopBot = useCallback(() => {
        runningRef.current = false; setRunning(false);
        addLog('Bot manually stopped. Stakes retained until next start.', 'warning');
    }, [addLog]);

    const resetStats = useCallback(() => {
        totalProfitRef.current = 0; totalRoundsRef.current = 0; roundWinsRef.current = 0; totalTradesRef.current = 0;
        setTotalProfit(0); setTotalRounds(0); setRoundWins(0); setTotalTrades(0);
        initStakes(round2(Math.max(0.5, baseStake)));
        setLogs([{ id: logId.current++, time: '', message: 'Stats reset.', type: 'warning' }]);
    }, [baseStake, initStakes]);

    // Cleanup on unmount
    useEffect(() => () => { runningRef.current = false; wsRef.current?.close(); }, []);

    // ── Derived ───────────────────────────────────────────────────────────────

    const isConnected = status === 'connected';
    const winRate = totalRounds > 0 ? ((roundWins / totalRounds) * 100).toFixed(1) : '--';

    const toggleTradeType = (type: TradeType) => {
        setTradeTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className='multi-trader'>
            <h1 className='multi-trader__title'>Deriv Multi-Strategy Tick Bot</h1>

            {/* Connection */}
            <div className='multi-trader__connection'>
                <button className='multi-trader__connection-btn' onClick={connect} disabled={isConnected}>
                    {status === 'connecting' ? 'Connecting…' : 'Connect'}
                </button>
                <span className={`multi-trader__connection-status multi-trader__connection-status--${status}`}>
                    {statusMsg}
                </span>
            </div>

            {/* Config */}
            <div className='multi-trader__config'>
                <h2>Trading Parameters</h2>
                <div className='multi-trader__config-grid'>
                    <div className='multi-trader__config-field'>
                        <label>Market (Symbol)</label>
                        <select value={market} onChange={e => setMarket(e.target.value)} disabled={running}>
                            <optgroup label='Continuous Volatility'>
                                <option value='V10_1S'>Volatility 10 (1s)</option>
                                <option value='V25_1S'>Volatility 25 (1s)</option>
                                <option value='V50_1S'>Volatility 50 (1s)</option>
                                <option value='V75_1S'>Volatility 75 (1s)</option>
                                <option value='V100_1S'>Volatility 100 (1s)</option>
                            </optgroup>
                            <optgroup label='Traditional Volatility'>
                                <option value='R_100'>Volatility 100</option>
                                <option value='R_75'>Volatility 75</option>
                                <option value='R_50'>Volatility 50</option>
                            </optgroup>
                        </select>
                    </div>
                    <div className='multi-trader__config-field'>
                        <label>Base Stake ($)</label>
                        <input type='number' value={baseStake} min={0.5} step={0.01} disabled={running} onChange={e => setBaseStake(round2(Math.max(0.5, parseFloat(e.target.value) || 0.5)))} />
                    </div>
                    <div className='multi-trader__config-field'>
                        <label>Duration (Ticks)</label>
                        <input type='number' value={ticks} min={5} max={10} step={1} disabled={running} onChange={e => setTicks(Math.max(5, parseInt(e.target.value) || 5))} />
                    </div>
                    <div className='multi-trader__config-field'>
                        <label>Martingale Factor</label>
                        <input type='number' value={martingale} min={1.1} step={0.01} disabled={running} onChange={e => setMartingale(parseFloat(e.target.value) || 2)} />
                    </div>
                    <div className='multi-trader__config-field'>
                        <label>Take Profit ($)</label>
                        <input type='number' value={takeProfit} min={0} step={1} disabled={running} onChange={e => setTakeProfit(parseFloat(e.target.value) || 10)} />
                    </div>
                    <div className='multi-trader__config-field'>
                        <label>Stop Loss ($)</label>
                        <input type='number' value={stopLoss} min={0} step={1} disabled={running} onChange={e => setStopLoss(Math.max(0, parseFloat(e.target.value) || 5))} />
                    </div>
                </div>

                {/* Trade type multi-select as toggle buttons */}
                <div className='multi-trader__config-multiselect'>
                    <label>Trade Types (select multiple)</label>
                    <select multiple value={tradeTypes} disabled={running}
                        onChange={e => setTradeTypes(Array.from(e.target.selectedOptions).map(o => o.value as TradeType))}>
                        <option value='highlow'>High / Low (Tick)</option>
                        <option value='risefall'>Rise / Fall (Directional)</option>
                        <option value='evenodd'>Even / Odd (Digit)</option>
                        <option value='overunder'>Over 5 / Under 4 (Digit)</option>
                    </select>
                    <p>Hold Ctrl / Cmd to select multiple types.</p>
                </div>
            </div>

            {/* Controls + Stats */}
            <div className='multi-trader__controls-row'>
                <div className='multi-trader__buttons'>
                    <button className='multi-trader__buttons-start' onClick={startBot} disabled={!isConnected || running}>
                        ▶ Start Bot
                    </button>
                    <button className='multi-trader__buttons-stop' onClick={stopBot} disabled={!running}>
                        ■ Stop Bot
                    </button>
                    <button className='multi-trader__buttons-reset' onClick={resetStats} disabled={running}>
                        ↺ Reset Stats
                    </button>
                </div>

                <div className='multi-trader__stats'>
                    <div className='multi-trader__stats-row'>
                        <span>Balance</span>
                        <span>{balance !== null ? `${balance.toFixed(2)} USD` : '-- USD'}</span>
                    </div>
                    <div className='multi-trader__stats-row'>
                        <span>Total P/L</span>
                        <span className={`multi-trader__stats-profit--${totalProfit >= 0 ? 'positive' : 'negative'}`}>
                            {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)} USD
                        </span>
                    </div>
                    <div className='multi-trader__stats-row'>
                        <span>Max Stake</span>
                        <span>{maxStake.toFixed(2)} USD</span>
                    </div>
                    <hr className='multi-trader__stats-divider' />
                    <div className='multi-trader__stats-mini'>
                        <span>Rounds: <span>{totalRounds}</span></span>
                        <span>Trades: <span>{totalTrades}</span></span>
                        <span>Win Rate: <span>{winRate}{totalRounds > 0 ? '%' : ''}</span></span>
                    </div>
                </div>
            </div>

            {/* Log */}
            <div className='multi-trader__log'>
                <h2>📋 Bot Log</h2>
                <div className='multi-trader__log-output'>
                    {logs.map(entry => (
                        <div key={entry.id} className={`multi-trader__log-entry multi-trader__log-entry--${entry.type}`}>
                            {entry.time && <span className='log-time'>| {entry.time} |</span>}
                            <span dangerouslySetInnerHTML={{ __html: entry.message }} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MultiTrader;
