import { localize } from '@deriv-com/translations';
import { emptyTextValidator, modifyContextMenu } from '../../../../utils';

window.Blockly.Blocks.broadcast_send = {
    init() {
        this.jsonInit(this.definition());
    },
    definition() {
        return {
            message0: localize('Remote: Send Key %1 Value %2'),
            args0: [
                {
                    type: 'input_value',
                    name: 'KEY',
                    check: 'String',
                },
                {
                    type: 'input_value',
                    name: 'VALUE',
                    check: null,
                },
            ],
            colour: window.Blockly.Colours.Special3.colour,
            colourSecondary: window.Blockly.Colours.Special3.colourSecondary,
            colourTertiary: window.Blockly.Colours.Special3.colourTertiary,
            previousStatement: null,
            nextStatement: null,
            tooltip: localize('Sends a message to other tabs or analysis engines using a shared key.'),
            category: window.Blockly.Categories.Miscellaneous,
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
    meta() {
        return {
            display_name: localize('Remote Send'),
            description: localize('Sends a value to other open tabs using a unique key.'),
        };
    },
    getRequiredValueInputs() {
        return {
            KEY: emptyTextValidator,
            VALUE: emptyTextValidator,
        };
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.broadcast_send = block => {
    const key = window.Blockly.JavaScript.javascriptGenerator.valueToCode(
        block,
        'KEY',
        window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
    ) || '""';
    const value = window.Blockly.JavaScript.javascriptGenerator.valueToCode(
        block,
        'VALUE',
        window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
    ) || 'null';

    const code = `Bot.sendToRemote(${key}, ${value});\n`;
    return code;
};

window.Blockly.Blocks.broadcast_receive = {
    init() {
        this.jsonInit(this.definition());
    },
    definition() {
        return {
            message0: localize('Remote: Read Key %1'),
            args0: [
                {
                    type: 'input_value',
                    name: 'KEY',
                    check: 'String',
                },
            ],
            output: null,
            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
            colour: window.Blockly.Colours.Special3.colour,
            colourSecondary: window.Blockly.Colours.Special3.colourSecondary,
            colourTertiary: window.Blockly.Colours.Special3.colourTertiary,
            tooltip: localize('Reads the latest value received from other tabs for the given key.'),
            category: window.Blockly.Categories.Miscellaneous,
        };
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
    meta() {
        return {
            display_name: localize('Remote Read'),
            description: localize('Reads a value sent from another tab using the same key.'),
        };
    },
    getRequiredValueInputs() {
        return {
            KEY: emptyTextValidator,
        };
    },
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.broadcast_receive = block => {
    const key = window.Blockly.JavaScript.javascriptGenerator.valueToCode(
        block,
        'KEY',
        window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
    ) || '""';

    const code = `Bot.readFromRemote(${key})`;
    return [code, window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC];
};
