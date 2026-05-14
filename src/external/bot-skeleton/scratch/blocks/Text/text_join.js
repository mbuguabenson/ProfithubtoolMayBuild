import { localize } from '@deriv-com/translations';
import { modifyContextMenu, runGroupedEvents } from '../../utils';
import { plusIconDark } from '../images';

window.Blockly.Blocks.text_join = {
    protected_statements: ['STACK'],
    allowed_children: ['text_statement'],
    init() {
        const field_image = new window.Blockly.FieldImage(plusIconDark, 25, 25, '', this.onIconClick.bind(this));

        // Default to statement mode (new format)
        this.is_expression = false;
        this.jsonInit(this.definition());

        if (!this.is_expression) {
            this.appendDummyInput('ADD_ICON').appendField(field_image);
            this.moveInputBefore('ADD_ICON', 'STACK');
        }
    },
    definition() {
        if (this.is_expression) {
            return {
                message0: localize('create text with'),
                output: 'String',
                outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
                colour: window.Blockly.Colours.Base.colour,
                colourSecondary: window.Blockly.Colours.Base.colourSecondary,
                colourTertiary: window.Blockly.Colours.Base.colourTertiary,
                tooltip: localize('Text join (expression)'),
                category: window.Blockly.Categories.Text,
            };
        }
        return {
            message0: localize('set {{ variable }} to create text with', { variable: '%1' }),
            message1: '%1',
            args0: [
                {
                    type: 'field_variable',
                    name: 'VARIABLE',
                    variable: localize('text'),
                },
            ],
            args1: [
                {
                    type: 'input_statement',
                    name: 'STACK',
                },
            ],
            inputsInline: true,
            colour: window.Blockly.Colours.Base.colour,
            colourSecondary: window.Blockly.Colours.Base.colourSecondary,
            colourTertiary: window.Blockly.Colours.Base.colourTertiary,
            previousStatement: null,
            nextStatement: null,
            tooltip: localize('Text join (statement)'),
            category: window.Blockly.Categories.Text,
        };
    },
    mutationToDom() {
        const container = document.createElement('mutation');
        if (this.is_expression) {
            container.setAttribute('items', this.itemCount_);
        }
        return container;
    },
    domToMutation(xmlElement) {
        const items = xmlElement.getAttribute('items');
        if (items !== null) {
            this.itemCount_ = parseInt(items);
            this.is_expression = true;
            this.updateShape_();
        }
    },
    updateShape_() {
        if (!this.is_expression) return;

        // Remove existing inputs
        if (this.getInput('STACK')) this.removeInput('STACK');
        if (this.getInput('ADD_ICON')) this.removeInput('ADD_ICON');
        this.setPreviousStatement(false);
        this.setNextStatement(false);
        this.setOutput(true, 'String');

        for (let i = 0; i < this.itemCount_; i++) {
            if (!this.getInput(`ADD${i}`)) {
                this.appendValueInput(`ADD${i}`);
            }
        }
    },
    customContextMenu(menu) {
        modifyContextMenu(menu);
    },
    meta() {
        return {
            display_name: localize('Text join'),
            description: localize('Creates a single text string from combining the text value of each attached item.'),
        };
    },
    onIconClick() {
        if (this.is_expression) return;
        if (this.workspace.options.readOnly || window.Blockly.derivWorkspace.isFlyoutVisible) {
            return;
        }

        runGroupedEvents(false, () => {
            const text_block = this.workspace.newBlock('text_statement');
            text_block.required_parent_id = this.id;
            text_block.setMovable(true);
            text_block.initSvg();
            text_block?.renderEfficiently();

            const shadow_block = this.workspace.newBlock('text');
            shadow_block.setShadow(true);
            shadow_block.setFieldValue('', 'TEXT');
            shadow_block.initSvg();
            shadow_block?.renderEfficiently();

            const text_input = text_block.getInput('TEXT');
            text_input.connection.connect(shadow_block.outputConnection);

            const connection = this.getLastConnectionInStatement('STACK');
            connection.connect(text_block.previousConnection);
        });
    },
    onchange: window.Blockly.Blocks.lists_create_with.onchange,
};

window.Blockly.JavaScript.javascriptGenerator.forBlock.text_join = block => {
    if (block.is_expression) {
        const elements = [];
        for (let i = 0; i < block.itemCount_; i++) {
            elements.push(
                window.Blockly.JavaScript.javascriptGenerator.valueToCode(
                    block,
                    `ADD${i}`,
                    window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC
                ) || "''"
            );
        }
        const code = `[${elements.join(', ')}].join('')`;
        return [code, window.Blockly.JavaScript.javascriptGenerator.ORDER_ATOMIC];
    }

    const var_name = window.Blockly.JavaScript.variableDB_.getName(
        block.getFieldValue('VARIABLE'),
        window.Blockly.Variables.CATEGORY_NAME
    );
    const blocks_in_stack = block.getBlocksInStatement('STACK');
    const elements = blocks_in_stack.map(b => {
        const value = window.Blockly.JavaScript.javascriptGenerator.forBlock[b.type](b);
        return Array.isArray(value) ? value[0] : value;
    });

    const code = `${var_name} = [${elements.join(', ')}].join(" ");\n`;
    return code;
};
