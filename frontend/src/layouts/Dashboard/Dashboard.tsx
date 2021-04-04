
import * as React from 'react'
import { Dataset, VolumeTimelineMode, Mode } from '../../types/Dataset';
import { DataInput } from '../../ui/DataInput/DataInput';
import { PacketTable } from '../../charts/DataTable/PacketTable';
import { StatTable } from '../../charts/StatTable/StatTable';
import { computePropertyStat, Stats, emptyStats, layerString, StatElement } from '../../utils/statsUtils';
import { VolumeTimelineChart } from '../../charts/VolumeTimeline/VolumeTimeline';
import { VolumeTimelineHighlighted } from '../../charts/VolumeTimeline/VolumeTimelineHighlighted';
import Spinner from '../../ui/Spinner/Spinner';
import { FlowMode } from '../../charts/DataTable/FlowTable';
import { wakeUpGeoServer } from '../../charts/Geo/geoUtils';
import { PieChart } from '../../charts/PieChart/PieChart';
import { NetworkGraphChart } from '../../charts/NetworkGraph/NetworkGraph';
import { NetworkGraphModalWrapper } from '../../charts/NetworkGraph/NetworkGraphModalWrapper';
import { ChangeLayersModal } from '../LayersConfigModal/LayersModal';
import { FiltersImportExport } from '../../ui/Filters/FiltersImportExport';
import NumberStats from '../../charts/NumberStats/NumberStats';
import styles from './Dashboard.module.css'
import SettingsModal, { defaultSettings } from '../Settings/Settings';
import { Settings } from '../Settings/Settings';
import { FiPlusSquare } from "react-icons/fi";
import NoDataInfoBox from '../../ui/NoDataInfoBox/NoDataInfoBox';
import InfoTip from '../../ui/InfoTip/InfoTip';
import DashboardInfoTipContent from '../../ui/InfoTip/DashboardInfoTipContent';
import NoDataInfoRightColumn from '../../ui/NoDataInfoBox/NoDataInfoRightColumn';
import FilterPresetsMemo from '../../ui/Filters/FilterPresets';
import ModeSwitcher from '../../ui/ModeSwitcher/ModeSwitcher';

// only used in Tabs mode
interface DashboardProps {
    openIpTab?: (ip: string) => void,
    openConnectionTab?: (connection: string[]) => void,
}


interface DashboardState {
    dataset: Dataset,
    timeFilteredDataset: Dataset,
    filteredDataset: Dataset,
    datasetPath: string,
    loading: boolean,
    firstDataLoaded: boolean,
    selections: Selections,
    filters: Filters,
    timeSelection: number[] | null,
    stats: Stats,
    filtrationLayers: layerString[],
    flowTableMode: FlowMode;
    volumeTimelineMode: VolumeTimelineMode;
    layerModes: LayerModes;
    graphMode: Mode;
    newBatchFlag: boolean;
    settings: Settings;
};

export interface Selections {
    networkProtocol?: Set<string>,
    transportProtocol?: Set<string>,
    applicationProtocol?: Set<string>,
    sourceIp?: Set<string>,
    destinationIp?: Set<string>,
    sourcePort?: Set<string>,
    destinationPort?: Set<string>,
    Ip?: Set<string>,
    Port?: Set<string>,
    app?: Set<string>,
}

interface Filters {
    networkProtocol?: Dataset,
    transportProtocol?: Dataset,
    applicationProtocol?: Dataset,
    sourceIp?: Dataset,
    destinationIp?: Dataset,
    sourcePort?: Dataset,
    destinationPort?: Dataset,
    Ip?: Dataset,
    Port?: Dataset,
    app: Dataset,
}

export interface LayerModes {
    networkProtocol: Mode,
    transportProtocol: Mode,
    applicationProtocol: Mode,
    sourceIp: Mode,
    destinationIp: Mode,
    sourcePort: Mode,
    destinationPort: Mode,
    Ip: Mode,
    Port: Mode,
    app: Mode,
}

export const emptySelections: Selections = {
    networkProtocol: new Set(),
    transportProtocol: new Set(),
    applicationProtocol: new Set(),
    sourceIp: new Set(),
    destinationIp: new Set(),
    sourcePort: new Set(),
    destinationPort: new Set(),
    Ip: new Set(),
    Port: new Set(),
    app: new Set(),
}

const emptyFilters: Filters = {
    networkProtocol: [],
    transportProtocol: [],
    applicationProtocol: [],
    sourceIp: [],
    destinationIp: [],
    sourcePort: [],
    destinationPort: [],
    Ip: [],
    Port: [],
    app: [],
}

