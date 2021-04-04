import * as React from 'react'
import { TablePagination } from '@material-ui/core';
import { StatElement, layerString, propertyDisplayNames } from '../../utils/statsUtils';
import { SwitchLayerDropdown } from './SwitchLayerDropdown';
import { Mode } from '../../types/Dataset';
import { percentFormat, getCountFormat } from '../../utils/numberFormats';
import { showPortService } from '../../utils/portAppDataUtils';
import styles from './StatTable.module.css'
import { FiEdit2, FiX } from "react-icons/fi";
import CopyToClipboard from './CopyToClipboard';
import OpenIpModal from './OpenIpModal';

const ROWS_PER_PAGE_OPTIONS = [5, 10, 25, 50]

interface StatTableProps {
    stat: Array<StatElement>,
    statName: layerString,
    selected: Set<string>,
    mode: Mode,
    handleSelect: (value: string, category: layerString) => void
    handleSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>, category: layerString) => void,
    switchLayers: (oldLayer: layerString, newLayer: layerString) => void,
    deleteLayer: (deletedLayer: layerString) => void,
    openChangeLayersModal: () => void;
    switchModeInParent?: (newMode: Mode, layer: layerString) => void,
    openIpModal: ((ip: string) => void) | null,
}

interface StatTableState {
    page: number,
    rowsPerPage: number,
}

/**
 * Renders a statistic table for a single filtration layer from the provided statistics
 * Allows to change filter selections for that fitlration layer
 */
export class StatTable extends React.PureComponent<StatTableProps, StatTableState> {
    constructor(props: StatTableProps) {
        super(props);
        this.state = {
            page: 0,
            rowsPerPage: 10,
        };
    }

    isSelected = (name: string) => this.props.selected.has(name);
    totalCount = () => {
        let result = this.props.stat.reduce((acc, curr) => (curr.count + acc), 0);
        return result
    }
    selectedCount = () => this.props.stat.filter((statElement) => this.isSelected(statElement[this.props.statName]!)).reduce((acc, curr) => (curr.count + acc), 0);

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

    handleModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        let newMode = event.target.value as Mode;
        if (this.props.switchModeInParent) {
            this.props.switchModeInParent(newMode, this.props.statName);
        }
    };

    render() {
        let selectedCount = this.selectedCount();
        let totalCount = this.totalCount();

        let countFormat = getCountFormat(this.props.mode);

        let currentPage = this.state.page;
        let nPages = Math.ceil(this.props.stat.length / this.state.rowsPerPage);
        if (this.props.stat.length === 0) currentPage = 0;
        if (this.props.stat.length > 0 && currentPage > nPages - 1) currentPage = nPages - 1;

        return (
            <div className={styles.statTableContainer}>
                <div className='paper'>
                    <div className={styles.statTableToolbar}>
                        <h3>{propertyDisplayNames[this.props.statName]}</h3>
                        <div className={styles.layerSelect}>
                            {(isIpOrPortAllCombos(this.props.statName)) &&
                                <SwitchLayerDropdown statName={this.props.statName} switchLayers={this.props.switchLayers} />
                            }
                            <select
                                onChange={this.handleModeChange}
                                value={this.props.mode}>
                                <option value='packets'>Packets</option>
                                <option value='bytes'>Bytes</option>
                                <option value='flows'>Connections</option>
                                {!isIpOrPortAllCombos(this.props.statName) && <option value='biflows'>Bi-connections</option>}
                            </select>
                        </div>
                        <FiEdit2 className={styles.editLayersIcon} title='Edit filtration layers' onClick={this.props.openChangeLayersModal} />
                        <FiX className={styles.deleteLayerIcon} title='Remove this filtration layer' onClick={() => this.props.deleteLayer(this.props.statName)} />
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <td align='right'>
                                    <input type='checkbox'
                                        onChange={(event) => this.props.handleSelectAllClick(event, this.props.statName)}
                                        ref={el => el && (el.indeterminate = this.props.selected.size > 0 && this.props.selected.size < this.props.stat.length)}
                                        checked={this.props.stat.length > 0 && this.props.selected.size === this.props.stat.length} />
                                </td>
                                <td align='left' className={styles.statName}>{propertyDisplayNames[this.props.statName]}</td>
                                <td align='right'>{countFormat(totalCount)} total</td>
                                <td align='right'>Percentage</td>
                                <td align='right'></td>
                            </tr>
                        </thead>
                        <tbody>
                            {this.props.stat.slice(currentPage * this.state.rowsPerPage, currentPage * this.state.rowsPerPage + this.state.rowsPerPage).map((statElement: StatElement) => {
                                let rowName = statElement[this.props.statName]!;
                                let isItemSelected = this.isSelected(rowName);
                                return (
                                    <tr className={`${isItemSelected ? styles.statTableRow_selected : styles.statTableRow}`}
                                        key={rowName}
                                        onClick={() => this.props.handleSelect(rowName, this.props.statName)}>
                                        <td align='right' ><input type='checkbox' readOnly checked={isItemSelected} /></td>
                                        <td align='left'>
                                            {rowName}
                                            {layerIsPort(this.props.statName) && showPortService(+rowName)}
                                            <CopyToClipboard value={rowName} />
                                            {layerIsIp(this.props.statName) && this.props.openIpModal !== null && <OpenIpModal ip={rowName} openIpModal={this.props.openIpModal} />}
                                        </td>
                                        <td align='right'>{countFormat(statElement.count)}</td>
                                        <td align='right'>{percentFormat(statElement.count / totalCount)}</td>
                                        <td align='left'>
                                            <div className={isItemSelected ? styles.innerProgressDiv : styles.percentageRect} style={{ width: statElement.count / totalCount * 100 + 'px', }} />
                                        </td>
                                    </tr>
                                );
                            })}
                            <tr key='selected' className={styles.selected_table_row}>
                                <td align='right' >Selected</td>
                                <td align='left'>{this.props.selected.size}</td>
                                <td align='right'>{countFormat(selectedCount)}</td>
                                <td align='right'>{percentFormat(selectedCount / totalCount)}</td>
                                <td align='left'>
                                    <div className={styles.outerProgressDiv}>
                                        {selectedCount > 0 &&
                                            <div className={styles.innerProgressDiv} style={{ width: selectedCount / totalCount * 100 + 'px' }} />}
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <TablePagination
                    rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                    component='div'
                    count={this.props.stat.length}
                    rowsPerPage={this.state.rowsPerPage}
                    page={currentPage}
                    onChangePage={this.handleChangePage}
                    onChangeRowsPerPage={this.handleChangeRowsPerPage}
                />

            </div >

        )
    }
}

export function isIpOrPortAllCombos(layer: layerString) {
    return layer === 'Ip' ||
        layer === 'Port' ||
        layer === 'sourceIp' ||
        layer === 'destinationIp' ||
        layer === 'sourcePort' ||
        layer === 'destinationPort';
}

export function layerIsPort(layer: layerString) {
    return layer === 'Port' ||
        layer === 'sourcePort' ||
        layer === 'destinationPort';
}

export function layerIsIp(layer: layerString) {
    return layer === 'Ip' ||
        layer === 'sourceIp' ||
        layer === 'destinationIp';
}



