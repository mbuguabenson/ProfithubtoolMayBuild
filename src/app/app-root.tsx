import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import ErrorBoundary from '@/components/error-component/error-boundary';
import ErrorComponent from '@/components/error-component/error-component';
import InitialLoader from '@/components/loader/initial-loader';
import { api_base } from '@/external/bot-skeleton';
import { useStore } from '@/hooks/useStore';
import useTMB from '@/hooks/useTMB';
import './app-root.scss';

const AppContent = lazy(() => import('./app-content'));
const RiskDisclaimerModal = lazy(() => import('@/components/shared/risk-disclaimer-modal'));

const AppRootLoader = () => {
    return <InitialLoader />;
};

const ErrorComponentWrapper = observer(() => {
    const { common } = useStore();

    if (!common.error) return null;

    return (
        <ErrorComponent
            header={common.error?.header}
            message={common.error?.message}
            redirect_label={common.error?.redirect_label}
            redirectOnClick={common.error?.redirectOnClick}
            should_clear_error_on_click={common.error?.should_clear_error_on_click}
            setError={common.setError}
            redirect_to={common.error?.redirect_to}
            should_redirect={common.error?.should_redirect}
        />
    );
});

const AppRoot = observer(() => {
    const store = useStore();
    const { ui } = store;
    const { is_dark_mode_on } = ui;

    useEffect(() => {
        const themeClass = is_dark_mode_on ? 'theme--dark' : 'theme--light';
        document.body.classList.remove('theme--light', 'theme--dark');
        document.body.classList.add(themeClass);
    }, [is_dark_mode_on]);

    const api_base_initialized = useRef(false);
    const [is_api_initialized, setIsApiInitialized] = useState(false);
    const [is_tmb_check_complete, setIsTmbCheckComplete] = useState(false);
    const [, setIsTmbEnabled] = useState(false);
    const { isTmbEnabled } = useTMB();

    useEffect(() => {
        if (is_tmb_check_complete) return;

        const safetyTimeout = setTimeout(() => {
            if (!is_tmb_check_complete) {
                console.warn('[AppRoot] TMB check safety timeout reached');
                setIsTmbCheckComplete(true);
            }
        }, 3000);

        const checkTmbStatus = async () => {
            try {
                const tmb_status = await isTmbEnabled();
                const final_status = tmb_status || window.is_tmb_enabled === true;
                console.log('[AppRoot] TMB status determined:', final_status);

                setIsTmbEnabled(final_status);
                setIsTmbCheckComplete(true);
            } catch (error) {
                console.error('[AppRoot] TMB check failed:', error);
                setIsTmbCheckComplete(true);
            } finally {
                clearTimeout(safetyTimeout);
            }
        };

        checkTmbStatus();
        return () => clearTimeout(safetyTimeout);
    }, [isTmbEnabled]);

    useEffect(() => {
        if (!is_tmb_check_complete) return;

        const timeoutId = setTimeout(() => {
            if (!is_api_initialized) {
                setIsApiInitialized(true);
            }
        }, 5000);

        const initializeApi = async () => {
            if (!api_base_initialized.current) {
                try {
                    await api_base.init();
                    api_base_initialized.current = true;
                } catch (error) {
                    console.error('API initialization failed:', error);
                    api_base_initialized.current = false;
                } finally {
                    setIsApiInitialized(true);
                    clearTimeout(timeoutId);
                }
            }
        };

        initializeApi();
        return () => clearTimeout(timeoutId);
    }, [is_tmb_check_complete]);

    if (!store || !is_api_initialized) return <AppRootLoader />;

    return (
        <Suspense fallback={<AppRootLoader />}>
            <ErrorBoundary root_store={store}>
                <ErrorComponentWrapper />
                <RiskDisclaimerModal force_show={!localStorage.getItem('experttrader_risk_accepted')} />
                <AppContent />
            </ErrorBoundary>
        </Suspense>
    );
});

export default AppRoot;
