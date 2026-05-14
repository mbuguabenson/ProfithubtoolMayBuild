import React, { useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import { generateDerivApiInstance } from '@/external/bot-skeleton/services/api/appId';
import { getAppId } from '@/components/shared/utils/config/config';
import { clearAuthData } from '@/utils/auth-utils';
import { useStore } from '@/hooks/useStore';
import { observer } from 'mobx-react-lite';

const CallbackPage = observer(() => {
    const { common } = useStore();
    const isProcessing = useRef(false);
    
    // Detect mode from URL path for strict isolation
    const path = window.location.pathname;
    const detectedMode = path.includes('/legacy/') ? 'legacy' : 'new';
    
    // Ensure API_MODE is synced with the callback we just entered
    if (localStorage.getItem('API_MODE') !== detectedMode) {
        localStorage.setItem('API_MODE', detectedMode);
    }

    useEffect(() => {
        const processUrlTokens = async () => {
            if (isProcessing.current) return;
            isProcessing.current = true;

            // Clear potential legacy config that causes InvalidToken errors on Vercel
            if (window.location.hostname.endsWith('.vercel.app')) {
                localStorage.removeItem('config.app_id');
                localStorage.removeItem('config.server_url');
            }

            const params = new URLSearchParams(window.location.search);
            const hasCode = params.has('code');
            const detectedMode = hasCode ? 'new' : 'legacy';

            if (detectedMode === 'new') {
                const code = params.get('code');
                const state = params.get('state');

                if (!code || !state) {
                    console.error('[OAuth2] Missing code or state in callback');
                    return;
                }

                const incomingState = params.get('state');
                const savedState = sessionStorage.getItem('pkce_state');
                
                console.log('[OAuth2] State Validation:', {
                    incoming: incomingState,
                    saved: savedState,
                    match: incomingState === savedState
                });

                if (!validatePKCEState(state)) {
                    console.error('[OAuth2] State mismatch! Possible CSRF attack.', {
                        incoming: incomingState,
                        saved: savedState
                    });
                    return;
                }

                const verifier = popPKCEVerifier();
                if (!verifier) {
                    console.error('[OAuth2] Missing PKCE verifier');
                    return;
                }

                try {
                    const redirect_uri = `${window.location.origin}/callback`;
                    console.log('[OAuth2] Exchange Config:', {
                        client_id: DERIV_OAUTH_CLIENT_ID,
                        redirect_uri,
                        grant_type: 'authorization_code'
                    });

                    console.log('[OAuth2] Exchanging code for token...');
                    const response = await fetch(DERIV_NEW_TOKEN_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            grant_type: 'authorization_code',
                            code,
                            client_id: DERIV_OAUTH_CLIENT_ID,
                            redirect_uri,
                            code_verifier: verifier,
                        }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        console.error('[OAuth2] Token Exchange Error Response:', {
                            status: response.status,
                            statusText: response.statusText,
                            data: errorData,
                        });
                        throw new Error(errorData.error_description || errorData.error || `HTTP ${response.status}`);
                    }

                    const data = await response.json();

                    // 1. Store tokens
                    localStorage.setItem('new_api_access_token', data.access_token);
                    localStorage.setItem('new_api_refresh_token', data.refresh_token);
                    
                    // 2. Fetch full account list to support switching (Step 3 of checklist)
                    console.log('[OAuth2] Fetching account list...');
                    const accountsResponse = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
                        headers: {
                            Authorization: `Bearer ${data.access_token}`,
                            'Deriv-App-ID': String(getAppId()),
                        },
                    });
                    const accountsData = await accountsResponse.json();
                    
                    if (accountsData.data && accountsData.data.length > 0) {
                        localStorage.setItem('new_api_accounts_list', JSON.stringify(accountsData.data));
                        // Set the first account as default active
                        localStorage.setItem('new_api_account_id', accountsData.data[0].account_id);
                    } else {
                        localStorage.setItem('new_api_account_id', data.account_id);
                    }

                    Cookies.set('logged_state', 'true', { expires: 30, path: '/' });
                    console.log('[OAuth2] Successfully obtained new API tokens and account list');
                } catch (e: any) {
                    console.error('[OAuth2] Token exchange failed:', e);
                    common.setError(true, {
                        message: `Authentication failed: ${e.message}`,
                        header: 'Auth Error',
                    });
                    return;
                }
            } else {
                // LEGACY FLOW
                const tokens: Record<string, string> = {};
                const accountsList: Record<string, string> = {};
                const clientAccounts: Record<string, { loginid: string; token: string; currency: string }> = {};

                // Extract all params to a dictionary first
                for (const [key, value] of params.entries()) {
                    tokens[key] = value;
                }

                // Parse accounts (acct1, token1, cur1, etc.)
                for (const [key, value] of Object.entries(tokens)) {
                    if (key.startsWith('acct')) {
                        const index = key.replace('acct', '');
                        const tokenKey = `token${index}`;
                        const curKey = `cur${index}`;
                        const token = tokens[tokenKey];
                        const currency = tokens[curKey] || '';

                        if (token) {
                            accountsList[value] = token;
                            clientAccounts[value] = {
                                loginid: value,
                                token: token,
                                currency: currency,
                            };
                        }
                    }
                }

                if (Object.keys(accountsList).length === 0) {
                    console.error('No accounts found in callback URL');
                    common.setError(true, {
                        message: 'Login failed: No accounts found.',
                        header: 'Login Error',
                    });
                    return;
                }

                // 1. Save minimal auth data needed for API
                localStorage.setItem('accountsList', JSON.stringify(accountsList));
                localStorage.setItem('clientAccounts', JSON.stringify(clientAccounts));

                // Default to the first account (acct1) as active
                const firstToken = tokens['token1'];
                const firstAcct = tokens['acct1'];

                if (firstToken && firstAcct) {
                    localStorage.setItem('authToken', firstToken);
                    localStorage.setItem('active_loginid', firstAcct);
                    Cookies.set('logged_state', 'true', { expires: 30, path: '/' });
                } else {
                    // Fallback if acct1 is missing (rare but possible)
                    const firstKey = Object.keys(accountsList)[0];
                    if (firstKey) {
                        localStorage.setItem('authToken', accountsList[firstKey]);
                        localStorage.setItem('active_loginid', firstKey);
                        Cookies.set('logged_state', 'true', { expires: 30, path: '/' });
                    }
                }
            }

            // 2. Authorize to validate and get details (Legacy only)
            if (detectedMode === 'legacy') {
                try {
                    const api = generateDerivApiInstance();
                    const activeToken = localStorage.getItem('authToken');

                    if (api && activeToken) {
                        const { authorize, error } = await api.authorize(activeToken);

                        if (error) {
                            console.error('Authorization error in callback:', error);
                            if ((error as any).code === 'InvalidToken') {
                                clearAuthData();
                                console.error('Login failed with error:', error);
                                common.setError(true, {
                                    message: `Login failed: ${(error as any).message || (error as any).code || 'Invalid token'}`,
                                    header: 'Login Error',
                                });
                                return;
                            }
                        } else {
                            // Success - update local storage with authoritative data from API
                            if (authorize.account_list) {
                                localStorage.setItem('client_account_details', JSON.stringify(authorize.account_list));
                            }
                            if (authorize.country) {
                                localStorage.setItem('client.country', authorize.country);
                            }
                        }
                        api.disconnect();
                    }
                } catch (e) {
                    console.error('API Error during callback processing:', e);
                }
            }

            // 3. Redirect to dashboard
            // Preserve the 'account' query param if user wanted a specific currency, else default to 'USD' or the first account's currency
            // But usually just redirecting to / is enough, main.tsx handles default account selection.
            window.location.assign(window.location.origin);
        };

        processUrlTokens();
    }, [common]);

    return (
        <React.Fragment>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    flexDirection: 'column',
                    gap: '20px',
                    color: 'var(--text-general)',
                }}
            >
                <h2>Logging in...</h2>
                <div className='initial-loader__barspinner barspinner barspinner-light'></div>
            </div>
        </React.Fragment>
    );
});

export default CallbackPage;
