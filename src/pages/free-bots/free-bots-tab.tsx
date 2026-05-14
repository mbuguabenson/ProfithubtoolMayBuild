import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { Localize, localize } from '@deriv-com/translations';
import { useFreeBots } from '@/hooks/use-free-bots';
import { useStore } from '@/hooks/useStore';
import './free-bots-tab.scss';

const BotCard = ({ bot, onLoad }: { bot: any; onLoad: (bot: any) => void }) => {
    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'Official': return '#f59e0b'; // Gold
            case 'Hybrid': return '#8b5cf6'; // Purple
            case 'Automatic': return '#10b981'; // Green
            default: return '#3b82f6'; // Blue
        }
    };

    const bot_color = getCategoryColor(bot.category);
    
    return (
        <div
            className='bot-card'
            style={{ '--bot-accent': bot_color } as React.CSSProperties}
        >
            <div className='bot-card__header'>
                <span className='bot-card__label'>
                    {bot.category === 'Official' ? localize('OFFICIAL BOT') : 
                     bot.category === 'Hybrid' ? localize('HYBRID BOT') :
                     bot.category === 'Automatic' ? localize('AUTO BOT') : localize('SMART BOT')}
                </span>
                {bot.isPremium && <span className='bot-card__badge-premium'>{localize('PREMIUM')}</span>}
            </div>

            <div className='bot-card__body'>
                <h3 className='bot-card__title'>{bot.name}</h3>
                <p className='bot-card__description'>{bot.description}</p>
            </div>

            <div className='bot-card__footer'>
                <button className='btn-load btn-load--wide' onClick={() => onLoad(bot)}>
                    {localize('LOAD BOT')}
                    <span className='icon-load'>⤓</span>
                </button>
            </div>
        </div>
    );
};

const FreeBotsTab = observer(() => {
    const { ui } = useStore();
    const { is_dark_mode_on } = ui;
    const { selectedCategory, setSelectedCategory, categories, filteredBots, loadBotToBuilder, isLoading } =
        useFreeBots();

    return (
        <div className={`free-bots-engine ${is_dark_mode_on ? 'free-bots-engine--dark' : ''}`}>
            <div className='tab-viewport'>
                <div className='library-container'>
                    <div className='library-header'>
                        <h2 className='library-title'>
                            <Localize i18n_default_text='Bot Library' />
                        </h2>
                        <p className='library-subtitle'>
                            <Localize i18n_default_text='Select a pre-built strategy to deploy to the Bot Builder.' />
                        </p>
                    </div>

                    <div className='library-filters'>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                className={`filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className='library-grid'>
                        {filteredBots.map(bot => (
                            <BotCard key={bot.id} bot={bot} onLoad={loadBotToBuilder} />
                        ))}
                    </div>
                </div>
            </div>

            {isLoading && (
                <div className='loading-overlay'>
                    <div className='spinner' />
                    <p>
                        <Localize i18n_default_text='Deploying Strategy...' />
                    </p>
                </div>
            )}
        </div>
    );
});

export default FreeBotsTab;
