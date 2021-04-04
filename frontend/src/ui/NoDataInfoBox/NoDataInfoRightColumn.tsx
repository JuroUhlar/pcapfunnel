import React from 'react'
import { FiCornerDownLeft, FiFilter} from 'react-icons/fi';

import styles from './NoDataInfoBox.module.css'

/**
 * Component that renders a No Data notice instead of an empty right column
 */
export default class NoDataInfoRightColumn extends React.PureComponent {
    render() {
        return (
            <div className={styles.noDataInfoBox}>
                <div className={styles.noDataInfoBoxText}>
                    <FiFilter size={20} className={styles.infoIcon} />
                    Nothing to show yet, use the left column to filter your dataset. <FiCornerDownLeft />
                </div>
            </div>
        );
    }
}
