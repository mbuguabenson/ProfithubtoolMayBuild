import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import TickSelector from '@/components/tick-selector/tick-selector';
import chart_api from '@/external/bot-skeleton/services/api/chart-api';
import { useStore } from '@/hooks/useStore';
import DigitDistributionCircles from '@/pages/chart/digit-distribution-circles';
import MarketSelector from '@/pages/smart-trading/components/market-selector';
import { Localize } from '@deriv-com/translations';
import AdvancedOUAnalyzer from './advanced-ou-analyzer';
import EvenOddPattern from './even-odd-pattern';
import MatchesDiffersAnalyzer from './matches-differs-analyzer';
import OverUnderPattern from './over-under-pattern';
import './easy-tool.scss';

const DIGIT_COLORS: Record<number, string> = {
    0: '#f43f5e', // Rose
    1: '#3b82f6', // Blue
    2: '#06b6d4', // Cyan
    3: '#d946ef', // Fuchsia
    4: '#10b981', // Emerald
    5: '#2563eb', // Indigo Blue
    6: '#e11d48', // Crimson
    7: '#9333ea', // Purple
    8: '#f59e0b', // Amber
    9: '#7c3aed', // Violet
};

const EasyTool = observer(() => {
    const { smart_trading, common, ui } = useStore();
    const { symbol, current_price, last_digit, ticks, stats_sample_size, setStatsSampleSize } = smart_trading;

    const { is_socket_opened } = common;
    const { is_dark_mode_on } = ui;

    const [selected_digit, setSelectedDigit] = useState<number | null>(null);
    const [history_count, setHistoryCount] = useState<15 | 50>(15);

    // Initialize chart API if not already running
    useEffect(() => {
        if (!chart_api?.api) {
            chart_api.init();
        }
    }, []);

    // Ensure we are subscribed to ticks and history via the smart_trading store
    useEffect(() => {
        if (symbol && is_socket_opened && smart_trading.subscribeToActiveSymbol) {
            smart_trading.subscribeToActiveSymbol();
        }
    }, [symbol, is_socket_opened, smart_trading]);

    // Update selected digit when last_digit changes if none selected
    useEffect(() => {
        if (selected_digit === null && last_digit !== undefined && last_digit !== null) {
            setSelectedDigit(last_digit);
        }
    }, [last_digit, selected_digit, setSelectedDigit]);

    return (
        <div className={`easy-tool ${is_dark_mode_on ? 'easy-tool--dark' : 'easy-tool--light'}`}>
            <div className='easy-tool__header'>
                <div className='easy-tool__vitals-row'>
                    <div className='v-item'>
                        <MarketSelector />
                    </div>
                    <div className='v-item'>
                        <span className='v'>{current_price}</span>
                    </div>
                    <div className='v-item'>
                        <span className='v digit'>{last_digit ?? '-'}</span>
                    </div>
                    <div className='v-item'>
                        <TickSelector value={stats_sample_size} onChange={setStatsSampleSize} />
                    </div>
                </div>
            </div>

            <div className='easy-tool__content'>
                {/* 1. Digit Distribution */}
                <div className='easy-tool__section'>
                    <div className='section-card distribution-v2'>
                        <DigitDistributionCircles onSelect={setSelectedDigit} selected_digit={selected_digit} />
                    </div>
                </div>

                {/* 2. Global Digit Selector */}
                <div className='easy-tool__digit-selector-wrapper'>
                    <div className='selector-label'>
                        <Localize i18n_default_text='Select Target Digit' />
                    </div>
                    <div className='digit-bar-v2 large'>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                            <button
                                key={d}
                                className={`digit-btn-v2 ${selected_digit === d ? 'active' : ''} ${last_digit === d ? 'current' : ''}`}
                                onClick={() => setSelectedDigit(d)}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. Analysis Grid (OU & MD side by side) */}
                <div className='easy-tool__analysis-grid'>
                    <div className='section-card analysis-col'>
                        <div className='section-card__header'>
                            <Localize i18n_default_text='Over/Under Analysis' />
                        </div>
                        {selected_digit !== null && (
                            <AdvancedOUAnalyzer selected_digit={selected_digit} ticks={ticks} />
                        )}
                    </div>
                    <div className='section-card analysis-col'>
                        <div className='section-card__header'>
                            <Localize i18n_default_text='Matches/Differs Analysis' />
                        </div>
                        {selected_digit !== null && (
                            <MatchesDiffersAnalyzer selected_digit={selected_digit} ticks={ticks} />
                        )}
                    </div>
                </div>

                {/* 4. Even/Odd Patterns */}
                <div className='easy-tool__section'>
                    <div className='section-card pattern-full'>
                        <EvenOddPattern />
                    </div>
                    <div className='section-card pattern-full'>
                        <OverUnderPattern />
                    </div>
                </div>
            </div>

            {/* 4. Tick Stream - WIDE Bottom */}
            <div className='easy-tool__section'>
                <div className='section-card history-v2-wide'>
                    <div className='section-card__header'>
                        <Localize i18n_default_text='Tick Stream' />
                        <div className='history-toggle'>
                            <button
                                className={history_count === 15 ? 'active' : ''}
                                onClick={() => setHistoryCount(15)}
                            >
                                15
                            </button>
                            <button
                                className={history_count === 50 ? 'active' : ''}
                                onClick={() => setHistoryCount(50)}
                            >
                                50
                            </button>
                        </div>
                    </div>
                    <div className={`history-v2__grid count-${history_count} is-wide`}>
                        {ticks
                            .slice(-history_count)
                            .reverse()
                            .map((digit, index) => (
                                <div
                                    key={index}
                                    className={`h-digit-v2 ${last_digit === digit && index === 0 ? 'is-current' : ''}`}
                                    style={
                                        {
                                            '--digit-color': DIGIT_COLORS[digit],
                                        } as React.CSSProperties
                                    }
                                >
                                    {digit}
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default EasyTool;
