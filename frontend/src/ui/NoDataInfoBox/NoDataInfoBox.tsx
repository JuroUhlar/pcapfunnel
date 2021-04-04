import React from 'react'
import { FiCornerRightUp, FiEdit2, FiFilter, FiX } from 'react-icons/fi';
import { layerString, propertyDisplayNames } from '../../utils/statsUtils';
import styles from './NoDataInfoBox.module.css'

interface NoDataInfoBoxProps {
    layer: layerString;
    openLayersmModal: () => void;
    deleteLayer: (deletedLayer: layerString) => void
}

/**
 * Component that renders a No Data notice instead of an empty filtration layer
 */
export default class NoDataInfoBox extends React.PureComponent<NoDataInfoBoxProps> {
    render() {
        return (
            <div className={styles.noDataInfoBox}>
                <div className={styles.noDataInfoBoxText}>
                    <FiFilter size={20} className={styles.infoIcon} />
                    <b>{propertyDisplayNames[this.props.layer]}</b>: Nothing to show yet, select some values in the filtration layer above <FiCornerRightUp />
                </div>
                <FiEdit2 className={styles.noDataInfoBoxIcon} title='Edit filtration layers' onClick={this.props.openLayersmModal} />
                <FiX className={styles.noDataInfoBoxIcon} title='Remove this filtration layer' onClick={() => this.props.deleteLayer(this.props.layer)} />
            </div>
        );
    }
}
