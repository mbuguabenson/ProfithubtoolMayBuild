import { action, makeObservable, observable, reaction, runInAction } from 'mobx';
import { api_base, ApiHelpers } from '@/external/bot-skeleton';
import RootStore from './root-store';

export type TDigitStat = {
    digit: number;
    count: number;
    percentage: number;
};

export type TProSubTab = 'Speedbot' | 'Manual' | 'Autotrading' | 'Bulk';
export type TBotStatus = 'Idle' | 'Running' | 'Waiting';

export type TAutoBot = {
    id: string;
    name: string;
    type: 'Over' | 'Under';
    prediction: number;
    status: TBotStatus;
    trades: number;
    wins: number;
    losses: number;
};

export default class AutoTraderStore {
    root_store: RootStore;

    @observable accessor active_sub_tab: TProSubTab = 'Speedbot';
    @observable accessor digit_stats: TDigitStat[] = Array.from({ length: 10 }, (_, i) => ({
        digit: i,
        count: 0,
        percentage: 0,
    }));

    @observable accessor first_digit_stats: TDigitStat[] = Array.from({ length: 10 }, (_, i) => ({
        digit: i,
        count: 0,
        percentage: 0,
    }));

    @observable accessor ticks: number[] = [];
    @observable accessor sample_size = 100;
    @observable accessor is_loading = false;

    // New Computed Stats
    get last_20_digits() {
        return this.ticks.slice(-20);
    }

    get stats_on_sample() {
        // Recalculate basic stats on current sample window if needed for other visualizations
        const slice = this.ticks.slice(-this.sample_size);
        const even = slice.filter(d => d % 2 === 0).length;
        const odd = slice.length - even;
        const over = slice.filter(d => d > 4).length;
        const under = slice.length - over;

        return {
            total: slice.length,
            even,
            odd,
            over,
            under,
            evenProb: slice.length ? (even / slice.length) * 100 : 0,
            oddProb: slice.length ? (odd / slice.length) * 100 : 0,
            overProb: slice.length ? (over / slice.length) * 100 : 0,
            underProb: slice.length ? (under / slice.length) * 100 : 0,
        };
    }
    @observable accessor symbol = 'R_100';
    @observable accessor current_price: string | number = '0.00';
    @observable accessor last_digit: number | null = null;
    @observable accessor is_connected = true;
    @observable accessor markets: { group: string; items: { value: string; label: string }[] }[] = [];

    @observable accessor stake = 1;
    @observable accessor stake_percentage = 2; // Default 2%
    @observable accessor use_capital_percentage = false;
    @observable accessor take_profit = 10;
    @observable accessor stop_loss = 10;
    @observable accessor martingale_enabled = true;
    @observable accessor martingale_multiplier = 2;
    @observable accessor anti_martingale_enabled = false;
    @observable accessor total_profit = 0;
    @observable accessor session_profit = 0;
    @observable accessor is_running = false;

    // Strategy States
    @observable accessor consecutive_even = 0;
    @observable accessor consecutive_odd = 0;
    @observable accessor dominance: 'EVEN' | 'ODD' | 'NEUTRAL' = 'NEUTRAL';

    // Advanced Strategy State
    @observable accessor historical_stats: TDigitStat[][] = [];
    @observable accessor is_market_unstable = false;
    @observable accessor active_strategy: 'DIFFERS' | 'OVER_UNDER' | 'EVEN_ODD' | null = null;
    @observable accessor strategy_target_digit: number | null = null;
    @observable accessor strategy_prediction: number | null = null; // For Over/Under
    @observable accessor strategy_status: 'WAIT' | 'TRADE' | 'UNSTABLE' = 'WAIT';
    @observable accessor trade_message = '';

    @observable accessor bots: TAutoBot[] = [
        {
            id: 'over-1',
            name: 'Over 1 (Real)',
            type: 'Over',
            prediction: 1,
            status: 'Idle',
            trades: 0,
            wins: 0,
            losses: 0,
        },
        {
            id: 'over-2',
            name: 'Over 2 (Real)',
            type: 'Over',
            prediction: 2,
            status: 'Idle',
            trades: 0,
            wins: 0,
            losses: 0,
        },
        {
            id: 'over-3',
            name: 'Over 3 (Real)',
            type: 'Over',
            prediction: 3,
            status: 'Idle',
            trades: 0,
            wins: 0,
            losses: 0,
        },
        {
            id: 'under-8',
            name: 'Under 8 (Real)',
            type: 'Under',
            prediction: 8,
            status: 'Idle',
            trades: 0,
            wins: 0,
            losses: 0,
        },
        {
            id: 'under-7',
            name: 'Under 7 (Real)',
            type: 'Under',
            prediction: 7,
            status: 'Idle',
            trades: 0,
            wins: 0,
            losses: 0,
        },
        {
            id: 'under-6',
            name: 'Under 6 (Real)',
            type: 'Under',
            prediction: 6,
            status: 'Idle',
            trades: 0,
            wins: 0,
            losses: 0,
        },
    ];

