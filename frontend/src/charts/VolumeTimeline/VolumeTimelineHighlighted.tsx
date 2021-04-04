import * as React from 'react'
import * as d3 from 'd3'
import { Dataset, Mode, Packet } from '../../types/Dataset';
import { generateBins, updateVolumeTimelineAxes, updateRects } from './volumeTimelineUtils';
import { Flow, flowsFromPackets, flowsFromPacketsBiDirectional } from '../../utils/flowUtils';

interface VolumeTimelineHighlightedProps {
    dataset: Dataset,
    highlightedDataset: Dataset,
    mode: Mode,
}

const MARGIN = { top: 20, right: 30, bottom: 40, left: 60 };
const WIDTH = 480 - MARGIN.left - MARGIN.right;
const HEIGHT = 260 - MARGIN.top - MARGIN.bottom;

/**
 * Display volume timeline using the provided dataset (packets), highlighting the traffic inside the provided highlightedDataset
 * To be used in each filtration layer.
 */
export class VolumeTimelineHighlighted extends React.PureComponent<VolumeTimelineHighlightedProps> {
    constructor(props: VolumeTimelineHighlightedProps) {
        super(props);
        this.svgRef = React.createRef();
        this.xScale = d3.scaleLinear();
        this.yScale = d3.scaleLinear();
        this.toolTipRef = React.createRef();
    }

    svgRef: React.RefObject<SVGSVGElement>;
    gAll: d3.Selection<SVGGElement, unknown, any, undefined> = d3.select('g.All');
    xScale: d3.ScaleLinear<number, number>;
    yScale: d3.ScaleLinear<number, number>;
    tickValues: number[] = [];
    tickWidth: number = 0;
    toolTipRef: React.RefObject<HTMLDivElement>;
    tooltip: any;

    initChart = () => {
        if (this.svgRef.current) {
            let svg = this.svgRef.current;
            this.gAll = d3.select(svg).select('.all');
            this.tooltip = d3.select(this.toolTipRef.current);
        }
    }

    updateChart = async () => {
        const minTimestamp = d3.min(this.props.dataset, d => d.timestamp)!;
        const maxTimestamp = d3.max(this.props.dataset, d => d.timestamp)!;

        let dataset: Packet[] | Flow[] = this.props.dataset;
        let highlightedDataset: Packet[] | Flow[] = this.props.highlightedDataset;
        if (this.props.mode === 'flows') {
            dataset = flowsFromPackets(this.props.dataset);
            highlightedDataset = flowsFromPackets(this.props.highlightedDataset);
        }
        if (this.props.mode === 'biflows') {
            dataset = flowsFromPacketsBiDirectional(this.props.dataset);
            highlightedDataset = flowsFromPacketsBiDirectional(this.props.highlightedDataset);
        }

        // set the ranges
        this.xScale = d3.scaleLinear()
            .domain([minTimestamp, maxTimestamp])
            .nice()
            .range([0, WIDTH]);
        this.yScale = d3.scaleLinear()
            .range([HEIGHT, 0]);

        this.tickValues = this.xScale.ticks(28);
        this.tickWidth = this.tickValues[1] - this.tickValues[0];
        const minTickValue = this.tickValues[0]
        const tickValuesTimeSpan = this.tickValues[this.tickValues.length - 1] - this.tickValues[0];


        var bins = generateBins(this.tickValues, this.tickWidth, dataset, this.props.mode);
        var highlightedBins = generateBins(this.tickValues, this.tickWidth, highlightedDataset, this.props.mode);

        // @ts-ignore Update yScale 
        this.yScale.domain([0, d3.max(bins, (d: any) => d.length)]);

        updateRects('.rects', bins, 'bar', this.gAll, this.xScale, this.yScale, HEIGHT, this.props.mode, this.tooltip)
        updateRects('.highlights', highlightedBins, 'highlight', this.gAll, this.xScale, this.yScale, HEIGHT, this.props.mode, this.tooltip)
        updateVolumeTimelineAxes(this.gAll, this.tickValues, minTickValue, tickValuesTimeSpan, this.xScale, this.yScale, this.props.mode, true)
    }

    componentDidMount() {
        setTimeout(() => {
            this.initChart();
            this.updateChart();
        }, 0);
    }

    componentDidUpdate(prevProps: VolumeTimelineHighlightedProps) {
        if (prevProps.dataset !== this.props.dataset || prevProps.mode !== this.props.mode) {
            setTimeout(() => {
                this.updateChart();
            }, 0);
        } else {
            setTimeout(() => {
                let highlightedDataset: Packet[] | Flow[] = this.props.highlightedDataset;
                if (this.props.mode === 'flows') highlightedDataset = flowsFromPackets(this.props.highlightedDataset);
                if (this.props.mode === 'biflows') highlightedDataset = flowsFromPacketsBiDirectional(this.props.highlightedDataset);
                // @ts-ignore
                let highlightedBins = generateBins(this.tickValues, this.tickWidth, highlightedDataset, this.props.mode);
                updateRects('.highlights', highlightedBins, 'highlight', this.gAll, this.xScale, this.yScale, HEIGHT, this.props.mode, this.tooltip)
            }, 0);
        }
    }

    render() {
        return (
            <div>
                <svg
                    ref={this.svgRef}
                    width={WIDTH + MARGIN.left + MARGIN.right}
                    height={HEIGHT + MARGIN.top + MARGIN.bottom}>
                    <g className='all' transform={`translate(${MARGIN.left},${MARGIN.top})`}>
                        <g className="xAxis" transform={`translate(0,${HEIGHT})`}></g>
                        <g className="yAxis"></g>
                        <g className="rects"></g>
                        <g className="highlights"></g>
                    </g>
                </svg>
                <div className='tooltip' ref={this.toolTipRef}> A tooltip </div>
            </div>
        )
    }
}