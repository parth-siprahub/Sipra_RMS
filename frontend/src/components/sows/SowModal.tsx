import { Modal } from '../ui/Modal';
import { type SOW } from '../../api/sows';
import { SowForm } from './SowForm';

interface SowModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (updatedIsActive?: boolean) => void;
    sow?: SOW;
}

export function SowModal({ isOpen, onClose, onSuccess, sow }: SowModalProps) {
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={sow ? 'Edit SOW' : 'New SOW'} maxWidth="max-w-xl">
            <SowForm
                sow={sow}
                onSaved={(updatedIsActive) => {
                    onSuccess(updatedIsActive);
                    onClose();
                }}
                onCancel={onClose}
            />
        </Modal>
    );
}
