import * as React from 'react'
import * as d3 from 'd3'
import { Dataset } from '../../types/Dataset';
import { generateBins, updateRects } from './volumeTimelineUtils';
import { bytesCountFormat } from '../../utils/numberFormats';

interface PacketSizeHistogramProps {
    dataset: Dataset,
}

const MARGIN = { top: 20, right: 30, bottom: 40, left: 90 };
const WIDTH = 560 - MARGIN.left - MARGIN.right;
const HEIGHT = 300 - MARGIN.top - MARGIN.bottom;


/**
 * Display histogram of packet sizes for the provided dataset (packets)
 */
export class PacketSizeHistogram extends React.PureComponent<PacketSizeHistogramProps> {
    constructor(props: PacketSizeHistogramProps) {
        super(props);
        this.svgRef = React.createRef();
        this.xScale = d3.scaleLinear();
        this.yScale = d3.scaleLinear();
    }

    svgRef: React.RefObject<SVGSVGElement>;
    gAll: d3.Selection<SVGGElement, unknown, any, undefined> = d3.select('g.All');
    xScale: d3.ScaleLinear<number, number>;
    yScale: d3.ScaleLinear<number, number>;
    tickValues: number[] = [];
    tickWidth: number = 0;

    initChart = () => {
        if (this.svgRef.current) {
            let svg = this.svgRef.current;
            this.gAll = d3.select(svg).select('.all');
        }
    }

    updateChart = async () => {
        var minBytes = d3.min(this.props.dataset, d => +d.bytes)!;
        var maxBytes = d3.max(this.props.dataset, d => +d.bytes)!;

        // set the ranges
        this.xScale = d3.scaleLinear()
            .domain([minBytes, maxBytes])
            .nice()
            .range([0, WIDTH]);
        this.yScale = d3.scaleLinear()
            .range([HEIGHT, 0]);
        // .range([0, HEIGHT]);

        this.tickValues = this.xScale.ticks(16);
        this.tickWidth = this.tickValues[1] - this.tickValues[0];

        let packetsSortedBySize = this.props.dataset.sort((a, b) => a.bytes - b.bytes)
        var bins = generateBins(this.tickValues, this.tickWidth, packetsSortedBySize, 'packetSize');

        // @ts-ignore Update yScale 
        this.yScale.domain([0, d3.max(bins, (d: any) => d.length)]);

        updateRects('.rects', bins, 'bar', this.gAll, this.xScale, this.yScale, HEIGHT, 'packets');
        updatePacketSizeHistogramAxes(this.gAll, this.tickValues, this.xScale, this.yScale);
    }

    componentDidMount() {
        setTimeout(() => {
            this.initChart();
            this.updateChart();
        }, 0);
    }

    componentDidUpdate(prevProps: PacketSizeHistogramProps) {
        setTimeout(() => {
            this.updateChart();
        }, 0);
    }

    render() {
        return (
            <div className="chart-container">
                <h2>Packet size histogram</h2>
                <svg
                    ref={this.svgRef}
                    width={WIDTH + MARGIN.left + MARGIN.right}
                    height={HEIGHT + MARGIN.top + MARGIN.bottom}>
                    <g className='all' transform={`translate(${MARGIN.left},${MARGIN.top})`}>
                        <g className="xAxis" transform={`translate(0,${HEIGHT})`}></g>
                        <g className="yAxis"></g>
                        <g className="rects"></g>
                    </g>
                </svg>
            </div>
        )
    }
}

export const updatePacketSizeHistogramAxes =
    (
        gAll: d3.Selection<SVGGElement, unknown, any, undefined>,
        tickValues: number[],
        xScale: d3.ScaleLinear<number, number>,
        yScale: d3.ScaleLinear<number, number>,
    ) => {
        // add the x Axis
        gAll.select(".xAxis")
            .transition().duration(500)
            // @ts-ignore
            .call(d3.axisBottom(xScale)
                .tickValues(tickValues)
                .tickFormat((d) => {
                    return bytesCountFormat(d as number);
                })
            )
            .selectAll("text")
            .attr("transform", "translate(-10,0)rotate(-45)")
            .style("text-anchor", "end");

        // Update the y Axis
        gAll.select(".yAxis")
            .transition().duration(500)
            // @ts-ignore
            .call(d3.axisLeft(yScale)
                .tickFormat((d) => {
                    return d3.format('.2s')(d);
                })
            );
    }