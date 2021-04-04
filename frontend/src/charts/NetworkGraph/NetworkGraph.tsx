import * as React from 'react'
import * as d3 from 'd3'
import { Graph, GraphNode, GraphLink } from '../../types/Graph';
import { BaseType } from 'd3';
import { Dataset, Mode } from '../../types/Dataset';
import { extractGraph } from './graphUtils';
import { getCountFormat } from '../../utils/numberFormats';
import { mouseOverThing } from '../../utils/tooltipUtils';
import styles from './NetworkGraph.module.css'

interface networkGraphProps {
    dataset: Dataset;
    openIpModal: (ip: string) => void;
    openConnectionModal: (connection: string[]) => void;
    mode: Mode;
    switchModeInParent?: (newMode: Mode) => void,
}

const MARGIN = { top: 20, right: 30, bottom: 40, left: 90 };
const WIDTH = 700 - MARGIN.left - MARGIN.right;
const HEIGHT = 480 - MARGIN.top - MARGIN.bottom;

/**
 * Component that computes and renders a network graph from the provided dataset (packets)
 * On update, it mutates the internal graph instead of restarting the entire physics simulation.
 */
export class NetworkGraphChart extends React.PureComponent<networkGraphProps> {
    constructor(props: networkGraphProps) {
        super(props);
        this.svgRef = React.createRef();
        this.toolTipRef = React.createRef();
    }

    svgRef: React.RefObject<SVGSVGElement>;
    svg: any;
    gAll: d3.Selection<SVGGElement, unknown, null | HTMLElement, undefined> = d3.select('g');
    nodes: GraphNode[] = [];
    links: GraphLink[] = [];
    circles: d3.Selection<any, any, BaseType, unknown> = this.gAll.select('circle');
    lines: d3.Selection<any, any, BaseType, unknown> = this.gAll.select('line');
    nodeRadiusScale: d3.ScaleLinear<number, number> = d3.scaleLinear();
    linkWidthScale: d3.ScaleLinear<number, number> = d3.scaleLinear();
    simulation: d3.Simulation<GraphNode, GraphLink> = d3.forceSimulation();
    dragHandler: any;
    toolTipRef: React.RefObject<HTMLDivElement>;
    tooltip: any;

    initChart = () => {
        if (this.svgRef.current) {
            this.svg = d3.select(this.svgRef.current);
            this.tooltip = d3.select(this.toolTipRef.current);
            this.gAll = this.svg.select('.networkEverything');
            this.lines = this.gAll.select('.links').selectAll('line');
            this.circles = this.gAll.select('.nodes').selectAll('circle');
            // @ts-ignore
            zoomHandler(this.svg);
        }

        // Define the force simulation
        this.simulation = d3.forceSimulation(this.nodes)
            .force('charge', d3.forceManyBody()
                .strength((node: any) => -30 - this.nodeRadiusScale(+(node as GraphNode).count)))
            .force('collide', d3.forceCollide((d: GraphNode) => this.nodeRadiusScale(d.count) + 1)
                .strength(0.7)
            )
            .force('x', d3.forceX(WIDTH / 2).strength(0.05))
            .force('y', d3.forceY(HEIGHT / 2).strength(0.05))
            .force('link', d3.forceLink()
                .links(this.links)
                .id((d: any) => d.ip)
                .distance((link: any) => 20 + this.nodeRadiusScale((link.target as GraphNode).count) + this.nodeRadiusScale((link.source as GraphNode).count))
                .strength(0.9)
            )
            .on('tick', this.ticked);

        this.dragHandler = d3.drag()
            .on('start', drag_start(this.simulation, this.svg))
            .on('drag', drag_drag())
            .on('end', drag_end(this.simulation, mouseOverNode(this.tooltip, this.props.mode), this.svg));
    }

