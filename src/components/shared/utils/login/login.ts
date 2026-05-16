import { website_name } from '@/utils/site-config';
import { domain_app_ids, getAppId, getCurrentProductionDomain } from '../config/config';
import { CookieStorage, isStorageSupported, LocalStore } from '../storage/storage';
import { getStaticUrl, urlForCurrentDomain } from '../url';
import { deriv_urls } from '../url/constants';

import { generateOAuthURL } from '../config/config';

export const redirectToLogin = async (is_logged_in: boolean, language: string, has_params = true, redirect_delay = 0) => {
    if (!is_logged_in && isStorageSupported(sessionStorage)) {
        const l = window.location;
        const redirect_url = has_params ? window.location.href : `${l.protocol}//${l.host}${l.pathname}`;
        sessionStorage.setItem('redirect_url', redirect_url);
        
        const oauth_url = await generateOAuthURL();
        
        setTimeout(() => {
            window.location.href = oauth_url;
        }, redirect_delay);
    }
};

export const redirectToSignUp = () => {
    window.open(getStaticUrl('/signup/'));
};

// Deprecated: logic moved to config/generateOAuthURL
export const loginUrl = ({ language }: TLoginUrl) => {
    // This is now handled by generateOAuthURL
    return ''; 
};
