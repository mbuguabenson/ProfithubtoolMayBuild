import React from 'react';
import './ultra-alpha-score.scss';

interface UltraAlphaScoreProps {
    score: number; // 0-100
}

const UltraAlphaScore: React.FC<UltraAlphaScoreProps> = ({ score }) => {
    const clampedScore = Math.min(100, Math.max(0, score));
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (clampedScore / 100) * circumference;

    const getColor = () => {
        if (clampedScore >= 70) return '#38ef7d'; // Strong Green
        if (clampedScore >= 40) return '#00c6ff'; // Moderate Blue
        return '#ef4444'; // Weak Red (keep for warning)
    };

    const getLabel = () => {
        if (clampedScore >= 70) return 'STRONG';
        if (clampedScore >= 40) return 'MODERATE';
        return 'WEAK';
    };

    return (
        <div className='ultra-alpha-score'>
            <div className='score-label'>Alpha Score</div>
            <svg viewBox='0 0 160 160' className='score-svg'>
                {/* Background Circle */}
                <circle cx='80' cy='80' r={radius} fill='none' stroke='rgba(255, 255, 255, 0.1)' strokeWidth='10' />

                {/* Score Circle */}
                <circle
                    cx='80'
                    cy='80'
                    r={radius}
                    fill='none'
                    stroke={getColor()}
                    strokeWidth='10'
                    strokeLinecap='round'
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    transform='rotate(-90 80 80)'
                    className='score-circle'
                />

                {/* Center Text */}
                <text x='80' y='75' textAnchor='middle' fill={getColor()} className='score-value'>
                    {clampedScore.toFixed(0)}
                </text>
                <text x='80' y='95' textAnchor='middle' fill='rgba(255, 255, 255, 0.6)' className='score-max'>
                    / 100
                </text>
            </svg>
            <div className='score-status' style={{ color: getColor() }}>
                {getLabel()}
            </div>
        </div>
    );
};

export default UltraAlphaScore;
