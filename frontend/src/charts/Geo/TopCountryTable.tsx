import React, { PureComponent } from 'react'
import Flag from 'react-flagkit'
import { Mode } from '../../types/Dataset'
import { getCountFormat, percentFormat } from '../../utils/numberFormats'
import { layerString, StatElement } from '../../utils/statsUtils'
import { getCountByCountry, ipLocation } from './geoUtils'
import dataTableStyles from '../DataTable/DataTable.module.css';
import styles from './Geo.module.css';
import { TablePagination } from '@material-ui/core'
import { TopCountriesVariant } from '../../layouts/DetailView/IpView'
var countryNames = require("i18n-iso-countries");
countryNames.registerLocale(require("i18n-iso-countries/langs/en.json"));
const getCountryISO2 = require("country-iso-3-to-2");

interface CountryStat {
    countryCodeISO3: string
    countryName: string,
    count: number
}

interface TopCountryTableProps {
    stat: Array<StatElement>,
    statName: layerString,
    ipCountryMap: Map<string, ipLocation>,
    mode: Mode;
    switchModeInParent?: (newMode: Mode) => void;
    switchVariant: (newVariant: TopCountriesVariant) => void;
}

interface TopCountryTableState {
    page: number,
    rowsPerPage: number,
}

/**
 * Component that renders a table of the provided statistic agregated by countries based on the provided ip-country mapping.
 * Allows to switch to a map representation of the same data.
 */
export default class TopCountryTable extends PureComponent<TopCountryTableProps, TopCountryTableState> {
    constructor(props: TopCountryTableProps) {
        super(props);
        this.state = {
            page: 0,
            rowsPerPage: 10,
        };
    }

    handleModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        let newMode = event.target.value as Mode;
        if (this.props.switchModeInParent) {
            this.props.switchModeInParent(newMode);
        }
    };

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


    render() {
        // Compute country statistics
        let countFormat = getCountFormat(this.props.mode);
        let totalCount = this.props.stat.reduce((total, statElement) => total + statElement.count, 0);
        let { countByCountry } = getCountByCountry(this.props.stat, this.props.statName, this.props.ipCountryMap);

        let naCount = countByCountry.get('N/A') | 0;
        countByCountry.remove('N/A');


        let countries: CountryStat[] = [{ countryName: 'Unlocalized', count: naCount, countryCodeISO3: 'N/A' }];
        for (let { key, value } of countByCountry.entries()) {
            countries.push({
                countryCodeISO3: key,
                countryName: countryNames.getName(key, "en", { select: "official" }),
                count: value
            });
        }
        countries.sort((a, b) => b.count - a.count);

        // Render
        return (
            <div className='chart-container'>
                <div className='chartToolbar'>
                    <h2>
                        {/* Top countries ({this.props.statName}) */}
                        Top countries (IP)
                    </h2>
                    <select
                        onChange={this.handleModeChange}
                        value={this.props.mode}>
                        <option value='packets'>Packets</option>
                        <option value='bytes'>Bytes</option>
                        <option value='flows'>Connections</option>
                        <option value='biflows'>Bi-connections</option>
                    </select>
                    <button onClick={() => this.props.switchVariant('map')}>See map</button>
                </div>
                <table className={styles.topCountryTable}>
                    <thead>
                        <tr>
                            <td align="left">Country</td>
                            <td align="right">{this.props.mode}</td>
                            <td align="right">Percentage</td>
                        </tr>
                    </thead>
                    <tbody>
                        {countries.slice(this.state.page * this.state.rowsPerPage, this.state.page * this.state.rowsPerPage + this.state.rowsPerPage)
                            .map(countryStat => (
                                <tr key={countryStat.countryName}>
                                    <td align="left">
                                        {countryStat.countryName !== 'Unlocalized' &&
                                            <Flag
                                                country={getCountryISO2(countryStat.countryCodeISO3)}
                                                size={16}
                                                title={countryStat.countryName}
                                                className={dataTableStyles.tableFlagLeft} />}
                                        {countryStat.countryName}
                                    </td>
                                    <td align="right">{countFormat(countryStat.count)}</td>
                                    <td align="right">{percentFormat(countryStat.count / totalCount)}</td>
                                </tr>
                            ))}
                    </tbody>
                </table>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component='div'
                    count={countries.length}
                    rowsPerPage={this.state.rowsPerPage}
                    page={this.state.page}
                    onChangePage={this.handleChangePage}
                    onChangeRowsPerPage={this.handleChangeRowsPerPage}
                />
            </div>
        )
    }
}
