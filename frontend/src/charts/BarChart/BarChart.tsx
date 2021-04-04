import * as React from 'react'
import * as d3 from 'd3'
import { StatElement, statString, layerString, propertyDisplayNames } from '../../utils/statsUtils'
import { Mode } from '../../types/Dataset';
import { isIpOrPortAllCombos, layerIsPort } from '../StatTable/StatTable';
import { getCountFormat, getAxisFormat, computeBytesTickValues } from '../../utils/numberFormats';
import { showPortService } from '../../utils/portAppDataUtils';
import { mousemove, mouseleave, mouseOverThing } from '../../utils/tooltipUtils';

interface BarChartProps {
    stat: Array<StatElement>,
    statName: statString,
    mode: Mode,
    switchModeInParent?: (statName: layerString, newMode: Mode) => void,
    titleTooltipsOnly?: boolean,
    statLimit?: number
}

const MAX_BARCHART_ELEMENTS = 15;
const MARGIN = { top: 20, right: 30, bottom: 50, left: 90 };
const WIDTH = 400 - MARGIN.left - MARGIN.right;
const HEIGHT = 380 - MARGIN.top - MARGIN.bottom;

/**
 * Component that renders a barchart of the provided statistics
 */
export class BarChart extends React.PureComponent<BarChartProps> {
    constructor(props: BarChartProps) {
        super(props);
        this.svgRef = React.createRef();
        this.toolTipRef = React.createRef();
    }

    svgRef: React.RefObject<SVGSVGElement>;
    gAll: d3.Selection<SVGGElement, unknown, null, undefined> | undefined;
    toolTipRef: React.RefObject<HTMLDivElement>;
    tooltip: any;

    initChart = () => {
        if (this.svgRef.current) {
            this.gAll = d3.select(this.svgRef.current).select('.all');
            this.tooltip = d3.select(this.toolTipRef.current);
        }
    }

    updateChart = () => {
        const cutOff = this.props.statLimit || MAX_BARCHART_ELEMENTS; 
        let dataset = this.props.stat.slice(0, cutOff);
        let categoryVariable = this.props.statName;
        let numericVariableMax: number = d3.max(dataset, (d) => +d.count)!;
        let gAll = this.gAll!;


        let x = d3.scaleLinear()
            .domain([0, numericVariableMax])
            .range([0, WIDTH]);

        let y = d3.scaleBand()
            .range([0, HEIGHT])
            .domain(dataset.map((d): string => d[categoryVariable]!))
            .padding(.2);

        let rects = gAll.select('.rects').selectAll('rect')
            .data(dataset, (d: any) => d[categoryVariable]);

        // Remove deleted rects  
        rects
            .exit()
            .remove()

        // Create new rects
        rects
            .enter()
            .append('rect')
            .attr('x', x(0))
            .attr('width', x(0))
            .attr('height', y.bandwidth())

        // Update all rects
        rects = gAll.selectAll('rect')
        rects
            .transition()
            .duration(500)
            // @ts-ignore
            .attr('y', (d: StatElement) => y(d[categoryVariable]))
            .attr('width', (d: StatElement) => x(d.count))
            .attr('height', y.bandwidth())
            .attr('class', 'bar');

        // Tooltips
        let countFormat = getCountFormat(this.props.mode);
        if (this.props.titleTooltipsOnly) {
            rects.selectAll('title').remove();
            rects.append('title').text((d: StatElement) => countFormat(d.count))

        } else {
            rects.on('mouseover', mouseOverThing(this.tooltip, (d: StatElement) => `${d[this.props.statName]}: ${countFormat(d.count)}`))
                .on('mousemove', mousemove(this.tooltip))
                .on('mouseleave', mouseleave(this.tooltip));
        }

        // Update axes
        let xAxisTicks = x.ticks()
            .filter(tick => Number.isInteger(tick));
        if (this.props.mode === 'bytes') xAxisTicks = computeBytesTickValues(xAxisTicks, x.domain()[1]);

        gAll.select('.xAxis').transition().duration(500)
            // @ts-ignore
            .call(d3.axisBottom(x)
                .tickValues(xAxisTicks)
                .tickFormat((d) => getAxisFormat(this.props.mode)(d as number))
            )
            .selectAll('text')
            .attr('transform', 'translate(-10,0)rotate(-45)')
            .style('text-anchor', 'end');

        gAll.select('.yAxis')
            .transition().duration(500)
            // @ts-ignore
            .call(d3.axisLeft(y)
                .tickFormat((d) => {
                    if (layerIsPort(this.props.statName)) return d + showPortService(+d);
                    return d;
                })
            );

    };

    handleModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        let newMode = event.target.value as Mode;
        if (this.props.switchModeInParent) {
            this.props.switchModeInParent(this.props.statName, newMode);
        }
    };

    componentDidMount() {
        this.initChart();
        this.updateChart();
    }

    componentDidUpdate() {
        this.updateChart();
    }

    render() {
        return (
            <div className='chart-container'>
                <div className='chartToolbar'>
                    <h2>
                        {propertyDisplayNames[this.props.statName]} 
                    </h2>
                    <select
                        onChange={this.handleModeChange}
                        value={this.props.mode}>
                        <option value='packets'>Packets</option>
                        <option value='bytes'>Bytes</option>
                        <option value='flows'>Connections</option>
                        {!isIpOrPortAllCombos(this.props.statName) && <option value='biflows'>Bi-connections</option>}
                    </select>
                </div>
                <svg
                    ref={this.svgRef}
                    width={WIDTH + MARGIN.left + MARGIN.right} height={HEIGHT + MARGIN.top + MARGIN.bottom}>
                    <g className='all' transform={`translate(${MARGIN.left},${MARGIN.top})`}>
                        <g className='xAxis' transform={`translate(0,${HEIGHT})`}></g>
                        <g className='yAxis'></g>
                        <g className='rects'></g>
                    </g>
                </svg>
                <div className='tooltip' ref={this.toolTipRef}>A tooltip </div>
            </div>
        )
    }
}