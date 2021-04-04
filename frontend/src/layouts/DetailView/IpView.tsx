
import * as React from 'react'
import { Dataset, Mode } from '../../types/Dataset';
import { PacketTable } from '../../charts/DataTable/PacketTable';
import { SankeyChart } from '../../charts/Sankey/SankeyChart';
import { extractGraph } from '../../charts/NetworkGraph/graphUtils';
import { Graph } from '../../types/Graph';
import Spinner from '../../ui/Spinner/Spinner';
import { Stats, computeStats, layerString, statString } from '../../utils/statsUtils';
import { BarChart } from '../../charts/BarChart/BarChart';
import { IpAddress, ipLocation, LocationApiIPInfo, getMapFromIpApiResponse, fetchFromGeoServer, fetchHostnamesFromIPInfoIO, getHostnameMapFromIPInfoResponse, Hostname } from '../../charts/Geo/geoUtils';
import { arrayUnion } from '../../utils/statsUtils';
import { GeoConnection } from '../../charts/Geo/GeoConnection';
import { GeoChoroplet } from '../../charts/Geo/GeoChoroplet';
import { VolumeTimelineMirrored } from '../../charts/VolumeTimeline/VolumeTimelineMirrored';
import { FlowTable, FlowMode } from '../../charts/DataTable/FlowTable';
import { flowsFromPackets, Flow, flowsFromPacketsBiDirectional } from '../../utils/flowUtils';
import { PacketSizeHistogramMirrored } from '../../charts/VolumeTimeline/PacketSizeHistogramMirrored';
import { LayerModes, newLayerModes } from '../Dashboard/Dashboard';
import styles from './DetailView.module.css';
import IpFlag from '../../ui/IpFlag';
import IpHostname from '../../ui/IpHostname';
import { FiActivity, FiArrowLeft, FiBarChart2, FiDatabase, FiGitPullRequest } from 'react-icons/fi';
import ModeSwitcher from '../../ui/ModeSwitcher/ModeSwitcher';
import TopCountryTable from '../../charts/Geo/TopCountryTable';
import { Settings } from '../Settings/Settings';
import TopLimitSwitcher from '../../ui/TopLimitSwitcher/TopLimitSwitcher';

export type TopCountriesVariant = 'table' | 'map';

interface SingleIpViewProps {
    ip: string;
    dataset: Dataset;
    openIpModal: (ip: string) => void;
    openConnectionModal: (connection: string[]) => void;
    openPreviousModal?: () => void;
    previousModalAvailable?: boolean;
    settings: Settings;
}

interface SingleIpViewState {
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
    ipLocations: Map<IpAddress, ipLocation>,
    ipHostnames: Map<IpAddress, Hostname>,
    flowsTableMode: FlowMode,
    sankeyMode: Mode;
    geoConnectionMode: Mode;
    geoChoropletMode: Mode;
    statModes: LayerModes;
    topCountriesVariant: TopCountriesVariant;
    noData: boolean;
    statLimit: number;
}


export const RECIEVED_SENT = ['Recieved', 'Sent'];


/**
 * Component that renders a screen containing visualizations for traffic to and from the provided IP address
 * using the provided dataset (packets) 
 */
export class IpView extends React.PureComponent<SingleIpViewProps, SingleIpViewState> {
    constructor(props: any) {
        super(props);
        this.state = {
            incomingPackets: [],
            outgoingPackets: [],
            filteredDataset: [],
            incomingFlows: [],
            outgoingFlows: [],
            allFlows: [],
            flowsTableMode: 'flows',
            graphs: {},
            stats: {},
            sankeyMode: 'packets',
            ipLocations: new Map(),
            ipHostnames: new Map(),
            geoConnectionMode: 'packets',
            geoChoropletMode: 'packets',
            statModes: newLayerModes('packets'),
            topCountriesVariant: 'table',
            noData: false,
            statLimit: 10,
        };
        this.fetchController = new AbortController();
    }

    fetchController: AbortController;

    componentDidMount() {
        setTimeout(this.computeStats, 0);
    }

    componentWillUnmount() {
        this.fetchController.abort();
    }