    updateChart = () => {
        // Process new data and mutate the current graph
        let graph: Graph = extractGraph(this.props.dataset, this.props.mode);
        let newNodes = graph.nodes;
        let newLinks = graph.links;
        this.mutateGraph(newNodes, newLinks);
        let countFormat = getCountFormat(this.props.mode);

        if (this.nodes.length > 0) {
            this.nodeRadiusScale = nodeRadiusScale(this.nodes);
            this.linkWidthScale = linkWidthScale(this.links);
        }

        // Update circles
        this.circles = this.circles.data(this.nodes, (node: GraphNode) => node.ip);
        this.circles.exit().transition().duration(500).attr('r', 0).remove();

        this.circles = this.circles.enter().append('circle').merge(this.circles);
        this.circles.transition().duration(500).attr('r', (node: GraphNode) => this.nodeRadiusScale(+node.count));

        this.circles
            .attr('class', styles.network_graph_circle)
            .on('click', (d) => this.props.openIpModal(d.ip))
            .on('mouseover', mouseOverNode(this.tooltip, this.props.mode))
            .on('mousemove', mousemove(this.tooltip))
            .on('mouseleave', mouseleave(this.tooltip));

        this.dragHandler(this.circles);

        // Update links
        this.lines = this.lines.data(this.links, (link: GraphLink) => link.id);
        this.lines.exit().remove();
        this.lines = this.lines.enter().append('line').merge(this.lines);
        this.lines.transition().duration(500).attr('stroke-width', (link: GraphLink) => this.linkWidthScale(link.count));

        this.lines
            .attr('class', styles.network_graph_line)
            .on('click', (d:GraphLink) => this.props.openConnectionModal([(d.source as GraphNode).ip, (d.target as GraphNode).ip]))
            .on('mouseover', mouseOverThing(this.tooltip, d => `${(d.source as GraphNode).ip} <--> ${(d.target as GraphNode).ip}, ${countFormat(d.count)} <br/> Click to see a detailed view`))
            .on('mousemove', mousemove(this.tooltip))
            .on('mouseleave', mouseleave(this.tooltip));

        // Update and restart the simulation
        this.simulation.nodes(this.nodes)
        // @ts-ignore
        this.simulation.force('link').links(this.links).strength(0.4);
        this.simulation.alphaTarget(0.4).restart();
        setTimeout(() => {
            this.simulation.alpha(0.4);
            this.simulation.alphaTarget(0);
            // @ts-ignore
            this.simulation.force('link').strength(0.9);
        }, 300);
    }

    // Mutates the existing graph using the provided new nodes and links
    mutateGraph = (newNodes: GraphNode[], newLinks: GraphLink[]) => {
        newNodes.forEach(node => {
            node.x = WIDTH / 2 + Math.random() * 50 - 25;
            node.y = 150 + Math.random() * 50 - 25;
        })

        this.nodes = this.nodes.filter(nodeIsInArray(newNodes));
        newNodes.forEach(newNode => {
            if (nodeIsInArray(this.nodes)(newNode)) {
                let oldNodeIndex = this.nodes.findIndex(node => node.ip === newNode.ip);
                this.nodes[oldNodeIndex].count = newNode.count;
                this.nodes[oldNodeIndex].linkCount = newNode.linkCount;
            } else {
                this.nodes.push(newNode);
            }
        })

        this.links = this.links.filter(linkIsInArray(newLinks));
        newLinks.forEach(newLink => {
            if (linkIsInArray(this.links)(newLink)) {
                let oldLinkIndex = this.links.findIndex(oldLink => linksAreTheSame(oldLink, newLink));
                this.links[oldLinkIndex].count = newLink.count;
            } else {
                this.links.push(newLink);
            }
        });
    }

    // Tick function of the D3 force simulation
    ticked = () => {
        this.lines
            .attr('x1', (d: any) => d.source.x)
            .attr('y1', (d: any) => d.source.y)
            .attr('x2', (d: any) => d.target.x)
            .attr('y2', (d: any) => d.target.y)

        this.circles
            .attr('cx', (d: any) => d.x)
            .attr('cy', (d: any) => d.y)
    }

    handleModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        let newMode = event.target.value as Mode;
        if (this.props.switchModeInParent) {
            this.props.switchModeInParent(newMode);
        }
    };

    componentDidMount() {
        this.initChart();
        if (this.props.dataset.length > 0) {
            setTimeout(() => {
                this.updateChart();
            }, 150);
        };
    }

    componentDidUpdate(prevProps: networkGraphProps) {
        if (this.props.dataset !== prevProps.dataset || this.props.mode !== prevProps.mode) {
            setTimeout(() => {
                this.updateChart();
            }, 0);
        }
    }

    render() {
        return (
            <div className={`${styles.network_graph_container} paper`}>
                <div className='chartToolbar'>
                    <h2>
                        Network Graph
                    </h2>
                    <select
                        onChange={this.handleModeChange}
                        value={this.props.mode}>
                        <option value='packets'>Packets</option>
                        <option value='bytes'>Bytes</option>
                        <option value='flows'>Flows</option>
                        <option value='biflows'>Biflows</option>
                    </select>
                </div>
                <svg
                    ref={this.svgRef}
                    width={WIDTH + MARGIN.left + MARGIN.right} height={HEIGHT + MARGIN.top + MARGIN.bottom}>
                    <g className='networkEverything'>
                        <g className='links'></g>
                        <g className='nodes'></g>
                    </g>
                </svg>
                <div className='tooltip' ref={this.toolTipRef}> A tooltip </div>
            </div>
        )
    }
}

const nodeIsInArray = (array: GraphNode[]) => (d: GraphNode) => array.findIndex(a => a.ip === d.ip) !== -1;
const linkIsInArray = (array: GraphLink[]) => (d: GraphLink) => array.findIndex(a => linksAreTheSame(a, d)) !== -1;
const linksAreTheSame = (oldLink: GraphLink, newLink: GraphLink) => (oldLink.id === newLink.id || oldLink.id === newLink.id_rev)

const nodeRadiusScale = (nodes: GraphNode[]) => {
    let maxNodeCount = d3.max(nodes, node => node.count)
    if (!maxNodeCount) throw new Error('Could not compute scale.');
    return d3.scaleLinear()
        .domain([1, maxNodeCount])
        .range([4, 25]);
}

const linkWidthScale = (links: GraphLink[]) => {
    let maxLinkCount = d3.max(links, link => link.count);
    if (!maxLinkCount) throw new Error('Could not compute scale.');
    return d3.scaleLinear()
        .domain([1, maxLinkCount])
        .range([3, 15]);
}

const zoomActions = () => {
    d3.select('.networkEverything').attr('transform', d3.event.transform)
}

const zoomHandler = d3.zoom()
    .on('zoom', zoomActions)
    .translateExtent([[-WIDTH, -HEIGHT], [2 * WIDTH, 2 * HEIGHT]])
    .scaleExtent([1 / 2, 8]);

//Drag handlers
const drag_start = (simulation: d3.Simulation<GraphNode, GraphLink>, svg: any) => (node: any) => {
    svg.select('.networkEverything').selectAll('circle')
        .attr('style', 'cursor: grabbing')
        .on('mouseover', null);
    svg.attr('style', 'cursor: grabbing');
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    node.fx = node.x;
    node.fy = node.y;
}


const drag_drag = () => (node: any) => {
    node.fx = d3.event.x;
    node.fy = d3.event.y;
}

const drag_end = (simulation: d3.Simulation<GraphNode, GraphLink>, mouseover: any, svg: any) => (d: any) => {
    svg.select('.networkEverything').selectAll('circle')
        .attr('style', 'cursor: pointer')
        .on('mouseover', mouseover);
    svg.attr('style', 'cursor: default');
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null; // Comment out to leave node in fixed position after dragging
    d.fy = null; // Commnent out to leave node in fixed position after dragging
}

// Tooltip handlers
const mouseOverNode = (tooltip: any, mode: Mode) => (d: GraphNode) => {
    let countFormat = getCountFormat(mode);
    tooltip
        .style('display', 'block')
        .html(`${d.ip}, ${countFormat(d.count)}, ${d.linkCount} links <br/> Click to see a detailed view`)
}

const mousemove = (tooltip: any) => (d: GraphNode | GraphLink) => {
    tooltip
        .style('left', (d3.event.clientX + 20) + 'px')
        .style('top', (d3.event.clientY + 20) + 'px')
        .style('display', 'block')
}

const mouseleave = (tooltip: any) => (d: GraphNode | GraphLink) => {
    tooltip
        .style('display', 'none')
}
