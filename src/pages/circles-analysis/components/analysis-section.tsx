import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';

interface AnalysisSectionProps {
    title: string;
    streak: { count: number; type: string };
    history: any[];
    left_label: string;
    left_pct: number;
    right_label: string;
    right_pct: number;
    type: string;
}

const AnalysisSection = observer(
    ({ title, streak, history, left_label, left_pct, right_label, right_pct, type }: AnalysisSectionProps) => {
        const { analysis } = useStore();
        return (
            <div className='analysis-section-card'>
                <div className='section-header'>
                    <h3 className='section-title'>{title}</h3>
                    <div className='streak-info'>
                        Current Streak:{' '}
                        <span className='streak-value'>
                            {streak.count}x {streak.type}
                        </span>
                    </div>
                </div>

                {type !== 'R_F' && (
                    <div className='digit-selector'>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                            <div
                                key={d}
                                className={`digit-box ${
                                    (type === 'M_D' && d === analysis.match_diff_digit) ||
                                    (type === 'U_O' && d === analysis.over_under_threshold)
                                        ? 'selected'
                                        : ''
                                }`}
                                onClick={() => {
                                    if (type === 'M_D') analysis.setMatchDiffDigit(d);
                                    if (type === 'U_O') analysis.setOverUnderThreshold(d);
                                }}
                            >
                                {d}
                            </div>
                        ))}
                    </div>
                )}

                <div className='percentage-bars'>
                    <div className={`bar-container left ${left_pct > right_pct ? 'dominant' : ''}`}>
                        <div className='bar-header'>
                            <span className='label'>{left_label}</span>
                            <span className='value'>{left_pct.toFixed(1)}%</span>
                        </div>
                        <div className='bar-bg'>
                            <div className='bar-fill green' style={{ width: `${left_pct}%` }}></div>
                        </div>
                    </div>
                    <div className={`bar-container right ${right_pct > left_pct ? 'dominant' : ''}`}>
                        <div className='bar-header'>
                            <span className='label'>{right_label}</span>
                            <span className='value'>{right_pct.toFixed(1)}%</span>
                        </div>
                        <div className='bar-bg'>
                            <div className='bar-fill red' style={{ width: `${right_pct}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className='history-list-wrapper'>
                    <div className='history-grid'>
                        {history.slice(0, 48).map((item, i) => (
                            <div
                                key={i}
                                className={`history-item ${item.type}`}
                                style={{ '--item-bg': item.color } as any}
                            >
                                {item.type}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
);

export default AnalysisSection;
