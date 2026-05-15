import { localize } from '@deriv-com/translations';
import { observer as globalObserver } from '../../../utils/observer';
import { notify } from '../utils/broadcast';

const bc = new BroadcastChannel('bot_communication');
const remote_values = {};

bc.onmessage = event => {
    if (event.data && event.data.key) {
        remote_values[event.data.key] = event.data.value;
    }
};

const getMiscInterface = tradeEngine => {
    return {
        notify: args => globalObserver.emit('ui.log.notify', args),
        console: ({ type, message }) => console[type](message), // eslint-disable-line no-console
        notifyTelegram: (access_token, chat_id, text) => {
            const url = `https://api.telegram.org/bot${access_token}/sendMessage`;
            const onError = () => notify('warn', localize('The Telegram notification could not be sent'));

            fetch(url, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id, text }),
            })
                .then(response => {
                    if (!response.ok) {
                        onError();
                    }
                })
                .catch(onError);
        },
        getTotalRuns: () => tradeEngine.getTotalRuns(),
        getBalance: type => tradeEngine.getBalance(type),
        getTotalProfit: toString => tradeEngine.getTotalProfit(toString, tradeEngine.tradeOptions.currency),
        sendToRemote: (key, value) => {
            bc.postMessage({ key, value });
        },
        readFromRemote: key => {
            return remote_values[key];
        },
    };
};

export default getMiscInterface;
