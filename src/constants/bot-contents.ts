type TTabsTitle = {
    [key: string]: string | number;
};

type TDashboardTabIndex = {
    [key: string]: number;
};

export const tabs_title: TTabsTitle = Object.freeze({
    WORKSPACE: 'Workspace',
    CHART: 'Chart',
});

export const DBOT_TABS: TDashboardTabIndex = Object.freeze({
    DASHBOARD: 0,
    BOT_BUILDER: 1,
    CHART: 2,
    EASY_TOOL: 3,
    FREE_BOTS: 4,
    SIGNALS: 5,
    SIGNAL_CENTRE: 6,
    PRO_TOOL: 7,
    SMART_AUTO24: 8,
    MARKETKILLER: 9,
    RISK_MANAGEMENT: 10,
    MULTI_TRADER: 11,
});

export const MAX_STRATEGIES = 10;

export const TAB_IDS = [
    'id-dbot-dashboard',
    'id-bot-builder',
    'id-charts',
    'id-easy-tool',
    'id-free-bots',
    'id-signals',
    'id-signal-centre',
    'id-pro-tool',
    'id-smart-auto',
    'id-marketkiller',
    'id-risk-management',
    'id-multi-trader',
];

export const DEBOUNCE_INTERVAL_TIME = 500;
