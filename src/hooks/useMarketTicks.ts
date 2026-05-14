import { useEffect, useRef, useState } from 'react';
import derivApiService from '@/lib/deriv-api-service';

export type TTick = {
    symbol: string;
    quote: number;
    epoch: number;
};

export type TMarketTicksOptions = {
    count?: number;
    subscribe?: boolean;
};

export const useMarketTicks = (symbol: string, options: TMarketTicksOptions = {}) => {
    const { count = 100, subscribe = true } = options;
    const [ticks, setTicks] = useState<TTick[]>([]);
    const [history, setHistory] = useState<number[]>([]);
    const [lastTick, setLastTick] = useState<TTick | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Ref to avoid stale closures in callbacks
    const symbolRef = useRef(symbol);
    symbolRef.current = symbol;

    useEffect(() => {
        if (!symbol) return;

        setIsLoading(true);
        setError(null);

        // 1. Fetch history first
        derivApiService.send({
            ticks_history: symbol,
            adjust_start_time: 1,
            count: count,
            end: 'latest',
            style: 'ticks',
        });

        // 2. Subscribe if requested
        let unsubscribe: (() => void) | null = null;

        if (subscribe) {
            unsubscribe = derivApiService.subscribe(
                {
                    ticks: symbol,
                    subscribe: 1,
                },
                data => {
                    if (data.msg_type === 'tick' && data.tick) {
                        if (data.tick.symbol === symbolRef.current) {
                            const newTick = {
                                symbol: data.tick.symbol,
                                quote: parseFloat(data.tick.quote),
                                epoch: data.tick.epoch,
                            };
                            setLastTick(newTick);
                            setTicks(prev => [...prev.slice(-count + 1), newTick]);
                        }
                    } else if (data.msg_type === 'history' && data.echo_req?.ticks_history === symbolRef.current) {
                        if (data.error) {
                            setError(data.error.message);
                        } else if (data.history?.prices) {
                            setHistory(data.history.prices);
                            const lastPrice = data.history.prices[data.history.prices.length - 1];
                            setLastTick({
                                symbol: symbolRef.current,
                                quote: lastPrice,
                                epoch: data.history.times[data.history.times.length - 1],
                            });
                        }
                        setIsLoading(false);
                    } else if (data.error && data.echo_req?.ticks === symbolRef.current) {
                        setError(data.error.message);
                    }
                }
            );
        }

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [symbol, count, subscribe]);

    return {
        ticks,
        history,
        lastTick,
        error,
        isLoading,
    };
};

export default useMarketTicks;
