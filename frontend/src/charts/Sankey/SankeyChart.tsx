import * as React from 'react'
import * as d3 from 'd3'
import { GraphLink } from '../../types/Graph';
import { D3sankey } from './sankeyLibrary';
import { constructSankeyGraph, displayNAMessage } from './sankeyUtils';
import { Mode } from '../../types/Dataset';
import { getCountFormat } from '../../utils/numberFormats';
import { mousemove, mouseleave, mouseOverThing } from '../../utils/tooltipUtils';
import styles from './SankeyChart.module.css';
import TopLimitSwitcher from '../../ui/TopLimitSwitcher/TopLimitSwitcher';

const IP_COUNT_AGGREGATION_CUTOFF = 15;

interface SankeyChartProps {
    links: GraphLink[],
    selectedIp: string,
    mode: Mode;
    switchModeInParent?: (newMode: Mode) => void,
    totalPackets: number;
    titleTooltipsOnly?: boolean;
    openIpModal: (ip: string) => void;
    openConnectionModal: (connection: string[]) => void;
    clickToEnableZoom: boolean;
}

interface SankeyChartState {
    aggregationCutoff: number
}

const MARGIN = { top: 10, right: 10, bottom: 10, left: 10 };
const WIDTH = 460 - MARGIN.left - MARGIN.right;
const HEIGHT = 360 - MARGIN.top - MARGIN.bottom;

/**
 * Computes and renders a Sankey graph (volume of incoming and outgoing data per IP adress) of the provided IP address from the provided graph links
 */
export class SankeyChart extends React.PureComponent<SankeyChartProps, SankeyChartState> {
    constructor(props: SankeyChartProps) {
        super(props);
        this.svgRef = React.createRef();
        this.toolTipRef = React.createRef();
        this.color = d3.scaleOrdinal(['#d3fe14', '#c9080a', '#fec7f8', '#0b7b3e', '#0bf0e9', '#c203c8', '#fd9b39', '#888593', '#906407', '#98ba7f', '#fe6794', '#10b0ff', '#ac7bff', '#fee7c0', '#964c63', '#1da49c', '#0ad811', '#bbd9fd', '#fe6cfe', '#297192', '#d1a09c', '#78579e', '#81ffad', '#739400', '#ca6949', '#d9bf01', '#646a58', '#d5097e', '#bb73a9', '#ccf6e9', '#9cb4b6', '#b6a7d4', '#9e8c62', '#6e83c8', '#01af64', '#a71afd', '#cfe589', '#d4ccd1', '#fd4109', '#bf8f0e', '#2f786e', '#4ed1a5', '#d8bb7d', '#a54509', '#6a9276', '#a4777a', '#fc12c9', '#606f15', '#3cc4d9', '#f31c4e', '#73616f', '#f097c6', '#fc8772', '#92a6fe', '#875b44', '#699ab3', '#94bc19', '#7d5bf0', '#d24dfe', '#c85b74', '#68ff57', '#b62347', '#994b91', '#646b8c', '#977ab4', '#d694fd', '#c4d5b5', '#fdc4bd', '#1cae05', '#7bd972', '#e9700a', '#d08f5d', '#8bb9e1', '#fde945', '#a29d98']);
        this.state = {
            aggregationCutoff: IP_COUNT_AGGREGATION_CUTOFF
        }
    }

    svgRef: React.RefObject<SVGSVGElement>;
    gAll: d3.Selection<SVGGElement, unknown, null, undefined> | undefined;
    sankeyLink: d3.Selection<d3.BaseType, unknown, SVGGElement, unknown> | any;
    node: d3.Selection<d3.BaseType, unknown, SVGGElement, unknown> | any;
    color: d3.ScaleOrdinal<string, string>;
    sankey: any;
    toolTipRef: React.RefObject<HTMLDivElement>;
    tooltip: any;

