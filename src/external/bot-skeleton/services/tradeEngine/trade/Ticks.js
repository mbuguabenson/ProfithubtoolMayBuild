/* eslint-disable no-promise-executor-return */
import debounce from 'lodash.debounce';
import { localize } from '@deriv-com/translations';
import { getLast } from '../../../utils/binary-utils';
import { observer as globalObserver } from '../../../utils/observer';
import { api_base } from '../../api/api-base';
import { getDirection, getLastDigit } from '../utils/helpers';
import { expectPositiveInteger } from '../utils/sanitize';
import * as constants from './state/constants';

let tickListenerKey;

export default Engine =>
    class Ticks extends Engine {
        async watchTicks(symbol) {
            if (symbol && this.symbol !== symbol) {
                this.symbol = symbol;
                const { ticksService } = this.$scope;

                await ticksService.stopMonitor({
                    symbol,
                    key: tickListenerKey,
                });
                const callback = ticks => {
                    if (this.is_proposal_subscription_required) {
                        this.checkProposalReady();
                    }
                    const lastTick = ticks.slice(-1)[0];
                    if (lastTick) {
                        const { epoch } = lastTick;
                        this.store.dispatch({ type: constants.NEW_TICK, payload: epoch });
                    }
                };

                const key = await ticksService.monitor({ symbol, callback });
                tickListenerKey = key;
            }
        }

        checkTicksPromiseExists() {
            return this.$scope.ticksService.ticks_history_promise;
        }

        getTicks(toString = false) {
            return new Promise(resolve => {
                this.$scope.ticksService.request({ symbol: this.symbol }).then(ticks => {
                    const ticks_list = ticks.map(tick => {
                        if (toString) {
                            return tick.quote.toFixed(this.getPipSize());
                        }
                        return tick.quote;
                    });

                    resolve(ticks_list);
                });
            });
        }

        getLastTick(raw, toString = false) {
            return new Promise(resolve =>
                this.$scope.ticksService
                    .request({ symbol: this.symbol })
                    .then(ticks => {
                        let last_tick = raw ? getLast(ticks) : getLast(ticks).quote;
                        if (!raw && toString) {
                            last_tick = last_tick.toFixed(this.getPipSize());
                        }
                        resolve(last_tick);
                    })
                    .catch(e => {
                        if (e.code === 'MarketIsClosed') {
                            globalObserver.emit('Error', e);
                            resolve(e.code);
                        }
                    })
            );
        }

        getLastDigit() {
            return new Promise(resolve => this.getLastTick(false, true).then(tick => resolve(getLastDigit(tick))));
        }

        getLastDigitList() {
            return new Promise(resolve => this.getTicks().then(ticks => resolve(this.getLastDigitsFromList(ticks))));
        }
        getLastDigitsFromList(ticks) {
            const digits = ticks.map(tick => {
                return getLastDigit(tick.toFixed(this.getPipSize()));
            });
            return digits;
        }

        checkDirection(dir) {
            return new Promise(resolve =>
                this.$scope.ticksService
                    .request({ symbol: this.symbol })
                    .then(ticks => resolve(getDirection(ticks) === dir))
            );
        }

        getOhlc(args) {
            const { granularity = this.options.candleInterval || 60, field } = args || {};

            return new Promise(resolve =>
                this.$scope.ticksService
                    .request({ symbol: this.symbol, granularity })
                    .then(ohlc => resolve(field ? ohlc.map(o => o[field]) : ohlc))
            );
        }

        getOhlcFromEnd(args) {
            const { index: i = 1 } = args || {};

            const index = expectPositiveInteger(Number(i), localize('Index must be a positive integer'));

            return new Promise(resolve => this.getOhlc(args).then(ohlc => resolve(ohlc.slice(-index)[0])));
        }

        getPipSize() {
            return this.$scope.ticksService.pipSizes[this.symbol];
        }

        async requestAccumulatorStats() {
            const subscription_id = this.subscription_id_for_accumulators;
            const is_proposal_requested = this.is_proposal_requested_for_accumulators;
            const proposal_request = {
                ...window.Blockly.accumulators_request,
                amount: this?.tradeOptions?.amount,
                basis: this?.tradeOptions?.basis,
                contract_type: 'ACCU',
                currency: this?.tradeOptions?.currency,
                growth_rate: this?.tradeOptions?.growth_rate,
                proposal: 1,
                subscribe: 1,
                symbol: this?.tradeOptions?.symbol,
            };
            if (!subscription_id && !is_proposal_requested) {
                this.is_proposal_requested_for_accumulators = true;
                if (proposal_request) {
                    await api_base?.api?.send(proposal_request);
                }
            }
        }

        async handleOnMessageForAccumulators() {
            let ticks_stayed_in_list = [];
            return new Promise(resolve => {
                const subscription = api_base.api.onMessage().subscribe(({ data }) => {
                    if (data.msg_type === 'proposal') {
                        try {
                            this.subscription_id_for_accumulators = data.subscription.id;
                            // this was done because we can multile arrays in the respone and the list comes in reverse order
                            const stat_list = (data.proposal.contract_details.ticks_stayed_in || []).flat().reverse();
                            ticks_stayed_in_list = [...stat_list, ...ticks_stayed_in_list];
                            if (ticks_stayed_in_list.length > 0) resolve(ticks_stayed_in_list);
                        } catch (error) {
                            globalObserver.emit('Unexpected message type or no proposal found:', error);
                        }
                    }
                });
                api_base.pushSubscription(subscription);
            });
        }

        async fetchStatsForAccumulators() {
            try {
                // request stats for accumulators
                const debouncedAccumulatorsRequest = debounce(() => this.requestAccumulatorStats(), 300);
                debouncedAccumulatorsRequest();
                // wait for proposal response
                const ticks_stayed_in_list = await this.handleOnMessageForAccumulators();
                return ticks_stayed_in_list;
            } catch (error) {
                globalObserver.emit('Error in subscription promise:', error);
                throw error;
            } finally {
                // forget all proposal subscriptions so we can fetch new stats data on new call
                await api_base?.api?.send({ forget_all: 'proposal' });
                this.is_proposal_requested_for_accumulators = false;
                this.subscription_id_for_accumulators = null;
            }
        }

        async getCurrentStat() {
            try {
                const ticks_stayed_in = await this.fetchStatsForAccumulators();
                return ticks_stayed_in?.[0];
            } catch (error) {
                globalObserver.emit('Error fetching current stat:', error);
            }
        }

        async getStatList() {
            try {
                const ticks_stayed_in = await this.fetchStatsForAccumulators();
                // we need to send only lastest 100 ticks
                return ticks_stayed_in?.slice(0, 100);
            } catch (error) {
                globalObserver.emit('Error fetching current stat:', error);
            }
        }

        // Advanced Analysis Methods
        digitFrequency(digit, tickCount = 50) {
            return new Promise(resolve =>
                this.getTicks().then(ticks => {
                    const digits = this.getLastDigitsFromList(ticks.slice(-tickCount));
                    const count = digits.filter(d => d === Number(digit)).length;
                    const frequency = (count / digits.length) * 100;
                    resolve(Math.round(frequency * 100) / 100);
                })
            );
        }

        detectStreak(patternType, valueType, tickCount = 10) {
            return new Promise(resolve =>
                this.getTicks().then(ticks => {
                    const digits = this.getLastDigitsFromList(ticks.slice(-tickCount));
                    let streakLength = 0;

                    const checkCondition = digit => {
                        switch (valueType) {
                            case 'even':
                                return digit % 2 === 0;
                            case 'odd':
                                return digit % 2 !== 0;
                            case 'over5':
                                return digit >= 5;
                            case 'under5':
                                return digit < 5;
                            default:
                                return false;
                        }
                    };

                    if (patternType === 'consecutive') {
                        for (let i = digits.length - 1; i >= 0; i--) {
                            if (checkCondition(digits[i])) {
                                streakLength++;
                            } else {
                                break;
                            }
                        }
                    } else if (patternType === 'alternating') {
                        let lastCondition = checkCondition(digits[digits.length - 1]);
                        for (let i = digits.length - 1; i >= 0; i--) {
                            const currentCondition = checkCondition(digits[i]);
                            if (i === digits.length - 1 || currentCondition !== lastCondition) {
                                streakLength++;
                                lastCondition = !lastCondition;
                            } else {
                                break;
                            }
                        }
                    }

                    resolve(streakLength);
                })
            );
        }

        countDigitsInRange(minDigit, maxDigit, tickCount = 50) {
            return new Promise(resolve =>
                this.getTicks().then(ticks => {
                    const digits = this.getLastDigitsFromList(ticks.slice(-tickCount));
                    const count = digits.filter(d => d >= minDigit && d <= maxDigit).length;
                    resolve(count);
                })
            );
        }

        calculateVolatility(tickCount = 50) {
            return new Promise(resolve =>
                this.getTicks().then(ticks => {
                    const digits = this.getLastDigitsFromList(ticks.slice(-tickCount));

                    // Calculate frequency distribution
                    const distribution = Array(10).fill(0);
                    digits.forEach(d => distribution[d]++);

                    // Calculate standard deviation
                    const mean = digits.reduce((a, b) => a + b, 0) / digits.length;
                    const variance = digits.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / digits.length;
                    const stdDev = Math.sqrt(variance);

                    // Calculate entropy (disorder)
                    let entropy = 0;
                    distribution.forEach(count => {
                        if (count > 0) {
                            const p = count / digits.length;
                            entropy -= p * Math.log2(p);
                        }
                    });

                    // Normalize to 0-100 scale
                    const maxEntropy = Math.log2(10); // Maximum entropy for 10 digits
                    const volatilityScore = ((stdDev / 3) * 0.5 + (entropy / maxEntropy) * 0.5) * 100;

                    resolve(Math.min(100, Math.round(volatilityScore * 100) / 100));
                })
            );
        }

        getDigitByRank(rank = 1, tickCount = 100) {
            return new Promise(resolve =>
                this.getTicks().then(ticks => {
                    const digits = this.getLastDigitsFromList(ticks.slice(-tickCount));
                    const frequency = Array(10)
                        .fill(0)
                        .map((_, i) => ({
                            digit: i,
                            count: digits.filter(d => d === i).length,
                        }));

                    // Sort by count ascending
                    frequency.sort((a, b) => a.count - b.count);

                    // rank 1 = least, rank 2 = 2nd least, etc.
                    const target = frequency[Math.min(9, Math.max(0, rank - 1))];
                    resolve(target.digit);
                })
            );
        }

        identifyCandlePattern(tickCount = 3) {
            return new Promise(resolve =>
                this.getTicks().then(ticks => {
                    // Logic to detect Hammer, Shooting Star, etc based on OHLC
                    // For now, let's use a simpler logic for "reversal"
                    const lastTicks = ticks.slice(-tickCount);
                    if (lastTicks.length < 3) return resolve('none');

                    // Ticks.js has access to OHLC via this.getOhlc (inherited or injected)
                    // Let's assume we use the getOhlc method
                    this.getOhlc({ granularity: 60, count: tickCount }).then(ohlc => {
                        const last = ohlc[ohlc.length - 1];

                        const isGreen = last.close > last.open;
                        const isRed = last.close < last.open;
                        const bodySize = Math.abs(last.close - last.open);
                        const upperShadow = last.high - Math.max(last.open, last.close);
                        const lowerShadow = Math.min(last.open, last.close) - last.low;

                        if (upperShadow > bodySize * 2 && isRed) resolve('shooting_star');
                        else if (lowerShadow > bodySize * 2 && isGreen) resolve('hammer');
                        else if (bodySize < (last.high - last.low) * 0.1) resolve('doji');
                        else resolve('neutral');
                    });
                })
            );
        }

        analyzeMomentum(tickCount = 10) {
            return new Promise(resolve =>
                this.getTicks().then(ticks => {
                    const lastTicks = ticks.slice(-tickCount);
                    const prices = lastTicks.map(t => t.quote);
                    const diffs = [];
                    for (let i = 1; i < prices.length; i++) diffs.push(prices[i] - prices[i - 1]);

                    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
                    if (avgDiff > 0.01) resolve('strong_bullish');
                    else if (avgDiff > 0) resolve('mild_bullish');
                    else if (avgDiff < -0.01) resolve('strong_bearish');
                    else if (avgDiff < 0) resolve('mild_bearish');
                    else resolve('flat');
                })
            );
        }

        checkVolumeHealth(tickCount = 20) {
            return new Promise(resolve =>
                this.getTicks().then(ticks => {
                    // In Binary.com/Deriv, 'volume' in ticks is often count of price changes
                    // High volatility usually correlates with high 'active volume'
                    const lastTicks = ticks.slice(-tickCount);
                    const movement = lastTicks.reduce((acc, t, i) => {
                        if (i === 0) return 0;
                        return acc + Math.abs(t.quote - lastTicks[i - 1].quote);
                    }, 0);

                    const avgMovement = movement / tickCount;
                    resolve(avgMovement > 0.05 ? 'high' : 'low');
                })
            );
        }

        analyzeTrend(trendType, tickCount = 20) {
            return new Promise(resolve =>
                this.getTicks().then(ticks => {
                    const digits = this.getLastDigitsFromList(ticks.slice(-tickCount));
                    const halfPoint = Math.floor(digits.length / 2);
                    const firstHalf = digits.slice(0, halfPoint);
                    const secondHalf = digits.slice(halfPoint);

                    let firstValue, secondValue;

                    switch (trendType) {
                        case 'sum':
                            firstValue = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
                            secondValue = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
                            break;
                        case 'evenodd':
                            firstValue = firstHalf.filter(d => d % 2 === 0).length / firstHalf.length;
                            secondValue = secondHalf.filter(d => d % 2 === 0).length / secondHalf.length;
                            break;
                        case 'highlow':
                            firstValue = firstHalf.filter(d => d >= 5).length / firstHalf.length;
                            secondValue = secondHalf.filter(d => d >= 5).length / secondHalf.length;
                            break;
                        default:
                            resolve('neutral');
                            return;
                    }

                    const threshold = 0.1; // 10% threshold
                    if (secondValue > firstValue + threshold) {
                        resolve('rising');
                    } else if (secondValue < firstValue - threshold) {
                        resolve('falling');
                    } else {
                        resolve('neutral');
                    }
                })
            );
        }

        getMarkovProbability(targetDigit, prevDigit, tickCount = 100) {
            return new Promise(resolve =>
                this.getTicks().then(ticks => {
                    const digits = this.getLastDigitsFromList(ticks.slice(-tickCount - 1));
                    let totalTransitions = 0;
                    let targetTransitions = 0;

                    for (let i = 1; i < digits.length; i++) {
                        if (digits[i - 1] === Number(prevDigit)) {
                            totalTransitions++;
                            if (digits[i] === Number(targetDigit)) {
                                targetTransitions++;
                            }
                        }
                    }

                    if (totalTransitions === 0) resolve(0);
                    else resolve(Math.round((targetTransitions / totalTransitions) * 100));
                })
            );
        }

        getMarketEntropy(tickCount = 100) {
            return new Promise(resolve =>
                this.getTicks().then(ticks => {
                    const digits = this.getLastDigitsFromList(ticks.slice(-tickCount));
                    const distribution = Array(10).fill(0);
                    digits.forEach(d => distribution[d]++);

                    let entropy = 0;
                    distribution.forEach(count => {
                        if (count > 0) {
                            const p = count / digits.length;
                            entropy -= p * Math.log2(p);
                        }
                    });

                    const maxEntropy = Math.log2(10);
                    resolve(Math.round((entropy / maxEntropy) * 100));
                })
            );
        }

        getSignalConfidence(targetDigit, tickCount = 100) {
            return new Promise(resolve =>
                Promise.all([this.digitFrequency(targetDigit, tickCount), this.getMarketEntropy(tickCount)]).then(
                    ([freq, entropy]) => {
                        // Lower entropy means more predictable. Higher freq means stronger signal.
                        // Confidence is a weighted average of how often the digit appears and how predictable the market is.
                        // This is a simple mock logic for the confidence score (0-100).
                        const freqScore = Math.min(100, (freq / 10) * 100); // Baseline 10% is expected.
                        const predictability = 100 - entropy;
                        const confidence = freqScore * 0.6 + predictability * 0.4;
                        resolve(Math.min(100, Math.max(0, Math.round(confidence))));
                    }
                )
            );
        }

        predictMarketState(tickCount = 20) {
            return new Promise(resolve =>
                Promise.all([this.analyzeMomentum(tickCount), this.analyzeTrend('highlow', tickCount)]).then(
                    ([momentum, trend]) => {
                        if (momentum.includes('strong') && trend === 'rising') resolve('continue');
                        else if (momentum.includes('strong') && trend === 'falling') resolve('reverse');
                        else if (momentum === 'flat' || trend === 'neutral') resolve('unstable');
                        else resolve('continue');
                    }
                )
            );
        }

        getCandleColor(tickCount = 1) {
            return new Promise(resolve => {
                this.getOhlc({ granularity: 60, count: Math.max(tickCount, 1) }).then(ohlc => {
                    if (!ohlc || ohlc.length === 0) return resolve('neutral');
                    const last = ohlc[ohlc.length - 1];
                    if (last.close > last.open) resolve('green');
                    else if (last.close < last.open) resolve('red');
                    else resolve('neutral');
                });
            });
        }

        getMasterTradeSignal(tickCount = 10) {
            return new Promise(resolve => {
                Promise.all([
                    this.analyzeTrend('highlow', tickCount),
                    this.getCandleColor(1),
                    this.predictMarketState(tickCount),
                    this.identifyCandlePattern(3),
                ]).then(([trend, color, state, pattern]) => {
                    // Safety check: Unstable markets or indecision candles format a wait block.
                    if (state === 'unstable' || pattern === 'doji') {
                        return resolve('WAIT_HOLD');
                    }

                    // Signal: BUY RISE (Call)
                    if (trend === 'rising' && color === 'green' && state === 'continue') {
                        return resolve('BUY_RISE');
                    }
                    // Reversal Bounce: Hammer off a falling trend
                    if (trend === 'falling' && pattern === 'hammer') {
                        return resolve('BUY_RISE');
                    }

                    // Signal: BUY FALL (Put)
                    if (trend === 'falling' && color === 'red' && state === 'continue') {
                        return resolve('BUY_FALL');
                    }
                    // Reversal Dump: Shooting star off a rising trend
                    if (trend === 'rising' && pattern === 'shooting_star') {
                        return resolve('BUY_FALL');
                    }

                    // Default to holding if no strong consensus
                    resolve('WAIT_HOLD');
                });
            });
        }

        async getDelayTickValue(tick_value) {
            return new Promise((resolve, reject) => {
                try {
                    const ticks = [];
                    const symbol = this.symbol;

                    const resolveAndExit = () => {
                        this.$scope.ticksService.stopMonitor({
                            symbol,
                            key: '',
                        });
                        resolve(ticks);
                        ticks.length = 0;
                    };

                    const watchTicks = tick_list => {
                        ticks.push(tick_list);
                        const current_tick = ticks.length;
                        if (current_tick === tick_value) {
                            resolveAndExit();
                        }
                    };

                    const delayExecution = tick_list => watchTicks(tick_list);

                    if (Number(tick_value) <= 0) resolveAndExit();
                    this.$scope.ticksService.monitor({ symbol, callback: delayExecution });
                } catch (error) {
                    reject(new Error(`Failed to start tick monitoring: ${error.message}`));
                }
            });
        }
    };
