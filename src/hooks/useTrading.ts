import { useCallback, useState } from 'react';
import derivApiService from '@/lib/deriv-api-service';

export type TBuyParams = {
    amount: number;
    basis: 'stake' | 'payout';
    contract_type: string;
    currency: string;
    duration: number;
    duration_unit: 't' | 's' | 'm' | 'h' | 'd';
    symbol: string;
    barrier?: string;
};

export const useTrading = () => {
    const [isExecuting, setIsExecuting] = useState(false);
    const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);
    const [error, setError] = useState<string | null>(null);

    const buy = useCallback(async (params: TBuyParams) => {
        setIsExecuting(true);
        setError(null);
        try {
            const proposal = await derivApiService.getProposal({
                amount: params.amount,
                basis: params.basis,
                contract_type: params.contract_type,
                currency: params.currency,
                duration: params.duration,
                duration_unit: params.duration_unit,
                symbol: params.symbol,
                barrier: params.barrier,
            });

            if (proposal.error) {
                throw new Error(proposal.error.message);
            }

            const result = await derivApiService.buy({
                buy: proposal.proposal.id,
                price: params.amount,
            });

            if (result.error) {
                throw new Error(result.error.message);
            }

            setLastResult(result.buy);
            return result.buy;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Trade execution failed';
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsExecuting(false);
        }
    }, []);

    const sell = useCallback(async (contractId: number, price: number = 0) => {
        setIsExecuting(true);
        setError(null);
        try {
            const result = await derivApiService.sell(contractId, price);
            if (result.error) {
                throw new Error(result.error.message);
            }
            return result.sell;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Contract sale failed';
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsExecuting(false);
        }
    }, []);

    return { buy, sell, isExecuting, lastResult, error };
};

export default useTrading;
