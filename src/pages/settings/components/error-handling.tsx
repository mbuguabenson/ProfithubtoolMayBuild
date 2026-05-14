import React from 'react';

const ErrorHandling = () => {
    return (
        <div className='error-handling-section'>
            <div className='settings-card'>
                <h3>Error Configuration</h3>
                <p>Configure how the application handles various system errors.</p>

                <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input type='checkbox' id='auto-reload' defaultChecked />
                    <label htmlFor='auto-reload'>Auto-reload on critical error</label>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input type='checkbox' id='send-reports' defaultChecked />
                    <label htmlFor='send-reports'>Send anonymous crash reports</label>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input type='checkbox' id='verbose-logging' />
                    <label htmlFor='verbose-logging'>Enable verbose logging</label>
                </div>
            </div>
        </div>
    );
};

export default ErrorHandling;