    initChart = () => {
        if (this.svgRef.current) {
            let svg = d3.select(this.svgRef.current);
            if (this.props.clickToEnableZoom) {
                svg.on('click', () => {
                    // @ts-ignore
                    zoomHandler(svg)
                })
            } else {
                // @ts-ignore
                zoomHandler(svg);
            }
            this.gAll = svg.select('.sankey_everything');
            this.sankeyLink = this.gAll.select('.links').selectAll(styles.sankey_link);
            this.node = this.gAll.select('.nodes').selectAll('.node');
            this.tooltip = d3.select(this.toolTipRef.current);
        }
    }

    updateChart = () => {
        let countFormat = getCountFormat(this.props.mode);
        let selectedIpNodeValue = this.props.links.reduce((total, link) => total + link.count, 0);

        let copyLinks = JSON.parse(JSON.stringify(this.props.links));
        let sankeyLinks = copyLinks.filter((link: GraphLink) => (link.source === this.props.selectedIp || link.target === this.props.selectedIp) && (link.source !== link.target));
        let graph;

        if (sankeyLinks.length > 0) {
            // Construct Sankey graph from provided links
            graph = constructSankeyGraph(sankeyLinks, this.props.selectedIp, 'aggregateBelowCutoff', this.state.aggregationCutoff);
            this.gAll!.select('.na_message').remove();
        } else {
            graph = { nodes: [], links: [] };
            displayNAMessage(this.gAll!);
        }

        // Set the sankey diagram properties
        this.sankey = D3sankey()
            .nodeWidth(36)
            // @ts-ignore
            .nodePadding(5)
            .size([WIDTH, HEIGHT]);

        // Constructs a new Sankey generator with the default settings.
        this.sankey
            .nodes(graph.nodes)
            .links(graph.links)
            .layout(6);

        // Add the links (general update pattern)
        this.sankeyLink = this.sankeyLink.data(graph.links, (link: any) => `${link.source.id} - ${link.target.id}`);
        this.sankeyLink.exit().transition().duration(0).style('stroke-width', 0).remove();
        this.sankeyLink.transition().duration(500)
            .attr('d', this.sankey.link())
            .style('stroke-width', (link: any) => Math.max(1, link.dy) + 'px')
        let sankeyLinkEnter = this.sankeyLink.enter().append('path').style('stroke-width', 0)
        sankeyLinkEnter
            .attr('class', styles.sankey_link)
            .transition().delay(500).duration(500)
            .attr('d', this.sankey.link())
            .style('stroke-width', (link: any) => Math.max(1, link.dy) + 'px')
            .style('stroke', (link: any) => this.color(link.source.ip === this.props.selectedIp ? link.target.ip : link.source.ip))

        sankeyLinkEnter.on('click', (link: any) => {
            if ((link.id as string).includes('Other') === false) {
                this.props.openConnectionModal([link.source.ip, link.target.ip]);
            }
        })

        this.sankeyLink = this.sankeyLink.merge(sankeyLinkEnter)
        this.sankeyLink.sort((linkA: any, linkB: any) => linkB.dy - linkA.dy)

        // Add the nodes (general update pattern)
        this.node = this.node.data(graph.nodes, (node: any) => node.id);
        let nodeOld = this.node;
        this.node.exit().remove()
        let nodeEnter = this.node.enter().append('g').attr('class', 'node').attr('transform', (node: any) => `translate(${node.x},${node.y})`)

        this.node.transition().duration(500)
            .attr('transform', (node: any) => `translate(${node.x},${node.y})`)

        this.node = this.node.merge(nodeEnter)
        this.node.call(d3.drag()
            .subject(d => d)
            .on('drag', this.dragmove));

        // Add the rectangles for the nodes (general update pattern)
        nodeEnter.append('rect')
            .attr('width', this.sankey.nodeWidth())
            .attr('cursor', 'pointer')
            .style('fill', (node: any) => node.ip === this.props.selectedIp ? 'black' : node.color = this.color(node.ip))
            .style('stroke', (node: any) => d3.rgb(node.color).darker(1))
            .transition().delay(500).duration(500)
            .attr('height', (node: any) => Math.max(1, node.dy))

        let rects = nodeOld.select('rect').transition().duration(500).attr('height', (node: any) => Math.max(1, node.dy))
        rects = this.node.select('rect');

        nodeEnter.on('click', (node: any) => {
            if (node.ip !== 'Others') this.props.openIpModal(node.ip);
        })

        // Add the title for the nodes (general update pattern)
        nodeEnter.append('text').merge(this.node.select('text'))
            .attr('x', -6)
            .attr('y', (node: any) => node.dy / 2)
            .attr('dy', '.35em')
            .attr('text-anchor', 'end')
            .attr('transform', null)
            .attr('class', styles.node_text)
            .text((node: any) => node.ip)
            .filter((node: any) => node.x < WIDTH / 2)
            .attr('x', 6 + this.sankey.nodeWidth())
            .attr('text-anchor', 'start');

        nodeEnter.select('text')
            .attr('opacity', 0)
            .transition().delay(500).duration(500)
            .attr('opacity', 1);

        this.addTooltips(countFormat, rects, selectedIpNodeValue);
    }