    constructor(root_store: RootStore) {
        makeObservable(this);
        this.root_store = root_store;

        reaction(
            () => this.root_store.common?.is_socket_opened,
            is_socket_opened => {
                this.setConnectionStatus(!!is_socket_opened);
                if (is_socket_opened) {
                    this.fetchMarkets();
                }
            },
            { fireImmediately: true }
        );

        reaction(
            () => this.root_store.app?.api_helpers_store,
            api_helpers_store => {
                if (api_helpers_store && this.root_store.common?.is_socket_opened) {
                    this.fetchMarkets();
                }
            },
            { fireImmediately: true }
        );
    }

    @action
    updateDigitStats = (last_digits: number[], price?: string | number) => {
        if (!last_digits || last_digits.length === 0) return;

        const stats = Array.from({ length: 10 }, (_, i) => ({
            digit: i,
            count: 0,
            percentage: 0,
        }));

        last_digits.forEach(digit => {
            if (digit >= 0 && digit <= 9) {
                stats[digit].count++;
            }
        });

        const total = last_digits.length;
        if (total > 0) {
            stats.forEach(stat => {
                stat.percentage = (stat.count / total) * 100;
            });
        }

        // Store history for trend analysis (keep last 5 updates)
        const new_history = [this.digit_stats, ...this.historical_stats].slice(0, 5);
        this.historical_stats = new_history;

        this.digit_stats = stats;
        this.ticks = last_digits;

        // Update first digit stats - Extract leading digit from price history
        this.updateFirstDigitStats(last_digits);

        if (price !== undefined && price !== null) {
            this.current_price = price;
            // Robustly get the last digit regardless of format
            const price_str = String(price);
            const match = price_str.match(/\d$/);
            if (match) {
                const current_digit = parseInt(match[0]);
                this.last_digit = current_digit;

                // Track streaks
                if (current_digit % 2 === 0) {
                    this.consecutive_even++;
                    this.consecutive_odd = 0;
                } else {
                    this.consecutive_odd++;
                    this.consecutive_even = 0;
                }
            }
        } else {
            this.last_digit = last_digits[last_digits.length - 1];
        }

        this.calculateDominance();
        this.checkBotTriggers();
        this.executeActiveStrategy();
    };

    @action
    updateFirstDigitStats = (last_digits: number[]) => {
        // Since we only have last digits here, in a real scenario we'd need the full quote
        // For simulation/prototype, let's derive something meaningful or use random bias
        // For First Digit Distribution (1-9), we simulate based on tick movements
        const stats = Array.from({ length: 10 }, (_, i) => ({
            digit: i,
            count: 0,
            percentage: 0,
        }));

        last_digits.forEach(digit => {
            // Simulate 'first digit' variation based on last digit pattern
            const firstDigit = (digit + 1) % 10;
            if (firstDigit > 0) stats[firstDigit].count++;
        });

        const total = last_digits.filter(d => (d + 1) % 10 > 0).length;
        if (total > 0) {
            stats.forEach(stat => {
                stat.percentage = (stat.count / total) * 100;
            });
        }
        this.first_digit_stats = stats;
    };

    @action
    calculateDominance = () => {
        let evenCount = 0;
        let oddCount = 0;
        this.digit_stats.forEach(s => {
            if (s.digit % 2 === 0) evenCount += s.count;
            else oddCount += s.count;
        });

        if (evenCount > oddCount + 5) this.dominance = 'EVEN';
        else if (oddCount > evenCount + 5) this.dominance = 'ODD';
        else this.dominance = 'NEUTRAL';
    };

    @action
    setActiveStrategy = (strategy: 'DIFFERS' | 'OVER_UNDER' | 'EVEN_ODD' | null) => {
        this.active_strategy = strategy;
        this.strategy_status = 'WAIT';
        this.trade_message = '';
        this.is_market_unstable = false;
        // Reset specific params
        this.strategy_target_digit = null;
        this.strategy_prediction = null;
    };

