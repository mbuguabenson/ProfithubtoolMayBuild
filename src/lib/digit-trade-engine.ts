import { action, makeObservable, observable, runInAction } from 'mobx';
import { api_base } from '@/external/bot-skeleton';
import { TDigitStat } from '@/stores/analysis-store';

export type TTradeConfig = {
    stake: number;
    multiplier: number;
    ticks: number;
    max_loss: number;
    use_max_loss: boolean;
    switch_condition: boolean;
    prediction: number;
    is_running: boolean;
    is_auto: boolean;
    take_profit?: number;
    max_runs?: number;
    runs_count?: number;
    use_compounding?: boolean;
    use_martingale?: boolean;
    max_stake?: number;
    global_max_loss?: number;
};

export type TTradeLog = {
    timestamp: number;
    message: string;
    type: 'info' | 'success' | 'error' | 'trade' | 'journal';
};

export class DigitTradeEngine {
    @observable accessor even_odd_config: TTradeConfig = {
        stake: 0.35,
        multiplier: 2.1,
        ticks: 1,
        max_loss: 5,
        use_max_loss: true,
        take_profit: 10,
        switch_condition: false,
        prediction: 0,
        is_running: false,
        is_auto: false,
        use_compounding: false,
        use_martingale: true,
        max_stake: 10,
        global_max_loss: 50,
        max_runs: 12,
        runs_count: 0,
    };
    @observable accessor over_under_config: TTradeConfig = {
        stake: 0.35,
        multiplier: 2.1,
        ticks: 1,
        max_loss: 5,
        use_max_loss: true,
        take_profit: 10,
        switch_condition: false,
        prediction: 4,
        is_running: false,
        is_auto: false,
        use_compounding: false,
        use_martingale: true,
        max_stake: 10,
        global_max_loss: 50,
        max_runs: 12,
        runs_count: 0,
    };
    @observable accessor differs_config: TTradeConfig = {
        stake: 0.35,
        multiplier: 11,
        ticks: 1,
        max_loss: 5,
        use_max_loss: true,
        take_profit: 10,
        switch_condition: false,
        prediction: 0,
        is_running: false,
        is_auto: false,
        use_compounding: false,
        use_martingale: true,
        max_stake: 10,
        global_max_loss: 50,
        max_runs: 12,
        runs_count: 0,
    };
    @observable accessor matches_config: TTradeConfig = {
        stake: 0.35,
        multiplier: 11,
        ticks: 1,
        max_loss: 5,
        use_max_loss: true,
        take_profit: 10,
        switch_condition: false,
        prediction: 0,
        is_running: false,
        is_auto: false,
        use_compounding: false,
        use_martingale: true,
        max_stake: 10,
        global_max_loss: 50,
        max_runs: 12,
        runs_count: 0,
    };

    @observable accessor active_strategy: 'even_odd' | 'over_under' | 'differs' | 'matches' | null = null;
    @observable accessor trade_status: string = 'IDLE';
    @observable accessor session_profit: number = 0;
    @observable accessor total_profit: number = 0;
    @observable accessor is_executing = false;
    @observable accessor logs: TTradeLog[] = [];

    // Martingale State
    @observable accessor last_result: 'WIN' | 'LOSS' | null = null;
    @observable accessor current_streak: number = 0;

    // Strategy State
    private consecutive_even = 0;
    private consecutive_odd = 0;
    private consecutive_over = 0;
    private consecutive_under = 0;

    constructor() {
        makeObservable(this);
    }

    @action
    addLog = (message: string, type: 'info' | 'success' | 'error' | 'trade' | 'journal' = 'info') => {
        this.logs.unshift({ timestamp: Date.now(), message, type });
        if (this.logs.length > 50) this.logs.pop();
    };

    @action
    clearLogs = () => {
        this.logs = [];
    };

    @action
    updateConfig = <K extends keyof TTradeConfig>(strategy: string, key: K, value: TTradeConfig[K]) => {
        const config = (this as Record<string, unknown>)[`${strategy}_config`] as TTradeConfig;
        if (config) config[key] = value;
    };

