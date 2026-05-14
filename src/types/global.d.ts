declare global {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let google: any;
    interface Window {
        sendRequestsStatistic: (is_running: boolean) => void;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Blockly: any;
    }
}

export {};
