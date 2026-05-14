import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import ToggleSwitch from '@/components/shared_ui/toggle-switch';
import { useStore } from '@/hooks/useStore';
import './turbo-exec-bot-tab.scss';

const TurboExecBotTab = observer(() => {
    const { smart_trading } = useStore();
    const {
        is_turbo_bot_running,
        turbo_bot_state,
        turbo_settings,
        turbo_cooldown_ticks,
        turbo_last_signal,
        v_sense_signals,
        wins,
        losses,
        session_pl,
        is_connected,
    } = smart_trading;

    const total_trades = wins + losses;
    const win_rate = total_trades > 0 ? (wins / total_trades) * 100 : 0;

    const handleToggleBulk = () => {
        smart_trading.turbo_settings = {
            ...turbo_settings,
            is_bulk_enabled: !turbo_settings.is_bulk_enabled,
        };
    };

    const handleRiskChange = (risk: number) => {
        smart_trading.turbo_settings = {
            ...turbo_settings,
            max_risk: risk,
        };
    };

    const getStateIcon = () => {
        switch (turbo_bot_state) {
            case 'STOPPED':
                return '📡';
            case 'LISTENING':
                return '🎧';
            case 'SETUP':
                return '⚙️';
            case 'EXECUTING':
                return '🔥';
            case 'COOLDOWN':
                return '⏳';
            default:
                return '🛰️';
        }
    };

    return (
        <div className='turbo-exec-bot-tab'>
            {/* Mission Header */}
            <div className='card status-mission-header'>
                <div className='state-monitor'>
                    <div className={classNames('status-indicator', turbo_bot_state)}>{getStateIcon()}</div>
                    <div className='state-text'>
                        <div className='label'>Mission Status</div>
                        <div className='value'>
                            {turbo_bot_state === 'COOLDOWN' ? `COOLDOWN (${turbo_cooldown_ticks}t)` : turbo_bot_state}
                        </div>
                    </div>
                </div>

                <div className='main-controls'>
                    <button
                        className={classNames('btn-mission', is_turbo_bot_running ? 'stop' : 'start')}
                        onClick={smart_trading.toggleTurboBot}
                        disabled={!is_connected}
                    >
                        {is_turbo_bot_running ? (
                            <>
                                <span>⏹</span> ABORT MISSION
                            </>
                        ) : (
                            <>
                                <span>🚀</span> INITIATE TURBO
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className='bot-layout-grid'>
                {/* Left: Intelligence Board */}
                <div className='card intelligence-board'>
                    <div className='intel-header'>
                        <h3>Intelligence Board</h3>
                        <span className='v-sense-tag'>V-SENSE™ ENABLED</span>
                    </div>

                    <div className='signal-scooter'>
                        <div className='last-event'>LAST TRIGGER EVENT</div>
                        <div className='event-value'>{turbo_last_signal || 'Waiting for setup...'}</div>
                    </div>

                    <div className='signal-grid'>
                        {v_sense_signals.map((signal, idx) => (
                            <div key={idx} className='intel-stat'>
                                <div className='label'>
                                    {signal.strategy} {signal.targetSide || signal.targetDigit}
                                </div>
                                <div className={classNames('value', signal.status)}>
                                    {signal.status} ({signal.confidence}%)
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Settings & Performance */}
                <div className='settings-sidebar'>
                    <div className='card'>
                        <div className='setting-group'>
                            <label>Execution Mode</label>
                            <div className='toggle-row'>
                                <span>Bulk Burst Mode</span>
                                <ToggleSwitch
                                    id='turbo_bulk'
                                    is_enabled={turbo_settings.is_bulk_enabled}
                                    handleToggle={handleToggleBulk}
                                />
                            </div>
                        </div>

                        <div className='setting-group'>
                            <label>Max Account Risk (%)</label>
                            <div className='risk-selector'>
                                <button
                                    className={classNames('risk-btn', { active: turbo_settings.max_risk === 0.02 })}
                                    onClick={() => handleRiskChange(0.02)}
                                >
                                    SAFE (2%)
                                </button>
                                <button
                                    className={classNames('risk-btn', { active: turbo_settings.max_risk === 0.05 })}
                                    onClick={() => handleRiskChange(0.05)}
                                >
                                    TURBO (5%)
                                </button>
                            </div>
                        </div>

                        <hr
                            style={{
                                border: 'none',
                                borderTop: '1px solid rgba(255,255,255,0.05)',
                                margin: '1.5rem 0',
                            }}
                        />

                        <div className='performance-summary'>
                            <h4>Performance Scan</h4>
                            <div className='metric-row'>
                                <span>Total Revenue</span>
                                <span className={classNames('val', session_pl >= 0 ? 'profit' : 'loss')}>
                                    {session_pl >= 0 ? '+' : ''}${session_pl.toFixed(2)}
                                </span>
                            </div>
                            <div className='metric-row'>
                                <span>Win Rate</span>
                                <span className='val'>{win_rate.toFixed(1)}%</span>
                            </div>
                            <div className='metric-row'>
                                <span>Trade Count</span>
                                <span className='val'>{total_trades}</span>
                            </div>
                        </div>
                    </div>

                    <div
                        className='card'
                        style={{
                            padding: '1rem',
                            background: 'rgba(239, 68, 68, 0.05)',
                            borderColor: 'rgba(239, 68, 68, 0.2)',
                        }}
                    >
                        <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 600 }}>
                            ⚠️ SAFETY PROTOCOL ACTIVE
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                            Bot will automatically terminate if a loss is detected.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default TurboExecBotTab;
