import * as React from 'react'
import Select from 'react-select'
import { IpAddress } from '../../charts/Geo/geoUtils'
import { Dataset } from '../../types/Dataset'
import { computePropertyStat } from '../../utils/statsUtils'

interface IpSelectProps {
    dataset: Dataset;
    onSelectionChange: (ips: IpAddress[]) => void;
    incomingLegendClass?: string,
    outgoingLegendClass?: string,
}

interface IpSelectState {
    ips: IpAddress[],
    selectedIps: Option[]
}

interface Option {
    value: string,
    label: string,
}

/**
 * Renders dropdown for selecting IPs whose traffic should be highlighted in the main Volume Timeline.
 */
export class IpSelect extends React.PureComponent<IpSelectProps, IpSelectState> {
    constructor(props: IpSelectProps) {
        super(props)
        this.state = {
            ips: [],
            selectedIps: []
        }
    }

    computeOptions = async () => {
        setTimeout(() => {
            let ipsStats = computePropertyStat('Ip', this.props.dataset, 'packets');
            let ips = ipsStats.map(stat => stat['Ip']) as string[];
            this.setState(() => ({
                ips,
                selectedIps: []
            }))
        }, 0)
    }

    componentDidMount() {
        this.computeOptions();
    }

    componentDidUpdate(prevProps: IpSelectProps) {
        if (prevProps.dataset !== this.props.dataset) {
            this.computeOptions();
        }
    }

    onSelectionChange = (e: any) => {
        if (e === null) this.props.onSelectionChange([]);
        else this.props.onSelectionChange(e.map((option: Option) => option.value));
        this.setState(() => ({
            selectedIps: e
        }))
    }

    render() {
        let options: Option[] = this.state.ips.map(ip => ({
            value: ip,
            label: ip
        }))
        return (
            <React.Fragment>
                Highlight local network IPs
                <Select
                    defaultValue={[]}
                    isMulti
                    name="colors"
                    options={options}
                    className="basic-multi-select"
                    classNamePrefix="select"
                    value={this.state.selectedIps}
                    onChange={this.onSelectionChange}
                />
                {this.state.selectedIps !== null && this.state.selectedIps.length > 0 &&
                    <div>
                        <span className={this.props.incomingLegendClass}>Incoming local </span>
                        <span className={this.props.outgoingLegendClass}>Outgoing local</span>
                    </div>}
            </React.Fragment>
        )
    }
}

