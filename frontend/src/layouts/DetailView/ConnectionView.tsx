import * as React from 'react'
import { Dataset, Mode } from '../../types/Dataset';
import { PacketTable } from '../../charts/DataTable/PacketTable';
import { extractGraph } from '../../charts/NetworkGraph/graphUtils';
import { Graph } from '../../types/Graph';
import Spinner from '../../ui/Spinner/Spinner';
import { Stats, computeStats, statString, layerString, arrayUnion } from '../../utils/statsUtils';
import { IpAddress, ipLocation, LocationApiIPInfo, getMapFromIpApiResponse, fetchFromGeoServer, fetchHostnamesFromIPInfoIO, getHostnameMapFromIPInfoResponse, Hostname } from '../../charts/Geo/geoUtils';
import { GeoConnection } from '../../charts/Geo/GeoConnection';
import { GeoChoroplet } from '../../charts/Geo/GeoChoroplet';
import { VolumeTimelineMirrored } from '../../charts/VolumeTimeline/VolumeTimelineMirrored';
import { flowsFromPackets, Flow, flowsFromPacketsBiDirectional } from '../../utils/flowUtils';
import { FlowTable, FlowMode } from '../../charts/DataTable/FlowTable';
import { PacketSizeHistogramMirrored } from '../../charts/VolumeTimeline/PacketSizeHistogramMirrored';
import { BarChart } from '../../charts/BarChart/BarChart';
import { LayerModes, newLayerModes } from '../Dashboard/Dashboard';
import styles from './DetailView.module.css';
import IpFlag from '../../ui/IpFlag';
import IpHostname from '../../ui/IpHostname';
import { FaExchangeAlt } from 'react-icons/fa';
import { FiActivity, FiArrowLeft, FiBarChart2, FiDatabase, FiGlobe } from 'react-icons/fi';
import ModeSwitcher from '../../ui/ModeSwitcher/ModeSwitcher';
import { TopCountriesVariant } from './IpView';
import TopCountryTable from '../../charts/Geo/TopCountryTable';
import { Settings } from '../Settings/Settings';
import TopLimitSwitcher from '../../ui/TopLimitSwitcher/TopLimitSwitcher';

interface ConnectionViewProps {
    connection: string[];
    dataset: Dataset;
    openIpModal: (ip: string) => void;
    openConnectionModal: (connection: string[]) => void;
    openPreviousModal?: () => void;
    previousModalAvailable?: boolean;
    settings: Settings;
}

interface ConnectionViewState {
    incomingPackets: Dataset;
    outgoingPackets: Dataset;
    filteredDataset: Dataset;
    incomingFlows: Flow[],
    outgoingFlows: Flow[],
    allFlows: Flow[],
    graphs: {
        packets?: Graph,
        bytes?: Graph,
        flows?: Graph,
        biflows?: Graph,
    };
    stats: {
        packets?: Stats,
        bytes?: Stats,
        flows?: Stats,
        biflows?: Stats,
    };
    ipLocations: Map<IpAddress, ipLocation>;
    ipHostnames: Map<IpAddress, Hostname>,
    mirrorLabels: string[];
    flowsTableMode: FlowMode,
    geoConnectionMode: Mode;
    geoChoropletMode: Mode;
    statModes: LayerModes;
    topCountriesVariant: TopCountriesVariant;
    statLimit: number;
}

/**
 * Compoenet that renders a screen containing visualizations for traffic between the provided connection (2 IP addresses)
 * using the provided dataset (packets) 
 */
export class ConnectionView extends React.PureComponent<ConnectionViewProps, ConnectionViewState> {
    constructor(props: any) {
        super(props);
        this.state = {
            incomingPackets: [],
            outgoingPackets: [],
            filteredDataset: [],
            incomingFlows: [],
            outgoingFlows: [],
            flowsTableMode: 'flows',
            allFlows: [],
            graphs: {},
            stats: {},
            ipLocations: new Map(),
            ipHostnames: new Map(),
            mirrorLabels: [],
            geoConnectionMode: 'packets',
            geoChoropletMode: 'packets',
            statModes: newLayerModes('packets'),
            topCountriesVariant: 'table',
            statLimit: 10,
        }
        this.fetchController = new AbortController();
    }

