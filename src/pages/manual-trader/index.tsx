import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import './manual-trader.scss';

const ManualTrader: React.FC = observer(() => {
    const { client } = useStore();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isLoading, setIsLoading] = useState(true);

    const DTRADER_URL = 'https://dtrader.profithub.co.ke/dtrader';

    const token = client.getToken();
    const loginid = localStorage.getItem('new_api_account_id') || localStorage.getItem('active_loginid');
    
    // Construct URL with hash params for immediate auto-auth if DTrader supports it
    const iframeSrc = `${DTRADER_URL}${token ? `#token1=${token}&loginid=${loginid}` : ''}`;

    useEffect(() => {
        const handleIframeMessage = (event: MessageEvent) => {
            // Security: Only trust your own domain
            if (!event.origin.includes('profithub.co.ke')) return;

            if (event.data?.type === 'DTRADER_READY') {
                const active_loginid = localStorage.getItem('active_loginid');

                const authData = {
                    type: 'DTRADER_AUTH',
                    token: client.getToken(),
                    accountsList: JSON.parse(localStorage.getItem('new_api_accounts_list') || '[]'),
                    clientAccounts: JSON.parse(localStorage.getItem('clientAccounts') || '{}'),
                    active_loginid: localStorage.getItem('new_api_account_id') || active_loginid,
                    app_id: localStorage.getItem('config.app_id') || '36544',
                };

                iframeRef.current?.contentWindow?.postMessage(authData, DTRADER_URL);
            }
        };

        window.addEventListener('message', handleIframeMessage);
        return () => window.removeEventListener('message', handleIframeMessage);
    }, [client]);

    return (
        <div className='manual-trader'>
            {isLoading && (
                <div className='manual-trader__loader'>
                    <div className='spinner'></div>
                    <p>Loading Manual Trader...</p>
                </div>
            )}
            <iframe
                ref={iframeRef}
                src={iframeSrc}
                title='Manual Trader'
                className='manual-trader__iframe'
                onLoad={() => setIsLoading(false)}
                allow='clipboard-read; clipboard-write; geolocation; microphone; camera'
            />
        </div>
    );
});

export default ManualTrader;
