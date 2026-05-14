const lightMode = () => {
    const workspace = Blockly;
    // Changed from blue (#064e72) to purple
    workspace.Colours.RootBlock = {
        colour: '#7c3aed', // Vibrant purple
        colourSecondary: '#6d28d9', // Darker purple
        colourTertiary: '#ffffff', // White text
    };

    // Keep grey blocks as they were
    workspace.Colours.Base = {
        colour: '#e5e5e5',
        colourSecondary: '#ffffff',
        colourTertiary: '#6d7278',
    };

    workspace.Colours.Special1 = {
        colour: '#e5e5e5',
        colourSecondary: '#ffffff',
        colourTertiary: '#6d7278',
    };

    workspace.Colours.Special2 = {
        colour: '#e5e5e5',
        colourSecondary: '#ffffff',
        colourTertiary: '#6d7278',
    };

    workspace.Colours.Special3 = {
        colour: '#e5e5e5',
        colourSecondary: '#ffffff',
        colourTertiary: '#6d7278',
    };

    workspace.Colours.Special4 = {
        colour: '#e5e5e5',
        colourSecondary: '#000000',
        colourTertiary: '#0e0e0e',
    };
};

export const setColors = () => lightMode();