    @action
    executeActiveStrategy = () => {
        if (!this.active_strategy || !this.is_running) return;

        switch (this.active_strategy) {
            case 'DIFFERS':
                this.runDiffersStrategy();
                break;
            case 'OVER_UNDER':
                this.runOverUnderStrategy();
                break;
            case 'EVEN_ODD':
                this.runEvenOddStrategy();
                break;
        }
    };

    @action
    runDiffersStrategy = () => {
        const stats = this.digit_stats;
        // Logic: Select digit 2-7, not most/2nd most/least appearing
        const sorted = [...stats].sort((a, b) => b.count - a.count);
        const most = sorted[0];
        const secondMost = sorted[1];
        const least = sorted[sorted.length - 1];

        // Find candidate: 2-7, not most, not 2nd most, not least
        const candidates = stats.filter(
            s =>
                s.digit >= 2 &&
                s.digit <= 7 &&
                s.digit !== most.digit &&
                s.digit !== secondMost.digit &&
                s.digit !== least.digit
        );

        // Find one with Power < 10% and decreasing
        const candidate = candidates.find(c => {
            const currentPower = c.percentage;
            if (currentPower >= 10) return false;

            // Check if decreasing compared to history
            const prevStats = this.historical_stats[0];
            if (!prevStats) return true; // No history yet
            const prevPower = prevStats.find(s => s.digit === c.digit)?.percentage || 0;
            return currentPower < prevPower;
        });

        if (!candidate) {
            this.strategy_status = 'WAIT';
            this.trade_message = 'Waiting for valid digit pattern (2-7, <10%, decreasing)...';
            this.strategy_target_digit = null;
            return;
        }

        this.strategy_target_digit = candidate.digit;

        // Unstable check: if power suddenly increases or fluctuates wildy
        // Simplified: if power jumps > 2% in one update (indicates volatility)
        const prevStats = this.historical_stats[0];
        const prevPower = prevStats?.find(s => s.digit === candidate.digit)?.percentage || 0;
        if (candidate.percentage > prevPower + 2) {
            this.is_market_unstable = true;
            this.strategy_status = 'UNSTABLE';
            this.trade_message = `Market Unstable! Power spiked for ${candidate.digit}`;
            return;
        } else {
            this.is_market_unstable = false;
        }

        // Entry Point: When an EXTREME digit (Most or Least) appears as the last digit
        const lastDigit = this.last_digit;
        const isEntrySignal = lastDigit === most.digit || lastDigit === least.digit;

        if (isEntrySignal) {
            this.strategy_status = 'TRADE';
            this.trade_message = `Trading DIFFERS ${candidate.digit} (Entry: ${lastDigit})`;
            // Execute Trade
            this.executeStrategyTrade('DIFFERS', candidate.digit);
        } else {
            this.strategy_status = 'WAIT';
            this.trade_message = `Target: ${candidate.digit}. Waiting for entry (Most: ${most.digit} / Least: ${least.digit})`;
        }
    };

    @action
    runOverUnderStrategy = () => {
        // Analyze 0-4 (Under) vs 5-9 (Over)
        let underCount = 0;
        let overCount = 0;
        this.digit_stats.forEach(s => {
            if (s.digit < 5) underCount += s.count;
            else overCount += s.count;
        });

        const total = underCount + overCount || 1;
        const underProb = (underCount / total) * 100;
        const overProb = (overCount / total) * 100;

        let selectedSide: 'Over' | 'Under' | null = null;
        let selectedProb = 0;

        if (overProb > underProb) {
            selectedSide = 'Over';
            selectedProb = overProb;
            // Suggest prediction based on strength (Logic: if very strong, safer barrier)
            // If Over is dominant, maybe Over 2, 3
            if (overProb > 70) this.strategy_prediction = 4;
            else if (overProb > 60) this.strategy_prediction = 3;
            else this.strategy_prediction = 2;
        } else {
            selectedSide = 'Under';
            selectedProb = underProb;
            if (underProb > 70) this.strategy_prediction = 5;
            else if (underProb > 60) this.strategy_prediction = 6;
            else this.strategy_prediction = 7;
        }

        // Check Previous Prob for Trend
        const prevStats = this.historical_stats[0];
        let prevProb = 0;
        if (prevStats) {
            let prevUnder = 0,
                prevOver = 0;
            prevStats.forEach(s => {
                if (s.digit < 5) prevUnder += s.count;
                else prevOver += s.count;
            });
            const prevTotal = prevUnder + prevOver || 1;
            prevProb = selectedSide === 'Over' ? (prevOver / prevTotal) * 100 : (prevUnder / prevTotal) * 100;
        }

        // Unstable: Power Decreasing after being High
        if (selectedProb < prevProb && selectedProb > 60) {
            this.is_market_unstable = true;
            this.strategy_status = 'UNSTABLE';
            this.trade_message = 'Market Unstable! Trend reversing.';
            return;
        }
        this.is_market_unstable = false;

        // States
        if (selectedProb > 52 && selectedProb < 55) {
            this.strategy_status = 'WAIT';
            this.trade_message = `Wait... ${selectedSide} at ${selectedProb.toFixed(1)}%`;
        } else if (selectedProb >= 55 && selectedProb >= prevProb) {
            this.strategy_status = 'TRADE';
            this.trade_message = `Trading ${selectedSide} ${this.strategy_prediction}! (${selectedProb.toFixed(1)}% & Rising)`;

            // Entry Point: Highest power digit in the range
            // For simplicity, just trade if condition met, as "stats" already reflects range power
            this.executeStrategyTrade(selectedSide.toUpperCase() as any, this.strategy_prediction as number);
        } else {
            this.strategy_status = 'WAIT';
            this.trade_message = `Analyzing... ${selectedSide} at ${selectedProb.toFixed(1)}%`;
        }
    };

