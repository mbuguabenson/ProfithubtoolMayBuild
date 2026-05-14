import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import Dialog from '@/components/shared_ui/dialog';
import ToggleSwitch from '@/components/shared_ui/toggle-switch';
import { Localize } from '@deriv-com/translations';
import './bot-settings-dialog.scss';

type TBotSettingsDialog = {
    is_visible: boolean;
    onClose: () => void;
};

const BotSettingsDialog = observer(({ is_visible, onClose }: TBotSettingsDialog) => {
    const { smart_trading } = useStore();
    const {
        use_martingale,
        martingale_multiplier,
        max_stake_limit,
        is_max_stake_enabled,
        enable_tp_sl,
        take_profit,
        stop_loss,
        max_consecutive_losses,
        is_max_loss_enabled,
        sound_notifications,
    } = smart_trading;

    return (
        <Dialog
            is_visible={is_visible}
            onClose={onClose}
            title='Trading Settings'
            className='bot-settings-dialog'
            has_close_icon
        >
            <div className='bot-settings-content'>
                <section className='settings-section'>
                    <div className='section-header'>
                        <span className='icon'>📈</span>
                        <span className='title'>Martingale</span>
                    </div>
                    <div className='setting-row'>
                        <label>Use Martingale (Digit trades only)</label>
                        <ToggleSwitch
                            id='use_martingale'
                            is_enabled={use_martingale}
                            handleToggle={() => (smart_trading.use_martingale = !use_martingale)}
                        />
                    </div>
                    <div className='setting-row'>
                        <label>Martingale Multiplier</label>
                        <input
                            type='number'
                            value={martingale_multiplier}
                            onChange={e => (smart_trading.martingale_multiplier = parseFloat(e.target.value))}
                            className='setting-input'
                        />
                    </div>
                    <div className='setting-row'>
                        <label>Max Stake Limit</label>
                        <ToggleSwitch
                            id='is_max_stake_enabled'
                            is_enabled={is_max_stake_enabled}
                            handleToggle={() => (smart_trading.is_max_stake_enabled = !is_max_stake_enabled)}
                        />
                    </div>
                    {is_max_stake_enabled && (
                        <div className='setting-row'>
                            <input
                                type='number'
                                value={max_stake_limit}
                                onChange={e => (smart_trading.max_stake_limit = parseFloat(e.target.value))}
                                className='setting-input'
                            />
                        </div>
                    )}
                </section>

                <section className='settings-section'>
                    <div className='section-header'>
                        <span className='icon'>💰</span>
                        <span className='title'>Take Profit & Stop Loss</span>
                    </div>
                    <div className='setting-row'>
                        <label>Enable TP/SL</label>
                        <ToggleSwitch
                            id='enable_tp_sl'
                            is_enabled={enable_tp_sl}
                            handleToggle={() => (smart_trading.enable_tp_sl = !enable_tp_sl)}
                        />
                    </div>
                    {enable_tp_sl && (
                        <>
                            <div className='setting-row'>
                                <label>Take Profit</label>
                                <input
                                    type='number'
                                    value={take_profit}
                                    onChange={e => (smart_trading.take_profit = parseFloat(e.target.value))}
                                    className='setting-input'
                                />
                            </div>
                            <div className='setting-row'>
                                <label>Stop Loss</label>
                                <input
                                    type='number'
                                    value={stop_loss}
                                    onChange={e => (smart_trading.stop_loss = parseFloat(e.target.value))}
                                    className='setting-input'
                                />
                            </div>
                        </>
                    )}
                    <div className='setting-row'>
                        <label>Max Consecutive Losses</label>
                        <ToggleSwitch
                            id='is_max_loss_enabled'
                            is_enabled={is_max_loss_enabled}
                            handleToggle={() => (smart_trading.is_max_loss_enabled = !is_max_loss_enabled)}
                        />
                    </div>
                    {is_max_loss_enabled && (
                        <div className='setting-row'>
                            <input
                                type='number'
                                value={max_consecutive_losses}
                                onChange={e => (smart_trading.max_consecutive_losses = parseInt(e.target.value))}
                                className='setting-input'
                            />
                        </div>
                    )}
                </section>

                <section className='settings-section'>
                    <div className='section-header'>
                        <span className='icon'>🔔</span>
                        <span className='title'>Notifications</span>
                    </div>
                    <div className='setting-row'>
                        <label>Sound Notifications</label>
                        <ToggleSwitch
                            id='sound_notifications'
                            is_enabled={sound_notifications}
                            handleToggle={() => (smart_trading.sound_notifications = !sound_notifications)}
                        />
                    </div>
                </section>

                <div className='dialog-actions'>
                    <button className='btn-save' onClick={onClose}>
                        ✓ Save & Close
                    </button>
                </div>
            </div>
        </Dialog>
    );
});

export default BotSettingsDialog;
