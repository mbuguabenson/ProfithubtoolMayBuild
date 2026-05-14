import { Suspense } from 'react';
import { observer } from 'mobx-react-lite';
import { Loader } from '@deriv-com/ui';
import ChartModalDesktop from './chart-modal-desktop';

export const ChartModal = observer(() => {
    return <Suspense fallback={<Loader />}>{<ChartModalDesktop />}</Suspense>;
});

export default ChartModal;