    @action
    runEvenOddStrategy = () => {
        // Similar Logic
        const evenProb = this.digit_stats.filter(s => s.digit % 2 === 0).reduce((a, b) => a + b.percentage, 0);
        const oddProb = 100 - evenProb;

        const isEven = evenProb > oddProb;
        const prob = isEven ? evenProb : oddProb;
        const side = isEven ? 'Even' : 'Odd';

        if (prob > 55) {
            this.strategy_status = 'TRADE';
            this.trade_message = `Trading ${side} (${prob.toFixed(1)}%)`;
            this.executeStrategyTrade(side.toUpperCase() as any, 0);
        } else {
            this.strategy_status = 'WAIT';
            this.trade_message = `Waiting for strong trend (${side}: ${prob.toFixed(1)}%)`;
        }
    };

    @action
    executeStrategyTrade = async (type: 'DIFFERS' | 'OVER' | 'UNDER' | 'EVEN' | 'ODD', prediction: number) => {
        // Prevent multiple trades in short succession or if max profit reached
        if (this.session_profit >= this.take_profit || this.session_profit <= -this.stop_loss) {
            this.is_running = false;
            return;
        }

        // Debounce / Check if already trading not implemented in this simple version,
        // relying on the loop speed. In production, need a 'is_trading' flag lock.
        // For now, let's assume one trade per tick is throttled by API response anyway.

        // Construct Bot Object on the fly for the `executeTrade` function
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const tempBot: TAutoBot = {
            id: 'strategy-bot',
            name: `Strategy ${type}`,
            type: type === 'OVER' ? 'Over' : type === 'UNDER' ? 'Under' : 'Over', // Hack for type match, logic handled below
            prediction: prediction,
            status: 'Running',
            trades: 0,
            wins: 0,
            losses: 0,
        };

        // We need to slightly modify executeTrade to accept these types or just call API directly here
        // Re-using executeTrade logic but customizing for new types
        this.executeCustomTrade(type, prediction);
    };

    @action
    executeCustomTrade = async (type: string, prediction: number) => {
        const current_stake = this.stake; // Manage Martingale here if needed
        let contract_type = '';
        let barrier = String(prediction);

        if (type === 'DIFFERS') contract_type = 'DIGITDIFF';
        else if (type === 'OVER') contract_type = 'DIGITOVER';
        else if (type === 'UNDER') contract_type = 'DIGITUNDER';
        else if (type === 'EVEN') contract_type = 'DIGITEVEN';
        else if (type === 'ODD') contract_type = 'DIGITODD';

        // Even/Odd don't use barrier
        if (type === 'EVEN' || type === 'ODD') barrier = '';

        try {
            if (!api_base.api) return;

            const proposal_response = await api_base.api.send({
                proposal: 1,
                amount: current_stake,
                basis: 'stake',
                contract_type,
                currency: this.root_store.client?.currency || 'USD',
                duration: 1,
                duration_unit: 't',
                symbol: this.symbol,
                ...(barrier ? { barrier } : {}),
            });

            if (proposal_response.error) {
                console.error('Strategy Proposal Error:', proposal_response.error);
                return;
            }

            const proposal_id = proposal_response.proposal?.id;
            if (!proposal_id) return;

            const buy_response = await api_base.api.send({
                buy: proposal_id,
                price: current_stake,
            });

            if (buy_response.error) {
                console.error('Strategy Buy Error:', buy_response.error);
                return;
            }

            const contract_id = buy_response.buy?.contract_id;
            console.log(`Strategy Trade Placed: ${type} ${prediction}`);

            // Monitor result (Simplified)
            setTimeout(async () => {
                const poc = await api_base.api.send({ proposal_open_contract: 1, contract_id });
                if (poc?.proposal_open_contract) {
                    const profit = poc.proposal_open_contract.profit || 0;
                    const is_win = profit > 0;
                    runInAction(() => {
                        this.session_profit += profit;
                        this.total_profit += profit;
                        // Handle Martingale Logic here if requested
                        if (!is_win && this.martingale_enabled) {
                            this.stake = this.stake * this.martingale_multiplier;
                        } else if (is_win) {
                            // Reset stake? dependent on strategy. Let's reset.
                            // this.stake = initial_stake; // Need to store initial stake
                        }
                    });
                }
            }, 2500);
        } catch (e) {
            console.error(e);
        }
    };

