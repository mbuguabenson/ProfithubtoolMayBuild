import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import AdvancedOverUnderTab from '../smart-trading/components/advanced-over-under-tab';
import DiffersTab from '../smart-trading/components/differs-tab';
import EvenOddAnalysis from '../smart-trading/components/even-odd-analysis';
import MatchesTab from '../smart-trading/components/matches-tab';
import OverUnderAnalysis from '../smart-trading/components/over-under-analysis';
import './analysis-tool.scss';

type TAnalysisSubTab = 'even_odd' | 'over_under' | 'adv_over_under' | 'differs' | 'matches';

const AnalysisTool = observer(() => {
    const [active_subtab, setActiveSubtab] = useState<TAnalysisSubTab>('even_odd');

    const renderActiveTab = () => {
        switch (active_subtab) {
            case 'even_odd':
                return <EvenOddAnalysis />;
            case 'over_under':
                return <OverUnderAnalysis />;
            case 'adv_over_under':
                return <AdvancedOverUnderTab />;
            case 'differs':
                return <DiffersTab />;
            case 'matches':
                return <MatchesTab />;
            default:
                return <EvenOddAnalysis />;
        }
    };

    return (
        <div className='analysis-tool'>
            <div className='analysis-tool__header'>
                <h2>Analysis Tool</h2>
                <p>Advanced market analysis strategies for digit trading</p>
            </div>

            <div className='analysis-tool__tabs'>
                <button
                    className={active_subtab === 'even_odd' ? 'active' : ''}
                    onClick={() => setActiveSubtab('even_odd')}
                >
                    Even/Odd
                </button>
                <button
                    className={active_subtab === 'over_under' ? 'active' : ''}
                    onClick={() => setActiveSubtab('over_under')}
                >
                    Over/Under
                </button>
                <button
                    className={active_subtab === 'adv_over_under' ? 'active' : ''}
                    onClick={() => setActiveSubtab('adv_over_under')}
                >
                    Advanced Over/Under
                </button>
                <button
                    className={active_subtab === 'differs' ? 'active' : ''}
                    onClick={() => setActiveSubtab('differs')}
                >
                    Differs
                </button>
                <button
                    className={active_subtab === 'matches' ? 'active' : ''}
                    onClick={() => setActiveSubtab('matches')}
                >
                    Matches
                </button>
            </div>

            <div className='analysis-tool__content'>{renderActiveTab()}</div>
        </div>
    );
});

export default AnalysisTool;
