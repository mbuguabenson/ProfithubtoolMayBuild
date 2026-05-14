import { useCallback, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import Button from '@/components/shared_ui/button';
import Modal from '@/components/shared_ui/modal';
import { localize } from '@deriv-com/translations';
import '@/components/shared/styles/risk-disclaimer-modal.scss';

interface RiskDisclaimerModalProps {
    is_open?: boolean;
    onClose?: () => void;
    force_show?: boolean;
}

const RiskDisclaimerModal = observer(({ is_open, onClose, force_show }: RiskDisclaimerModalProps) => {
    const [is_visible, setIsVisible] = useState(false);

    const checkAcceptance = useCallback(() => {
        const accepted = localStorage.getItem('experttrader_risk_accepted');
        if (!accepted || force_show) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [force_show]);

    useEffect(() => {
        checkAcceptance();

        // Listen for storage changes in case it's accepted in another tab
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'experttrader_risk_accepted' && e.newValue === 'true') {
                setIsVisible(false);
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [checkAcceptance]);

    useEffect(() => {
        if (is_open !== undefined) {
            setIsVisible(is_open);
        }
    }, [is_open]);

    const onAccept = () => {
        localStorage.setItem('experttrader_risk_accepted', 'true');
        setIsVisible(false);
        if (onClose) onClose();
    };

    const onDecline = () => {
        // Just close the modal as requested
        setIsVisible(false);
        if (onClose) onClose();
    };

    if (!is_visible && !is_open) return null;

    return (
        <Modal
            is_open={is_visible}
            title={localize('Risk Warning')}
            toggleModal={onDecline} // If they try to close via X, it's effectively a decline or prevent
            width='600px'
            className='risk-disclaimer-modal'
            has_close_icon={!force_show} // Don't show close icon if it's the mandatory one
        >
            <Modal.Body>
                <div className='risk-disclaimer-content'>
                    <div className='risk-warning-text'>
                        {localize(
                            'Deriv offers complex derivatives, such as options and contracts for difference ("CFDs"). These products may not be suitable for all clients, and trading them puts you at risk.'
                        )}
                    </div>

                    <div className='risk-points'>
                        <div className='risk-point'>
                            <div className='point-bullet'></div>
                            <span className='point-text'>
                                {localize('You may lose some or all of the money you invest in the trade')}
                            </span>
                        </div>
                        <div className='risk-point'>
                            <div className='point-bullet'></div>
                            <span className='point-text'>
                                {localize(
                                    'If your trade involves currency conversion, exchange rates will affect your profit and loss.'
                                )}
                            </span>
                        </div>
                    </div>

                    <div className='risk-footer-note'>
                        {localize(
                            'You should never trade with borrowed money or with money that you cannot afford to lose.'
                        )}
                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', width: '100%' }}>
                    <Button text={localize('Close')} onClick={onDecline} secondary />
                    <Button text={localize('I Understand & Accept')} onClick={onAccept} primary />
                </div>
            </Modal.Footer>
        </Modal>
    );
});

export default RiskDisclaimerModal;
