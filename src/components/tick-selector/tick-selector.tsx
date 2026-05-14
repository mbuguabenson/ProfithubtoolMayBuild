import React, { useEffect, useState } from 'react';
import './tick-selector.scss';

interface TickSelectorProps {
    value: number;
    onChange: (value: number) => void;
    className?: string;
    label?: string;
}

const PREDEFINED_VALUES = [25, 60, 120, 250, 500, 1000, 5000];

const TickSelector: React.FC<TickSelectorProps> = ({ value, onChange, className, label }) => {
    const isCustom = !PREDEFINED_VALUES.includes(value);
    const [mode, setMode] = useState<'select' | 'custom'>(isCustom ? 'custom' : 'select');
    const [customValue, setCustomValue] = useState(value.toString());

    // Update internal state if value changed externally
    useEffect(() => {
        if (!PREDEFINED_VALUES.includes(value)) {
            setMode('custom');
            setCustomValue(value.toString());
        } else {
            setMode('select');
        }
    }, [value]);

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val === 'custom') {
            setMode('custom');
        } else {
            onChange(Number(val));
        }
    };

    const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCustomValue(e.target.value);
    };

    const handleCustomBlur = () => {
        let val = parseInt(customValue);
        if (isNaN(val) || val < 1) val = 25;
        if (val > 5000) val = 5000;

        setCustomValue(val.toString());
        onChange(val);

        // If the custom value matches a predefined one, switch back to select mode
        if (PREDEFINED_VALUES.includes(val)) {
            setMode('select');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleCustomBlur();
        }
    };

    return (
        <div className={`tick-selector-v2 ${className || ''}`}>
            {label && <label className='tick-selector-v2__label'>{label}</label>}
            <div className='tick-selector-v2__control'>
                {mode === 'select' ? (
                    <select value={value} onChange={handleSelectChange} className='tick-selector-v2__select'>
                        {PREDEFINED_VALUES.map(val => (
                            <option key={val} value={val}>
                                {val} Ticks
                            </option>
                        ))}
                        <option value='custom'>Custom...</option>
                    </select>
                ) : (
                    <div className='tick-selector-v2__custom-wrapper'>
                        <input
                            type='number'
                            value={customValue}
                            onChange={handleCustomChange}
                            onBlur={handleCustomBlur}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className='tick-selector-v2__input'
                            placeholder='Min 1, Max 5000'
                        />
                        <button
                            className='tick-selector-v2__close-btn'
                            onClick={() => setMode('select')}
                            title='Switch to dropdown'
                        >
                            ✕
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TickSelector;
