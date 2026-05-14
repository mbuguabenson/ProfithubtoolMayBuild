import { createContext, useContext, useState } from 'react';
import RootStore from '@/stores/root-store';
import Bot from '../external/bot-skeleton/scratch/dbot';

const StoreContext = createContext<null | RootStore>(null);

type TStoreProvider = {
    children: React.ReactNode;
    mockStore?: RootStore;
};

const StoreProvider: React.FC<TStoreProvider> = ({ children, mockStore: mockedStore }) => {
    const [store] = (window as any).root_store
        ? [(window as any).root_store]
        : useState<RootStore>(mockedStore || new RootStore(Bot));
    if (!(window as any).root_store) (window as any).root_store = store;

    return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
};

const useStore = () => {
    const store = useContext(StoreContext);
    if (!store) {
        throw new Error('useStore must be used within a StoreProvider');
    }

    return store;
};

export { StoreProvider, useStore };

export const mockStore = () => new RootStore(Bot);
