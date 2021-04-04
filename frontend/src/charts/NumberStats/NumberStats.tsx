import React, { PureComponent, ReactNode } from 'react'
import { Dataset } from '../../types/Dataset'
import { bytesCountFormat, naturalFormat } from '../../utils/numberFormats';
import styles from './numberStats.module.css';
import Worker from '../../workers'

interface NumberStatsProps {
    dataset: Dataset,
}

export interface NumberStatsState {
    ips: number,
    packets: number,
    flows: number,
    bytes: number,
}

/**
 * Computes and displays basic statitics (number of packets, ips, flows and bytes) from the provided dataset (packets)
 * Uses a worker instance to avoid disrupting the main thread.
 */
class NumberStats extends PureComponent<NumberStatsProps, NumberStatsState> {
    constructor(props: NumberStatsProps) {
        super(props)
        this.state = {
            ips: 0,
            packets: 0,
            flows: 0,
            bytes: 0,
        }
    }

    async computeStats() {
        // Worker experiment
        const workerInstance = new Worker();
        let numberStats = await workerInstance.getNumberStatsFromDataset(this.props.dataset);
        this.setState(() => ({ ...numberStats }));
    }

    componentDidUpdate(): void {
        setTimeout(() => {
            this.computeStats();
        }, 0);
    }

    render(): ReactNode {
        let packets = naturalFormat(this.state.packets)
        let ips = naturalFormat(this.state.ips);
        let flows = naturalFormat(this.state.flows);
        let bytes = bytesCountFormat(this.state.bytes).split(' ');

        return (
            <div className={`${styles.numberStatsWrapper} paper`}>
                <NumberStat description='packets' number={packets} />
                <NumberStat description={bytes[1]} number={bytes[0]} />
                <NumberStat description='IPs' number={ips} />
                <NumberStat description='flows' number={flows} />
            </div>
        )
    }
}

export default NumberStats

interface numberStatProps {
    number: number | string,
    description: string,
}
const NumberStat = (props: numberStatProps) => {
    const { number, description } = props

    return (
        <div className={styles.numberStat}>
            <div className={styles.number}>{number}</div>
            <div className={styles.description}>{description}</div>
        </div>
    )
}

