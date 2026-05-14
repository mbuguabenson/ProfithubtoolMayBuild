import React from 'react';

// Stubbing external dependencies to allow build to pass until migration is complete
// import { getPositionsV2TabIndexFromURL, makeLazyLoader, moduleLoader, routes } from '@deriv/shared';
// import { Loading } from '@deriv/components';
// import { TCoreStores } from '@deriv/stores/types';
// import { TWebSocket } from 'Types';
// import { useDtraderV2Flag } from '@deriv/hooks';

type Apptypes = {
    passthrough: {
        root_store: any; // TCoreStores
        WS: any; // TWebSocket
    };
};

const App = ({ passthrough }: Apptypes) => {
    return <div>DTrader Module (Loading...)</div>;
};
export default App;
