import * as React from 'react';
import { layerString } from '../../utils/statsUtils'

interface SwitchLayerDropdownProps {
    statName: layerString,
    switchLayers: (oldLayer: layerString, newLayer: layerString) => void,
}

/**
 * Renders a drop-down that allows to swtich a filtration layer between 'source', 'destination' and 'both' variants
 * in Port or IP filtration layers.
 */
export class SwitchLayerDropdown extends React.PureComponent<SwitchLayerDropdownProps>  {
    handleLayerChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        let newLayer = event.target.value as layerString;
        this.props.switchLayers(this.props.statName, newLayer);
    };

    render() {
        return (
            <span>
                {isIp(this.props.statName) &&
                    <select
                        onChange={this.handleLayerChange}
                        value={this.props.statName}>
                        <option value='Ip'>IP (source or dest.)</option>
                        <option value='sourceIp'>Source IP</option>
                        <option value='destinationIp'>Destination IP</option>
                    </select>}
                {isPort(this.props.statName) &&
                    <select
                        onChange={this.handleLayerChange}
                        value={this.props.statName}>
                        <option value='Port'>Port (source or dest.)</option>
                        <option value='sourcePort'>Source Port</option>
                        <option value='destinationPort'>Destination Port</option>
                    </select>}
            </span>
        )
    }
}

function isIp(layer: layerString) {
    return layer === 'Ip' ||
        layer === 'sourceIp' ||
        layer === 'destinationIp'
}

function isPort(layer: layerString) {
    return layer === 'Port' ||
        layer === 'sourcePort' ||
        layer === 'destinationPort'
}