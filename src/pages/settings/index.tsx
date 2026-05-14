import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import Contacts from './components/contacts';
import ErrorHandling from './components/error-handling';
import SystemLogs from './components/system-logs';
import './settings.scss';

type SettingsTab = 'contacts' | 'system_logs' | 'error_handling';

const Settings = observer(() => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('contacts');

    const renderContent = () => {
        switch (activeTab) {
            case 'contacts':
                return <Contacts />;
            case 'system_logs':
                return <SystemLogs />;
            case 'error_handling':
                return <ErrorHandling />;
            default:
                return <Contacts />;
        }
    };

    return (
        <div className='settings-page'>
            <div className='settings-page__header'>
                <h2>Settings</h2>
                <p>Manage system preferences and view logs</p>
            </div>

            <div className='settings-page__container'>
                <div className='settings-page__sidebar'>
                    <button
                        className={activeTab === 'contacts' ? 'active' : ''}
                        onClick={() => setActiveTab('contacts')}
                    >
                        Contacts information
                    </button>
                    <button
                        className={activeTab === 'system_logs' ? 'active' : ''}
                        onClick={() => setActiveTab('system_logs')}
                    >
                        System Logs
                    </button>
                    <button
                        className={activeTab === 'error_handling' ? 'active' : ''}
                        onClick={() => setActiveTab('error_handling')}
                    >
                        Error Handling
                    </button>
                </div>

                <div className='settings-page__content'>{renderContent()}</div>
            </div>
        </div>
    );
});

export default Settings;
