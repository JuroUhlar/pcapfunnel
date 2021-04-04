import * as React from 'react'
import { Selections } from '../../layouts/Dashboard/Dashboard';
import { layerString } from '../../utils/statsUtils';
import InfoTip from '../InfoTip/InfoTip';
import styles from './FiltersImportExport.module.css'

interface FiltersImportExportProps {
    timeSelection: number[] | null,
    selections: Selections,
    filtrationLayers: layerString[],
    applyImportedFilters: (timeSelection: number[] | null, selections: Selections, layers: layerString[]) => void,
}

interface FiltersExport {
    header: string,
    timeSelection: number[] | null,
    selections: SelectionsArrays,
    filtrationLayers: layerString[],
}

interface SelectionsArrays {
    networkProtocol?: string[],
    transportProtocol?: string[],
    applicationProtocol?: string[],
    sourceIp?: string[],
    destinationIp?: string[],
    sourcePort?: string[],
    destinationPort?: string[],
    Ip?: string[],
    Port?: string[],
    app?: string[],
}

const HEADER_STRING = 'PcapViz exported filters'

/**
 * Component that handles importing and exporting of the current filter configurations (layers, selected values, time selection) from/to JSON
 */
export class FiltersImportExport extends React.PureComponent<FiltersImportExportProps> {
    saveFilters = () => {
        var data: FiltersExport = {
            header: HEADER_STRING,
            timeSelection: this.props.timeSelection,
            filtrationLayers: this.props.filtrationLayers,
            selections: selectionsToArrays(this.props.selections),
        };

        var json = JSON.stringify(data);
        var blob = new Blob([json], { type: "application/json" });
        var url = URL.createObjectURL(blob);

        var a = document.createElement('a');
        a.download = "pcapViz_filters_export.json";
        a.href = url;
        a.textContent = "Download backup.json";
        a.click();
        a.remove();
    }

    handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target!.files![0]) {
            console.log("File selection canceled");
            return;
        }
        let file = event.target!.files![0];
        console.log(file);
        let fileExtension = file.name.split('.')[1];
        if (fileExtension !== 'json') {
            console.log("Not a JSON file");
            return;
        }

        let reader = new FileReader();
        reader.onload = (event: any) => {
            var json = JSON.parse(event.target.result);
            if (json.header !== HEADER_STRING) {
                console.log('Not a filters export JSON file');
                return;
            }
            let filtersImport: FiltersExport = { ...json };
            this.props.applyImportedFilters(filtersImport.timeSelection, selectionsToSets(filtersImport.selections), filtersImport.filtrationLayers)
        };
        reader.readAsText(file);
    }

    render() {
        return (
            <React.Fragment>
                <span className={styles.titleSpan}>
                    Filters
                    <InfoTip id='filterstip' small={true} >Import or export the current filtration layers and their selected values as a JSON file.</InfoTip>
                </span>
                <button onClick={this.saveFilters}>Export</button>
                <div className={`${styles.fileUpload} my-button`}>
                    <span>Import</span>
                    <input onChange={this.handleFileChange} type="file" className={styles.upload} accept=".json" />
                </div>
            </React.Fragment>
        )
    }
}

function selectionsToArrays(selections: Selections) {
    let properties = Object.keys(selections) as layerString[];
    let result: SelectionsArrays = {};
    properties.forEach((property) => {
        result[property] = Array.from(selections[property as layerString]!);
    })
    return result;
}

function selectionsToSets(selections: SelectionsArrays) {
    let properties = Object.keys(selections) as layerString[];
    let result: Selections = {};
    properties.forEach((property) => {
        result[property] = new Set(selections[property])
    })
    return result;
}
