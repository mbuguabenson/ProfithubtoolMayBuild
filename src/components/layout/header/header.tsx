import React, { useCallback } from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import PWAInstallButton from '@/components/pwa-install-button';
import { standalone_routes } from '@/components/shared';
import { generateOAuthURL } from '@/components/shared/utils/config/config';
import Button from '@/components/shared_ui/button';
import useActiveAccount from '@/hooks/api/account/useActiveAccount';
import { useOauth2 } from '@/hooks/auth/useOauth2';
import { useFirebaseCountriesConfig } from '@/hooks/firebase/useFirebaseCountriesConfig';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import useTMB from '@/hooks/useTMB';
import { clearAuthData } from '@/utils/auth-utils';
import { StandaloneCircleUserRegularIcon } from '@deriv/quill-icons/Standalone';
import { Localize, useTranslations } from '@deriv-com/translations';
import { Header, useDevice, Wrapper, Tooltip } from '@deriv-com/ui';
import { AppLogo } from '../app-logo';
import PlatformSwitcher from './platform-switcher';
import AccountsInfoLoader from './account-info-loader';
import AccountSwitcher from './account-switcher';
import MenuItems from './menu-items';
import MobileMenu from './mobile-menu';
import './header.scss';

type TAppHeaderProps = {
    isAuthenticating?: boolean;
};

const AppHeader = observer(({ isAuthenticating }: TAppHeaderProps) => {
    const { isDesktop } = useDevice();
    const { isAuthorizing, activeLoginid, setIsAuthorizing } = useApiBase();
    const { client } = useStore() ?? {};
    const [authTimeout, setAuthTimeout] = React.useState(false);

    // Detect OAuth callback on mount
    const [isOAuthPending, setIsOAuthPending] = React.useState(() => {
        const params = new URLSearchParams(window.location.search);
        return Boolean(params.get('code') && params.get('state'));
    });

    const { data: activeAccount } = useActiveAccount({ allBalanceData: client?.all_accounts_balance });

    // Clear OAuth-pending flag once the account is set or after a timeout
    React.useEffect(() => {
        if (!isOAuthPending) return;
        if (activeLoginid) {
            setIsOAuthPending(false);
            return;
        }
        const timer = setTimeout(() => setIsOAuthPending(false), 30_000);
        return () => clearTimeout(timer);
    }, [isOAuthPending, activeLoginid]);

    // Fallback timeout: show login button if auth never resolves
    React.useEffect(() => {
        if (isOAuthPending || isAuthenticating) return;

        const timer = setTimeout(() => {
            if (isAuthorizing && !activeLoginid) {
                setAuthTimeout(true);
                setIsAuthorizing(false);
            }
        }, 5000);

        if (activeLoginid || !isAuthorizing) {
            if (authTimeout) setAuthTimeout(false);
            clearTimeout(timer);
        }

        return () => clearTimeout(timer);
    }, [isAuthorizing, activeLoginid, setIsAuthorizing, authTimeout, isOAuthPending, isAuthenticating]);

    const handleLogin = React.useCallback(async () => {
        try {
            setIsAuthorizing(true);
            const oauthUrl = await generateOAuthURL();
            if (oauthUrl) {
                window.location.assign(oauthUrl);
            } else {
                setIsAuthorizing(false);
            }
        } catch (error) {
            console.error('Login failed:', error);
            setIsAuthorizing(false);
        }
    }, [setIsAuthorizing]);

    const renderAccountSection = React.useCallback((position: 'left' | 'right' = 'right') => {
        if (activeLoginid) {
            if (position === 'left' && !isDesktop) {
                return (
                    <div className='auth-actions'>
                        <AccountSwitcher activeAccount={activeAccount} />
                    </div>
                );
            } else if (position === 'right' && isDesktop) {
                return (
                    <div className='auth-actions'>
                        <AccountSwitcher activeAccount={activeAccount} />
                    </div>
                );
            }
        } else if (
            position === 'right' &&
            !isOAuthPending &&
            ((!isAuthorizing && !activeLoginid) || authTimeout)
        ) {
            return (
                <div className='auth-actions'>
                    <Button
                        primary
                        onClick={handleLogin}
                    >
                        <Localize i18n_default_text='Connect' />
                    </Button>
                </div>
            );
        } else if (position === 'right') {
            return (
                <div className='auth-actions auth-actions--loading'>
                    <svg
                        className='auth-actions__spinner'
                        viewBox='0 0 24 24'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                    >
                        <circle
                            cx='12'
                            cy='12'
                            r='10'
                            stroke='currentColor'
                            strokeWidth='2.5'
                            strokeLinecap='round'
                            strokeDasharray='31.416'
                            strokeDashoffset='10'
                        />
                    </svg>
                </div>
            );
        }
        return null;
    }, [activeLoginid, isDesktop, activeAccount, isOAuthPending, isAuthorizing, authTimeout, handleLogin]);

    if (client?.should_hide_header) return null;
    return (
        <Header
            className={clsx('app-header', {
                'app-header--desktop': isDesktop,
                'app-header--mobile': !isDesktop,
            })}
        >
            <Wrapper variant='left'>
                {!isDesktop && <MobileMenu />}
                <PlatformSwitcher />
                {isDesktop ? <MenuItems /> : renderAccountSection('left')}
            </Wrapper>
            <Wrapper variant='right'>
                {renderAccountSection('right')}
            </Wrapper>
        </Header>
    );
});

export default AppHeader;
