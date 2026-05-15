import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { localize } from '@deriv-com/translations';
import { 
    LabelPairedLinkMdRegularIcon,
    LabelPairedLinkSlashMdRegularIcon,
    LabelPairedGlobeMdRegularIcon,
    LabelPairedTabMdRegularIcon
} from '@deriv/quill-icons/LabelPaired';
import ToolbarIcon from './toolbar-icon';
import './toolbar.scss';

const RemoteLinkGroup = observer(() => {
    const [is_connected, setIsConnected] = useState(false);
    const [remote_url, setRemoteUrl] = useState('');
    const [pairing_key, setPairingKey] = useState('default_key');
    const [show_config, setShowConfig] = useState(false);
    const [selected_tab, setSelectedTab] = useState('');

    const internal_tabs = [
        { label: localize('Signals Tab'), url: '', key: 'signals_key' },
        { label: localize('Easy Tool'), url: '', key: 'easy_tool_key' },
        { label: localize('Profithub Analysis'), url: 'https://analysisprofithub.vercel.app/', key: 'analysis_hub_key' },
    ];

    // This is a mock connection status for now
    useEffect(() => {
        const bc = new BroadcastChannel('bot_communication');
        let timeout: NodeJS.Timeout;

        bc.onmessage = (event) => {
            if (event.data && event.data.key === pairing_key) {
                setIsConnected(true);
                if (timeout) clearTimeout(timeout);
                timeout = setTimeout(() => setIsConnected(false), 10000); // Reset after 10s of inactivity
            }
        };

        return () => {
            bc.close();
            if (timeout) clearTimeout(timeout);
        };
    }, [pairing_key]);

    const handleLink = () => {
        if (remote_url) {
            window.open(remote_url, '_blank');
        } else if (selected_tab) {
            const tab = internal_tabs.find(t => t.label === selected_tab);
            if (tab) {
                setPairingKey(tab.key);
                if (tab.url) window.open(tab.url, '_blank');
            }
        }
        setShowConfig(false);
    };

    return (
        <div className='toolbar__group remote-link-group'>
            <div className='toolbar__separator' />
            <ToolbarIcon
                popover_message={localize('Remote Link Configuration')}
                icon={
                    <span 
                        className={`toolbar__icon ${is_connected ? 'toolbar__icon--active' : ''}`}
                        onClick={() => setShowConfig(!show_config)}
                    >
                        {is_connected ? <LabelPairedLinkMdRegularIcon /> : <LabelPairedLinkSlashMdRegularIcon />}
                    </span>
                }
            />
            {show_config && (
                <div className='remote-link-config-popover'>
                    <div className='remote-link-config-header'>
                        <h3>{localize('Connectivity Center')}</h3>
                        <div className={`status-badge ${is_connected ? 'connected' : 'disconnected'}`}>
                            {is_connected ? localize('Online') : localize('Offline')}
                        </div>
                    </div>

                    <div className='remote-link-config-item'>
                        <label>{localize('Select Tab to Link')}</label>
                        <select 
                            value={selected_tab} 
                            onChange={(e) => setSelectedTab(e.target.value)}
                        >
                            <option value="">{localize('-- Select a Tab --')}</option>
                            {internal_tabs.map(tab => (
                                <option key={tab.label} value={tab.label}>{tab.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className='remote-link-config-divider'>
                        <span>{localize('OR')}</span>
                    </div>

                    <div className='remote-link-config-item'>
                        <label>{localize('Enter External URL')}</label>
                        <input 
                            type='text' 
                            value={remote_url} 
                            onChange={(e) => setRemoteUrl(e.target.value)}
                            placeholder='https://...'
                        />
                    </div>

                    <div className='remote-link-config-item'>
                        <label>{localize('Pairing Key (Link Bot)')}</label>
                        <input 
                            type='text' 
                            value={pairing_key} 
                            onChange={(e) => setPairingKey(e.target.value)}
                            placeholder={localize('Enter key to pair...')}
                        />
                    </div>

                    <div className='remote-link-config-actions'>
                        <button className='remote-link-button' onClick={handleLink}>
                            {localize('Connect & Link Bot')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

export default RemoteLinkGroup;
