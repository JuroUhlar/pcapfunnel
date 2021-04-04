import * as React from 'react'
import * as d3 from 'd3'
import { topo } from './worldMap';
import { ipLocation, IpAddress } from './geoUtils';
import { GraphLink, GraphNode } from '../../types/Graph';
import { Mode } from '../../types/Dataset';
import { getCountFormat } from '../../utils/numberFormats';
import { mousemove, mouseleave, mouseOverThing } from '../../utils/tooltipUtils';
import styles from './Geo.module.css';
import InfoTip from '../../ui/InfoTip/InfoTip';

interface GeoConnectionProps {
    graphLinks: GraphLink[],
    graphNodes: GraphNode[],
    ipLocationMap: Map<IpAddress, ipLocation>,
    mode: Mode;
    switchModeInParent?: (newMode: Mode) => void,
    htmlTooltipsOnly?: boolean,
    openIpModal: (ip: string) => void;
    openConnectionModal: (connection: string[]) => void;
    currentIp?: string;
    clickToEnableZoom: boolean;
}

const MARGIN = { top: 0, right: 0, bottom: 0, left: 0 };
const WIDTH = 460 - MARGIN.left - MARGIN.right;
const HEIGHT = 355 - MARGIN.top - MARGIN.bottom;
const GALL_CLASS_STRING = `geo_connection_everything`;

/**
 * Component that renders a world map along with the provided graph nodes (located IPs) and links between them,
 * based on the provided ip-location mapping. 
 * Allows to open a detail modal by clicking on nodes or links.
 */
export class GeoConnection extends React.PureComponent<GeoConnectionProps> {
    constructor(props: GeoConnectionProps) {
        super(props);
        this.svgRef = React.createRef();
        this.textRef = React.createRef();
        this.projection = d3.geoMercator()
            .scale(70)
            .center([0, 20])
            .translate([WIDTH / 2, HEIGHT / 2]);
        this.path = d3.geoPath()
            .projection(this.projection);
        this.toolTipRef = React.createRef();
    }

    svgRef: React.RefObject<SVGSVGElement>;
    textRef: React.RefObject<HTMLDivElement>
    gAll: d3.Selection<SVGGElement, unknown, null | HTMLElement, undefined> = d3.select('g')
    projection: d3.GeoProjection;
    path: d3.GeoPath<any, d3.GeoPermissibleObjects>;
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
                .attr('class', GALL_CLASS_STRING)
                .attr('transform', 'translate(' + MARGIN.left + ',' + MARGIN.top + ')')
                .attr('title', "Click to zoom")

            // Draw each country
            this.gAll!.append('g').attr('class', 'country_shapes')
                .selectAll('path')
                .data(topo.features)
                .enter()
                .append('path')
                // @ts-ignore
                .attr('d', d3.geoPath()
                    .projection(this.projection)
                )
                .attr('fill', function (d: any) {
                    return '#F0F0F0';
                })
                .style('stroke', (d: any) => 'black')
                .style('stroke-width', 0.2)
                .append('title').text((d: any) => {
                    return `${d.properties.name}`;
                });

