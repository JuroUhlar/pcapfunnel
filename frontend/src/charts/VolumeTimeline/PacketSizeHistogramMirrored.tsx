import * as React from 'react'
import * as d3 from 'd3'
import { Dataset } from '../../types/Dataset';
import { generateBins, updateRects, updateRectsFlipped } from './volumeTimelineUtils';
import { bytesCountFormat, naturalFormat } from '../../utils/numberFormats';
import styles from './VolumeTimeline.module.css';

interface PacketSizeHistogramMirroredProps {
    dataset1: Dataset,
    dataset2: Dataset,
    totalDataset: Dataset,
    labels: string[];
}

const MARGIN = { top: 20, right: 30, bottom: 40, left: 90 };
const WIDTH = 420 - MARGIN.left - MARGIN.right;
const HEIGHT = 260 - MARGIN.top - MARGIN.bottom;

/**
 * Display two histogram of packet sizes (one mirroered) using the two provided datasets (arrays of packets)
 * To be used IP Modal and Connection Modal.
 */
export class PacketSizeHistogramMirrored extends React.PureComponent<PacketSizeHistogramMirroredProps> {
    constructor(props: PacketSizeHistogramMirroredProps) {
        super(props);
        this.svgRef1 = React.createRef();
        this.svgRef2 = React.createRef();
        this.xScale = d3.scaleLinear();
        this.yScale1 = d3.scaleLinear();
        this.yScale2 = d3.scaleLinear();
        this.toolTipRef = React.createRef();
    }

    svgRef1: React.RefObject<SVGSVGElement>;
    svgRef2: React.RefObject<SVGSVGElement>;
    gAll1: d3.Selection<SVGGElement, unknown, any, undefined> = d3.select('g.All');
    gAll2: d3.Selection<SVGGElement, unknown, any, undefined> = d3.select('g.All');
    xScale: d3.ScaleLinear<number, number>;
    yScale1: d3.ScaleLinear<number, number>;
    yScale2: d3.ScaleLinear<number, number>;
    tickValues: number[] = [];
    tickWidth: number = 0;
    toolTipRef: React.RefObject<HTMLDivElement>;
    tooltip: any;

    initChart = () => {
        if (this.svgRef1.current) {
            let svg = this.svgRef1.current;
            this.gAll1 = d3.select(svg).select('.all');
            this.gAll1.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 0 - 75)
                .attr("x", 0 - (HEIGHT / 2))
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .style("font-family", "Arial, Helvetica, sans-serif")
                .style("font-weight", "700")
                .text(this.props.labels[0]);
        }
        if (this.svgRef2.current) {
            let svg = this.svgRef2.current;
            this.gAll2 = d3.select(svg).select('.all');
            this.gAll2.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 0 - 75)
                .attr("x", 0 - (HEIGHT / 2))
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .style("font-family", "Arial, Helvetica, sans-serif")
                .style("font-weight", "700")
                .text(this.props.labels[1]);
        }
        this.tooltip = d3.select(this.toolTipRef.current);
    }

    updateChart = async () => {
        var minBytes = d3.min(this.props.totalDataset, d => +d.bytes)!;
        var maxBytes = d3.max(this.props.totalDataset, d => +d.bytes)!;

        // set the ranges
        this.xScale = d3.scaleLinear()
            .domain([minBytes, maxBytes])
            .nice()
            .range([0, WIDTH]);

        this.yScale1 = d3.scaleLinear()
            .range([HEIGHT, 0]);

        this.yScale2 = d3.scaleLinear()
            .range([0, HEIGHT]);

        this.tickValues = this.xScale.ticks(16);
        this.tickWidth = this.tickValues[1] - this.tickValues[0];

        let packetsSortedBySize1 = this.props.dataset1.sort((a, b) => a.bytes - b.bytes)
        let packetsSortedBySize2 = this.props.dataset2.sort((a, b) => a.bytes - b.bytes)
        var bins1 = generateBins(this.tickValues, this.tickWidth, packetsSortedBySize1, 'packetSize');
        var bins2 = generateBins(this.tickValues, this.tickWidth, packetsSortedBySize2, 'packetSize');



        let totalMax = Math.max(
            (d3.max(bins1, (d: any) => d.length) || 0),
            (d3.max(bins2, (d: any) => d.length) || 0)
        );

        this.yScale1.domain([0, totalMax]);
        this.yScale2.domain([0, totalMax]);

        updateRects('.rects', bins1, 'bar', this.gAll1, this.xScale, this.yScale1, HEIGHT, 'packets', this.tooltip)
        updatePacketSizeHistogramAxes(this.gAll1, this.tickValues, this.xScale, this.yScale1);

        updateRectsFlipped('.rects', bins2, 'bar', this.gAll2, this.xScale, this.yScale2, 'packets', this.tooltip);
        updatePacketSizeHistogramAxesFlipped(this.gAll2, this.tickValues, this.xScale, this.yScale2);

    }

    componentDidMount() {
        setTimeout(() => {
            this.initChart();
            this.updateChart();
        }, 0);
    }

    componentDidUpdate(prevProps: PacketSizeHistogramMirroredProps) {
        setTimeout(() => {
            this.updateChart();
        }, 0);
    }

    render() {
        return (
            <div className={`${styles.mirrorContainer} chart-container`}>
                <h2>Packet size histogram</h2>
                <svg
                    ref={this.svgRef1}
                    width={WIDTH + MARGIN.left + MARGIN.right}
                    height={HEIGHT + MARGIN.top + MARGIN.bottom}>
                    <g className='all' transform={`translate(${MARGIN.left},${MARGIN.top})`}>
                        <g className="xAxis" transform={`translate(0,${HEIGHT})`}></g>
                        <g className="yAxis"></g>
                        <g className="rects"></g>
                    </g>
                </svg>
                <svg
                    ref={this.svgRef2}
                    width={WIDTH + MARGIN.left + MARGIN.right}
                    height={HEIGHT + MARGIN.top + MARGIN.bottom}>
                    <g className='all' transform={`translate(${MARGIN.left},3)`}>
                        <g className="xAxis" transform={`translate(0,0)`}></g>
                        <g className="yAxis"></g>
                        <g className="rects"></g>
                    </g>
                </svg>
                <div className='tooltip' ref={this.toolTipRef}> A tooltip </div>
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
        const yAxisTicks = yScale.ticks()
            .filter(tick => Number.isInteger(tick));

        gAll.select(".yAxis")
            .transition().duration(500)
            // @ts-ignore
            .call(d3.axisLeft(yScale)
                .tickValues(yAxisTicks)
                .tickFormat(naturalFormat)
            );
    };


export const updatePacketSizeHistogramAxesFlipped =
    (
        gAll: d3.Selection<SVGGElement, unknown, any, undefined>,
        tickValues: number[],
        xScale: d3.ScaleLinear<number, number>,
        yScale: d3.ScaleLinear<number, number>,
    ) => {
        // add the x Axis
        gAll.select(".xAxis")
            .transition().duration(500)
            // @ts-ignore+
            .call(d3.axisTop(xScale)
                .tickValues(tickValues)
                // @ts-ignore
                .tickFormat(''));

        // Update the y Axis
        const yAxisTicks = yScale.ticks()
            .filter(tick => Number.isInteger(tick));

        gAll.select(".yAxis")
            .transition().duration(500)
            // @ts-ignore
            .call(d3.axisLeft(yScale)
                .tickValues(yAxisTicks)
                .tickFormat(naturalFormat)
            );
    }

