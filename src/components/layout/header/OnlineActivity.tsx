import { useEffect, useState } from 'react';
import './OnlineActivity.scss';

const AVATARS = [
    { id: 1, initial: 'MB', color: '#6366f1' },
    { id: 2, initial: 'AK', color: '#10b981' },
    { id: 3, initial: 'JW', color: '#f59e0b' },
    { id: 4, initial: 'RT', color: '#f43f5e' },
    { id: 5, initial: 'DS', color: '#8b5cf6' },
];

const OnlineActivity = () => {
    const [onlineCount, setOnlineCount] = useState(98);

    useEffect(() => {
        const updateCount = () => {
            // Random number between 85 and 150
            const newCount = Math.floor(Math.random() * (150 - 85 + 1)) + 85;
            setOnlineCount(newCount);
        };

        // Update every 2 minutes (120,000 ms)
        const interval = setInterval(updateCount, 120000);
        
        // Immediate first update if needed, but we initialized with 98
        return () => clearInterval(interval);
    }, []);

    return (
        <div className='online-activity-container'>
            <div className='avatar-stack'>
                {AVATARS.map(avatar => (
                    <div 
                        key={avatar.id} 
                        className='avatar-circle' 
                        style={{ backgroundColor: avatar.color }}
                    >
                        {avatar.initial}
                    </div>
                ))}
            </div>
            <div className='online-status'>
                <span className='pulse-dot' />
                <span className='online-count'>{onlineCount} online</span>
            </div>
        </div>
    );
};

export default OnlineActivity;
