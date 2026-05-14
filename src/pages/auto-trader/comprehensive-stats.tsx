import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import classNames from 'classnames';

const ComprehensiveStats = observer(() => {
    const { smart_trading } = useStore();
    const { digit_stats } = smart_trading;

    // Calculate Stats directly from digit_stats to ensure sync with the ticks
    const total = digit_stats.reduce((acc, s) => acc + s.count, 0) || 1;
    const even_count = digit_stats.filter(s => s.digit % 2 === 0).reduce((acc, s) => acc + s.count, 0);
    const odd_count = total - even_count;
    const over_count = digit_stats.filter(s => s.digit > 4).reduce((acc, s) => acc + s.count, 0);
    const under_count = total - over_count;

    const even_pct = (even_count / total) * 100;
    const odd_pct = (odd_count / total) * 100;
    const over_pct = (over_count / total) * 100;
    const under_pct = (under_count / total) * 100;

    // Logic Helper
    const getSignalStatus = (primaryPct: number, label: string) => {
        if (primaryPct >= 58) return { status: 'HIGH SIGNAL', color: '#10b981', glow: true, msg: `Trade: ${label}` };
        if (primaryPct >= 55)
            return { status: 'WAITING...', color: '#eab308', glow: false, msg: `Confirming ${label}` };
        return { status: 'ANALYZING', color: '#8b9bb4', glow: false, msg: 'Market Balanced' };
    };

    // Determine dominance for the merged card
    const max_pct = Math.max(even_pct, odd_pct, over_pct, under_pct);
    let overall_glow = false;
    let glow_color = 'transparent';

    if (max_pct >= 55) {
        overall_glow = true;
        if (even_pct === max_pct)
            glow_color = 'rgba(59, 130, 246, 0.5)'; // Blue
        else if (odd_pct === max_pct)
            glow_color = 'rgba(236, 72, 153, 0.5)'; // Pink
        else if (over_pct === max_pct)
            glow_color = 'rgba(244, 63, 94, 0.5)'; // Red
        else if (under_pct === max_pct) glow_color = 'rgba(16, 185, 129, 0.5)'; // Green
    }

    const eo_status =
        even_pct > odd_pct ? getSignalStatus(even_pct, 'DIGITEVEN') : getSignalStatus(odd_pct, 'DIGITODD');
    const ou_status =
        over_pct > under_pct ? getSignalStatus(over_pct, 'DIGITOVER') : getSignalStatus(under_pct, 'DIGITUNDER');

    return (
        <div className='market-stats-premium' style={{ gridTemplateColumns: '1fr', marginTop: '1rem' }}>
            <div
                className={classNames('stat-card-glass', { 'glow-dominant': overall_glow })}
                style={
                    {
                        '--glow-color': glow_color,
                        padding: '1.2rem', // Reduced padding
                        borderRadius: '12px',
                        border: `1px solid ${overall_glow ? glow_color : 'rgba(255,255,255,0.1)'}`,
                    } as React.CSSProperties
                }
            >
                {/* Header for Combined Card - Horizontal */}
                <div
                    className='card-header'
                    style={{
                        marginBottom: '0.8rem',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        paddingBottom: '0.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <span
                        className='title'
                        style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-prominent)' }}
                    >
                        MARKET OVERVIEW
                    </span>
                    {(eo_status.status === 'HIGH SIGNAL' || ou_status.status === 'HIGH SIGNAL') && (
                        <span
                            className='status-badge'
                            style={{
                                color: '#10b981',
                                borderColor: '#10b981',
                                background: 'rgba(16, 185, 129, 0.1)',
                                fontSize: '0.9rem',
                                padding: '0.2rem 0.6rem',
                            }}
                        >
                            ACTION RECOMMENDED
                        </span>
                    )}
                </div>

                {/* Horizontal Layout for Stats */}
                <div className='stats-container-horizontal' style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    {/* Even / Odd Section */}
                    <div className='sub-section' style={{ flex: 1, minWidth: '200px' }}>
                        <div
                            className='card-header'
                            style={{ marginBottom: '0.4rem', justifyContent: 'space-between', display: 'flex' }}
                        >
                            <span className='title' style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)' }}>
                                EVEN / ODD
                            </span>
                            <span
                                className='status-badge'
                                style={{
                                    color: eo_status.color,
                                    borderColor: eo_status.color,
                                    fontSize: '0.9rem',
                                    padding: '0 0.4rem',
                                }}
                            >
                                {eo_status.status}
                            </span>
                        </div>
                        <div className='stat-bars' style={{ gap: '0.4rem' }}>
                            <div className='bar-row' style={{ alignItems: 'center', marginBottom: '4px' }}>
                                <div className='label-group' style={{ minWidth: '40px', fontSize: '1rem' }}>
                                    <span style={{ color: '#3b82f6' }}>E</span>
                                    <span className='val'>{even_pct.toFixed(0)}%</span>
                                </div>
                                <div className='track' style={{ height: '6px' }}>
                                    <div className='fill blue' style={{ width: `${even_pct}%` }} />
                                </div>
                            </div>
                            <div className='bar-row' style={{ alignItems: 'center' }}>
                                <div className='label-group' style={{ minWidth: '40px', fontSize: '1rem' }}>
                                    <span style={{ color: '#ec4899' }}>O</span>
                                    <span className='val'>{odd_pct.toFixed(0)}%</span>
                                </div>
                                <div className='track' style={{ height: '6px' }}>
                                    <div className='fill pink' style={{ width: `${odd_pct}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className='divider-vertical' style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />

                    {/* Over / Under Section */}
                    <div className='sub-section' style={{ flex: 1, minWidth: '200px' }}>
                        <div
                            className='card-header'
                            style={{ marginBottom: '0.4rem', justifyContent: 'space-between', display: 'flex' }}
                        >
                            <span className='title' style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)' }}>
                                OVER / UNDER
                            </span>
                            <span
                                className='status-badge'
                                style={{
                                    color: ou_status.color,
                                    borderColor: ou_status.color,
                                    fontSize: '0.9rem',
                                    padding: '0 0.4rem',
                                }}
                            >
                                {ou_status.status}
                            </span>
                        </div>
                        <div className='stat-bars' style={{ gap: '0.4rem' }}>
                            <div className='bar-row' style={{ alignItems: 'center', marginBottom: '4px' }}>
                                <div className='label-group' style={{ minWidth: '40px', fontSize: '1rem' }}>
                                    <span style={{ color: '#f43f5e' }}>O</span>
                                    <span className='val'>{over_pct.toFixed(0)}%</span>
                                </div>
                                <div className='track' style={{ height: '6px' }}>
                                    <div className='fill red' style={{ width: `${over_pct}%` }} />
                                </div>
                            </div>
                            <div className='bar-row' style={{ alignItems: 'center' }}>
                                <div className='label-group' style={{ minWidth: '40px', fontSize: '1rem' }}>
                                    <span style={{ color: '#10b981' }}>U</span>
                                    <span className='val'>{under_pct.toFixed(0)}%</span>
                                </div>
                                <div className='track' style={{ height: '6px' }}>
                                    <div className='fill green' style={{ width: `${under_pct}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: '0.8rem',
                        fontSize: '0.9rem',
                        color: 'rgba(255,255,255,0.5)',
                    }}
                >
                    <span>{eo_status.msg}</span>
                    <span>{ou_status.msg}</span>
                </div>
            </div>
        </div>
    );
});

export default ComprehensiveStats;
