import React from 'react';
import './ultra-momentum-gauge.scss';

interface UltraMomentumGaugeProps {
    value: number; // 0-100
}

const UltraMomentumGauge: React.FC<UltraMomentumGaugeProps> = ({ value }) => {
    const clampedValue = Math.min(100, Math.max(0, value));
    const rotation = (clampedValue / 100) * 180 - 90; // -90 to 90 degrees

    const getColor = () => {
        if (clampedValue < 30) return '#00c6ff'; // Light Blue
        if (clampedValue < 70) return '#0099ff'; // Mid Blue
        return '#0072ff'; // Dark Blue
    };

    return (
        <div className='ultra-momentum-gauge'>
            <div className='gauge-label'>Market Velocity</div>
            <svg viewBox='0 0 200 120' className='gauge-svg'>
                {/* Background Arc */}
                <path
                    d='M 20 100 A 80 80 0 0 1 180 100'
                    fill='none'
                    stroke='rgba(255, 255, 255, 0.1)'
                    strokeWidth='12'
                    strokeLinecap='round'
                />

                {/* Value Arc */}
                <path
                    d='M 20 100 A 80 80 0 0 1 180 100'
                    fill='none'
                    stroke={getColor()}
                    strokeWidth='12'
                    strokeLinecap='round'
                    strokeDasharray={`${(clampedValue / 100) * 251.2} 251.2`}
                    className='gauge-arc'
                />

                {/* Needle */}
                <line
                    x1='100'
                    y1='100'
                    x2='100'
                    y2='40'
                    stroke={getColor()}
                    strokeWidth='3'
                    strokeLinecap='round'
                    transform={`rotate(${rotation} 100 100)`}
                    className='gauge-needle'
                />

                {/* Center Dot */}
                <circle cx='100' cy='100' r='6' fill={getColor()} className='gauge-center' />
            </svg>
            <div className='gauge-value' style={{ color: getColor() }}>
                {clampedValue.toFixed(0)}
            </div>
        </div>
    );
};

export default UltraMomentumGauge;
