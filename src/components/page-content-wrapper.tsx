import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { useDevice } from '@deriv-com/ui';

const PageContentWrapper = observer(({ children, className }: { children: React.ReactNode; className?: string }) => {
    const { run_panel, dashboard } = useStore();
    const { isDesktop } = useDevice();
    const { is_drawer_open } = run_panel;
    const { is_chart_modal_visible } = dashboard;

    return (
        <div
            className={classNames(
                'dashboard__chart-wrapper',
                {
                    'dashboard__chart-wrapper--expanded': is_drawer_open && isDesktop,
                    'dashboard__chart-wrapper--modal': is_chart_modal_visible && isDesktop,
                },
                className
            )}
        >
            {children}
        </div>
    );
});

export default PageContentWrapper;
