import { useEffect, useState } from 'react';
import derivApiService from '@/lib/deriv-api-service';

export type TSymbol = {
    symbol: string;
    display_name: string;
    market: string;
    submarket: string;
};

export const useActiveSymbols = () => {
    const [symbols, setSymbols] = useState<TSymbol[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setIsLoading(true);
        setError(null);

        derivApiService
            .sendRequest({ active_symbols: 'brief', product_type: 'basic' })
            .then(data => {
                if (data.active_symbols) {
                    setSymbols(data.active_symbols);
                }
            })
            .catch(err => {
                setError(err.message || 'Failed to fetch active symbols');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, []);

    return { symbols, isLoading, error };
};

export default useActiveSymbols;
