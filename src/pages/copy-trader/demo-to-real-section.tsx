import { useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import './demo-to-real-section.scss';

const DemoToRealSection = observer(() => {
    const { client, copy_trader } = useStore();
    const {
        selected_real_account_loginid,
        is_demo_to_real_active,
        demo_to_real_status,
        demo_to_real_error,
        setSelectedRealAccount,
        startDemoToRealCopy,
        stopDemoToRealCopy,
    } = copy_trader;

    // Get list of real accounts (non-virtual) from client's account list
    const realAccounts = useMemo(() => {
        return client.account_list.filter(account => !account.is_virtual);
    }, [client.account_list]);

    // Get selected account details
    const selectedAccount = useMemo(() => {
        return client.accounts[selected_real_account_loginid];
    }, [client.accounts, selected_real_account_loginid]);

    const handleToggle = () => {
        if (is_demo_to_real_active) {
            stopDemoToRealCopy();
        } else {
            startDemoToRealCopy();
        }
    };

    const getStatusBadge = () => {
        switch (demo_to_real_status) {
            case 'connecting':
                return <span className='status-badge connecting'>Connecting...</span>;
            case 'active':
                return <span className='status-badge active'>● Active</span>;
            case 'error':
                return <span className='status-badge error'>✕ Error</span>;
            default:
                return <span className='status-badge idle'>○ Ready</span>;
        }
    };

    return (
        <div className={`demo-to-real-section ${is_demo_to_real_active ? 'enabled' : ''}`}>
            <div className='section-header'>
                <div className='title-group'>
                    <h2>Demo to Real Account</h2>
                    <p>Copy trades from your current Demo session to a Real account automatically</p>
                </div>
                {getStatusBadge()}
            </div>

            <div className='section-body'>
                <div className='connection-info'>
                    <div className='info-row'>
                        <span className='label'>Demo Account:</span>
                        <span className='value'>{client.loginid || 'Not connected'}</span>
                    </div>
                    <div className='info-row'>
                        <span className='label'>Account Type:</span>
                        <span className='value'>{client.is_virtual ? 'Virtual' : 'Real'}</span>
                    </div>
                    <div className='info-row'>
                        <span className='label'>Balance:</span>
                        <span className='value'>
                            {client.balance} {client.currency}
                        </span>
                    </div>
                </div>

                {!client.is_virtual ? (
                    <div className='warning-message'>
                        <span className='warning-icon'>⚠️</span>
                        <p>You must be on a Demo account to use this feature. Please switch to a Demo account first.</p>
                    </div>
                ) : (
                    <>
                        <div className='account-selector-group'>
                            <label>Select Real Account to Copy To</label>
                            <select
                                value={selected_real_account_loginid}
                                onChange={e => setSelectedRealAccount(e.target.value)}
                                disabled={is_demo_to_real_active}
                                className={demo_to_real_error && !selected_real_account_loginid ? 'error' : ''}
                            >
                                <option value=''>-- Select a Real Account --</option>
                                {realAccounts.map(account => (
                                    <option key={account.loginid} value={account.loginid}>
                                        {account.loginid} ({account.currency})
                                    </option>
                                ))}
                            </select>
                            {selectedAccount && (
                                <div className='selected-account-info'>
                                    <div className='info-item'>
                                        <span className='label'>Type:</span>
                                        <span className='value'>{selectedAccount.is_virtual ? 'Demo' : 'Real'}</span>
                                    </div>
                                    <div className='info-item'>
                                        <span className='label'>Currency:</span>
                                        <span className='value'>{selectedAccount.currency}</span>
                                    </div>
                                </div>
                            )}
                            {demo_to_real_error && <span className='error-message'>{demo_to_real_error}</span>}
                        </div>

                        <button
                            className={`toggle-button ${is_demo_to_real_active ? 'active' : ''}`}
                            onClick={handleToggle}
                            disabled={
                                demo_to_real_status === 'connecting' ||
                                (!selected_real_account_loginid && !is_demo_to_real_active)
                            }
                        >
                            {demo_to_real_status === 'connecting'
                                ? 'Connecting...'
                                : is_demo_to_real_active
                                  ? 'Stop Copying'
                                  : 'Start Copying'}
                        </button>

                        {is_demo_to_real_active && (
                            <div className='copy-stats'>
                                <div className='stat-card'>
                                    <span className='stat-label'>Trades Copied</span>
                                    <span className='stat-value'>
                                        {
                                            copy_trader.trade_history.filter(t => t.target_label === 'Real Account')
                                                .length
                                        }
                                    </span>
                                </div>
                                <div className='stat-card'>
                                    <span className='stat-label'>Success Rate</span>
                                    <span className='stat-value'>
                                        {(() => {
                                            const realAccTrades = copy_trader.trade_history.filter(
                                                t => t.target_label === 'Real Account'
                                            );
                                            const successCount = realAccTrades.filter(
                                                t => t.status === 'Success'
                                            ).length;
                                            const rate =
                                                realAccTrades.length > 0
                                                    ? (successCount / realAccTrades.length) * 100
                                                    : 0;
                                            return `${rate.toFixed(0)}%`;
                                        })()}
                                    </span>
                                </div>
                                <div className='stat-card'>
                                    <span className='stat-label'>Status</span>
                                    <span className='stat-value positive'>🟢 Live</span>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
});

export default DemoToRealSection;
