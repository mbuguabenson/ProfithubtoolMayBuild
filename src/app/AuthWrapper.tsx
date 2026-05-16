import React from 'react';
import ChunkLoader from '@/components/loader/chunk-loader';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';
import { localize } from '@deriv-com/translations';
import { URLUtils } from '@deriv-com/utils';
import { getAppId } from '@/components/shared/utils/config/config';
import App from './App';

// Extend Window interface to include is_tmb_enabled property
declare global {
    interface Window {
        is_tmb_enabled?: boolean;
    }
}

const setLocalStorageToken = async (loginInfo: URLUtils.LoginInfo[], paramsToDelete: string[]) => {
    if (loginInfo.length) {
        try {
            const defaultActiveAccount = URLUtils.getDefaultActiveAccount(loginInfo);
            if (!defaultActiveAccount) return;

            const accountsList: Record<string, string> = {};
            const clientAccounts: Record<string, { loginid: string; token: string; currency: string }> = {};

            loginInfo.forEach((account: { loginid: string; token: string; currency: string }) => {
                accountsList[account.loginid] = account.token;
                clientAccounts[account.loginid] = account;
            });

            localStorage.setItem('accountsList', JSON.stringify(accountsList));
            localStorage.setItem('clientAccounts', JSON.stringify(clientAccounts));

            URLUtils.filterSearchParams(paramsToDelete);
            localStorage.setItem('authToken', loginInfo[0].token);
            localStorage.setItem('active_loginid', loginInfo[0].loginid);
        } catch (error) {
            console.error('Error setting up login info:', error);
        }
    }
};

export const AuthWrapper = () => {
    const [isAuthComplete, setIsAuthComplete] = React.useState(false);
    const { loginInfo, paramsToDelete } = URLUtils.getLoginInfoFromURL();
    const { isOnline } = useOfflineDetection();

    React.useEffect(() => {
        const initializeAuth = async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const code = urlParams.get('code');
                const code_verifier = localStorage.getItem('code_verifier');

                if (code && code_verifier) {
                    console.log('[Auth] Detected authorization code, exchanging for tokens...');
                    const response = await fetch('https://auth.deriv.com/oauth2/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            grant_type: 'authorization_code',
                            code,
                            code_verifier,
                            client_id: String(getAppId()),
                            redirect_uri: window.location.origin.includes('localhost') 
                                ? `${window.location.origin}/` 
                                : 'https://profithub.co.ke',
                        }),
                    });

                    const data = await response.json();
                    if (data.access_token) {
                        console.log('[Auth] Token exchange successful');
                        // In a real app, you'd call an API with this token to get the account list
                        // For now, we'll store it in the keys used by api-base.ts
                        localStorage.setItem('new_api_access_token', data.access_token);
                        localStorage.setItem('new_api_account_id', data.account_id || '');
                        // If there are multiple accounts, they'd be in data.accounts
                        if (data.accounts) {
                            localStorage.setItem('new_api_accounts_list', JSON.stringify(data.accounts));
                        }
                    } else {
                        console.error('[Auth] Token exchange failed:', data.error_description || data.error);
                    }
                    
                    // Cleanup URL and verifier
                    localStorage.removeItem('code_verifier');
                    window.history.replaceState({}, document.title, window.location.pathname);
                }

                // Tokens are parsed from URL and stored in localStorage (Legacy support)
                await setLocalStorageToken(loginInfo, paramsToDelete);
                URLUtils.filterSearchParams(['lang']);
                setIsAuthComplete(true);
            } catch (error) {
                console.error('[Auth] Authentication initialization failed:', error);
                setIsAuthComplete(true);
            }
        };

        // If offline, set auth complete immediately but still run initializeAuth
        // to save login info to localStorage for offline use
        if (!isOnline) {
            setIsAuthComplete(true);
        }

        initializeAuth();
    }, [loginInfo, paramsToDelete, isOnline]);

    // Add timeout for offline scenarios to prevent infinite loading
    React.useEffect(() => {
        if (!isOnline && !isAuthComplete) {
            const timeout = setTimeout(() => {
                setIsAuthComplete(true);
            }, 2000); // 2 second timeout for offline

            return () => clearTimeout(timeout);
        }
    }, [isOnline, isAuthComplete]);

    const getLoadingMessage = () => {
        if (!isOnline) return localize('Loading offline mode...');
        return localize('Initializing...');
    };

    if (!isAuthComplete) {
        return <ChunkLoader message={getLoadingMessage()} />;
    }

    return <App />;
};
