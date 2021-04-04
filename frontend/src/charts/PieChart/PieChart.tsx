import * as React from 'react'
import * as d3 from 'd3'
import { StatElement, layerString } from '../../utils/statsUtils'
import { Mode } from '../../types/Dataset';
import { isIpOrPortAllCombos } from '../StatTable/StatTable';
import { getCountFormat, percentFormat } from '../../utils/numberFormats';
import { mouseOverThing, mousemove, mouseleave } from '../../utils/tooltipUtils';

interface PieChartProps {
    stat: Array<StatElement>,
    statName: layerString,
    mode: Mode,
    selected: Set<string>,
    switchModeInParent?: (statName: layerString, newMode: Mode) => void,
    titleTooltipsOnly?: boolean
}

const MARGIN = 10
const WIDTH = 200
const HEIGHT = 200
const INNER_RADIUS = 50;
const INNER_RADIUS_SELECTED = 20;

/**
 * Displays a piechart of the provided packet statistic
 */
export class PieChart extends React.PureComponent<PieChartProps> {
    constructor(props: PieChartProps) {
        super(props);
        this.svgRef = React.createRef();
        this.toolTipRef = React.createRef();
        this.color = d3.scaleOrdinal(d3.schemeCategory10);
    }

    svgRef: React.RefObject<SVGSVGElement>;
    gAll: d3.Selection<SVGGElement, unknown, null, undefined> | undefined;
    toolTipRef: React.RefObject<HTMLDivElement>;
    tooltip: any;
    color: d3.ScaleOrdinal<string, string>;
    totalCount: number = 0;

    initChart = () => {
        if (this.svgRef.current) {
            this.gAll = d3.select(this.svgRef.current).select('.all');
            this.tooltip = d3.select(this.toolTipRef.current);
        }
    }

    updateChart = () => {
        let stats = this.props.stat;
        var radius = Math.min(WIDTH, HEIGHT) / 2 - MARGIN;
        var g = this.gAll!;
        this.totalCount = this.props.stat.reduce((acc, curr) => (curr.count + acc), 0);

        var pie = d3.pie().value(function (d: any) {
            return (d as StatElement).count;
        });

        var path = d3.arc()
            .outerRadius(radius)
            .innerRadius(INNER_RADIUS);

        var pathSelected = d3.arc()
            .outerRadius(radius)
            .innerRadius(INNER_RADIUS_SELECTED);

        var paths = g.selectAll('path')
            // @ts-ignore
            .data(pie(stats), (d: any) => d.data[this.props.statName]);

        paths.exit().remove();

        paths
            .enter()
            .append('path');

        paths = this.gAll!.selectAll('path');
        paths
            .transition().duration(500)
            // @ts-ignore
            .attr('d', d => this.isSelected(d.data[this.props.statName]) ? pathSelected(d) : path(d))
            // @ts-ignore
            .attr('fill', d => { return this.color(d.data[this.props.statName]); })
            // @ts-ignore
            .attr('opacity', d => this.isSelected(d.data[this.props.statName]) ? 1 : 0.3)

        // Tooltips
        this.updateTooltips(paths);
    };

    handleModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        let newMode = event.target.value as Mode;
        if (this.props.switchModeInParent) {
            this.props.switchModeInParent(this.props.statName, newMode);
        }
    };

    private updateTooltips(paths: any) {
        let countFormat = getCountFormat(this.props.mode);
        if (this.props.titleTooltipsOnly) {
            paths.selectAll('title').remove();
            paths.append('title').text((d: any) => `${d.data[this.props.statName]}, ${countFormat(d.data.count)} (${percentFormat(d.data.count / this.totalCount)})`);

        }
        else {
            paths.on('mouseover', mouseOverThing(this.tooltip, (d: any) => `${d.data[this.props.statName]}, ${countFormat(d.data.count)} (${percentFormat(d.data.count / this.totalCount)})`))
                .on('mousemove', mousemove(this.tooltip))
                .on('mouseleave', mouseleave(this.tooltip));
        }
    }

    private isSelected = (name: any) => this.props.selected.has(name);

    componentDidMount() {
        this.initChart();
        this.updateChart();
    }

    componentDidUpdate() {
        this.updateChart();
    }

    render() {
        return (
            <div>
                <div className='chartToolbar'>
                    {this.props.switchModeInParent &&
                        <select
                            onChange={this.handleModeChange}
                            value={this.props.mode}>
                            <option value='packets'>Packets</option>
                            <option value='bytes'>Bytes</option>
                            <option value='flows'>Connections</option>
                            {!isIpOrPortAllCombos(this.props.statName) && <option value='biflows'>Bi-connections</option>}
                        </select>
                    }
                </div>
                <svg
                    ref={this.svgRef}
                    width={WIDTH} height={HEIGHT}>
                    <g className='all' transform={`translate(${WIDTH / 2},${HEIGHT / 2})`}>
                    </g>
                </svg>
                <div className='tooltip' ref={this.toolTipRef}> A tooltip </div>
            </div>
        )
    }
}