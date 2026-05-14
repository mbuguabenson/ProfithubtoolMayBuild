import { localize } from '@deriv-com/translations';
const modifyContextMenu = menu => {
    if (menu && menu.length > 0) {
        menu.forEach(item => {
            if (item.text === 'Help') {
                item.enabled = false;
            }
        });
    }
};

window.Blockly.Blocks.rise_fall_logic = {
    init() {
        this.jsonInit({
            message0: localize('Rise/Fall Analysis: %1 over last %2 ticks/candles'),
            args0: [
                {
                    type: 'field_dropdown',
                    name: 'ANALYSIS_TYPE',
                    options: [
                        [localize('Master Signal Provider (Buy/Sell/Hold)'), 'SIGNAL'],
                        [localize('Market movement'), 'MOVEMENT'],
                        [localize('Trend'), 'TREND'],
                        [localize('Candle type/Pattern'), 'PATTERN'],
                        [localize('Market State (Reverse/Continue/Unstable)'), 'STATE'],
                        [localize('Candle color'), 'COLOR'],
                    ],
                },
                {
                    type: 'input_value',
                    name: 'TICK_COUNT',
                    check: 'Number',
                },
            ],
            output: 'String',
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: '#f59e0b', // A vibrant orange/gold to fit the fire theme
            tooltip: localize('Advanced logical predictions based on multiple market axes.'),
            category: 'fire_logics',
        });
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
    meta() {
        return {
            display_name: localize('Rise/Fall Analysis Logic'),
            description: localize('Returns specific predictions (string) for Market state, Trends, and Patterns.'),
        };
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.rise_fall_logic = block => {
    const analysisType = block.getFieldValue('ANALYSIS_TYPE');
    const tickCount =
        window.Blockly.JavaScript.javascriptGenerator.valueToCode(
            block,
            'TICK_COUNT',
            window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
        ) || '10';

    let code = '';

    switch (analysisType) {
        case 'SIGNAL':
            code = `Bot.getMasterTradeSignal(${tickCount})`;
            break;
        case 'MOVEMENT':
            code = `Bot.checkVolumeHealth(${tickCount})`;
            break;
        case 'TREND':
            code = `Bot.analyzeTrend('highlow', ${tickCount})`;
            break;
        case 'PATTERN':
            code = `Bot.identifyCandlePattern(${tickCount})`;
            break;
        case 'STATE':
            code = `Bot.predictMarketState(${tickCount})`;
            break;
        case 'COLOR':
            code = `Bot.getCandleColor(${tickCount})`;
            break;
        default:
            code = `''`;
    }

    return [code, window.Blockly.JavaScript.javascriptGenerator.ORDER_FUNCTION_CALL];
};