    // Computes statistics and graphs and retrieves external data for the provided IP from the provided dataset
    computeStats = async () => {
        let filteredDataset = this.props.dataset.filter(packet => packet.destinationIp === this.props.ip || packet.sourceIp === this.props.ip);

        if (filteredDataset.length === 0) {
            this.setState(() => ({
                noData: true,
            }));
            return;
        }
        let incomingPackets = filteredDataset
            .filter(packet => packet.destinationIp === this.props.ip)
        let outgoingPackets = filteredDataset
            .filter(packet => packet.sourceIp === this.props.ip)

        let incomingFlows = flowsFromPackets(incomingPackets);
        let outgoingFlows = flowsFromPackets(outgoingPackets);
        let allFlows = incomingFlows.concat(outgoingFlows);

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

    switchFlowTableMode = (newMode: FlowMode) => {
        let newFlows: Flow[] = [];
        if (newMode === 'flows') newFlows = flowsFromPackets(this.state.filteredDataset);
        if (newMode === 'biflows') newFlows = flowsFromPacketsBiDirectional(this.state.filteredDataset);
        this.setState(() => ({
            flowsTableMode: newMode,
            allFlows: newFlows,
        }))
    }

    switchSankeyMode = (newMode: Mode) => {
        let graphs = this.getUpdatedGraphs(newMode);
        this.setState(() => ({
            sankeyMode: newMode,
            graphs,
        }));
    };

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
            sankeyMode: newMode,
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

    getUpdatedStats = (newMode: Mode) => {
        let stats = this.state.stats;
        if (!this.state.stats[newMode]) {
            stats[newMode] = computeStats(this.state.filteredDataset, newMode);
        }
        return stats;
    }

    getUpdatedGraphs = (newMode: Mode) => {
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
                    <IpHostname ip={this.props.ip} hostnames={this.state.ipHostnames} />
                    <IpFlag ip={this.props.ip} ipLocationMap={this.state.ipLocations} flagSize={28} classes={styles.titleFlag} />
                </h1>
                {this.state.filteredDataset.length === 0 && this.state.noData === false && <Spinner />}
                {this.state.noData &&
                    <div>
                        <h1>No Data</h1>
                        <p>There are no packets coming from or to {this.props.ip} in your current selection. Check your filters in the left column.</p>
                    </div>
                }
                {this.state.filteredDataset.length > 0 &&
                    <div className={styles.detailStatsContainer}>
                        <h3 className={styles.sectionTitle}><FiActivity size={titleIconSize} />Communications Profile</h3>
                        <div className={styles.sectionOfVisualizations}>
                            <div className={styles.rowOfVisualizations}>
                                <VolumeTimelineMirrored dataset1={this.state.incomingPackets} dataset2={this.state.outgoingPackets} totalDataset={this.state.filteredDataset}
                                    mode={'packets'} labels={RECIEVED_SENT} />
                                <VolumeTimelineMirrored dataset1={this.state.incomingPackets} dataset2={this.state.outgoingPackets} totalDataset={this.state.filteredDataset}
                                    mode={'bytes'} labels={RECIEVED_SENT} />
                                <VolumeTimelineMirrored dataset1={this.state.incomingFlows} dataset2={this.state.outgoingFlows} totalDataset={this.state.filteredDataset}
                                    mode={'flows'} labels={RECIEVED_SENT} />
                                <PacketSizeHistogramMirrored dataset1={this.state.incomingPackets} dataset2={this.state.outgoingPackets} totalDataset={this.state.filteredDataset}
                                    labels={RECIEVED_SENT} />
                            </div>
                        </div>
                        <ModeSwitcher switchModes={this.switchAllModes} />
                        <h3 className={styles.sectionTitle}><FiGitPullRequest size={titleIconSize} />Network Profile</h3>
                        <div className={styles.sectionOfVisualizations}>
                            <div className={styles.rowOfVisualizations}>

                                <SankeyChart links={this.state.graphs[this.state.sankeyMode]!.linksSingleDirection!} selectedIp={this.props.ip} mode={this.state.sankeyMode}
                                    switchModeInParent={this.switchSankeyMode} totalPackets={this.state.filteredDataset.length}
                                    openIpModal={this.props.openIpModal}
                                    openConnectionModal={this.props.openConnectionModal}
                                    clickToEnableZoom={true} />

                                <GeoConnection graphLinks={this.state.graphs[this.state.geoConnectionMode]!.links} graphNodes={this.state.graphs[this.state.geoConnectionMode]!.nodes}
                                    ipLocationMap={this.state.ipLocations} mode={this.state.geoConnectionMode}
                                    switchModeInParent={this.switchGeoConnectionMode}
                                    openIpModal={this.props.openIpModal}
                                    openConnectionModal={this.props.openConnectionModal}
                                    currentIp={this.props.ip}
                                    clickToEnableZoom={this.props.settings.chartsOnlyZoomableAfterClick} />

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
                                {(['networkProtocol', 'transportProtocol', 'sourceIp', 'destinationIp',] as statString[]).map((stat) => (
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