    private addTooltips(countFormat: (n: number) => string, rects: any, selectedIpNodeValue: number) {
        // Title tooltip
        if (this.props.titleTooltipsOnly) {
            this.sankeyLink.selectAll('title').remove();
            this.sankeyLink.append('title')
                .text((link: any) => `${link.source.ip} -> ${link.target.ip}, ${countFormat(link.value)}`);

            rects.selectAll('title').remove();
            rects.append('title')
                .text((node: any) => `${node.ip} \n ${countFormat(node.ip === this.props.selectedIp ? selectedIpNodeValue : node.value)}`);
        }
        // Custom tooltips
        else {
            this.sankeyLink
                .on('mouseover', mouseOverThing(this.tooltip, (link) => `${link.source.ip} -> ${link.target.ip}, ${countFormat(link.value)}`))
                .on('mousemove', mousemove(this.tooltip))
                .on('mouseleave', mouseleave(this.tooltip));

            rects
                .on('mouseover', mouseOverThing(this.tooltip, (node) => `${node.ip} \n ${countFormat(node.ip === this.props.selectedIp ? selectedIpNodeValue : node.value)}`))
                .on('mousemove', mousemove(this.tooltip))
                .on('mouseleave', mouseleave(this.tooltip));
        }
    }

    dragmove = (node: any) => {
        let id = d3.event.subject.id;
        let g = d3.selectAll('.node').filter((node: any) => node.id === id);
        g.attr('transform', `translate(${(node.x = d3.event.x)}, ${(node.y = d3.event.y)})`);
        this.sankey.relayout();
        this.sankeyLink.attr('d', this.sankey.link());
    }

    handleModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        let newMode = event.target.value as Mode;
        if (this.props.switchModeInParent) {
            this.props.switchModeInParent(newMode);
        }
    };

    changeAggregationCutoff = (newCutoff: number) => {
        this.setState(() => ({
            aggregationCutoff: newCutoff,
        }))
    }

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
                        In/Out Traffic
                    </h2>
                </div>
                <div>
                    <TopLimitSwitcher currentLimit={this.state.aggregationCutoff} changeLimit={this.changeAggregationCutoff} nouns="IPs" ></TopLimitSwitcher>
                    {' by '}
                    <select
                        onChange={this.handleModeChange}
                        value={this.props.mode}>
                        <option value='packets'>Packets</option>
                        <option value='bytes'>Bytes</option>
                        <option value='flows'>Connections</option>
                    </select>
                </div>

                <svg
                    ref={this.svgRef}
                    width={WIDTH + MARGIN.left + MARGIN.right} height={HEIGHT + MARGIN.top + MARGIN.bottom}>
                    <g className='sankey_everything' transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
                        <g className='nodes'></g>
                        <g className='links'></g>
                    </g>
                </svg>
                <div className='tooltip' ref={this.toolTipRef}> A tooltip </div>
            </div>
        )
    }
}

const zoomActions = () => {
    d3.select('.sankey_everything').attr('transform', d3.event.transform)
}

const zoomHandler = d3.zoom()
    .on('zoom', zoomActions)
    .translateExtent([[-WIDTH, -HEIGHT], [2 * WIDTH, 2 * HEIGHT]])
    .scaleExtent([0.5, 2]);