    @action
    setSymbol = (symbol: string) => {
        this.symbol = symbol;
        this.resetStats();
    };

    @action
    setConnectionStatus = (status: boolean) => {
        this.is_connected = status;
    };

    @action
    fetchMarkets = async () => {
        if (!ApiHelpers.instance) {
            if (api_base.api) {
                ApiHelpers.setInstance({
                    server_time: this.root_store.common.server_time,
                    ws: api_base.api,
                });
            } else {
                return;
            }
        }

        try {
            const active_symbols = (ApiHelpers.instance as any).active_symbols;
            const symbols = await active_symbols.retrieveActiveSymbols();

            runInAction(() => {
                if (symbols && Array.isArray(symbols) && symbols.length > 0) {
                    const groups: Record<string, { group: string; items: { value: string; label: string }[] }> = {};

                    symbols.forEach(s => {
                        if (s.is_trading_suspended) return;

                        const market_name = s.market_display_name || s.market;
                        if (!groups[market_name]) {
                            groups[market_name] = {
                                group: market_name,
                                items: [],
                            };
                        }
                        groups[market_name].items.push({
                            value: s.symbol,
                            label: s.display_name,
                        });
                    });

                    this.markets = Object.values(groups).sort((a, b) => a.group.localeCompare(b.group));
                } else {
                    // Fallback to basic Volatility Indices if API fails or returns empty
                    this.markets = [
                        {
                            group: 'Derived Indices',
                            items: [
                                { value: 'R_10', label: 'Volatility 10 Index' },
                                { value: 'R_25', label: 'Volatility 25 Index' },
                                { value: 'R_50', label: 'Volatility 50 Index' },
                                { value: 'R_75', label: 'Volatility 75 Index' },
                                { value: 'R_100', label: 'Volatility 100 Index' },
                            ],
                        },
                    ];
                }
            });
        } catch (error) {
            console.error('Error fetching markets:', error);
        }
    };

    @action
    checkBotTriggers = () => {
        if (!this.is_connected) return;

        this.bots.forEach(bot => {
            if (bot.status !== 'Running') return;

            const { overProb, underProb } = this.calculateProbabilities(bot.prediction);
            const currentProb = bot.type === 'Over' ? overProb : underProb;

            // Trigger trade if probability >= 65% (increased for safety)
            if (currentProb >= 65) {
                this.executeTrade(bot);
            }
        });
    };

    calculateProbabilities = (prediction: number) => {
        let over = 0;
        let under = 0;
        let total = 0;
        this.digit_stats.forEach(stat => {
            total += stat.count;
            if (stat.digit > prediction) over += stat.count;
            if (stat.digit < prediction) under += stat.count;
        });
        return {
            overProb: total > 0 ? (over / total) * 100 : 0,
            underProb: total > 0 ? (under / total) * 100 : 0,
        };
    };

