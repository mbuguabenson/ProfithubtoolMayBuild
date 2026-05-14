import { makeAutoObservable, runInAction } from 'mobx';
import derivApiService, { ConnectionState } from '@/lib/deriv-api-service';

class DerivConnectionStore {
    state: ConnectionState = ConnectionState.DISCONNECTED;
    error: string | null = null;
    latency: number = 0;

    constructor() {
        makeAutoObservable(this);

        // Subscribe to service state changes
        derivApiService.onStateChange(newState => {
            runInAction(() => {
                this.state = newState;
                if (newState !== ConnectionState.ERROR) {
                    this.error = null;
                }
            });
        });
    }

    get isConnected() {
        return this.state === ConnectionState.CONNECTED || this.state === ConnectionState.AUTHORIZED;
    }

    get isAuthorized() {
        return this.state === ConnectionState.AUTHORIZED;
    }

    get isConnecting() {
        return this.state === ConnectionState.CONNECTING;
    }

    get hasError() {
        return this.state === ConnectionState.ERROR;
    }

    connect(token?: string) {
        derivApiService.connect(token);
    }

    disconnect() {
        derivApiService.disconnect();
    }

    authorize(token: string) {
        derivApiService.authorize(token);
    }

    setError(message: string) {
        this.error = message;
        this.state = ConnectionState.ERROR;
    }
}

export const derivConnectionStore = new DerivConnectionStore();
export default derivConnectionStore;