    fetchController: AbortController;

    componentDidMount() {
        setTimeout(this.computeStats, 0);
    }

    componentWillUnmount() {
        this.fetchController.abort();
    }

    switchFlowTableMode = (newMode: FlowMode) => {
        let newFlows: Flow[] = [];
        if (newMode === 'flows') newFlows = flowsFromPackets(this.state.filteredDataset);
        if (newMode === 'biflows') newFlows = flowsFromPacketsBiDirectional(this.state.filteredDataset);
        this.setState(() => ({
            flowsTableMode: newMode,
            allFlows: newFlows,
        }))
    }

    // Computes statistics and graphs and retrieves external data for the provided connection (2 IPs) from the provided dataset
    computeStats = async () => {
        let incomingPackets = this.props.dataset.filter(packet => packet.sourceIp === this.props.connection[0] && packet.destinationIp === this.props.connection[1]);
        let outgoingPackets = this.props.dataset.filter(packet => packet.sourceIp === this.props.connection[1] && packet.destinationIp === this.props.connection[0]);
        let filteredDataset = incomingPackets.concat(outgoingPackets).sort((a, b) => a.timestamp - b.timestamp);

        let incomingFlows = flowsFromPackets(incomingPackets);
        let outgoingFlows = flowsFromPackets(outgoingPackets);
        let allFlows = incomingFlows.concat(outgoingFlows);

        let mirrorLabels = [`Sent from ${this.props.connection[0]}`, `Sent from ${this.props.connection[1]}`];

        let packetsGraph = extractGraph(filteredDataset, 'packets');
        let packetStats = computeStats(filteredDataset, 'packets');

        let ipLocations = new Map();
        this.setState(() => ({
            incomingPackets,
            outgoingPackets,
            filteredDataset,
            incomingFlows,
            outgoingFlows,
            allFlows,
            graphs: { packets: packetsGraph },
            stats: { packets: packetStats },
            ipLocations,
            mirrorLabels
        }), () => {
            let destinationIps = this.state.stats.packets!.destinationIp.map(stat => stat.destinationIp);
            let sourceIps = this.state.stats.packets!.sourceIp.map(stat => stat.sourceIp);
            let allIps = arrayUnion(destinationIps, sourceIps);

            this.getGeoData(allIps);
            this.getHostNameData(allIps);
        });
    };

    getGeoData = async (ips: IpAddress[]) => {
        try {
            const { signal } = this.fetchController;
            let apiResponse: LocationApiIPInfo[] = await (await fetchFromGeoServer(ips, signal)).json();
            let ipLocations = getMapFromIpApiResponse(apiResponse);
            this.setState(() => ({
                ipLocations
            }));
        } catch (error) {
            console.log("Fething geolocation data failed:  \n", error);
        };
    }

    getHostNameData = async (ips: IpAddress[]) => {
        try {
            let response = await (await fetchHostnamesFromIPInfoIO(ips)).json();
            let hostnames = getHostnameMapFromIPInfoResponse(response);
            this.setState(() => ({
                ipHostnames: hostnames
            }));
        } catch (error) {
            console.log("Fething hostname data failed:  \n", error);
        }
    }

    switchGeoConnectionMode = (newMode: Mode) => {
        let graphs = this.getUpdatedGraphs(newMode);
        this.setState(() => ({
            geoConnectionMode: newMode,
            graphs,
        }));
    }

    switchGeoChoropletMode = (newMode: Mode) => {
        let stats = this.getUpdatedStats(newMode);
        this.setState(() => ({
            geoChoropletMode: newMode,
            stats,
        }));
    }

