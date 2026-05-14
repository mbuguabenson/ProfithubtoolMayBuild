import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import ToggleSwitch from '@/components/shared_ui/toggle-switch';
import './quick-settings.scss';

const QuickSettings = observer(() => {
    const { smart_trading } = useStore();
    const { use_martingale, martingale_multiplier, speedbot_stake, is_executing } = smart_trading;

    return (
        <div className='quick-settings-glass'>
            <div className='settings-grid'>
                <div className='setting-item'>
                    <label>STAKE</label>
                    <div className='input-wrapper'>
                        <span className='currency'>$</span>
                        <input
                            type='number'
                            value={speedbot_stake}
                            disabled={is_executing}
                            onChange={e => (smart_trading.speedbot_stake = parseFloat(e.target.value))}
                        />
                    </div>
                </div>

                <div className='setting-item'>
                    <label>MARTINGALE</label>
                    <div className='toggle-wrapper'>
                        <ToggleSwitch
                            id='quick_martingale'
                            is_enabled={use_martingale}
                            handleToggle={() => (smart_trading.use_martingale = !use_martingale)}
                        />
                        <input
                            type='number'
                            step='0.1'
                            className='multiplier-input'
                            value={martingale_multiplier}
                            disabled={!use_martingale || is_executing}
                            onChange={e => (smart_trading.martingale_multiplier = parseFloat(e.target.value))}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
});

export default QuickSettings;
