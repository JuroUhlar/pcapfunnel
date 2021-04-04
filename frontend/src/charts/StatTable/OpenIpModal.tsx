import React, { ReactElement } from 'react'
import { FiExternalLink } from 'react-icons/fi';
import statTableStyles from './StatTable.module.css';

interface OpenIpModalProps {
    ip: string,
    openIpModal: (ip: string) => void;
}

/**
 * A small icon button that opens the deatail modal of the provided IP address.
 * To be used in each StatTable line containing an IP address.
 * @param ip
 * @param openIpModal
 */
export default function OpenIpModal({ ip, openIpModal }: OpenIpModalProps): ReactElement {
    return (
        <FiExternalLink
            className={statTableStyles.lineIcon}
            title={'Open detial view if available'}
            onClick={(e) => {
                openIpModal(ip);
                e.stopPropagation();
            }} />
    )
}