    switchStatMode = (statName: layerString, newMode: Mode) => {
        let stats = this.getUpdatedStats(newMode);
        let statModes = { ...this.state.statModes };
        statModes[statName] = newMode;
        this.setState(() => ({
            statModes,
            stats,
        }));
    }

    switchAllModes = (newMode: Mode) => {
        this.getUpdatedGraphs(newMode);
        this.getUpdatedStats(newMode);
        this.setState(() => ({
            geoConnectionMode: newMode,
            geoChoropletMode: newMode,
            statModes: newLayerModes(newMode),
        }))
    }

    switchTopCountriesVariant = (newVariant: TopCountriesVariant) => {
        this.setState(() => ({
            topCountriesVariant: newVariant
        }));
    }

    changeStatLimit = (limit: number) => {
        this.setState(() => ({
            statLimit: limit
        }))
    }

    private getUpdatedStats(newMode: Mode) {
        let stats = this.state.stats;
        if (!this.state.stats[newMode]) {
            stats[newMode] = computeStats(this.state.filteredDataset, newMode);
        }
        return stats;
    }

    private getUpdatedGraphs(newMode: Mode) {
        let graphs = this.state.graphs;
        if (!this.state.graphs[newMode]) {
            let newGraph = extractGraph(this.state.filteredDataset, newMode);
            graphs[newMode] = newGraph;
        }
        return graphs;
    }