            this.gAll.append('g').attr('class', 'circles');
            this.gAll.append('g').attr('class', 'links');
            this.tooltip = d3.select(this.toolTipRef.current);
        }
    }

    updateChart = () => {
        let countFormat = getCountFormat(this.props.mode);

        // Update nodes
        let nodesLocalized = this.props.graphNodes.filter(node => this.props.ipLocationMap.has(node.ip));
        let ogNodesLength = this.props.graphNodes.length;
        let NANodeCount = ogNodesLength - nodesLocalized.length;
        d3.select(this.textRef.current).select('#na_nodes').text(`${ogNodesLength - NANodeCount} / ${ogNodesLength}`);

        let nodes: GraphNodeGeo[] = nodesLocalized.map((graphNode) => ({
            ip: graphNode.ip,
            count: graphNode.count,
            linkCount: graphNode.linkCount,
            long: this.props.ipLocationMap.get(graphNode.ip)?.long!,
            lat: this.props.ipLocationMap.get(graphNode.ip)?.lat!,
            city: this.props.ipLocationMap.get(graphNode.ip)?.city!,
        })).sort((a, b) => b.count - a.count);

        let nodeRadius = ((x: any) => x);
        if (nodes.length > 0) nodeRadius = nodeRadiusScale(nodes);

        // Draw nodes
        this.gAll.selectAll('circle').remove();
        let circles = this.gAll.select('.circles').selectAll('circle')
            .data(nodes, (node: any) => node.ip)
            .enter()
            .append('circle')
            .attr('cx', (d) => this.projection([d.long, d.lat])![0])
            .attr('cy', (d) => this.projection([d.long, d.lat])![1])
            .attr('r', (d) => nodeRadius(d.count))
            .attr('class', styles.geo_connection_node)
            .attr('style', (d) => d.ip === this.props.currentIp ? 'fill: black; fill-opacity: 0.4' : '')
            .on('click', (d) => this.props.openIpModal(d.ip))

        // Update links
        let ogLinksLength = this.props.graphLinks.length;
        let linksLocalized = this.props.graphLinks.filter((link) => this.props.ipLocationMap.has(link.target as string) && this.props.ipLocationMap.has(link.source as string));
        let NALinkCount = ogLinksLength - linksLocalized.length;
        d3.select(this.textRef.current).select('#na_links').text(`${ogLinksLength - NALinkCount} / ${ogLinksLength}`);

        let links: GraphLinkGeo[] = linksLocalized.map((graphLink) => ({
            source: [this.props.ipLocationMap.get(graphLink.source as string)?.long!, this.props.ipLocationMap.get(graphLink.source as string)?.lat!],
            target: [this.props.ipLocationMap.get(graphLink.target as string)?.long!, this.props.ipLocationMap.get(graphLink.target as string)?.lat!],
            sourceIp: graphLink.source as string,
            targetIp: graphLink.target as string,
            count: graphLink.count,
        }));
        let linkPaths = links.filter(link => link.source.toString() !== link.target.toString()).map(link => ({
            type: 'LineString',
            connection: [link.sourceIp, link.targetIp],
            title: `${link.sourceIp} -> ${link.targetIp}, ${countFormat(link.count)}`,
            coordinates: [link.source, link.target]
        }));


        // Redraw links
        this.gAll.select('.links').selectAll('path').remove();
        let paths = this.gAll.select('.links').selectAll('myPath')
            .data(linkPaths)
            .enter()
            .append('path')
            .attr('d', (d: any) => this.path(d))
            .attr('class', styles.geo_connection_link)
            .style('stroke-width', 2)
            .on('click', d => this.props.openConnectionModal(d.connection))

        // Update tooltips
        if (this.props.htmlTooltipsOnly) {
            circles
                .append('title')
                .text((d: GraphNodeGeo) => `${d.ip}, ${countFormat(d.count)}, ${d.linkCount} links, city: ${d.city}`);
            paths
                .append('title').text(d => d.title);
        } else {
            circles.on('mouseover', mouseOverThing(this.tooltip, d => `${d.ip}, ${countFormat(d.count)}, ${d.linkCount} links, city: ${d.city}`))
                .on('mousemove', mousemove(this.tooltip))
                .on('mouseleave', mouseleave(this.tooltip));

            paths.on('mouseover', mouseOverThing(this.tooltip, d => `${d.title}`))
                .on('mousemove', mousemove(this.tooltip))
                .on('mouseleave', mouseleave(this.tooltip));
        }
    }

    componentDidMount() {
        this.initChart();
        this.updateChart();
    }

    componentDidUpdate() {
        this.updateChart();
    }

    handleModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        let newMode = event.target.value as Mode;
        if (this.props.switchModeInParent) {
            this.props.switchModeInParent(newMode);
        }
    };

    zoomActions = () => {
        d3.selectAll(`.${GALL_CLASS_STRING}`)
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
                        Connection graph
                    </h2>
                    <select
                        onChange={this.handleModeChange}
                        value={this.props.mode}>
                        <option value='packets'>Packets</option>
                        <option value='bytes'>Bytes</option>
                        <option value='flows'>Connections</option>
                        <option value='biflows'>Bi-connections</option>
                    </select>
                    <InfoTip id='geo_connection_tip'>
                        Only a portion of IPs can be localized. A link is drawn only if we know the location of IPs on both sides of the connection. Click to zoom and drag.
                    </InfoTip>
                </div>
                <div ref={this.textRef} className={styles.textStats}>
                    Localized nodes: <b id='na_nodes'>0</b> <br />
                    Localized links: <b id='na_links'>0</b>
                </div>
                <svg
                    ref={this.svgRef}
                    width={WIDTH + MARGIN.left + MARGIN.right} height={HEIGHT + MARGIN.top + MARGIN.bottom}
                >
                </svg>
                <div className='tooltip' ref={this.toolTipRef}> A tooltip </div>
            </div>
        )
    }
}

interface GraphNodeGeo {
    ip: IpAddress,
    count: number,
    linkCount: number,
    long: number,
    lat: number,
    city: string,
}

interface GraphLinkGeo {
    source: number[],
    target: number[]
    sourceIp: string,
    targetIp: string,
    count: number,
}

const nodeRadiusScale = (nodes: GraphNodeGeo[]) => {
    let maxNodePacketCount = d3.max(nodes, node => node.count)
    if (!maxNodePacketCount) throw new Error('Could not compute scale.');
    return d3.scaleLinear()
        .domain([1, maxNodePacketCount])
        .range([1.5, 15]);
}