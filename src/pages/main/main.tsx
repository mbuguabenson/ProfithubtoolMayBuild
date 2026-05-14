import React, { lazy, Suspense, useEffect, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useLocation, useNavigate } from 'react-router-dom';
import ChunkLoader from '@/components/loader/chunk-loader';
import PageContentWrapper from '@/components/page-content-wrapper';
import { generateOAuthURL } from '@/components/shared';
import DesktopWrapper from '@/components/shared_ui/desktop-wrapper';
import Dialog from '@/components/shared_ui/dialog';
import MobileWrapper from '@/components/shared_ui/mobile-wrapper';
import Tabs from '@/components/shared_ui/tabs/tabs';
import TradingViewModal from '@/components/trading-view-chart/trading-view-modal';
import { DBOT_TABS, TAB_IDS } from '@/constants/bot-contents';
import { api_base, updateWorkspaceName } from '@/external/bot-skeleton';
import { CONNECTION_STATUS } from '@/external/bot-skeleton/services/api/observables/connection-status-stream';
import { isDbotRTL } from '@/external/bot-skeleton/utils/workspace';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import useTMB from '@/hooks/useTMB';
import {
    LabelPairedChartLineCaptionRegularIcon,
    LabelPairedLightbulbCaptionRegularIcon,
    LabelPairedObjectsColumnCaptionRegularIcon,
    LabelPairedPuzzlePieceTwoCaptionBoldIcon,
    LabelPairedSignalCaptionRegularIcon,
} from '@deriv/quill-icons/LabelPaired';
import { Localize, localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import RunPanel from '../../components/run-panel';
import ChartModal from '../chart/chart-modal';
import Dashboard from '../dashboard';
import RunStrategy from '../dashboard/run-strategy';
import './main.scss';

const ChartWrapper = lazy(() => import('../chart/chart-wrapper'));

// const Bots = lazy(() => import('../bots'));
const SignalsTab = lazy(() => import('../signals/signals-tab'));
const FreeBotsTab = lazy(() => import('../free-bots/free-bots-tab'));
const EasyTool = lazy(() => import('../easy-tool/index'));
const SmartAuto24 = lazy(() => import('../circles-analysis/index'));
const DigitCracker = lazy(() => import('../digit-cracker/index'));
const SignalCentrePage = lazy(() => import('../smart-trading/components/signal-centre-tab'));
const Marketkiller = lazy(() => import('../marketkiller'));
const OverUnderTab = lazy(() => import('../over-under'));
const RiskManagementTab = lazy(() => import('../risk-management'));
const MultiTraderTab = lazy(() => import('../multi-trader'));
// const DTrader = lazy(() => import('../dtrader/index')); // Removed as per request

const AppWrapper = observer(() => {
    const { connectionStatus } = useApiBase();
    const { dashboard, load_modal, run_panel, quick_strategy, summary_card } = useStore();
    const { active_tab, active_tour, setActiveTab, setWebSocketState, setActiveTour, setTourDialogVisibility } =
        dashboard;
    const { dashboard_strategies } = load_modal;
    const {
        is_dialog_open,
        is_drawer_open,
        dialog_options,
        onCancelButtonClick,
        onCloseDialog,
        onOkButtonClick,
        stopBot,
    } = run_panel;
    const { is_open } = quick_strategy;
    const { cancel_button_text, ok_button_text, title, message, dismissable, is_closed_on_cancel } = dialog_options as {
        [key: string]: string;
    };
    const { clear } = summary_card;
    const { DASHBOARD, BOT_BUILDER } = DBOT_TABS;
    const init_render = React.useRef(true);
    const [smart_tools_tab, setSmartToolsTab] = React.useState<'smart_auto' | 'digit_cracker'>('smart_auto');
    const hash = [
        'dashboard',
        'bot_builder',
        'chart',
        'easy_tool',
        'free_bots',
        'signals',
        'signal_centre',
        'pro_tool',
        'smart_auto',
        'marketkiller',
        'over_under',
        'risk_management',
    ];
    const { isDesktop } = useDevice();
    const location = useLocation();
    const navigate = useNavigate();
    const [left_tab_shadow, setLeftTabShadow] = useState<boolean>(false);
    const [right_tab_shadow, setRightTabShadow] = useState<boolean>(false);

    let tab_value: number | string = active_tab;
    const GetHashedValue = (tab: number) => {
        tab_value = location.hash?.split('#')[1];
        if (!tab_value) return tab;
        return Number(hash.indexOf(String(tab_value)));
    };
    const active_hash_tab = GetHashedValue(active_tab);

    const { onRenderTMBCheck, isTmbEnabled } = useTMB();

    const historyShim = {
        replace: (path: string) => navigate(path, { replace: true }),
        location,
    };

    React.useEffect(() => {
        const el_dashboard = document.getElementById('id-dbot-dashboard');
        const el_smart_auto = document.getElementById('id-smart-auto');

        const observer_dashboard = new window.IntersectionObserver(
            ([entry]) => {
                setLeftTabShadow(!entry.isIntersecting);
            },
            { threshold: 0.5 }
        );

        const observer_smart_auto = new window.IntersectionObserver(
            ([entry]) => {
                setRightTabShadow(!entry.isIntersecting);
            },
            { threshold: 0.5 }
        );

        if (el_dashboard) observer_dashboard.observe(el_dashboard);
        if (el_smart_auto) observer_smart_auto.observe(el_smart_auto);

        return () => {
            observer_dashboard.disconnect();
            observer_smart_auto.disconnect();
        };
    }, [setLeftTabShadow, setRightTabShadow]);

    React.useEffect(() => {
        if (connectionStatus !== CONNECTION_STATUS.OPENED) {
            const is_bot_running = document.getElementById('db-animation__stop-button') !== null;
            if (is_bot_running) {
                clear();
                stopBot();
                api_base.setIsRunning(false);
                setWebSocketState(false);
            }
        }
    }, [clear, connectionStatus, setWebSocketState, stopBot]);

    // Update tab shadows height to match bot builder height
    const updateTabShadowsHeight = () => {
        const botBuilderEl = document.getElementById('id-bot-builder');
        const leftShadow = document.querySelector('.tabs-shadow--left') as HTMLElement;
        const rightShadow = document.querySelector('.tabs-shadow--right') as HTMLElement;

        if (botBuilderEl && leftShadow && rightShadow) {
            const height = botBuilderEl.offsetHeight;
            leftShadow.style.height = `${height}px`;
            rightShadow.style.height = `${height}px`;
        }
    };

    React.useEffect(() => {
        // Run on mount and when active tab changes
        updateTabShadowsHeight();

        if (is_open) {
            setTourDialogVisibility(false);
        }

        if (init_render.current) {
            setActiveTab(Number(active_hash_tab));
            if (!isDesktop) handleTabChange(Number(active_hash_tab));
            init_render.current = false;
        } else {
            navigate(`#${hash[active_tab] || hash[0]}`);
        }
        if (active_tour !== '') {
            setActiveTour('');
        }

        // Prevent scrolling when tutorial tab is active (only on mobile)
        const mainElement = document.querySelector('.main__container');

        document.body.style.overflow = '';
        if (mainElement instanceof HTMLElement) {
            mainElement.classList.remove('no-scroll');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active_tab]);

    React.useEffect(() => {
        const trashcan_init_id = setTimeout(() => {
            if (
                active_tab === BOT_BUILDER &&
                (
                    Blockly as typeof Blockly & {
                        derivWorkspace?: { trashcan?: { setTrashcanPosition: (x: number, y: number) => void } };
                    }
                )?.derivWorkspace?.trashcan
            ) {
                const trashcanY = window.innerHeight - 250;
                let trashcanX;
                if (is_drawer_open) {
                    trashcanX = isDbotRTL() ? 380 : window.innerWidth - 460;
                } else {
                    trashcanX = isDbotRTL() ? 20 : window.innerWidth - 100;
                }
                (
                    Blockly as typeof Blockly & {
                        derivWorkspace?: { trashcan?: { setTrashcanPosition: (x: number, y: number) => void } };
                    }
                )?.derivWorkspace?.trashcan?.setTrashcanPosition(trashcanX, trashcanY);
            }
        }, 100);

        return () => {
            clearTimeout(trashcan_init_id); // Clear the timeout on unmount
        };
        //eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active_tab, is_drawer_open]);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (dashboard_strategies.length > 0) {
            // Needed to pass this to the Callback Queue as on tab changes
            // document title getting override by 'Bot | Deriv' only
            timer = setTimeout(() => {
                updateWorkspaceName();
            });
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [dashboard_strategies, active_tab]);

    const handleTabChange = React.useCallback(
        (tab_index: number) => {
            setActiveTab(tab_index);
            const el_id = TAB_IDS[tab_index];
            if (el_id) {
                const el_tab = document.getElementById(el_id);
                setTimeout(() => {
                    el_tab?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                }, 10);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [active_tab]
    );

    const handleLoginGeneration = async () => {
        try {
            // Check TMB status first
            const tmbEnabled = await isTmbEnabled();
            if (tmbEnabled) {
                await onRenderTMBCheck();
            } else {
                window.location.assign(await generateOAuthURL());
            }
        } catch (error) {
            console.error('Login generation error:', error);
        }
    };
    return (
        <React.Fragment>
            <div
                className={classNames('main', {
                    'main--bot-builder': active_tab === BOT_BUILDER,
                })}
            >
                <div
                    className={classNames('main__container', {
                        'main__container--active': active_tour && active_tab === DASHBOARD && !isDesktop,
                        'main__container--bot-builder': active_tab === BOT_BUILDER,
                    })}
                >
                    <div>
                        {!isDesktop && left_tab_shadow && <span className='tabs-shadow tabs-shadow--left' />}{' '}
                        <Tabs
                            active_index={active_tab}
                            className='main__tabs'
                            onTabItemClick={handleTabChange}
                            top
                            history={historyShim as unknown as React.ComponentProps<typeof Tabs>['history']}
                            is_scrollable
                        >
                            <div
                                label={
                                    <div className='main__tabs-label'>
                                        <LabelPairedObjectsColumnCaptionRegularIcon
                                            height='20px'
                                            width='20px'
                                            fill='var(--text-general)'
                                        />
                                        <Localize i18n_default_text='Dashboard' />
                                    </div>
                                }
                                id='id-dbot-dashboard'
                            >
                                <Dashboard handleTabChange={handleTabChange} />
                            </div>
                            <div
                                label={
                                    <div className='main__tabs-label'>
                                        <LabelPairedPuzzlePieceTwoCaptionBoldIcon
                                            height='20px'
                                            width='20px'
                                            fill='var(--text-general)'
                                        />
                                        <Localize i18n_default_text='Bot Builder' />
                                    </div>
                                }
                                id='id-bot-builder'
                            >
                                <div id='dbot-workspace-placeholder' />
                            </div>
                            <div
                                label={
                                    <div className='main__tabs-label'>
                                        <LabelPairedChartLineCaptionRegularIcon
                                            height='20px'
                                            width='20px'
                                            fill='var(--text-general)'
                                        />
                                        <Localize i18n_default_text='Charts' />
                                    </div>
                                }
                                id='id-charts'
                            >
                                <Suspense
                                    fallback={<ChunkLoader message={localize('Please wait, loading chart...')} />}
                                >
                                    <ChartWrapper show_digits_stats={false} />
                                </Suspense>
                            </div>
                            <div
                                label={
                                    <div className='main__tabs-label'>
                                        <LabelPairedLightbulbCaptionRegularIcon
                                            height='20px'
                                            width='20px'
                                            fill='var(--text-general)'
                                        />
                                        <Localize i18n_default_text='Easy Tool' />
                                    </div>
                                }
                                id='id-easy-tool'
                            >
                                <PageContentWrapper>
                                    <Suspense fallback={<ChunkLoader message={localize('Loading Easy Tool...')} />}>
                                        <EasyTool />
                                    </Suspense>
                                </PageContentWrapper>
                            </div>
                            <div
                                label={
                                    <div className='main__tabs-label'>
                                        <LabelPairedLightbulbCaptionRegularIcon
                                            height='20px'
                                            width='20px'
                                            fill='var(--text-general)'
                                        />
                                        <Localize i18n_default_text='Free Bots' />
                                    </div>
                                }
                                id='id-free-bots'
                            >
                                <PageContentWrapper>
                                    <Suspense fallback={<ChunkLoader message={localize('Loading...')} />}>
                                        <FreeBotsTab />
                                    </Suspense>
                                </PageContentWrapper>
                            </div>
                            <div
                                label={
                                    <div className='main__tabs-label'>
                                        <LabelPairedSignalCaptionRegularIcon
                                            height='20px'
                                            width='20px'
                                            fill='var(--text-general)'
                                        />
                                        <Localize i18n_default_text='AI Predictions' />
                                    </div>
                                }
                                id='id-signals'
                            >
                                <PageContentWrapper>
                                    <Suspense fallback={<ChunkLoader message={localize('Loading Signals...')} />}>
                                        <SignalsTab />
                                    </Suspense>
                                </PageContentWrapper>
                            </div>
                            <div
                                label={
                                    <div className='main__tabs-label'>
                                        <LabelPairedObjectsColumnCaptionRegularIcon
                                            height='20px'
                                            width='20px'
                                            fill='var(--text-general)'
                                        />
                                        <Localize i18n_default_text='Market Scanner' />
                                    </div>
                                }
                                id='id-signal-centre'
                            >
                                <PageContentWrapper>
                                    <Suspense fallback={<ChunkLoader message={localize('Loading Signal Centre...')} />}>
                                        <SignalCentrePage />
                                    </Suspense>
                                </PageContentWrapper>
                            </div>

                            {/* Smart Tools: SmartAuto + DigitCracker combined */}
                            <div
                                label={
                                    <div className='main__tabs-label'>
                                        <LabelPairedLightbulbCaptionRegularIcon
                                            height='20px'
                                            width='20px'
                                            fill='var(--text-general)'
                                        />
                                        <Localize i18n_default_text='Smart Tools' />
                                    </div>
                                }
                                id='id-smart-auto'
                            >
                                <PageContentWrapper>
                                    {/* Smart Tools Sub-Tab Switcher */}
                                    <div className='smart-tools-nav'>
                                        <button
                                            className={`smart-tools-nav__btn smart-tools-nav__btn--auto ${smart_tools_tab === 'smart_auto' ? 'smart-tools-nav__btn--active' : ''}`}
                                            onClick={() => setSmartToolsTab('smart_auto')}
                                        >
                                            <span className='smart-tools-nav__icon'>⚡</span>
                                            <span className='smart-tools-nav__label'>Smart Auto</span>
                                        </button>
                                        <button
                                            className={`smart-tools-nav__btn smart-tools-nav__btn--cracker ${smart_tools_tab === 'digit_cracker' ? 'smart-tools-nav__btn--active' : ''}`}
                                            onClick={() => setSmartToolsTab('digit_cracker')}
                                        >
                                            <span className='smart-tools-nav__icon'>🔬</span>
                                            <span className='smart-tools-nav__label'>Digit Cracker</span>
                                        </button>
                                    </div>
                                    <div
                                        className={`smart-tools-content ${smart_tools_tab === 'smart_auto' ? 'smart-tools-content--visible' : 'smart-tools-content--hidden'}`}
                                    >
                                        <Suspense
                                            fallback={<ChunkLoader message={localize('Loading Smart Auto...')} />}
                                        >
                                            <SmartAuto24 />
                                        </Suspense>
                                    </div>
                                    <div
                                        className={`smart-tools-content ${smart_tools_tab === 'digit_cracker' ? 'smart-tools-content--visible' : 'smart-tools-content--hidden'}`}
                                    >
                                        <Suspense
                                            fallback={<ChunkLoader message={localize('Loading Digit Cracker...')} />}
                                        >
                                            <DigitCracker />
                                        </Suspense>
                                    </div>
                                </PageContentWrapper>
                            </div>
                            {/* Smart Tools: SmartAuto + DigitCracker combined */}

                            <div
                                label={
                                    <div className='main__tabs-label'>
                                        <LabelPairedLightbulbCaptionRegularIcon
                                            height='20px'
                                            width='20px'
                                            fill='var(--text-general)'
                                        />
                                        <Localize i18n_default_text='Marketkiller' />
                                    </div>
                                }
                                id='id-marketkiller'
                            >
                                <PageContentWrapper>
                                    <Suspense fallback={<ChunkLoader message={localize('Loading Marketkiller...')} />}>
                                        <Marketkiller />
                                    </Suspense>
                                </PageContentWrapper>
                            </div>

                            <div
                                label={
                                    <div className='main__tabs-label'>
                                        <LabelPairedLightbulbCaptionRegularIcon
                                            height='20px'
                                            width='20px'
                                            fill='var(--text-general)'
                                        />
                                        <Localize i18n_default_text='Over/Under Analysis' />
                                    </div>
                                }
                                id='id-over-under'
                            >
                                <PageContentWrapper>
                                    <Suspense fallback={<ChunkLoader message={localize('Loading Over/Under Analysis...')} />}>
                                        <OverUnderTab />
                                    </Suspense>
                                </PageContentWrapper>
                            </div>

                            <div
                                label={
                                    <div className='main__tabs-label'>
                                        <LabelPairedLightbulbCaptionRegularIcon
                                            height='20px'
                                            width='20px'
                                            fill='var(--text-general)'
                                        />
                                        <Localize i18n_default_text='Risk Management' />
                                    </div>
                                }
                                id='id-risk-management'
                            >
                                <PageContentWrapper>
                                    <Suspense fallback={<ChunkLoader message={localize('Loading Risk Management...')} />}>
                                        <RiskManagementTab />
                                    </Suspense>
                                </PageContentWrapper>
                            </div>

                            <div
                                label={
                                    <div className='main__tabs-label'>
                                        <LabelPairedObjectsColumnCaptionRegularIcon
                                            height='20px'
                                            width='20px'
                                            fill='var(--text-general)'
                                        />
                                        <Localize i18n_default_text='Multi Trader' />
                                    </div>
                                }
                                id='id-multi-trader'
                            >
                                <PageContentWrapper>
                                    <Suspense fallback={<ChunkLoader message={localize('Loading Multi Trader...')} />}>
                                        <MultiTraderTab />
                                    </Suspense>
                                </PageContentWrapper>
                            </div>
                        </Tabs>
                        {!isDesktop && right_tab_shadow && <span className='tabs-shadow tabs-shadow--right' />}{' '}
                    </div>
                </div>
            </div>
            <DesktopWrapper>
                <div className='main__run-strategy-wrapper'>
                    <RunStrategy />
                    <RunPanel />
                </div>
                <ChartModal />
                <TradingViewModal />
            </DesktopWrapper>
            <MobileWrapper>{!is_open && <RunPanel />}</MobileWrapper>
            <Dialog
                cancel_button_text={cancel_button_text || localize('Cancel')}
                className='dc-dialog__wrapper--fixed'
                confirm_button_text={ok_button_text || localize('Ok')}
                has_close_icon
                is_mobile_full_width={false}
                is_visible={is_dialog_open}
                onCancel={onCancelButtonClick || undefined}
                onClose={onCloseDialog || undefined}
                onConfirm={onOkButtonClick || onCloseDialog || (() => {})}
                portal_element_id='modal_root'
                title={title}
                login={handleLoginGeneration}
                dismissable={!!dismissable} // Prevents closing on outside clicks
                is_closed_on_cancel={!!is_closed_on_cancel}
            >
                {message}
            </Dialog>
        </React.Fragment>
    );
});

export default AppWrapper;
