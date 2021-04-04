import * as React from 'react'
import * as d3 from 'd3'
import { Dataset, modeDisplayNames } from '../../types/Dataset';
import { generateBins, updateVolumeTimelineAxes, updateRects, updateRectsFlipped, updateVolumeTimelineAxesFlipped } from './volumeTimelineUtils';
import { Flow } from '../../utils/flowUtils';
import styles from './VolumeTimeline.module.css';

interface VolumeTimelineMirroredProps {
    dataset1: Dataset | Flow[],
    dataset2: Dataset | Flow[],
    totalDataset: Dataset,
    mode: 'packets' | 'bytes' | 'flows',
    labels: string[];
}

const MARGIN = { top: 20, right: 30, bottom: 40, left: 90 };
const WIDTH = 420 - MARGIN.left - MARGIN.right;
const HEIGHT = 260 - MARGIN.top - MARGIN.bottom;


/**
 * Display double volume timelines (one mirrored upside donw) using the two provided datasets (arrays of packets)
 * To be used in IPModal and ConnectionModal
 */
export class VolumeTimelineMirrored extends React.PureComponent<VolumeTimelineMirroredProps> {
    constructor(props: VolumeTimelineMirroredProps) {
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

    updateChart = () => {
        const minTimestamp = d3.min(this.props.totalDataset, d => d.timestamp)!;
        const maxTimestamp = d3.max(this.props.totalDataset, d => d.timestamp)!;

        this.xScale = d3.scaleLinear()
            .domain([minTimestamp, maxTimestamp])
            .nice()
            .range([0, WIDTH]);

        this.yScale1 = d3.scaleLinear()
            .range([HEIGHT, 0]);

        this.yScale2 = d3.scaleLinear()
            .range([0, HEIGHT]);

        this.tickValues = this.xScale.ticks(24);
        this.tickWidth = this.tickValues[1] - this.tickValues[0];
        const minTickValue = this.tickValues[0]
        const tickValuesTimeSpan = this.tickValues[this.tickValues.length - 1] - this.tickValues[0];

        var bins1 = generateBins(this.tickValues, this.tickWidth, this.props.dataset1, this.props.mode);
        var bins2 = generateBins(this.tickValues, this.tickWidth, this.props.dataset2, this.props.mode);

        let totalMax = Math.max(
            (d3.max(bins1, (d: any) => d.length) || 0),
            (d3.max(bins2, (d: any) => d.length) || 0)
        );

        this.yScale1.domain([0, totalMax]);
        this.yScale2.domain([0, totalMax]);

        updateRects('.rects', bins1, 'bar', this.gAll1, this.xScale, this.yScale1, HEIGHT, this.props.mode, this.tooltip)
        updateVolumeTimelineAxes(this.gAll1, this.tickValues, minTickValue, tickValuesTimeSpan, this.xScale, this.yScale1, this.props.mode, true)

        updateRectsFlipped('.rects', bins2, 'bar', this.gAll2, this.xScale, this.yScale2, this.props.mode, this.tooltip)
        updateVolumeTimelineAxesFlipped(this.gAll2, this.tickValues, this.xScale, this.yScale2, this.props.mode);
    }

    componentDidMount() {
        setTimeout(() => {
            this.initChart();
            this.updateChart();
        }, 0)
    }

    componentDidUpdate() {
        setTimeout(() => {
            this.updateChart();
        }, 0)
    }

    render() {
        return (
            <div className={`${styles.mirrorContainer} chart-container`} >
                <h2>{modeDisplayNames[this.props.mode]}</h2>
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