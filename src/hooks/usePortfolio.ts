import { useEffect, useState } from 'react';
import derivApiService, { TDerivResponse } from '@/lib/deriv-api-service';

export type TPortfolioItem = {
    contract_id: number;
    buy_price: number;
    symbol: string;
    contract_type: string;
    expiry_time: number;
};

export const usePortfolio = (subscribe: boolean = true) => {
    const [portfolio, setPortfolio] = useState<TPortfolioItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setIsLoading(true);
        setError(null);

        const request = { portfolio: 1, subscribe: subscribe ? 1 : 0 };

        const unsubscribe = derivApiService.subscribe(request, (data: TDerivResponse) => {
            if (data.error) {
                setError(data.error.message);
            } else if (data.portfolio) {
                setPortfolio(data.portfolio.contracts || []);
            }
            setIsLoading(false);
        });

        return () => {
            if (subscribe) {
                unsubscribe();
            }
        };
    }, [subscribe]);

    return { portfolio, isLoading, error };
};

export default usePortfolio;
