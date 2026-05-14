import { observer as globalObserver } from '../../../utils/observer';
import { createDetails } from '../utils/helpers';

const getBotInterface = tradeEngine => {
    const getDetail = i => createDetails(tradeEngine.data.contract)[i];

    return {
        init: (...args) => tradeEngine.init(...args),
        start: (...args) => tradeEngine.start(...args),
        stop: (...args) => tradeEngine.stop(...args),
        purchase: (contract_type, allow_bulk, num_trades) =>
            tradeEngine.purchase(contract_type, allow_bulk, num_trades),
        getAskPrice: contract_type => Number(getProposal(contract_type, tradeEngine).ask_price),
        getPayout: contract_type => Number(getProposal(contract_type, tradeEngine).payout),
        getPurchaseReference: () => tradeEngine.getPurchaseReference(),
        isSellAvailable: () => tradeEngine.isSellAtMarketAvailable(),
        sellAtMarket: () => tradeEngine.sellAtMarket(),
        getSellPrice: () => getSellPrice(tradeEngine),
        isResult: result => getDetail(10) === result,
        isTradeAgain: result => globalObserver.emit('bot.trade_again', result),
        readDetails: i => getDetail(i - 1),
        getAnalysisPower: target => {
            const { analysis } = window.root_store || {};
            if (!analysis) return 0;
            switch (target) {
                case 'OVER':
                    return analysis.percentages.over;
                case 'UNDER':
                    return analysis.percentages.under;
                case 'EVEN':
                    return analysis.percentages.even;
                case 'ODD':
                    return analysis.percentages.odd;
                default:
                    return 0;
            }
        },
        isAnalysisIncreasing: target => {
            const { analysis } = window.root_store || {};
            if (!analysis || !analysis.ticks || analysis.ticks.length < 50) return false;

            const ticks = analysis.ticks;
            const last_10 = ticks.slice(-10);
            const last_50 = ticks.slice(-50);

            const checkCondition = digit => {
                switch (target) {
                    case 'OVER':
                        return digit >= 5;
                    case 'UNDER':
                        return digit < 5;
                    case 'EVEN':
                        return digit % 2 === 0;
                    case 'ODD':
                        return digit % 2 !== 0;
                    default:
                        return false;
                }
            };

            const recent_count = last_10.filter(checkCondition).length;
            const mid_count = last_50.filter(checkCondition).length / 5;

            return recent_count > mid_count;
        },
    };
};

const getProposal = (contract_type, tradeEngine) => {
    return tradeEngine.data.proposals.find(
        proposal =>
            proposal.contract_type === contract_type &&
            proposal.purchase_reference === tradeEngine.getPurchaseReference()
    );
};

const getSellPrice = tradeEngine => {
    return tradeEngine.getSellPrice();
};

export default getBotInterface;
