import React, { useState } from 'react';

const SystemLogs = () => {
    const [logs, setLogs] = useState<Array<{ time: string; level: string; message: string }>>([
        { time: new Date().toLocaleTimeString(), level: 'info', message: 'System initialized' },
        { time: new Date().toLocaleTimeString(), level: 'info', message: 'Connected to WebSocket' },
    ]);

    // Mock log generation disabled to avoid confusion with real system logs
    // Users can monitor actual console logs in browser DevTools

    return (
        <div className='system-logs-section'>
            <div className='settings-card'>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem',
                    }}
                >
                    <h3>System Logs</h3>
                    <button
                        onClick={() => setLogs([])}
                        style={{
                            padding: '0.5rem 1rem',
                            border: 'none',
                            borderRadius: '4px',
                            background: 'rgba(255,255,255,0.1)',
                            color: 'white',
                            cursor: 'pointer',
                        }}
                    >
                        Clear Logs
                    </button>
                </div>

                <div
                    style={{
                        background: 'rgba(0,0,0,0.3)',
                        padding: '1rem',
                        borderRadius: '8px',
                        height: '400px',
                        overflowY: 'auto',
                    }}
                >
                    {logs.map((log, index) => (
                        <div key={index} className={`log-entry ${log.level}`}>
                            <span style={{ opacity: 0.6 }}>[{log.time}]</span>{' '}
                            <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{log.level}:</span>{' '}
                            {log.message}
                        </div>
                    ))}
                    {logs.length === 0 && <div className='log-entry info'>No logs to display</div>}
                </div>
            </div>
        </div>
    );
};

export default SystemLogs;
