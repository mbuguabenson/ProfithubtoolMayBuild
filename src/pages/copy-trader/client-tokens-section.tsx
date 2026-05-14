import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import './client-tokens-section.scss';

interface ClientAccount {
    id: string;
    token: string;
    status: 'idle' | 'connecting' | 'connected' | 'error';
    accountType: string;
    balance: number;
    currency: string;
    totalRuns: number;
    totalPL: number;
    totalStake: number;
}

const ClientTokensSection = observer(() => {
    const [clients, setClients] = useState<ClientAccount[]>([]);
    const [newToken, setNewToken] = useState('');

    const addClient = () => {
        if (!newToken.trim()) return;

        const newClient: ClientAccount = {
            id: `client_${Date.now()}`,
            token: newToken,
            status: 'idle',
            accountType: 'N/A',
            balance: 0,
            currency: 'USD',
            totalRuns: 0,
            totalPL: 0,
            totalStake: 0,
        };

        setClients([...clients, newClient]);
        setNewToken('');
    };

    const removeClient = (id: string) => {
        setClients(clients.filter(c => c.id !== id));
    };

    const connectClient = async (id: string) => {
        setClients(clients.map(c => (c.id === id ? { ...c, status: 'connecting' as const } : c)));

        // TODO: Implement actual API connection
        setTimeout(() => {
            setClients(
                clients.map(c =>
                    c.id === id
                        ? {
                              ...c,
                              status: 'connected' as const,
                              accountType: 'Real',
                              balance: 1000.0,
                          }
                        : c
                )
            );
        }, 1500);
    };

    return (
        <div className='client-tokens-section'>
            <div className='section-header'>
                <h2>Copytrade to Client Accounts</h2>
                <p>Copy trades to OTHER PEOPLE's accounts by adding their API tokens</p>
                <p className='sub-hint'>
                    💡 For copying to your own Real accounts, use "Demo to Real Account" section above
                </p>
            </div>

            <div className='add-client-group'>
                <input
                    type='password'
                    placeholder='Enter client API token...'
                    value={newToken}
                    onChange={e => setNewToken(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && addClient()}
                />
                <button onClick={addClient} className='add-button'>
                    + Add Client
                </button>
            </div>

            {clients.length === 0 ? (
                <div className='empty-state'>
                    <span className='empty-icon'>📋</span>
                    <p>No client accounts added yet</p>
                    <span className='empty-hint'>Add your first client API token above to get started</span>
                </div>
            ) : (
                <div className='clients-grid'>
                    {clients.map(client => (
                        <div key={client.id} className={`client-card ${client.status}`}>
                            <div className='card-header'>
                                <span className='client-id'>Client #{client.id.slice(-4)}</span>
                                <div className='header-actions'>
                                    <span className={`status-dot ${client.status}`}></span>
                                    <button className='remove-btn' onClick={() => removeClient(client.id)}>
                                        ✕
                                    </button>
                                </div>
                            </div>

                            <div className='card-body'>
                                <div className='token-display'>
                                    <span className='token-label'>Token:</span>
                                    <span className='token-value'>{'•'.repeat(20)}</span>
                                </div>

                                <div className='account-info'>
                                    <div className='info-item'>
                                        <span className='label'>Type</span>
                                        <span className='value'>{client.accountType}</span>
                                    </div>
                                    <div className='info-item'>
                                        <span className='label'>Balance</span>
                                        <span className='value'>
                                            {client.balance.toFixed(2)} {client.currency}
                                        </span>
                                    </div>
                                </div>

                                {client.status === 'connected' ? (
                                    <div className='trading-stats'>
                                        <div className='stat'>
                                            <span className='stat-label'>Total Runs</span>
                                            <span className='stat-value'>{client.totalRuns}</span>
                                        </div>
                                        <div className='stat'>
                                            <span className='stat-label'>Total P/L</span>
                                            <span
                                                className={`stat-value ${client.totalPL >= 0 ? 'positive' : 'negative'}`}
                                            >
                                                ${client.totalPL.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className='stat'>
                                            <span className='stat-label'>Total Stake</span>
                                            <span className='stat-value'>${client.totalStake.toFixed(2)}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        className='connect-btn'
                                        onClick={() => connectClient(client.id)}
                                        disabled={client.status === 'connecting'}
                                    >
                                        {client.status === 'connecting' ? 'Connecting...' : 'Connect Account'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

export default ClientTokensSection;