    render() {
        const titleIconSize = 24;
        return (
            <div className={styles.detailView}>
                <h1 className={styles.detailViewTitle}>
                    {this.props.previousModalAvailable && this.props.openPreviousModal && this.state.filteredDataset.length > 0 &&
                        <FiArrowLeft onClick={this.props.openPreviousModal} className={styles.titleBackIcon} title='Go back to previous modal' />}
                    <span className={styles.titleLink} onClick={() => this.props.openIpModal(this.props.connection[0])}>
                        <IpHostname ip={this.props.connection[0]} hostnames={this.state.ipHostnames} />
                        <IpFlag ip={this.props.connection[0]} ipLocationMap={this.state.ipLocations} flagSize={28} classes={styles.titleFlag} />
                    </span>
                    <span>
                        <FaExchangeAlt />
                    </span>
                    <span className={styles.titleLink} onClick={() => this.props.openIpModal(this.props.connection[1])}>
                        <IpHostname ip={this.props.connection[1]} hostnames={this.state.ipHostnames} />
                        <IpFlag ip={this.props.connection[1]} ipLocationMap={this.state.ipLocations} flagSize={28} classes={styles.titleFlag} />
                    </span>
                </h1>
                {this.state.filteredDataset.length === 0 && <Spinner />}
                {this.state.filteredDataset.length > 0 &&
                    <div className={styles.detailStatsContainer}>
                        <h3 className={styles.sectionTitle}><FiActivity size={titleIconSize} />Communications Profile</h3>
                        <div className={styles.sectionOfVisualizations}>
                            <div className={styles.rowOfVisualizations}>
                                <VolumeTimelineMirrored dataset1={this.state.incomingPackets} dataset2={this.state.outgoingPackets} totalDataset={this.state.filteredDataset}
                                    mode={'packets'} labels={this.state.mirrorLabels} />
                                <VolumeTimelineMirrored dataset1={this.state.incomingPackets} dataset2={this.state.outgoingPackets} totalDataset={this.state.filteredDataset}
                                    mode={'bytes'} labels={this.state.mirrorLabels} />
                                <VolumeTimelineMirrored dataset1={this.state.incomingFlows} dataset2={this.state.outgoingFlows} totalDataset={this.state.filteredDataset}
                                    mode={'flows'} labels={this.state.mirrorLabels} />
                                <PacketSizeHistogramMirrored dataset1={this.state.incomingPackets} dataset2={this.state.outgoingPackets} totalDataset={this.state.filteredDataset}
                                    labels={this.state.mirrorLabels} />
                            </div>
                        </div>
                        <ModeSwitcher switchModes={this.switchAllModes} />
                        <h3 className={styles.sectionTitle}><FiGlobe size={titleIconSize} />Geolocation</h3>
                        <div className={styles.sectionOfVisualizations}>
                            <div className={styles.rowOfVisualizations}>
                                <GeoConnection graphLinks={this.state.graphs[this.state.geoConnectionMode]!.links} graphNodes={this.state.graphs[this.state.geoConnectionMode]!.nodes}
                                    ipLocationMap={this.state.ipLocations} mode={this.state.geoConnectionMode}
                                    switchModeInParent={this.switchGeoConnectionMode}
                                    openIpModal={this.props.openIpModal}
                                    openConnectionModal={this.props.openConnectionModal}
                                    clickToEnableZoom={this.props.settings.chartsOnlyZoomableAfterClick}
                                />
                                {this.state.topCountriesVariant === 'map' &&
                                    <GeoChoroplet
                                        stat={this.state.stats[this.state.geoChoropletMode]!.Ip}
                                        statName={"Ip"} ipCountryMap={this.state.ipLocations}
                                        mode={this.state.geoChoropletMode} switchModeInParent={this.switchGeoChoropletMode}
                                        clickToEnableZoom={this.props.settings.chartsOnlyZoomableAfterClick}
                                        switchVariant={this.switchTopCountriesVariant}
                                    />}

                                {this.state.topCountriesVariant === 'table' &&
                                    <TopCountryTable
                                        stat={this.state.stats[this.state.geoChoropletMode]!.Ip}
                                        statName={"Ip"} ipCountryMap={this.state.ipLocations}
                                        mode={this.state.geoChoropletMode} switchModeInParent={this.switchGeoChoropletMode}
                                        switchVariant={this.switchTopCountriesVariant}
                                    />}
                            </div>
                        </div>
                        <h3 className={styles.sectionTitle}><FiBarChart2 size={titleIconSize} />Packet Property Statistics</h3>
                        <TopLimitSwitcher currentLimit={this.state.statLimit} changeLimit={this.changeStatLimit} />
                        <div className={styles.sectionOfVisualizations}>
                            <div className={styles.rowOfVisualizations}>
                                {(['networkProtocol', 'transportProtocol', 'sourceIp', 'destinationIp'] as statString[]).map((stat) => (
                                    <BarChart
                                        stat={this.state.stats[this.state.statModes[stat]]![stat]}
                                        statName={stat}
                                        mode={this.state.statModes[stat]}
                                        switchModeInParent={this.switchStatMode}
                                        key={stat}
                                        statLimit={this.state.statLimit}
                                    />
                                ))}
                            </div>
                            <div className={styles.rowOfVisualizations}>
                                {(['sourcePort',
                                    'destinationPort',
                                    'app',
                                    // 'applicationProtocol'
                                ] as statString[]).map((stat) => (
                                    <BarChart
                                        stat={this.state.stats[this.state.statModes[stat]]![stat]}
                                        statName={stat}
                                        mode={this.state.statModes[stat]}
                                        switchModeInParent={this.switchStatMode}
                                        key={stat}
                                        statLimit={this.state.statLimit}
                                    />
                                ))}
                            </div>
                        </div>
                        <h3 className={styles.sectionTitle}><FiDatabase size={titleIconSize} />Raw Data</h3>
                        <FlowTable flows={this.state.allFlows} mode={this.state.flowsTableMode} switchModeInParent={this.switchFlowTableMode}
                            ipLocationMap={this.state.ipLocations} ipHostnameMap={this.state.ipHostnames}
                            openIpModal={this.props.openIpModal} />
                        <PacketTable packets={this.state.filteredDataset}
                            ipLocationMap={this.state.ipLocations} ipHostnameMap={this.state.ipHostnames}
                            openIpModal={this.props.openIpModal} />
                    </div>}
            </div>
        )
    }
};