    @action
    toggleStrategy = (strategy: 'even_odd' | 'over_under' | 'differs' | 'matches') => {
        const config = (this as Record<string, unknown>)[`${strategy}_config`] as TTradeConfig;

        if (config.is_running) {
            // Stop
            config.is_running = false;
            this.active_strategy = null;
            this.trade_status = 'STOPPED';
            this.is_executing = false;
        } else {
            // Start
            // Ensure others are stopped
            ['even_odd', 'over_under', 'differs', 'matches'].forEach(s => {
                const c = (this as Record<string, unknown>)[`${s}_config`] as TTradeConfig;
                if (c) c.is_running = false;
            });

            config.is_running = true;
            this.active_strategy = strategy;
            this.trade_status = 'RUNNING';
            this.addLog(`Strategy started: ${strategy.toUpperCase()}`, 'success');
        }
    };

    @action
    executeManualTrade = (
        strategy: 'even_odd' | 'over_under' | 'differs' | 'matches',
        symbol: string,
        currency: string
    ) => {
        const config = (this as Record<string, unknown>)[`${strategy}_config`] as TTradeConfig;
        if (!config) return;

        let contract_type = '';
        const prediction = config.prediction;

        switch (strategy) {
            case 'even_odd':
                contract_type = prediction === 0 ? 'DIGITEVEN' : 'DIGITODD';
                break;
            case 'over_under':
                contract_type = prediction > 4 ? 'DIGITOVER' : 'DIGITUNDER';
                break;
            case 'differs':
                contract_type = 'DIGITDIFF';
                break;
            case 'matches':
                contract_type = 'DIGITMATCH';
                break;
        }

        // Mark strategy as running for the manual one-shot trade
        config.is_running = true;
        this.executeTrade(strategy, symbol, contract_type, prediction, currency);
    };

    @action
    processTick = (
        last_digit: number,
        stats: {
            percentages: { even: number; odd: number; over: number; under: number; rise: number; fall: number };
            digit_stats: TDigitStat[];
            recent_powers?: number[][];
            ticks?: number[];
            ranks?: { most: number | null; second: number | null; least: number | null };
        },
        symbol: string,
        currency: string
    ) => {
        // Update local counters
        if (last_digit % 2 === 0) {
            this.consecutive_even++;
            this.consecutive_odd = 0;
        } else {
            this.consecutive_odd++;
            this.consecutive_even = 0;
        }

        if (last_digit >= 5) {
            this.consecutive_over++;
            this.consecutive_under = 0;
        } else {
            this.consecutive_under++;
            this.consecutive_over = 0;
        }

        if (!this.active_strategy) return;

        const config = (this as Record<string, unknown>)[`${this.active_strategy}_config`] as TTradeConfig;
        if (!config || !config.is_running) return;

        if (this.is_executing) return;

        // Check Max Runs
        if ((config.runs_count || 0) >= (config.max_runs || 100)) {
            this.stopAll('MAX RUNS REACHED');
            return;
        }

        switch (this.active_strategy) {
            case 'even_odd':
                this.checkEvenOdd(stats.percentages, config, symbol, currency);
                break;
            case 'over_under':
                this.checkOverUnder(stats.percentages, config, symbol, currency);
                break;
            case 'differs':
                this.checkDiffers(stats.digit_stats, config, symbol, currency);
                break;
            case 'matches':
                this.checkMatches(stats as any, config, symbol, currency);
                break;
        }
    };

    private checkEvenOdd = (
        percentages: { even: number; odd: number },
        config: TTradeConfig,
        symbol: string,
        currency: string
    ) => {
        // Logic: Wait for streak break (2+ of opposite side)
        // Even Strategy Trigger: Even > 55% AND we just ended an Odd streak of at least 2
        if (percentages.even > 55 && this.consecutive_even === 1 && this.consecutive_odd === 0) {
            // We need to know if the PREVIOUS state was a streak of 2+ odds
            // Since processTick just zeroed consecutive_odd, we check our internal tracking
            this.addLog(`🔍 Even Signal Detected (Power: ${percentages.even.toFixed(1)}%)`, 'journal');
            this.executeTrade('even_odd', symbol, 'DIGITEVEN', 0, currency);
        } else if (percentages.odd > 55 && this.consecutive_odd === 1 && this.consecutive_even === 0) {
            this.addLog(`🔍 Odd Signal Detected (Power: ${percentages.odd.toFixed(1)}%)`, 'journal');
            this.executeTrade('even_odd', symbol, 'DIGITODD', 0, currency);
        }
    };

