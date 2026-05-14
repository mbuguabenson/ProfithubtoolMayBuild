import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { Localize } from '@deriv-com/translations';
import classNames from 'classnames';

const LastDigits = observer(() => {
    const { smart_trading } = useStore();
    const { ticks, last_digit } = smart_trading;
    // Default to true (Show 50 Digits) as requested
    const [showAll, setShowAll] = useState(true);

    // Get last 50 or last 20 based on toggle
    const displayDigits = showAll ? ticks.slice(-50) : ticks.slice(-20);
    const digitCount = showAll ? 50 : 20;

    return (
        <div className='last-digits-panel' style={{ gap: '1rem' }}>
            <div className='panel-title' style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                <Localize i18n_default_text={`Last ${digitCount} Digits`} />
                {ticks.length > 20 && (
                    <button
                        className='toggle-btn'
                        onClick={() => setShowAll(!showAll)}
                        style={{ fontSize: '1rem', padding: '0.2rem 0.5rem', marginLeft: '1rem' }}
                    >
                        {showAll ? 'Show 20 Digits' : 'Show 50 Digits'}
                    </button>
                )}
            </div>
            <div
                className={classNames('digits-row', { expanded: showAll })}
                style={{
                    flexWrap: 'wrap',
                    gap: '4px',
                    justifyContent: 'flex-start',
                    maxHeight: 'none', // Allow wrapping
                }}
            >
                {displayDigits.map((digit, index) => (
                    <div
                        key={index}
                        className={classNames('digit-box', {
                            even: digit % 2 === 0,
                            odd: digit % 2 !== 0,
                            pulse: index === displayDigits.length - 1, // Highlight latest
                        })}
                        style={{
                            width: '24px',
                            height: '24px',
                            fontSize: '1.1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            background: digit % 2 === 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(236, 72, 153, 0.2)',
                            color: digit % 2 === 0 ? '#60a5fa' : '#f472b6',
                            border: `1px solid ${digit % 2 === 0 ? 'rgba(59, 130, 246, 0.4)' : 'rgba(236, 72, 153, 0.4)'}`,
                        }}
                    >
                        {digit}
                    </div>
                ))}
            </div>
            <div className='current-digit-display' style={{ marginTop: '0.5rem', fontSize: '1.2rem' }}>
                <Localize i18n_default_text='Last Digit: ' />
                <span
                    className='large-digit'
                    style={{
                        fontSize: '1.6rem',
                        fontWeight: 'bold',
                        color: last_digit !== null && last_digit % 2 === 0 ? '#60a5fa' : '#f472b6',
                    }}
                >
                    {last_digit !== null ? last_digit : '-'}
                </span>
            </div>
        </div>
    );
});

export default LastDigits;