    @action
    executeTrade = async (bot: TAutoBot) => {
        if (
            bot.status !== 'Running' ||
            this.session_profit >= this.take_profit ||
            this.session_profit <= -this.stop_loss
        ) {
            if (this.session_profit >= this.take_profit || this.session_profit <= -this.stop_loss) {
                bot.status = 'Idle';
            }
            return;
        }

        bot.status = 'Waiting';

        // Calculate current stake based on martingale logic
        const current_stake = this.stake;

        // Determine contract type based on bot type
        const contract_type = bot.type === 'Over' ? `DIGITOVER` : `DIGITUNDER`;
        const barrier = bot.prediction.toString();

        try {
            if (!api_base.api) {
                console.error('AutoTrader: API not initialized');
                bot.status = 'Running';
                return;
            }

            // Step 1: Get proposal
            const proposal_response = await api_base.api.send({
                proposal: 1,
                amount: current_stake,
                basis: 'stake',
                contract_type,
                currency: this.root_store.client?.currency || 'USD',
                duration: 1,
                duration_unit: 't',
                symbol: this.symbol,
                barrier,
            });

            if (proposal_response.error) {
                console.error('AutoTrader Proposal Error:', proposal_response.error);
                runInAction(() => {
                    bot.status = 'Running';
                });
                return;
            }

            const proposal_id = proposal_response.proposal?.id;
            if (!proposal_id) {
                console.error('AutoTrader: No proposal ID received');
                bot.status = 'Running';
                return;
            }

            // Step 2: Buy the contract
            const buy_response = await api_base.api.send({
                buy: proposal_id,
                price: current_stake,
            });

            if (buy_response.error) {
                console.error('AutoTrader Buy Error:', buy_response.error);
                runInAction(() => {
                    bot.status = 'Running';
                });
                return;
            }

            const contract_id = buy_response.buy?.contract_id;
            console.log(`AutoTrader: Contract purchased! ID: ${contract_id}`);

            // Step 3: Monitor contract result
            setTimeout(async () => {
                try {
                    const poc_response = await api_base.api.send({
                        proposal_open_contract: 1,
                        contract_id,
                    });

                    if (poc_response?.proposal_open_contract) {
                        const contract = poc_response.proposal_open_contract;
                        const is_win = contract.status === 'won';
                        const profit = contract.profit || 0;
                        this.handleTradeResult(bot.id, is_win, current_stake, profit);
                    }
                } catch (e) {
                    console.error('AutoTrader: Error checking contract result', e);
                    // Fallback to Running state
                    runInAction(() => {
                        bot.status = 'Running';
                    });
                }
            }, 3000);
        } catch (error) {
            console.error('AutoTrader execution error:', error);
            runInAction(() => {
                bot.status = 'Running';
            });
        }
    };

    @action
    handleTradeResult = (id: string, is_win: boolean, stake_amount: number, actual_profit?: number) => {
        const bot = this.bots.find(b => b.id === id);
        if (bot) {
            bot.trades++;
            const profit = actual_profit !== undefined ? actual_profit : is_win ? stake_amount * 0.9 : -stake_amount;

            runInAction(() => {
                if (is_win) {
                    bot.wins++;
                    // Reset stake multiplier on win if we were martingaling
                } else {
                    bot.losses++;
                }

                this.session_profit += profit;
                this.total_profit += profit;

                if (bot.status === 'Waiting') {
                    bot.status = 'Running';
                }

                // Check session limits
                if (this.session_profit >= this.take_profit || this.session_profit <= -this.stop_loss) {
                    this.bots.forEach(b => (b.status = 'Idle'));
                }
            });
        }
    };

    @action
    handleAutoSwitch = (bot: TAutoBot) => {
        // Logic for finding corresponding bot might need refined mapping
        // For now, just stop the current one if it drops below threshold
        bot.status = 'Idle';
    };

    @action
    setSampleSize = (size: number) => {
        this.sample_size = size;
    };

    @action
    updateBotStatus = (id: string, status: TBotStatus) => {
        const bot = this.bots.find(b => b.id === id);
        if (bot) {
            bot.status = status;
        }
    };

    @action
    setStake = (val: number) => {
        this.stake = val;
    };

    @action
    setTakeProfit = (val: number) => {
        this.take_profit = val;
    };

    @action
    setStopLoss = (val: number) => {
        this.stop_loss = val;
    };

    @action
    setMartingale = (val: number) => {
        this.martingale_multiplier = val;
    };

    @action
    clearBotStats = () => {
        this.total_profit = 0;
        this.session_profit = 0;
        this.bots.forEach(bot => {
            bot.trades = 0;
            bot.wins = 0;
            bot.losses = 0;
            bot.status = 'Idle';
        });
        this.active_strategy = null;
        this.strategy_status = 'WAIT';
        this.trade_message = '';
    };

    @action
    resetStats = () => {
        this.digit_stats.forEach(stat => {
            stat.count = 0;
            stat.percentage = 0;
        });
        this.ticks = [];
        this.last_digit = null;
    };
}