    private checkOverUnder = (
        percentages: { over: number; under: number },
        config: TTradeConfig,
        symbol: string,
        currency: string
    ) => {
        let prediction = config.prediction;
        // Trigger Under: Percentage > 55% AND we just ended an Over streak of at least 2
        if (percentages.under > 55 && this.consecutive_under === 1 && this.consecutive_over === 0) {
            if (prediction < 6) prediction = 8;
            this.addLog(`🔍 Under Signal Detected (Power: ${percentages.under.toFixed(1)}%)`, 'journal');
            this.executeTrade('over_under', symbol, 'DIGITUNDER', prediction, currency);
        } else if (percentages.over > 55 && this.consecutive_over === 1 && this.consecutive_under === 0) {
            if (prediction > 3) prediction = 1;
            this.addLog(`🔍 Over Signal Detected (Power: ${percentages.over.toFixed(1)}%)`, 'journal');
            this.executeTrade('over_under', symbol, 'DIGITOVER', prediction, currency);
        }
    };

    private checkDiffers = (digit_stats: TDigitStat[], config: TTradeConfig, symbol: string, currency: string) => {
        // Advanced Logic: Select digit 2-7. Not Highest, 2nd, or Least. < 10% prob. Decreasing trend.
        const sorted = [...digit_stats].sort((a, b) => b.count - a.count);
        const highest = sorted[0].digit;
        const second = sorted[1].digit;
        const least = sorted[9].digit;

        const eligible = digit_stats.filter(s => {
            return (
                s.digit >= 2 &&
                s.digit <= 7 &&
                s.digit !== highest &&
                s.digit !== second &&
                s.digit !== least &&
                s.percentage < 10 &&
                !s.is_increasing
            );
        });

        if (eligible.length > 0) {
            const target = eligible.sort((a, b) => a.percentage - b.percentage)[0];
            if (config.prediction !== target.digit) {
                runInAction(() => (config.prediction = target.digit));
            }
            this.addLog(`🔍 Differ Signal: Digit ${target.digit} (Prob: ${target.percentage.toFixed(1)}%)`, 'journal');
            this.executeTrade('differs', symbol, 'DIGITDIFF', target.digit, currency);
        }
    };

