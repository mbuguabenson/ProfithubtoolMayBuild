import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { Localize } from '@deriv-com/translations';

const AutoBots = observer(() => {
    const { auto_trader } = useStore();
    const { bots, updateBotStatus } = auto_trader;

    return (
        <div className='auto-bots'>
            <div className='auto-bots__title'>
                <Localize i18n_default_text='Automatic Over / Under Bots' />
            </div>
            <div className='auto-bots__grid'>
                {bots.map(bot => (
                    <div
                        key={bot.id}
                        className={classNames('bot-card', {
                            'bot-card--running': bot.status === 'Running',
                            'bot-card--waiting': bot.status === 'Waiting',
                        })}
                    >
                        <div className='bot-card__header'>
                            <div className='bot-card__name'>{bot.name}</div>
                            <div className={classNames('bot-card__status-indicator', bot.status.toLowerCase())}>
                                {bot.status}
                            </div>
                        </div>

                        <div className='bot-card__stats'>
                            <div className='stat-item'>
                                <div className='label'>Trades</div>
                                <div className='value'>{bot.trades}</div>
                            </div>
                            <div className='stat-item'>
                                <div className='label'>Wins</div>
                                <div className='value win'>{bot.wins}</div>
                            </div>
                            <div className='stat-item'>
                                <div className='label'>Losses</div>
                                <div className='value loss'>{bot.losses}</div>
                            </div>
                        </div>

                        <div className='bot-card__controls'>
                            {bot.status === 'Idle' ? (
                                <button className='btn-start' onClick={() => updateBotStatus(bot.id, 'Running')}>
                                    START
                                </button>
                            ) : (
                                <button className='btn-stop' onClick={() => updateBotStatus(bot.id, 'Idle')}>
                                    STOP
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

export default AutoBots;
