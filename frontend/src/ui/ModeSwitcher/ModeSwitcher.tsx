import React, { ReactElement } from 'react'
import { Mode } from '../../types/Dataset'
import styles from './ModeSwitcher.module.css'

interface Props {
    switchModes: (newMode: Mode) => void;
}

/**
 * Renders buttons (packets, bytes, flows) for switching something to the desired mode with the provided method
 */
export default function ModeSwitcher({ switchModes }: Props): ReactElement {
    return (
        <div className={styles.ModalModeSwitcher}>
            Switch all charts to:
            <button onClick={() => switchModes('packets')}>Packets</button>
            <button onClick={() => switchModes('bytes')}>Bytes</button>
            <button onClick={() => switchModes('flows')}>Connections</button>
        </div>)
}
