import React, { useEffect, useRef } from 'react';
import './ultra-console.scss';

interface UltraConsoleProps {
    logs: Array<{ timestamp: number; message: string; type: 'info' | 'success' | 'error' }>;
}

const UltraConsole: React.FC<UltraConsoleProps> = ({ logs }) => {
    const consoleRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Auto-scroll to bottom when new logs arrive
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [logs]);

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3,
        });
    };

    const getIcon = (type: 'info' | 'success' | 'error') => {
        switch (type) {
            case 'success':
                return '✓';
            case 'error':
                return '✗';
            default:
                return '›';
        }
    };

    return (
        <div className='ultra-console' ref={consoleRef}>
            {logs.length === 0 ? (
                <div className='console-empty'>
                    <span className='empty-icon'>💻</span>
                    <p>Ultra Console Ready. Waiting for execution...</p>
                </div>
            ) : (
                logs.map((log, index) => (
                    <div key={index} className={`console-log console-log-${log.type}`}>
                        <span className='log-time'>[{formatTime(log.timestamp)}]</span>
                        <span className='log-icon'>{getIcon(log.type)}</span>
                        <span className='log-message'>{log.message}</span>
                    </div>
                ))
            )}
        </div>
    );
};

export default UltraConsole;
