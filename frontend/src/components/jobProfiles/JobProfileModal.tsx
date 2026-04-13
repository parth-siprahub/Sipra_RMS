import { Modal } from '../ui/Modal';
import type { JobProfile } from '../../api/jobProfiles';
import { JobProfileForm } from './JobProfileForm';

interface JobProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    jobProfile?: JobProfile;
    onDelete?: (id: number) => void;
}

export function JobProfileModal({ isOpen, onClose, onSuccess, jobProfile, onDelete }: JobProfileModalProps) {
    if (!isOpen) return null;
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={jobProfile ? 'Edit Job Profile' : 'New Job Profile'}
            maxWidth="max-w-lg"
        >
            <JobProfileForm
                jobProfile={jobProfile}
                onSaved={() => {
                    onSuccess();
                    onClose();
                }}
                onCancel={onClose}
                onDelete={onDelete}
            />
        </Modal>
    );
}