export const newLayerModes = (mode: Mode): LayerModes => ({
    networkProtocol: mode,
    transportProtocol: mode,
    applicationProtocol: mode,
    sourceIp: mode,
    destinationIp: mode,
    sourcePort: mode,
    destinationPort: mode,
    Ip: mode,
    Port: mode,
    app: mode,
})

/**
 * Main screen component controlling the data flow of the entire application
 * Devided into left and right columns
 */
export class Dashboard
    extends React.PureComponent<DashboardProps, DashboardState> {
    constructor(props: DashboardProps) {
        super(props);
        this.state = {
            dataset: [],
            timeFilteredDataset: [],
            filteredDataset: [],
            // datasetPath: 'datasets/60KB_31680.json',
            datasetPath: 'datasets/10MB_3221263.json',
            firstDataLoaded: false,
            loading: true,
            selections: emptySelections,
            filters: emptyFilters,
            timeSelection: null,
            stats: emptyStats,
            // filtrationLayers: ['applicationProtocol', 'Ip'],
            filtrationLayers: [],
            flowTableMode: 'flows',
            volumeTimelineMode: 'packets',
            layerModes: newLayerModes('packets'),
            graphMode: 'packets',
            newBatchFlag: false,
            settings: defaultSettings,
        };
    }

    // The application requires some refactoring to achieve the same features without using these refs
    volumeTimelineRef: React.RefObject<VolumeTimelineChart> | null | undefined = React.createRef();
    changeLayersModalRef: React.RefObject<ChangeLayersModal> | null | undefined = React.createRef();
    modalWrapperRef: React.RefObject<NetworkGraphModalWrapper> | null | undefined = React.createRef();

    componentDidMount() {
        this.fetchDataset(this.state.datasetPath);
        wakeUpGeoServer();
    }


    // Dataset management

    fetchDataset = async (path: string) => {
        this.setState(() => ({
            loading: true
        }))
        let response = await fetch(path);
        let dataset = await response.json();
        this.changeDataset(dataset as Dataset);
    };

    changeDataset = async (dataset: Dataset) => {
        if (this.volumeTimelineRef && this.volumeTimelineRef.current && this.state.settings.resetFiltersOnNewDataset) {
            this.volumeTimelineRef.current.clearSelection()
        }

        this.setState(() => ({
            dataset: dataset,
            firstDataLoaded: true,
            loading: false,
            newBatchFlag: false,
            filtrationLayers: this.state.settings.clearLayersOnNewDataset ? [] : this.state.filtrationLayers
        }));
        // This triggers update of VolumeTimeline chart which triggers this.setTimeSelection
    }

    appendToDataset = async (dataset: Dataset) => {
        let newDataset = this.state.dataset.concat(dataset);
        // let newDataset = [...this.state.dataset];
        // newDataset.push(...dataset);
        this.setState((oldState) => ({
            dataset: newDataset,
            firstDataLoaded: true,
            loading: false,
            newBatchFlag: true
        }));
        // This triggers update of VolumeTimeline chart which triggers this.setTimeSelection
    }

    setLoading = (loading: boolean) => {
        this.setState(() => ({
            loading
        }))
    }

    // Layer management

    resetLayers = (newLayers: layerString[]) => {
        this.setState(() => ({
            filtrationLayers: newLayers as layerString[]
        }), () => this.setTimeSelection(this.state.timeSelection));
    }

    switchLayer = (oldLayer: layerString, newLayer: layerString) => {
        let newLayers = this.state.filtrationLayers;
        let index = newLayers.indexOf(oldLayer);
        newLayers[index] = newLayer;
        newLayers = Array.from(new Set(newLayers));

        this.cascadeFromChangedLayer(index, newLayers, oldLayer, newLayer);
    }

    deleteLayer = (deletedLayer: layerString) => {
        let newLayers = this.state.filtrationLayers;
        let index = newLayers.indexOf(deletedLayer);
        newLayers = newLayers.filter(layer => layer !== deletedLayer);
        let newLayer = newLayers[index];

        if (newLayers.length === 0) this.resetLayers([]);
        else this.cascadeFromChangedLayer(index, newLayers, deletedLayer, newLayer);
    }

    private cascadeFromChangedLayer(index: number, newLayers: layerString[], oldLayer: layerString, newLayer: layerString) {
        let update: any = null;
        if (index > 0) {
            let startCascadingFromIndex = index - 1;
            update = this.cascadeFilters(newLayers, this.state.selections, this.state.filters[oldLayer]!, this.state.filters, startCascadingFromIndex);
        }
        if (index === 0) {
            let filters = this.state.filters;
            filters[newLayer] = this.state.timeFilteredDataset;
            let stats = this.state.stats;
            stats[newLayer] = computePropertyStat(newLayer, this.state.timeFilteredDataset, this.state.layerModes[newLayer]);
            update = this.cascadeFilters(newLayers, this.state.selections, this.state.timeFilteredDataset, filters, 0, stats);
        }
        this.setState(() => ({
            ...update,
            filtrationLayers: newLayers
        }));
    }

    // Mode management 

    switchFlowTableMode = (newMode: FlowMode) => {
        this.setState(() => ({
            flowTableMode: newMode
        }));
    }

    switchVolumeTimelineMode = (newMode: VolumeTimelineMode) => {
        this.setState(() => ({
            volumeTimelineMode: newMode
        }));
    }

    switchGraphMode = (newMode: Mode) => {
        this.setState(() => ({
            graphMode: newMode
        }));
    }

    switchLayerMode = (newMode: Mode, layer: layerString) => {
        let layerModes = { ...this.state.layerModes };
        let stats = { ...this.state.stats };

        layerModes[layer] = newMode;

        let ipLayers: layerString[] = ['sourceIp', 'destinationIp', 'Ip']
        if (ipLayers.includes(layer)) {
            ipLayers.forEach(ipLayer => layerModes[ipLayer] = newMode)
        };

        let portLayers: layerString[] = ['sourcePort', 'destinationPort', 'Port']
        if (portLayers.includes(layer)) {
            portLayers.forEach(ipLayer => layerModes[ipLayer] = newMode)
        };

        stats[layer] = computePropertyStat(layer, this.state.filters[layer] || [], newMode)
        this.setState(() => ({
            layerModes,
            stats
        }));
    }

    switchAllModes = (newMode: Mode) => {
        console.log(newMode);
        let stats = emptyStats;
        this.state.filtrationLayers.forEach(layer => {
            stats[layer] = computePropertyStat(layer, this.state.filters[layer] || [], newMode)
        })
        this.setState(() => ({
            layerModes: newLayerModes(newMode),
            stats,
            volumeTimelineMode: newMode,
            graphMode: newMode,
        }))
    }

    // Filtering

    setTimeSelection = (selection: number[] | null) => {
        let timeFilteredDataset: Dataset = [];
        if (selection !== null) {
            timeFilteredDataset = this.state.dataset.filter(packet => packet.timestamp >= selection[0] && packet.timestamp <= selection[1])
        }

        // Begin cascading filtering layers from the first one
        let stats = emptyStats;
        let selections = this.state.selections;
        let filters = this.state.filters;
        var update = { selections: this.state.selections, stats: this.state.stats, filteredDataset: timeFilteredDataset }

        let firstLayer = this.state.filtrationLayers[0];
        if (firstLayer) {
            stats[firstLayer] = computePropertyStat(firstLayer, timeFilteredDataset, this.state.layerModes[firstLayer]);
            filters[firstLayer] = timeFilteredDataset;
            selections[firstLayer] = this.filterSelectionsByNewStats(this.state.selections, firstLayer, stats[firstLayer]);
            update = this.cascadeFilters(this.state.filtrationLayers, selections, timeFilteredDataset, filters, 0, stats);
        }

        this.setState((oldState) => ({
            timeSelection: selection,
            timeFilteredDataset,
            newBatchFlag: false,
            ...update
        }));
    }

    // Handler for clicking a checkbox for a single value in StatTable
    handleSelectionClick = (value: string, layer: layerString) => {
        let selections = { ...this.state.selections };
        let currectSelect = selections[layer]!;
        let newSelect = new Set(selections[layer]!);
        if (currectSelect.has(value)) {
            newSelect.delete(value);
        } else {
            newSelect.add(value);
        }

        selections[layer] = newSelect;

        let startCascadingFromIndex = this.state.filtrationLayers.indexOf(layer);
        let update = this.cascadeFilters(this.state.filtrationLayers, selections, this.state.filters[layer]!, this.state.filters, startCascadingFromIndex);
        this.setState(() => ({
            ...update
        }))
    };

    // Handler for clicking 'Select all' checkbox in StatTable
    handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>, layer: layerString) => {
        let newSelections = this.state.selections;
        if (event.target.checked) { // All selected
            newSelections[layer] = new Set(this.state.stats[layer].map((statElement) => statElement[layer]!));
        } else { // No selected
            newSelections[layer] = new Set([]);
        }


        let startCascadingFromIndex = this.state.filtrationLayers.indexOf(layer);
        let update = this.cascadeFilters(this.state.filtrationLayers, newSelections, this.state.filters[layer]!, this.state.filters, startCascadingFromIndex);
        this.setState(() => ({
            ...update
        }))
    };

    // Core filtering loop of propagating filter changes from the changed layer to the laters below
    cascadeFilters = (layers: layerString[], givenSelections: Selections, givenDataset: Dataset, filters: Filters, startFromIndex: number, givenStats?: Stats) => {
        let stats = this.state.stats;
        if (givenStats) stats = givenStats;

        let selections = givenSelections;
        let filteredDataset = givenDataset;

        for (let i = startFromIndex; i < layers.length - 1; i++) {
            let updatedLayer = layers[i];
            let affectedLayer = layers[i + 1];
            // console.log(`Updating ${updatedLayer}, cascading changes to ${affectedLayer}`);
            filteredDataset = this.filterLayerBySelections(updatedLayer, selections, filteredDataset);
            filters[affectedLayer] = filteredDataset;
            stats[affectedLayer] = computePropertyStat(affectedLayer, filteredDataset, this.state.layerModes[affectedLayer]);
            selections[affectedLayer] = this.filterSelectionsByNewStats(givenSelections, affectedLayer, stats[affectedLayer]);
        }
        let lastLayer = layers[layers.length - 1];
        // console.log(`Updating ${lastLayer}, cascading changes to filteredDataset`);
        filteredDataset = this.filterLayerBySelections(lastLayer, selections, filteredDataset);
        return { selections, stats, filteredDataset, filters };
    }

    filterSelectionsByNewStats(selections: Selections, affectedLayer: layerString, newStats: StatElement[]) {
        let newStatsSet = new Set(newStats.map(statElement => statElement[affectedLayer]));
        let resultArray = Array.from(selections[affectedLayer]!).filter((name) => newStatsSet.has(name));
        return new Set(resultArray);
    }

    filterLayerBySelections = (layer: layerString, selections: Selections, dataset: Dataset) => {
        let result: Dataset = [];
        if (layer === 'Port' || layer === 'Ip') {
            dataset.forEach(packet => {
                if (
                    (selections[layer]!.has(packet['source' + layer] as string)) ||
                    (selections[layer]!.has(packet['destination' + layer] as string))
                ) {
                    result.push(packet);
                };
            });
        } else {
            dataset.forEach((packet) => {
                if (
                    (selections[layer]!.has(packet[layer] as string)) ||
                    (packet[layer] === undefined && selections[layer]!.has('N/A'))
                ) {
                    result.push(packet);
                };
            })
        };
        return result;
    };


    // Handler for applying filters imported from a JSON file
    applyImportedFilters = (timeSelection: number[] | null, selections: Selections, layers: layerString[]) => {
        console.log(timeSelection, selections, layers)
        this.setState(() => ({
            filtrationLayers: layers,
            selections: selections,
        }), () => {
            if (this.state.settings.ignoreTimeOnFiltersImport) this.volumeTimelineRef!.current!.selectEverything();
            else this.setTimeSelection(timeSelection);
        });

    }

    setSettings = (settings: Settings) => {
        this.setState(() => ({
            settings
        }))
    }

    openIpModal = (ip: string) => {
        if (this.modalWrapperRef) {
            this.modalWrapperRef.current?.openIpModal(ip);
        }
    }

    render() {
        return (
            <div className={styles.topDownContainer}>
                <div className={styles.leftColumn}>
                    <div>
                        <div className={styles.topDownHeader}>
                            <h1 className={styles.topDownTitle}>
                                PCAPFunnel {this.state.loading && 'is loading...'}
                                {this.state.loading && 'is loading...' && <Spinner />}
                            </h1>
                            <InfoTip id='maintip'><DashboardInfoTipContent /></InfoTip>
                            <SettingsModal settings={this.state.settings} setSettings={this.setSettings} />
                        </div>

                        <div className={styles.topDownToolbar}>
                            <DataInput changeDataset={this.changeDataset}
                                setLoadingInParent={this.setLoading}
                                appendToDataset={this.appendToDataset}
                                fetchDataset={this.fetchDataset}
                            />
                            <div>
                                <span>Filter Presets: </span>
                                <FilterPresetsMemo filtrationLayers={this.state.filtrationLayers} resetLayers={this.resetLayers} />
                                <ChangeLayersModal layers={this.state.filtrationLayers} changeLayers={this.resetLayers} ref={this.changeLayersModalRef} />
                            </div>
                            <div>
                                <FiltersImportExport filtrationLayers={this.state.filtrationLayers}
                                    selections={this.state.selections}
                                    timeSelection={this.state.timeSelection}
                                    applyImportedFilters={this.applyImportedFilters} />
                            </div>
                        </div>
                        <NumberStats dataset={this.state.dataset} />
                    </div>

                    <ModeSwitcher switchModes={this.switchAllModes} />

                    {this.state.firstDataLoaded &&
                        <div className={`${styles.volumeTimelineContainer} paper`}>
                            <VolumeTimelineChart
                                dataset={this.state.dataset}
                                timeSelection={this.state.timeSelection}
                                setTimeSelection={this.setTimeSelection}
                                mode={this.state.volumeTimelineMode}
                                switchModeInParent={this.switchVolumeTimelineMode}
                                newBatchFlag={this.state.newBatchFlag}
                                ref={this.volumeTimelineRef}
                            />
                        </div>}


                    {this.state.firstDataLoaded && this.state.filtrationLayers.map((layer, index) => (
                        <div key={index + layer} className={`${styles.filtrationLayer} paper`}>
                            {this.state.stats[layer].length === 0 &&
                                <NoDataInfoBox layer={layer} deleteLayer={this.deleteLayer} openLayersmModal={() => this.changeLayersModalRef!.current!.openModal()} />
                            }

                            {this.state.stats[layer].length > 0 &&
                                <React.Fragment>
                                    <StatTable
                                        statName={layer}
                                        key={index + layer}
                                        stat={this.state.stats[layer]}
                                        selected={this.state.selections[layer]!}
                                        handleSelect={this.handleSelectionClick}
                                        handleSelectAllClick={this.handleSelectAllClick}
                                        switchLayers={this.switchLayer}
                                        deleteLayer={this.deleteLayer}
                                        openChangeLayersModal={() => this.changeLayersModalRef!.current!.openModal()}
                                        mode={this.state.layerModes[layer]}
                                        switchModeInParent={this.switchLayerMode}
                                        openIpModal={this.state.filteredDataset.length > 0 ? this.openIpModal : null}
                                    />
                                    <div className={styles.layerGraphs}>
                                        {this.state.settings.displayPiecharts &&
                                            <PieChart
                                                stat={this.state.stats[layer]}
                                                statName={layer}
                                                mode={this.state.layerModes[layer]}
                                                selected={this.state.selections[layer]!}
                                            />}
                                        <VolumeTimelineHighlighted
                                            dataset={this.state.filters[layer]!}
                                            highlightedDataset={this.state.filters[this.state.filtrationLayers[index + 1]] || this.state.filteredDataset}
                                            mode={this.state.layerModes[layer]} />
                                    </div>
                                </React.Fragment>
                            }
                        </div>
                    ))}
                    <FiPlusSquare className={`${styles.addLayerIcon} icon`} title='Add or remove filtration layers' onClick={() => this.changeLayersModalRef!.current!.openModal()} />
                </div>

                <div className={styles.rightColumn}>
                    {this.state.filteredDataset.length > 0 &&
                        <React.Fragment>
                            {/* Modal mode */}
                            {this.state.firstDataLoaded && !this.props.openIpTab && !this.props.openConnectionTab &&
                                <NetworkGraphModalWrapper
                                    dataset={this.state.filteredDataset}
                                    mode={this.state.graphMode}
                                    switchModeInParent={this.switchGraphMode}
                                    settings={this.state.settings}
                                    ref={this.modalWrapperRef}
                                />}

                            {/* Tabs mode */}
                            {this.state.firstDataLoaded && this.props.openIpTab && this.props.openConnectionTab &&
                                <NetworkGraphChart
                                    dataset={this.state.filteredDataset}
                                    openIpModal={this.props.openIpTab}
                                    openConnectionModal={this.props.openConnectionTab}
                                    switchModeInParent={this.switchGraphMode}
                                    mode={this.state.graphMode} />
                            }

                            {/* Uncomment below to display Flows table in the right column */}
                            {/* {this.state.firstDataLoaded  && <FlowTable packets={this.state.filteredDataset} mode={this.state.flowTableMode} switchModeInParent={this.switchFlowTableMode} />} */}
                            {this.state.firstDataLoaded &&
                                <PacketTable
                                    packets={this.state.filteredDataset}
                                    rowsPerPageDefault={25}
                                    openIpModal={this.openIpModal}
                                    />}
                        </React.Fragment>
                    }
                    {this.state.filteredDataset.length === 0 &&
                        <NoDataInfoRightColumn />
                    }
                </div>

            </div>
        )
    }
};


