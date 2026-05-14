import React from 'react';
import './trading-signals-notification.scss';

interface TradingSignal {
    type: 'MATCHES' | 'DIFFERS' | 'EVEN' | 'ODD' | 'OVER' | 'UNDER';
    confidence: number;
    entry: string;
    exit: string;
    stop: string;
    instruction: string;
    digit?: number;
}

interface TradingSignalsNotificationProps {
    signal?: TradingSignal | null;
    isVisible: boolean;
}

const TradingSignalsNotification: React.FC<TradingSignalsNotificationProps> = ({ signal, isVisible }) => {
    if (!isVisible || !signal) return null;

    const getSignalColor = () => {
        if (signal.confidence >= 70) return '#10b981'; // Green
        if (signal.confidence >= 50) return '#f59e0b'; // Orange
        return '#ef4444'; // Red
    };

    const getSignalIcon = () => {
        switch (signal.type) {
            case 'MATCHES':
                return '🎯';
            case 'DIFFERS':
                return '❌';
            case 'EVEN':
                return '⚖️';
            case 'ODD':
                return '🔢';
            case 'OVER':
                return '⬆️';
            case 'UNDER':
                return '⬇️';
            default:
                return '📊';
        }
    };

    return (
        <div className='trading-signals-notification' style={{ borderColor: getSignalColor() }}>
            <div className='signal-header'>
                <span className='signal-icon'>{getSignalIcon()}</span>
                <div className='signal-title'>
                    <h4>{signal.type} Signal Detected</h4>
                    <span className='confidence' style={{ color: getSignalColor() }}>
                        {signal.confidence}% Confidence
                    </span>
                </div>
            </div>

            <div className='signal-body'>
                <div className='signal-instruction'>
                    <span className='label'>📋 Instruction:</span>
                    <span className='value'>{signal.instruction}</span>
                </div>

                {signal.digit !== undefined && (
                    <div className='signal-digit'>
                        <span className='label'>🎲 Target Digit:</span>
                        <span className='digit-value'>{signal.digit}</span>
                    </div>
                )}

                <div className='signal-levels'>
                    <div className='level entry'>
                        <span className='label'>🟢 Entry:</span>
                        <span className='value'>{signal.entry}</span>
                    </div>
                    <div className='level exit'>
                        <span className='label'>🔵 Exit:</span>
                        <span className='value'>{signal.exit}</span>
                    </div>
                    <div className='level stop'>
                        <span className='label'>🔴 Stop:</span>
                        <span className='value'>{signal.stop}</span>
                    </div>
                </div>
            </div>

            <div className='signal-progress-bar'>
                <div
                    className='progress-fill'
                    style={{ width: `${signal.confidence}%`, backgroundColor: getSignalColor() }}
                ></div>
            </div>
        </div>
    );
};

export default TradingSignalsNotification;
