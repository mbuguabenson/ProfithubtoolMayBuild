import React from 'react';
import { useOauth2 } from '@/hooks/auth/useOauth2';
import useTMB from '@/hooks/useTMB';
import InitialLoader from '@/components/loader/initial-loader';

type AuthLoadingWrapperProps = {
    children: React.ReactNode;
};

const AuthLoadingWrapper = ({ children }: AuthLoadingWrapperProps) => {
    const { isSingleLoggingIn } = useOauth2();
    const { isTmbEnabled } = useTMB();

    const is_tmb_enabled = isTmbEnabled() || window.is_tmb_enabled === true;

    if (isSingleLoggingIn && !is_tmb_enabled) {
        return <InitialLoader />;
    }

    return <>{children}</>;
};

export default AuthLoadingWrapper;
