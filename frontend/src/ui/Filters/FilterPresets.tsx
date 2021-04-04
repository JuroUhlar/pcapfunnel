import React, { ReactElement } from 'react'
import { layerString } from '../../utils/statsUtils';

interface Props {
    resetLayers: (newLayers: layerString[]) => void;
    filtrationLayers: layerString[];
}

/**
 * Component that renders a dropdown of filter presets (pre-made filtration layer configurations) that the user can choose to apply
 * + a button to clear all layers
 */

function FilterPresets(props: Props): ReactElement {
    return (
        <React.Fragment>
            <select
                onChange={(e) => {
                    let value = e.target.value as any;
                    if (value === '') props.resetLayers([])
                    else props.resetLayers(value.split(',') as layerString[])
                }}
                value={props.filtrationLayers.toString()}
            >
                <option value={['app', 'Ip']}>Application -{'>'} Network (quick)</option>
                <option value={['app', 'Port', 'Ip']}>Application -{'>'} Network (detailed)</option>
                <option value={['Ip', 'Port', 'app']}>Network -{'>'} Application (quick)</option>
                <option value={['networkProtocol', 'Ip', 'transportProtocol', 'Port', 'app']}>Network -{'>'} Application (detailed)</option>
                <option value={[]}>No filters</option>
                <option value={props.filtrationLayers} disabled>Custom</option>
            </select>
            <button onClick={() => props.resetLayers([])}>Clear filtration layers</button>
        </React.Fragment>
    )
}

const FilterPresetsMemo = React.memo(FilterPresets);
export default FilterPresetsMemo;
