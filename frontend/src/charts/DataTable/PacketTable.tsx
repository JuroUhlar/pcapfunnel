import * as React from 'react'
import { Packet } from '../../types/Dataset';
import { TablePagination, } from '@material-ui/core';
import { showPortService } from '../../utils/portAppDataUtils';
import styles from './DataTable.module.css';
import { Hostname, IpAddress, ipLocation } from '../Geo/geoUtils';
import IpFlag from '../../ui/IpFlag';
import IpHostname from '../../ui/IpHostname';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'
import { SortDirection, sortTableRows } from './tableUtils';
import { niceTimestamp } from '../../utils/dateUtils';

interface PacketTableProps {
    packets: Array<Packet>,
    ipLocationMap?: Map<IpAddress, ipLocation>,
    ipHostnameMap?: Map<IpAddress, Hostname>,
    openIpModal?: (ip: string) => void,
    rowsPerPageDefault?: number,
}

interface PacketTableState {
    page: number,
    rowsPerPage: number,
    sortedPackets: Packet[],
    sortProperty: PacketTableSortProperty,
    sortDirection: SortDirection
}

/**
 * Component that renders a table of the provided packets
 */
export class PacketTable extends React.PureComponent<PacketTableProps, PacketTableState> {
    constructor(props: PacketTableProps) {
        super(props);
        this.state = {
            page: 0,
            rowsPerPage: props.rowsPerPageDefault || 5,
            sortedPackets: props.packets,
            sortProperty: 'index',
            sortDirection: 'asc',
        };
    }

    handleChangePage = (event: unknown, newPage: number) => {
        this.setState(() => ({
            page: newPage,
        }))
    };

    handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState(() => ({
            page: 0,
            rowsPerPage: +event.target.value,
        }));
    };

    componentDidUpdate(prevProps: PacketTableProps) {
        if (this.props.packets !== prevProps.packets) {
            if (this.state.sortProperty === 'index') {
                this.setState(() => ({
                    sortedPackets: this.props.packets
                }))
            } else {
                this.sortTable(this.state.sortProperty, this.state.sortDirection);
            }
        }
    }

    private sortTable(sortProperty: PacketTableSortProperty, sortDirection: SortDirection) {
        let sortedPackets = sortTableRows(this.props.packets, sortProperty, sortDirection) as Packet[];
        this.setState(() => ({
            sortedPackets,
            sortProperty,
            sortDirection,
        }));
    }

    requestSort = (property: PacketTableSortProperty) => {
        if (property !== this.state.sortProperty) {
            this.sortTable(property, 'asc');
        } else {
            let newSortDirection = this.state.sortDirection === 'asc' ? 'desc' : 'asc' as SortDirection;
            this.sortTable(property, newSortDirection);
            
        }
    }

    render() {
        let currentPage = this.state.page;
        let nPages = Math.ceil(this.props.packets.length / this.state.rowsPerPage);
        if (this.props.packets.length === 0) currentPage = 0;
        if (this.props.packets.length > 0 && currentPage > nPages - 1) currentPage = nPages - 1;
        return (
            <div className={styles.dataTable}>
                <div className='paper'>
                    <div className={styles.dataTableToolbar}>
                        <h3>Packets</h3>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                {packetTableColumns.map(column =>
                                    <td
                                        key={column.property}
                                        onClick={() => this.requestSort(column.property)}
                                        className={this.state.sortProperty === column.property ? styles.sortedByColumnHeader : ''}
                                        title={`Sort table by ${column.displayName}`}
                                    >
                                        {column.displayName}
                                        {this.state.sortProperty === column.property && this.state.sortDirection === 'asc' && <FiChevronUp/>}
                                        {this.state.sortProperty === column.property && this.state.sortDirection === 'desc' && <FiChevronDown/>}
                                    </td>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {this.state.sortedPackets.slice(currentPage * this.state.rowsPerPage, currentPage * this.state.rowsPerPage + this.state.rowsPerPage).map((packet) => (
                                <tr key={packet.index}>
                                    <td align='left'>{packet.index}</td>
                                    <td align='right' className={this.props.openIpModal ? styles.cellLink : ''}
                                        onClick={() => this.props.openIpModal ? this.props.openIpModal(packet.sourceIp) : null}>
                                        <IpHostname ip={packet.sourceIp} hostnames={this.props.ipHostnameMap} />
                                        <IpFlag ip={packet.sourceIp} ipLocationMap={this.props.ipLocationMap} returnPlaceholder={this.props.ipLocationMap ? true : false} classes={styles.tableFlag} />
                                    </td>
                                    <td align='right' className={this.props.openIpModal ? styles.cellLink : ''}
                                        onClick={() => this.props.openIpModal ? this.props.openIpModal(packet.destinationIp) : null}>
                                        <IpHostname ip={packet.destinationIp} hostnames={this.props.ipHostnameMap} />
                                        <IpFlag ip={packet.destinationIp} ipLocationMap={this.props.ipLocationMap} returnPlaceholder={this.props.ipLocationMap ? true : false} classes={styles.tableFlag} />
                                    </td>
                                    <td align='right'>{packet.sourcePort} {showPortService(packet.sourcePort)}</td>
                                    <td align='right'>{packet.destinationPort}{showPortService(packet.destinationPort)}</td>
                                    <td align='right'>{packet.app}</td>
                                    <td align='right'>{packet.networkProtocol}</td>
                                    <td align='right'>{packet.transportProtocol}</td>
                                     {/* Hidden avoid confusion between application protocol and app (port-based application name) */}
                                    {/* <td align='right'>{packet.applicationProtocol || ''}</td> */}
                                    <td align='right'>{niceTimestamp(new Date(1000 * packet.timestamp))}</td>
                                    <td align='right'>{packet.bytes}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component='div'
                    count={this.state.sortedPackets.length}
                    rowsPerPage={this.state.rowsPerPage}
                    page={currentPage}
                    onChangePage={this.handleChangePage}
                    onChangeRowsPerPage={this.handleChangeRowsPerPage}
                />
            </div>
        )
    }
}

export type PacketTableSortProperty =
    'index' |
    'timestamp' |
    'networkProtocol' |
    'transportProtocol' |
    'applicationProtocol' |
    'sourceIp' |
    'destinationIp' |
    'sourcePort' |
    'destinationPort' |
    'bytes' |
    'app';

interface packetTableColumn {
    property: PacketTableSortProperty,
    displayName: string
};

const packetTableColumns: packetTableColumn[] = [
    { property: 'index', displayName: 'Index' },
    { property: 'sourceIp', displayName: 'Source IP' },
    { property: 'destinationIp', displayName: 'Destination IP' },
    { property: 'sourcePort', displayName: 'Source Port' },
    { property: 'destinationPort', displayName: 'Destination Port' },
    { property: 'app', displayName: 'App' },
    { property: 'networkProtocol', displayName: 'Network protocol' },
    { property: 'transportProtocol', displayName: 'Transport protocol' },
    // Hidden avoid confusion between application protocol and app (port-based application name)
    // { property: 'applicationProtocol', displayName: 'Application protocol' }, 
    { property: 'timestamp', displayName: 'Timestamp' },
    { property: 'bytes', displayName: 'Bytes' },
]