    private checkMatches = (
        stats: {
            digit_stats: TDigitStat[];
            recent_powers?: number[][];
            ticks?: number[];
            ranks?: { most: number | null; second: number | null; least: number | null };
        },
        config: TTradeConfig & any,
        symbol: string,
        currency: string
    ) => {
        const { digit_stats, recent_powers = [], ticks = [], ranks } = stats;

        // 0. Resolve Targets
        let targets: number[] = config.is_auto 
            ? [ranks?.most, ranks?.second, ranks?.least].filter(d => d !== null) as number[] 
            : (config.predictions || [config.prediction]);
        
        // Elite Set for Rank Sync
        const elite = [ranks?.most, ranks?.second, ranks?.least].filter(d => d !== null);

        const updateStatus = (stage: number, msg: string) => {
            if (config.verification_stage !== stage || config.verification_status !== msg) {
                runInAction(() => {
                    config.verification_stage = stage;
                    config.verification_status = msg;
                });
            }
        };

        const checkDigit = (digit: number) => {
            const stat = digit_stats[digit];
            if (!stat) return false;

            const enabled = config.enabled_conditions || [true, true, true, true];

            // STAGE 1: Momentum
            if (enabled[0]) {
                if (!stat.is_increasing) return false;
            }

            // STAGE 2: Logic Hold (Double Increase)
            if (enabled[1] && recent_powers.length >= 3) {
                const len = recent_powers.length;
                const p0 = recent_powers[len - 3][digit];
                const p1 = recent_powers[len - 2][digit];
                const p2 = recent_powers[len - 1][digit];
                if (!(p2 > p1 && p1 > p0)) return false;
            }

            // STAGE 3: Power Threshold
            if (enabled[2]) {
                const op = config.c3_op || '>=';
                const val = config.c3_val || 12;
                const prob = stat.percentage;
                let pass = false;
                if (op === '>') pass = prob > val;
                else if (op === '>=') pass = prob >= val;
                else if (op === '==') pass = Math.abs(prob - val) < 0.1;
                else if (op === '<') pass = prob < val;
                else if (op === '<=') pass = prob <= val;
                if (!pass) return false;
            }

            // STAGE 4: Rank Sync
            if (enabled[3] && ticks.length >= config.c1_count) {
                const lastX = ticks.slice(-config.c1_count);
                if (!lastX.every(d => elite.includes(d))) return false;
            }

            return true;
        };

        // Filter valid targets through 4-stage gate
        const valid_targets = targets.filter(checkDigit);

        if (valid_targets.length === 0) {
            updateStatus(0, '⏳ Analyzing market for Match pattern...');
        } else {
            const top_digit = valid_targets[0];
            updateStatus(4, `🚀 STAGE 4: Synchronization Confirmed for Digit ${top_digit}!`);
            
            const trades_to_run = valid_targets.slice(0, config.simultaneous_trades || 1);
            trades_to_run.forEach(digit => {
                this.executeTrade('matches', symbol, 'DIGITMATCH', digit, currency);
            });
        }
    };

    @action
    executeTrade = async (
        strategy: string,
        symbol: string,
        contract_type: string,
        prediction: number,
        currency: string
    ) => {
        if (this.is_executing) return;
        this.is_executing = true;
        this.trade_status = 'EXECUTING';

        try {
            const api = api_base?.api;
            if (!api) throw new Error('WebSocket API not connected. Please wait for connection.');

            // Check authorization state explicitly
            if (!api_base.is_authorized) {
                this.addLog('⛔ API not authorized. Please log in first.', 'error');
                throw new Error('API not authorized');
            }

            const config = (this as Record<string, unknown>)[`${strategy}_config`] as TTradeConfig;
            if (!config || !config.is_running) return;

            const stake = this.calculateStake(config);

            // Safety: Max Stake Limit
            const max_stake = config.max_stake || 10;
            if (stake > max_stake) {
                this.addLog(`⚠️ Max Stake hit! Capping ${stake} at ${max_stake}`, 'journal');
            }
            const final_stake = Math.min(stake, max_stake);

            // Validate stake for real accounts (minimum 0.35)
            if (final_stake < 0.35) {
                this.addLog(`⛔ Final stake ${final_stake} is below 0.35 minimum.`, 'error');
                throw new Error(`Minimum stake required: 0.35`);
            }

            const proposal_data: any = {
                proposal: 1,
                amount: String(final_stake),
                basis: 'stake',
                contract_type,
                currency,
                duration: 1,
                duration_unit: 't',
                symbol,
            };

            // Add barrier for digit contracts that require it
            if (!['DIGITEVEN', 'DIGITODD'].includes(contract_type)) {
                proposal_data.barrier = String(prediction);
            }

            this.addLog(
                `📤 Proposal: ${contract_type} @ ${symbol} | stake=${stake} | barrier=${proposal_data.barrier ?? 'N/A'}`,
                'journal'
            );

            const proposal = (await api.send(proposal_data)) as {
                error?: { message: string; code: string };
                proposal?: { id: string; ask_price: number };
            };

            if (proposal.error) {
                const errorMsg = `Proposal error: ${proposal.error.message} (${proposal.error.code})`;
                this.addLog('ERROR', errorMsg);
                throw new Error(errorMsg);
            }
            if (!proposal.proposal?.id) throw new Error('No proposal ID returned from server');

            this.addLog(`📋 Proposal OK: id=${proposal.proposal.id} price=${proposal.proposal.ask_price}`, 'journal');

            const buy_request = {
                buy: proposal.proposal.id,
                price: proposal.proposal.ask_price || stake,
            };

            this.addLog(`💰 Buying: id=${buy_request.buy} price=${buy_request.price}`, 'journal');

            const buy = (await api.send(buy_request)) as {
                error?: { message: string; code: string };
                buy?: { contract_id: string; buy_price: number };
            };

            if (buy.error) {
                const errorMsg = `Buy error: ${buy.error.message} (${buy.error.code})`;
                this.addLog('ERROR', errorMsg);
                throw new Error(errorMsg);
            }
            if (!buy.buy?.contract_id) throw new Error('No contract ID returned from server');

            this.trade_status = `TRADING ${contract_type}`;
            this.addLog(`✅ Contract purchased: ${buy.buy.contract_id}`, 'info');

            // Monitor result
            this.monitorTrade(buy.buy.contract_id, config);
        } catch (e: unknown) {
            const message = (e as Error).message || 'Unknown Error';
            console.error('[DigitTradeEngine] Trade error:', message);
            runInAction(() => {
                this.addLog(`❌ Error: ${message}`, 'error');
                this.is_executing = false;
                this.trade_status = 'ERROR';
            });
        }
    };

