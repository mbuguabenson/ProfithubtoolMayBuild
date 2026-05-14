import React, { useState } from 'react';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import {
    LabelPairedArrowsRotateMdRegularIcon,
    LabelPairedPlayMdFillIcon,
    LabelPairedSquareMdFillIcon,
} from '@deriv/quill-icons/LabelPaired';
import './trading-engine.scss';

const TradingEngine = observer(() => {
    const { smart_auto, analysis } = useStore();
    const [activeTab, setActiveTab] = useState<
        'even_odd' | 'over_under' | 'differs' | 'matches' | 'smart_auto_24' | 'rise_fall'
    >('even_odd');

    const { bot_status, is_executing, session_profit, total_profit, logs } = smart_auto;
    const logRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [logs.length]);

    const renderBotControls = (
        botType: 'even_odd' | 'over_under' | 'differs' | 'matches' | 'smart_auto_24' | 'rise_fall'
    ) => {
        const config = (smart_auto as any)[`${botType}_config` || 'over_under_config'];

        return (
            <div className='trading-engine-console'>
                <div className='console-header'>
                    <h3>COMMAND CENTER</h3>
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                        {['even_odd', 'differs', 'matches', 'over_under', 'rise_fall'].map(t => (
                            <button
                                key={t}
                                onClick={() => setActiveTab(t as any)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '10px',
                                    fontWeight: '800',
                                    border: 'none',
                                    background: activeTab === t ? '#06b6d4' : 'rgba(255,255,255,0.05)',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {t.replace('_', ' ').toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                <div className='stats-grid'>
                    <div className='stat-mini-card'>
                        <span className='label'>SESSION PROFIT</span>
                        <span className={`value ${session_profit >= 0 ? 'win' : 'loss'}`}>
                            ${session_profit.toFixed(2)}
                        </span>
                    </div>
                    <div className='stat-mini-card'>
                        <span className='label'>WIN RATE</span>
                        <span className='value' style={{ color: '#06b6d4' }}>
                            {(() => {
                                const total = logs.filter(l => l.type === 'success' || l.type === 'error').length;
                                const wins = logs.filter(l => l.type === 'success').length;
                                return total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
                            })()}
                            %
                        </span>
                    </div>
                </div>

                <div className='controls-stack'>
                    <div className='control-group'>
                        <label>STAKE AMOUNT</label>
                        <input
                            type='number'
                            step='0.01'
                            value={config.stake}
                            onChange={e => smart_auto.updateConfig(botType, 'stake', parseFloat(e.target.value))}
                        />
                    </div>
                    <div className='control-group'>
                        <label>MAX STAKE (SAFETY)</label>
                        <input
                            type='number'
                            step='0.01'
                            value={config.max_stake || 10}
                            onChange={e => smart_auto.updateConfig(botType, 'max_stake', parseFloat(e.target.value))}
                        />
                    </div>
                    <div className='control-group'>
                        <label>STOP LOSS ($)</label>
                        <input
                            type='number'
                            step='0.01'
                            value={config.max_loss}
                            onChange={e => smart_auto.updateConfig(botType, 'max_loss', parseFloat(e.target.value))}
                        />
                    </div>
                    {(botType === 'over_under' || botType === 'differs' || botType === 'matches') && (
                        <div className='control-group'>
                            <label>PREDICTION (0-9)</label>
                            <input
                                type='number'
                                value={config.prediction}
                                onChange={e => smart_auto.updateConfig(botType, 'prediction', parseInt(e.target.value))}
                            />
                        </div>
                    )}
                </div>

                <div className='action-row'>
                    <button
                        className={`btn-start ${config.is_running && config.is_auto ? 'active' : ''}`}
                        onClick={() => smart_auto.toggleBot(botType, 'auto')}
                        style={config.is_running && config.is_auto ? { background: '#f43f5e' } : {}}
                    >
                        {config.is_running && config.is_auto ? 'TERMINATE AUTO' : 'INITIALIZE AUTO'}
                    </button>
                    <button
                        onClick={() => smart_auto.toggleBot(botType, 'manual')}
                        disabled={is_executing}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff',
                            padding: '12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '700',
                        }}
                    >
                        EXECUTE SINGLE TRADE
                    </button>
                </div>

                <div
                    className='activity-log-wrapper'
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '200px' }}
                >
                    <div
                        className='log-header'
                        style={{ fontSize: '10px', fontWeight: '800', opacity: 0.4, textTransform: 'uppercase' }}
                    >
                        Live Telemetry
                    </div>
                    <div
                        className='log-content'
                        ref={logRef}
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '12px',
                            padding: '12px',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                        }}
                    >
                        {logs.map((log, i) => (
                            <div
                                key={i}
                                className={`log-entry ${log.type}`}
                                style={{ padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}
                            >
                                <span style={{ opacity: 0.3 }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                                {log.message}
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    className='reset-btn'
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,0.2)',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        marginTop: 'auto',
                    }}
                    onClick={() => {
                        runInAction(() => {
                            smart_auto.session_profit = 0;
                            smart_auto.clearLogs();
                        });
                    }}
                >
                    RESET SESSION DATA
                </button>
            </div>
        );
    };

    return renderBotControls(activeTab);
});

export default TradingEngine;
