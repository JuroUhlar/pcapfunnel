import React, { PureComponent } from 'react';
import { FiInfo } from 'react-icons/fi';
import ReactTooltip from 'react-tooltip';
import styles from './InfoTip.module.css'

interface Props {
    id: string;
    small?: boolean
}

/**
 * Component that renders a small info icon with a hover tooltip containing the provided content (usually an explanation of something)
 */
export default class InfoTip extends PureComponent<Props> {
    render() {
        return (
            <React.Fragment>
                <FiInfo className={`${styles.icon} ${this.props.small ? styles.smallIcon : ''}`} data-tip data-for={this.props.id} />
                <ReactTooltip
                    id={this.props.id}
                    place="bottom"
                    type="dark"
                    effect="solid"
                    delayHide={700}
                    className={styles.keepOnHover}
                >
                    <div className={styles.tooltipContent}> 
                        {this.props.children}
                    </div>
                </ReactTooltip>
            </React.Fragment>

        )
    }
}
