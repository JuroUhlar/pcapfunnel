import * as React from 'react'
import { Packet } from '../../types/Dataset';
import { TablePagination } from '@material-ui/core';
import { Flow, flowsFromPackets, flowsFromPacketsBiDirectional } from '../../utils/flowUtils';
import { showPortService } from '../../utils/portAppDataUtils';
import styles from './DataTable.module.css';
import { Hostname, IpAddress, ipLocation } from '../Geo/geoUtils';
import IpFlag from '../../ui/IpFlag';
import IpHostname from '../../ui/IpHostname';
import InfoTip from '../../ui/InfoTip/InfoTip';
import { SortDirection, sortTableRows } from './tableUtils';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

export type FlowMode = 'flows' | 'biflows';

interface FlowTableProps {
    packets?: Packet[],
    flows?: Flow[],
    mode: FlowMode,
    switchModeInParent?: (newMode: FlowMode) => void,
    ipLocationMap?: Map<IpAddress, ipLocation>,
    ipHostnameMap?: Map<IpAddress, Hostname>,
    openIpModal?: (ip: string) => void,
}

interface FlowTableState {
    page: number,
    rowsPerPage: number,
    sortedFlows: Flow[],
    sortProperty: FlowTableSortProperty,
    sortDirection: SortDirection
}

/**
 * Component that renders a table of the provided flows or flows computed from the provided packets
 */
export class FlowTable extends React.PureComponent<FlowTableProps, FlowTableState> {
    constructor(props: FlowTableProps) {
        super(props);
        this.state = {
            page: 0,
            rowsPerPage: 5,
            sortedFlows: [],
            sortProperty: 'timestamp',
            sortDirection: 'asc',
        };
    }

    justMounted = true;

    handleChangePage = (event: unknown, newPage: number) => {
        this.setState(() => ({
            page: newPage,
        }))
    };

    updateTable = () => {
        let flows: Flow[] = [];
        if (this.props.packets) {
            if (this.props.mode === 'flows') flows = flowsFromPackets(this.props.packets);
            if (this.props.mode === 'biflows') flows = flowsFromPacketsBiDirectional(this.props.packets);
        } else {
            flows = this.props.flows!;
        }
        let sortedFlows = sortTableRows(flows, this.state.sortProperty, this.state.sortDirection) as Flow[];
        this.setState(() => ({
            sortedFlows,
        }));
    }

    componentDidUpdate(prevProps: FlowTableProps) {
        if ((this.props.packets !== prevProps.packets || this.props.flows !== prevProps.flows || this.props.mode !== prevProps.mode) && !this.justMounted) {
            setTimeout(() => {
                this.updateTable();
            }, 0);
        }
        this.justMounted = false;
    }

    componentDidMount() {
        setTimeout(() => {
            this.updateTable();
        }, 0);
    }

    handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState(() => ({
            page: 0,
            rowsPerPage: +event.target.value,
        }));
    };

    handleModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        let newMode = event.target.value as FlowMode;
        if (this.props.switchModeInParent) {
            this.props.switchModeInParent(newMode);
        }
    };

    private sortTable(sortProperty: FlowTableSortProperty, sortDirection: SortDirection) {
        let sortedFlows = sortTableRows(this.state.sortedFlows, sortProperty, sortDirection) as Flow[];
        this.setState(() => ({
            sortedFlows,
            sortProperty,
            sortDirection,
        }));
    }

    requestSort = (property: FlowTableSortProperty) => {
        if (property !== this.state.sortProperty) {
            this.sortTable(property, 'asc');
        } else {
            let newSortDirection = this.state.sortDirection === 'asc' ? 'desc' : 'asc' as SortDirection;
            this.sortTable(property, newSortDirection);
        }
    }

    render() {
        let currentPage = this.state.page;
        let nPages = Math.ceil(this.state.sortedFlows.length / this.state.rowsPerPage);
        if (this.state.sortedFlows.length === 0) currentPage = 0;
        if (this.state.sortedFlows.length > 0 && currentPage > nPages - 1) currentPage = nPages - 1;
        return (
            <div className={styles.dataTable}>
                <div className='paper'>
                    <div className={styles.dataTableToolbar}>
                        <h3>Connections</h3>
                        <InfoTip id='flowstip'>
                            A connections is an aggregation of all packets with the same source and destination IP, source and destination port and transport protocol.
                        </InfoTip>
                        <div className={styles.modeSelect}>
                            <select
                                onChange={this.handleModeChange}
                                value={this.props.mode}>
                                <option value='flows'>Uni-directional connections</option>
                                <option value='biflows'>Bi-directional (combined) connections</option>
                            </select>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                {flowTableColumns.map(column =>
                                    <td
                                        key={column.property}
                                        onClick={() => this.requestSort(column.property)}
                                        className={this.state.sortProperty === column.property ? styles.sortedByColumnHeader : ''}
                                        title={`Sort table by ${column.displayName}`}
                                    >
                                        {column.displayName}
                                        {this.state.sortProperty === column.property && this.state.sortDirection === 'asc' && <FiChevronUp />}
                                        {this.state.sortProperty === column.property && this.state.sortDirection === 'desc' && <FiChevronDown />}
                                    </td>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {this.state.sortedFlows.slice(currentPage * this.state.rowsPerPage, currentPage * this.state.rowsPerPage + this.state.rowsPerPage).map((flow, index) => (
                                <tr key={index}>
                                    <td align='right' className={this.props.openIpModal ? styles.cellLink : ''}
                                        onClick={() => this.props.openIpModal ? this.props.openIpModal(flow.sourceIp) : null}
                                    >
                                        <IpHostname ip={flow.sourceIp} hostnames={this.props.ipHostnameMap} />
                                        <IpFlag ip={flow.sourceIp} ipLocationMap={this.props.ipLocationMap} returnPlaceholder={true} classes={styles.tableFlag} /></td>
                                    <td align='right' className={this.props.openIpModal ? styles.cellLink : ''}
                                        onClick={() => this.props.openIpModal ? this.props.openIpModal(flow.destinationIp) : null}>
                                        <IpHostname ip={flow.destinationIp} hostnames={this.props.ipHostnameMap} />
                                        <IpFlag ip={flow.destinationIp} ipLocationMap={this.props.ipLocationMap} returnPlaceholder={true} classes={styles.tableFlag} /></td>
                                    <td align='right'>{flow.sourcePort} {`${showPortService(+flow.sourcePort)}`}</td>
                                    <td align='right'>{flow.destinationPort}{showPortService(+flow.destinationPort)}</td>
                                    <td align='right'>{flow.app}</td>
                                    <td align='right'>{flow.networkProtocol}</td>
                                    <td align='right'>{flow.transportProtocol}</td>
                                    {/* Hidden avoid confusion between application protocol and app (port-based application name) */}
                                    {/* <td align='right'>{flow.applicationProtocol}</td> */}
                                    <td align='right'>{new Date(1000 * flow.timestamp).toLocaleString()}</td>
                                    <td align='right'>{flow.count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component='div'
                    count={this.state.sortedFlows.length}
                    rowsPerPage={this.state.rowsPerPage}
                    page={currentPage}
                    onChangePage={this.handleChangePage}
                    onChangeRowsPerPage={this.handleChangeRowsPerPage}
                />
            </div>
        )
    }
}

export type FlowTableSortProperty =
    'sourceIp' |
    'destinationIp' |
    'sourcePort' |
    'destinationPort' |
    'app' |
    'networkProtocol' |
    'transportProtocol' |
    'applicationProtocol' |
    'timestamp' |
    'count';

interface FlowTableColumn {
    property: FlowTableSortProperty,
    displayName: string
};

const flowTableColumns: FlowTableColumn[] = [
    { property: 'sourceIp', displayName: 'Source IP' },
    { property: 'destinationIp', displayName: 'Destination IP' },
    { property: 'sourcePort', displayName: 'Source Port' },
    { property: 'destinationPort', displayName: 'Destination Port' },
    { property: 'app', displayName: 'App/Service' },
    { property: 'networkProtocol', displayName: 'Network protocol' },
    { property: 'transportProtocol', displayName: 'Transport protocol' },
    // Hidden avoid confusion between application protocol and app (port-based application name)
    // { property: 'applicationProtocol', displayName: 'Application protocol' },
    { property: 'timestamp', displayName: 'Timestamp' },
    { property: 'count', displayName: 'Count' },
]