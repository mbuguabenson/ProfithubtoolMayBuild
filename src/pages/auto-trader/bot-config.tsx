import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { Localize } from '@deriv-com/translations';

const BotConfig = observer(() => {
    const { auto_trader } = useStore();
    const {
        stake,
        setStake,
        take_profit,
        setTakeProfit,
        stop_loss,
        setStopLoss,
        martingale_multiplier,
        setMartingale,
        total_profit,
        session_profit,
        clearBotStats,
    } = auto_trader;

    const is_positive = session_profit >= 0;

    return (
        <div className='bot-config'>
            <div className='bot-config__header'>
                <div className='bot-config__title'>
                    <Localize i18n_default_text='Bot Settings' />
                </div>
                <div className='bot-config__stats'>
                    <div className='stat-item'>
                        <span className='label'>
                            <Localize i18n_default_text='Total Profit:' />
                        </span>
                        <span className={`value ${total_profit >= 0 ? 'positive' : 'negative'}`}>
                            {total_profit.toFixed(2)} USD
                        </span>
                    </div>
                    <div className='stat-item'>
                        <span className='label'>
                            <Localize i18n_default_text='Session:' />
                        </span>
                        <span className={`value ${is_positive ? 'positive' : 'negative'}`}>
                            {session_profit.toFixed(2)} USD
                        </span>
                    </div>
                    <button className='reset-btn' onClick={clearBotStats}>
                        <Localize i18n_default_text='Reset Stats' />
                    </button>
                </div>
            </div>

            <div className='bot-config__grid'>
                <div className='config-item'>
                    <label>
                        <Localize i18n_default_text='Stake (USD)' />
                    </label>
                    <input
                        type='number'
                        value={stake}
                        onChange={e => setStake(parseFloat(e.target.value) || 0)}
                        min='0.35'
                        step='0.1'
                    />
                </div>
                <div className='config-item'>
                    <label>
                        <Localize i18n_default_text='Take Profit (USD)' />
                    </label>
                    <input
                        type='number'
                        value={take_profit}
                        onChange={e => setTakeProfit(parseFloat(e.target.value) || 0)}
                        min='1'
                    />
                </div>
                <div className='config-item'>
                    <label>
                        <Localize i18n_default_text='Stop Loss (USD)' />
                    </label>
                    <input
                        type='number'
                        value={stop_loss}
                        onChange={e => setStopLoss(parseFloat(e.target.value) || 0)}
                        min='1'
                    />
                </div>
                <div className='config-item'>
                    <label>
                        <Localize i18n_default_text='Martingale' />
                    </label>
                    <input
                        type='number'
                        value={martingale_multiplier}
                        onChange={e => setMartingale(parseFloat(e.target.value) || 0)}
                        min='1'
                        step='0.1'
                    />
                </div>
            </div>
        </div>
    );
});

export default BotConfig;
