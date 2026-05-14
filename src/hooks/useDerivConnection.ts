import { useCallback } from 'react';
import derivConnectionStore from '@/stores/deriv-connection-store';

export const useDerivConnection = () => {
    const { state, isConnected, isAuthorized, isConnecting, hasError, error } = derivConnectionStore;

    const connect = useCallback((token?: string) => {
        derivConnectionStore.connect(token);
    }, []);

    const disconnect = useCallback(() => {
        derivConnectionStore.disconnect();
    }, []);

    const authorize = useCallback((token: string) => {
        derivConnectionStore.authorize(token);
    }, []);

    return {
        state,
        isConnected,
        isAuthorized,
        isConnecting,
        hasError,
        error,
        connect,
        disconnect,
        authorize,
    };
};

export default useDerivConnection;
