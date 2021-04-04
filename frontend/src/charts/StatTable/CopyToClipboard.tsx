import React, { ReactElement } from 'react'
import { FiCopy } from 'react-icons/fi';
import statTableStyles from './StatTable.module.css';
// @ts-ignore
import { useSnackbar } from 'react-simple-snackbar'

interface CopyToClipboardProps {
    value: string
}


/**
 * A small icon button that copies the provided value into the clipboard.
 * Displays a snackbar for action feedback.
 * To be used in each StatTable line
 * @param value
 */
export default function CopyToClipboard({ value }: CopyToClipboardProps): ReactElement {
    const [openSnackbar] = useSnackbar()

    return (
        <FiCopy
            className={statTableStyles.lineIcon}
            title={'Copy to clipboard'}
            onClick={(e) => {
                e.stopPropagation();
                openSnackbar(`'${value}' copied to clipboard.`)
                navigator.clipboard.writeText(value);
            }} />
    )
}