    private monitorTrade = (contract_id: string, config: TTradeConfig) => {
        const check = setInterval(async () => {
            try {
                const data = (await api_base.api?.send({ proposal_open_contract: 1, contract_id })) as {
                    proposal_open_contract?: { is_sold: number; profit: number };
                };
                if (data.proposal_open_contract && data.proposal_open_contract.is_sold) {
                    clearInterval(check);
                    this.handleResult(data.proposal_open_contract, config);
                }
            } catch (e) {
                clearInterval(check);
                runInAction(() => (this.is_executing = false));
            }
        }, 1000);
    };

    @action
    handleResult = (contract: { profit: number }, config: TTradeConfig) => {
        const profit = Number(contract.profit);
        const result = profit > 0 ? 'WIN' : 'LOSS';

        this.last_result = result;
        this.session_profit += profit;
        this.total_profit += profit;
        this.is_executing = false;

        if (result === 'WIN') {
            this.current_streak = 0;
            this.addLog(`WIN: +${profit.toFixed(2)}`, 'success');
            if (config.take_profit && this.session_profit >= config.take_profit) {
                this.stopAll('TAKE PROFIT HIT');
            }
        } else {
            this.current_streak++;
            this.addLog(`LOSS: ${profit.toFixed(2)}`, 'error');
            const total_loss = Math.abs(this.session_profit);
            if (config.use_max_loss && total_loss >= config.max_loss) {
                this.stopAll('INDIVIDUAL STOP LOSS HIT');
            }
            if (config.global_max_loss && total_loss >= config.global_max_loss) {
                this.stopAll('GLOBAL MAX LOSS HIT');
            }
        }

        if (config.runs_count !== undefined) config.runs_count++;
        this.trade_status = 'RUNNING';
    };

    @action
    stopAll = (reason: string) => {
        ['even_odd', 'over_under', 'differs', 'matches'].forEach(s => {
            const c = (this as Record<string, unknown>)[`${s}_config`] as TTradeConfig;
            if (c) c.is_running = false;
        });
        this.active_strategy = null;
        this.trade_status = reason;
        this.addLog(reason, 'info');
    };

    private calculateStake = (config: TTradeConfig & any) => {
        let stake = config.stake || 0.35;
        if (this.last_result === 'LOSS') {
            const isMatch = this.active_strategy === 'matches';
            const martingaleEnabled = isMatch ? config.martingale_enabled : config.use_martingale;
            const multiplier = isMatch ? (config.martingale_multiplier || 11) : (config.multiplier || 2.1);

            if (martingaleEnabled) {
                stake = stake * Math.pow(multiplier, this.current_streak);
            }
        }
        return Number(stake.toFixed(2));
    };
}
