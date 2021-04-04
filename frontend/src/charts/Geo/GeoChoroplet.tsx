import * as React from 'react'
import * as d3 from 'd3'
import { StatElement, layerString } from '../../utils/statsUtils'
import { topo } from './worldMap';
import { getCountByCountry, getCountryTooltip, getCountryTooltipText, getTopCountry, ipLocation } from './geoUtils';
import { percentFormat, getCountFormat } from '../../utils/numberFormats';
import { Mode } from '../../types/Dataset';
import { mousemove, mouseleave, mouseOverThing } from '../../utils/tooltipUtils';
import styles from './Geo.module.css';
import { TopCountriesVariant } from '../../layouts/DetailView/IpView';

interface GeoChoropletProps {
    stat: Array<StatElement>,
    statName: layerString,
    ipCountryMap: Map<string, ipLocation>,
    mode: Mode;
    switchModeInParent?: (newMode: Mode) => void,
    titleTooltipsOnly?: boolean,
    clickToEnableZoom: boolean;
    switchVariant: (newVariant: TopCountriesVariant) => void;
}

const MARGIN = { top: 0, right: 0, bottom: 0, left: 0 };
const WIDTH = 460 - MARGIN.left - MARGIN.right;
const HEIGHT = 355 - MARGIN.top - MARGIN.bottom;

/**
 * Component that renders a world map a colors each country based on
 * the provided statistic and the provided ip-country mapping.
 * Allows to switch to a table representation of the same data.
 */
export class GeoChoroplet extends React.PureComponent<GeoChoropletProps> {
    constructor(props: GeoChoropletProps) {
        super(props);
        this.svgRef = React.createRef();
        this.textRef = React.createRef();
        this.toolTipRef = React.createRef();
    }

    svgRef: React.RefObject<SVGSVGElement>;
    textRef: React.RefObject<HTMLDivElement>
    gAll: d3.Selection<SVGGElement, unknown, null, undefined> | undefined;
    toolTipRef: React.RefObject<HTMLDivElement>;
    tooltip: any;

    initChart = () => {
        if (this.svgRef.current) {
            let svg = d3.select(this.svgRef.current);

            if (this.props.clickToEnableZoom) {
                svg.on('click', () => {
                    // @ts-ignore
                    this.zoomHandler(svg)
                })
            } else {
                // @ts-ignore
                this.zoomHandler(svg);
            }

            this.gAll = svg.append('g')
                .append('g')
                .attr('class', `geo_everything`)
                .attr('transform', 'translate(' + MARGIN.left + ',' + MARGIN.top + ')');

            var projection = d3.geoMercator()
                .scale(70)
                .center([0, 20])
                .translate([WIDTH / 2, HEIGHT / 2]);

            // Draw each country
            this.gAll!
                .selectAll('path')
                .data(topo.features)
                .enter()
                .append('path')
                // @ts-ignore
                .attr('d', d3.geoPath()
                    .projection(projection)
                );

            this.tooltip = d3.select(this.toolTipRef.current);
        }
    }

    updateChart = () => {
        // Compute statistics by country
        let countFormat = getCountFormat(this.props.mode);
        let totalCount = this.props.stat.reduce((total, statElement) => total + statElement.count, 0);
        let { countByCountry, ipsByCountry } = getCountByCountry(this.props.stat, this.props.statName, this.props.ipCountryMap);

        let naCount = countByCountry.get('N/A') | 0;
        d3.select(this.textRef.current).select('#na').text(percentFormat((totalCount - naCount) / totalCount));

        countByCountry.remove('N/A');
        let topCountry = getTopCountry(countByCountry);
        let max = topCountry.count;
        d3.select(this.textRef.current).select('#top').text(`${topCountry.code}`);

        // @ts-ignore
        var colorScale = d3.scaleSequential(d3.interpolateBlues)
            .domain([0, max!])

        // Color country shapes    
        let paths = this.gAll!.selectAll('path');
        paths
            .attr('fill', function (d: any) {
                let count = countByCountry.get(d.id);
                if (count) {
                    // multiply result to make the scale logarihmic and add a 1/10 of range to make countries with 0 at least a bit visible
                    return colorScale(count * 10 + max / 10);
                } else {
                    return '#F0F0F0';
                };
            })
            .style('stroke', (d: any) => countByCountry.get(d.id) ? 'black' : 'white')
            .style('stroke-width', 0.2);

        // Tooltips
        if (this.props.titleTooltipsOnly) {
            paths.selectAll('title').remove();
            paths.append('title').text(getCountryTooltipText(countFormat, countByCountry, ipsByCountry));
        } else {
            paths.on('mouseover', mouseOverThing(this.tooltip, getCountryTooltip(countFormat, countByCountry, ipsByCountry)))
                .on('mousemove', mousemove(this.tooltip))
                .on('mouseleave', mouseleave(this.tooltip));
        }
    }

    handleModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        let newMode = event.target.value as Mode;
        if (this.props.switchModeInParent) {
            this.props.switchModeInParent(newMode);
        }
    };

    componentDidMount() {
        this.initChart();
        this.updateChart();
    }

    componentDidUpdate() {
        this.updateChart();
    }

    zoomActions = () => {
        d3.selectAll(`.geo_everything`)
            .selectAll('path') // To prevent stroke width from scaling
            .attr('transform', d3.event.transform);
    }

    zoomHandler = d3.zoom()
        .on('zoom', this.zoomActions)
        .translateExtent([[-WIDTH, -HEIGHT], [2 * WIDTH, 2 * HEIGHT]])
        .scaleExtent([1 / 2, 10]);

    render() {
        return (
            <div className='chart-container'>
                <div className='chartToolbar'>
                    <h2>
                        Top countries ({this.props.statName})
                    </h2>
                    <select
                        onChange={this.handleModeChange}
                        value={this.props.mode}>
                        <option value='packets'>Packets</option>
                        <option value='bytes'>Bytes</option>
                        <option value='flows'>Connections</option>
                        <option value='biflows'>Bi-connections</option>
                    </select>
                    <button onClick={() => this.props.switchVariant('table')}>See table</button>
                </div>
                <div ref={this.textRef} className={styles.textStats}>
                    Top country: <b id='top'>n/a</b>,<br />Localized {this.props.mode}: <b id='na'>0</b>
                </div>
                <svg
                    ref={this.svgRef}
                    width={WIDTH + MARGIN.left + MARGIN.right} height={HEIGHT + MARGIN.top + MARGIN.bottom}>
                </svg>
                <div className='tooltip' ref={this.toolTipRef}>A tooltip </div>
            </div>
        )
    }
}


