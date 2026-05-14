import Cookies from 'js-cookie';

/**
 * Clears authentication data from local storage and reloads the page
 */
export const clearAuthData = (is_reload: boolean = true): void => {
    localStorage.removeItem('accountsList');
    localStorage.removeItem('clientAccounts');
    localStorage.removeItem('callback_token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('active_loginid');
    localStorage.removeItem('client.accounts');
    localStorage.removeItem('client.country');
    sessionStorage.removeItem('query_param_currency');
    if (is_reload) {
        location.reload();
    }
};

/**
 * Handles OIDC authentication failure by clearing auth data and showing logged out view
 * @param error - The error that occurred during OIDC authentication
 */

export const handleOidcAuthFailure = (error: any) => {
    console.error('[OIDC] Authentication failure:', error);
    // Clear logged_state to prevent infinite authentication loops
    Cookies.set('logged_state', 'false');
    // Optionally clear other auth data
    localStorage.removeItem('accountsList');
    localStorage.removeItem('clientAccounts');
};
