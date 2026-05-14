import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import UltraMomentumGauge from './components/ultra-momentum-gauge';
import UltraAlphaScore from './components/ultra-alpha-score';
import UltraConsole from './components/ultra-console';
import './money-maker-ultra-tab.scss';

const MoneyMakerUltraTab = observer(() => {
    const { smart_trading, common } = useStore();
    const {
        is_money_maker_ultra_running,
        ultra_momentum_mode,
        ultra_heartbeat_count,
        ultra_alpha_score,
        ultra_session_trades,
        ultra_circuit_breaker_active,
        ultra_volatility_sigma,
        ultra_momentum_velocity,
        ultra_console_logs,
        session_pl,
        wins,
        losses,
    } = smart_trading;
    const { latency } = common;

    const handleStart = () => {
        if (ultra_circuit_breaker_active) {
            alert('Circuit Breaker is active. Please wait before resuming.');
            return;
        }
        smart_trading.startMoneyMakerUltra();
    };

    const handleStop = () => {
        smart_trading.stopMoneyMakerUltra();
    };

    const handleStrategyChange = (strategy: 'shadow_scalper' | 'flash_overunder' | 'momentum_pulse') => {
        smart_trading.setUltraMomentumMode(strategy);
    };

    return (
        <div className='money-maker-ultra-tab'>
            {/* Header Section */}
            <div className='ultra-header'>
                <div className='title-section'>
                    <h1 className='ultra-title'>
                        <span className='neon-text'>MONEY MAKER</span>
                        <span className='ultra-badge'>ULTRA</span>
                    </h1>
                    <p className='ultra-subtitle'>High-Frequency Quantum Trading Engine</p>
                </div>

                <div className='heartbeat-indicator'>
                    <div className={`heartbeat-pulse ${is_money_maker_ultra_running ? 'active' : ''}`} />
                    <span className='heartbeat-count'>{ultra_heartbeat_count}</span>
                </div>
            </div>

            {/* Main Control Grid */}
            <div className='ultra-control-grid'>
                {/* Left Panel - Gauges & Metrics */}
                <div className='ultra-panel metrics-panel'>
                    <div className='panel-header'>
                        <h3>System Vitals</h3>
                    </div>

                    <div className='gauges-container'>
                        <UltraMomentumGauge value={ultra_momentum_velocity} />
                        <UltraAlphaScore score={ultra_alpha_score} />
                    </div>

                    <div className='volatility-display'>
                        <div className='metric-card'>
                            <span className='metric-label'>Volatility σ</span>
                            <span className='metric-value neon-cyan'>{ultra_volatility_sigma.toFixed(4)}</span>
                        </div>
                        <div className='metric-card'>
                            <span className='metric-label'>Ping</span>
                            <span className={`metric-value ${latency > 300 ? 'loss' : 'profit'}`}>{latency}ms</span>
                        </div>
                        <div className='metric-card'>
                            <span className='metric-label'>Trades</span>
                            <span className='metric-value'>{ultra_session_trades}</span>
                        </div>
                    </div>
                </div>

                {/* Center Panel - Strategy Selection */}
                <div className='ultra-panel strategy-panel'>
                    <div className='panel-header'>
                        <h3>Ultra Strategies</h3>
                    </div>

                    <div className='strategy-cards'>
                        <div
                            className={`strategy-card ${ultra_momentum_mode === 'shadow_scalper' ? 'active' : ''}`}
                            onClick={() => handleStrategyChange('shadow_scalper')}
                        >
                            <div className='strategy-icon'>👥</div>
                            <div className='strategy-name'>Shadow Scalper</div>
                            <div className='strategy-desc'>Cold Digit Hunter</div>
                        </div>

                        <div
                            className={`strategy-card ${ultra_momentum_mode === 'flash_overunder' ? 'active' : ''}`}
                            onClick={() => handleStrategyChange('flash_overunder')}
                        >
                            <div className='strategy-icon'>⚡</div>
                            <div className='strategy-name'>Flash Over/Under</div>
                            <div className='strategy-desc'>Extreme Clustering</div>
                        </div>

                        <div
                            className={`strategy-card ${ultra_momentum_mode === 'momentum_pulse' ? 'active' : ''}`}
                            onClick={() => handleStrategyChange('momentum_pulse')}
                        >
                            <div className='strategy-icon'>📈</div>
                            <div className='strategy-name'>Momentum Pulse</div>
                            <div className='strategy-desc'>EMA Crossover</div>
                        </div>
                    </div>

                    {/* Control Buttons */}
                    <div className='control-buttons'>
                        {!is_money_maker_ultra_running ? (
                            <button
                                className='ultra-button start-button'
                                onClick={handleStart}
                                disabled={ultra_circuit_breaker_active}
                            >
                                <span className='button-glow' />
                                INITIATE ULTRA
                            </button>
                        ) : (
                            <button className='ultra-button stop-button' onClick={handleStop}>
                                <span className='button-glow' />
                                TERMINATE
                            </button>
                        )}
                    </div>

                    {ultra_circuit_breaker_active && (
                        <div className='circuit-breaker-warning'>
                            <div className='warning-icon'>⚠️</div>
                            <div className='warning-text'>Circuit Breaker Active - Cooling Down</div>
                        </div>
                    )}
                </div>

                {/* Right Panel - Session Stats */}
                <div className='ultra-panel stats-panel'>
                    <div className='panel-header'>
                        <h3>Session Performance</h3>
                    </div>

                    <div className='stats-grid'>
                        <div className='stat-item'>
                            <span className='stat-label'>P/L</span>
                            <span className={`stat-value ${session_pl >= 0 ? 'profit' : 'loss'}`}>
                                ${session_pl.toFixed(2)}
                            </span>
                        </div>
                        <div className='stat-item'>
                            <span className='stat-label'>Wins</span>
                            <span className='stat-value success'>{wins}</span>
                        </div>
                        <div className='stat-item'>
                            <span className='stat-label'>Losses</span>
                            <span className='stat-value danger'>{losses}</span>
                        </div>
                        <div className='stat-item'>
                            <span className='stat-label'>Win Rate</span>
                            <span className='stat-value'>
                                {wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : 0}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ultra Console */}
            <div className='ultra-panel console-panel'>
                <div className='panel-header'>
                    <h3>Ultra Console</h3>
                    <span className='console-badge'>LIVE</span>
                </div>
                <UltraConsole logs={ultra_console_logs} />
            </div>
        </div>
    );
});

export default MoneyMakerUltraTab;
