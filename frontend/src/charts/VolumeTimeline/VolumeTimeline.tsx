import * as React from 'react'
import * as d3 from 'd3'
import { Dataset, Mode, modeDisplayNames, Packet, VolumeTimelineMode } from '../../types/Dataset';
import { generateBins, updateVolumeTimelineAxes, updateRects } from './volumeTimelineUtils';
import { flowsFromPackets, Flow, flowsFromPacketsBiDirectional } from '../../utils/flowUtils';
import styles from './VolumeTimeline.module.css'
import { IpSelect } from '../../ui/ipSelect/IpSelect';
import { IpAddress } from '../Geo/geoUtils';
import { niceTimestamp } from '../../utils/dateUtils';

interface VolumeTimelineProps {
    dataset: Dataset,
    timeSelection: number[] | null,
    mode: VolumeTimelineMode,
    setTimeSelection: (selection: number[] | null) => void,
    switchModeInParent?: (newMode: VolumeTimelineMode) => void,
    newBatchFlag: boolean,
}

interface VolumeTimelineState {
    highlightedIps: IpAddress[]
}

const MARGIN = { top: 20, right: 30, bottom: 40, left: 40 };
const WIDTH = 800 - MARGIN.left - MARGIN.right;
const HEIGHT = 400 - MARGIN.top - MARGIN.bottom;


/**
 * Displays the main volume timeline using the provided dataset (packets).
 * Allows user to make a time selection by brushing.
 * Allows user to highlight traffic of selected IPs.
 */
export class VolumeTimelineChart extends React.PureComponent<VolumeTimelineProps, VolumeTimelineState> {
    constructor(props: VolumeTimelineProps) {
        super(props);
        this.state = {
            highlightedIps: []
        }
        this.svgRef = React.createRef();
        this.xScale = d3.scaleLinear();
        this.yScale = d3.scaleLinear();
        this.tickValues = [];
        this.tickWidth = 0;
    }


    svgRef: React.RefObject<SVGSVGElement>;
    gAll: d3.Selection<SVGGElement, unknown, any, undefined> = d3.select('g.All');
    xScale: d3.ScaleLinear<number, number>;
    yScale: d3.ScaleLinear<number, number>;
    tickValues: number[];
    tickWidth: number;

    initChart = () => {
        if (this.svgRef.current) {
            const svg = this.svgRef.current;
            this.gAll = d3.select(svg).select('.all');
            // @ts-ignore
            d3.select(svg).select('.brush').call(this.brush);
        }
    }

    brushedHandler = () => {
        if (!d3.event.sourceEvent) return; // If event triggered programmatically, ignore
        if (d3.event.selection) {
            let timeSelection = this.brushSelectionToTimeSelection(d3.event.selection);
            this.props.setTimeSelection(timeSelection);
        } else {
            this.props.setTimeSelection(null);
        }
    }

    brushSelectionToTimeSelection = (brushSelection: number[]) => brushSelection.map((position) => this.xScale.invert(position - MARGIN.left)) as [number, number];
    timeSelectionToBrushSelection = (timeSelection: number[]) => {
        return timeSelection.map(timestamp => Math.round(this.xScale(timestamp) * 10) / 10 + MARGIN.left) as [number, number];
    }

    selectEverything = () => {
        this.brush.move(d3.select(this.svgRef.current).select('.brush'), [MARGIN.left, WIDTH + MARGIN.left]);
        this.props.setTimeSelection(this.xScale.domain());
    }

    clearSelection = () => {
        this.brush.move(d3.select(this.svgRef.current).select('.brush'), null);
        this.props.setTimeSelection(null);
    }


    handleModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        let newMode = event.target.value as VolumeTimelineMode;
        if (this.props.switchModeInParent) {
            this.props.switchModeInParent(newMode);
        }
    };

    brush = d3.brushX()
        .extent([[MARGIN.left, MARGIN.top], [WIDTH + MARGIN.left, HEIGHT + MARGIN.top]])
        .on("end", this.brushedHandler)

    updateChart = () => {
        const minTimestamp = d3.min(this.props.dataset, d => d.timestamp)!;
        const maxTimestamp = d3.max(this.props.dataset, d => d.timestamp)!;

        let dataset: Packet[] | Flow[] = this.props.dataset;
        if (this.props.mode === 'flows') dataset = flowsFromPackets(this.props.dataset);
        if (this.props.mode === 'biflows') dataset = flowsFromPacketsBiDirectional(this.props.dataset);

        // set the ranges
        this.xScale = d3.scaleLinear()
            .domain([minTimestamp, maxTimestamp])
            .nice()
            .range([0, WIDTH]);
        this.yScale = d3.scaleLinear()
            .range([HEIGHT, 0]);

        // Compute bin/tick borders
        this.tickValues = this.xScale.ticks(28);
        let tickValues = this.tickValues;
        this.tickWidth = this.tickValues[1] - tickValues[0];
        let tickWidth = this.tickWidth;
        const minTickValue = tickValues[0]
        const tickValuesTimeSpan = tickValues[tickValues.length - 1] - tickValues[0];

        // Devide packets into bins to be displayed as bars
        var bins = generateBins(tickValues, tickWidth, dataset, this.props.mode);

        // @ts-ignore
        this.yScale.domain([0, d3.max(bins, (d: any) => d.length)]);

        updateRects('.rects', bins, 'bar', this.gAll, this.xScale, this.yScale, HEIGHT, this.props.mode);
        updateVolumeTimelineAxes(this.gAll, tickValues, minTickValue, tickValuesTimeSpan, this.xScale, this.yScale, this.props.mode);
    }

    componentDidMount() {
        setTimeout(() => {
            this.initChart();
            this.updateChart();
            this.moveBrushBasedOnTimeFromProps();
        }, 0);
    }

    private moveBrushBasedOnTimeFromProps() {
        if (this.props.timeSelection) {
            let brushSelection: [number, number] = this.timeSelectionToBrushSelection(this.props.timeSelection);
            this.brush.move(d3.select(this.svgRef.current).select('.brush'), brushSelection);
        };
    }

    componentDidUpdate(prevProps: VolumeTimelineProps) {
        setTimeout(() => {
            this.updateChart();
            this.updateHighlightedIpsRects(this.state.highlightedIps);

            if (this.props.dataset !== prevProps.dataset) {
                this.gAll.select('.localTraffic').selectAll('rect').remove()
                this.gAll.select('.incomingLocalTraffic').selectAll('rect').remove()
                // @ts-ignore
                let currentBrushSelection: [number, number] | null = d3.brushSelection(d3.select(this.svgRef.current).select('.brush').node());
                if (currentBrushSelection === null) {
                    this.props.setTimeSelection(null);
                } else {
                    // If updating with a new batch while progressively loading data from server, move brush selection based on current time selection
                    if (this.props.newBatchFlag) {

                        this.moveBrushBasedOnTimeFromProps();
                    }
                    // If loading a new dataset, set time selection based on current brush selection
                    else {
                        let timeSelection = this.brushSelectionToTimeSelection(currentBrushSelection);
                        this.props.setTimeSelection(timeSelection);
                    }
                }
            }
        }, 0);
    }

    // Highlighted IPs change handler
    onIpSelectionChange = (ips: IpAddress[]) => {
        this.setState(() => ({
            highlightedIps: ips
        }))
        this.updateHighlightedIpsRects(ips);
    }


    private updateHighlightedIpsRects(ips: string[]) {
        let dataset: Dataset | Flow[] = this.props.dataset;

        if (this.props.mode === 'flows' || this.props.mode === 'biflows') {
            if (this.props.mode === 'flows') dataset = flowsFromPackets(this.props.dataset) as Flow[];
            if (this.props.mode === 'biflows') dataset = flowsFromPacketsBiDirectional(this.props.dataset) as Flow[];
        }

        let localTrafficDataset = (dataset as Dataset).filter((packet) => ips.indexOf(packet.sourceIp) !== -1 || ips.indexOf(packet.destinationIp) !== -1);
        let incominglocalTrafficDataset = localTrafficDataset.filter((packet: Packet | Flow) => ips.indexOf(packet.destinationIp) !== -1);
        let localTrafficBins = generateBins(this.tickValues, this.tickWidth, localTrafficDataset, this.props.mode);
        let incomingLocalTrafficBins = generateBins(this.tickValues, this.tickWidth, incominglocalTrafficDataset, this.props.mode);
        updateRects('.localTraffic', localTrafficBins, styles.localTrafficRect, this.gAll, this.xScale, this.yScale, HEIGHT, this.props.mode);
        updateRects('.incomingLocalTraffic', incomingLocalTrafficBins, styles.incomingLocalTrafficRect, this.gAll, this.xScale, this.yScale, HEIGHT, this.props.mode);
    }

    render() {
        let selectionDates = [' - ', ' - ']
        if (this.props.timeSelection !== null) {
            selectionDates = this.props.timeSelection.map((seconds: number) => niceTimestamp(new Date(seconds * 1000)));
        }
        return (
            <div className={styles.mainTimeline}>
                <svg
                    ref={this.svgRef}
                    width={WIDTH + MARGIN.left + MARGIN.right}
                    height={HEIGHT + MARGIN.top + MARGIN.bottom}>
                    <g className='all' transform={`translate(${MARGIN.left},${MARGIN.top})`}>
                        <g className="xAxis" transform={`translate(0,${HEIGHT})`}></g>
                        <g className="yAxis"></g>
                        <g className="rects"></g>
                        <g className="localTraffic"></g>
                        <g className="incomingLocalTraffic"></g>
                    </g>
                    <g className="brush"></g>
                </svg>

                <div className={styles.timeSelectionUI}>
                    <div>
                        Mode:
                        <select
                            onChange={this.handleModeChange}
                            value={this.props.mode}>
                            {Object.keys(modeDisplayNames).map((mode) => {
                               return <option key={mode} value={mode}>{`${modeDisplayNames[mode as Mode]}`}</option>
                            })}
                        </select>
                    </div>
                    <div>

                        Brush to select a timeframe
                        <br />
                        <button onClick={this.selectEverything}>Select all</button>

                        {this.props.timeSelection &&
                            <React.Fragment>
                                <p>
                                    Your selection: <br />
                                Start: {selectionDates[0]}
                                    <br />
                                End: {selectionDates[1]}
                                    <button onClick={this.clearSelection}>Clear selection</button>
                                </p>
                            </React.Fragment>
                        }
                    </div>
                    <div>
                        <IpSelect dataset={this.props.dataset} onSelectionChange={this.onIpSelectionChange}
                            incomingLegendClass={styles.incomingTrafficLegend} outgoingLegendClass={styles.outgoingTrafficLegend} />
                    </div>

                </div>
            </div>
        )
    }
}