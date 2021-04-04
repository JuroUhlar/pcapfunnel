import { Dataset, Packet, Mode } from '../../types/Dataset';
import { GraphNode, GraphLink, Graph } from '../../types/Graph';
import { flowsFromPackets, Flow, flowsFromPacketsBiDirectional } from '../../utils/flowUtils';

interface NodesMapRecord {
    count: number,
    linkCount?: number
}

/**
 * Function to compute a graph (collection of IP nodes and link from the provided dataset (packets),
 * using the provided mode (bytes/packets/flows/biflows)
 */
export function extractGraph(dataset: Dataset | Flow[], mode: Mode) {
    let data: Packet[] | Flow[] = dataset;
    if (mode === 'flows') data = flowsFromPackets(dataset as Packet[]);
    if (mode === 'biflows') data = flowsFromPacketsBiDirectional(dataset as Packet[]);

    // Compile all nodes into Map using the provided mode
    let nodesMap = new Map<string, NodesMapRecord>();
    if (mode === 'packets' || mode === 'flows' || mode === 'biflows') {
        data.forEach((d: Packet | Flow) => {
            let sourceIp = d.sourceIp;
            nodesMap.set(sourceIp, nodesMap.has(sourceIp) ? { count: nodesMap.get(sourceIp)!.count + 1 } : { count: 1 });
            let destinationIp = d.destinationIp;
            nodesMap.set(destinationIp, nodesMap.has(destinationIp) ? { count: nodesMap.get(destinationIp)!.count + 1 } : { count: 1 });
        });
    }
    if (mode === 'bytes') {
        data.forEach((d: Packet | Flow) => {
            let sourceIp = d.sourceIp;
            nodesMap.set(sourceIp, nodesMap.has(sourceIp) ? { count: nodesMap.get(sourceIp)!.count + +d.bytes } : { count: +d.bytes });
            let destinationIp = d.destinationIp;
            nodesMap.set(destinationIp, nodesMap.has(destinationIp) ? { count: nodesMap.get(destinationIp)!.count + +d.bytes } : { count: +d.bytes });
        });
    }

    let linksSingleDirectionMap = new Map<string, number>();
    if (mode === 'packets' || mode === 'flows' || mode === 'biflows') {
        data.forEach((d: Packet | Flow) => {
            let sourceIp = d.sourceIp;
            let destinationIp = d.destinationIp;
            let mapId = `${sourceIp}-${destinationIp}`;
            linksSingleDirectionMap.set(mapId, linksSingleDirectionMap.has(mapId) ? linksSingleDirectionMap.get(mapId)! + 1 : 1);
        });
    }
    if (mode === 'bytes') {
        data.forEach((d: Packet | Flow) => {
            let sourceIp = d.sourceIp;
            let destinationIp = d.destinationIp;
            let mapId = `${sourceIp}-${destinationIp}`;
            linksSingleDirectionMap.set(mapId, linksSingleDirectionMap.has(mapId) ? linksSingleDirectionMap.get(mapId)! + +d.bytes : +d.bytes);
        });
    }

    // Convert single direction links into array
    let linksSingleDirection: Array<GraphLink> = []
    linksSingleDirectionMap.forEach((val, key) => {
        let source = key.split('-')[0];
        let target = key.split('-')[1];
        let id_rev = `${target}-${source}`;

        let record: GraphLink = {
            source: source,
            target: target,
            count: val,
            id: key,
            id_rev: id_rev
        };
        linksSingleDirection.push(record);
    })

    // Compute bi-directional links
    let links: GraphLink[] = [];
    linksSingleDirectionMap.forEach((val, key) => {
        let source = key.split('-')[0];
        let target = key.split('-')[1];
        let id_rev = `${target}-${source}`
        let record: GraphLink = {
            source: source,
            target: target,
            count: val + (linksSingleDirectionMap.has(id_rev) ? linksSingleDirectionMap.get(id_rev)! : 0),
            id: key,
            id_rev: id_rev
        }
        links.push(record);
        linksSingleDirectionMap.delete(id_rev)
    });

    // Add link count info to nodes
    links.forEach(link => {
        let sourceIp = link.source as string;
        nodesMap.set(sourceIp, {
            count: nodesMap.get(sourceIp)!.count,
            linkCount: nodesMap.get(sourceIp)!.linkCount ? nodesMap.get(sourceIp)!.linkCount! + 1 : 1
        })

        let targetIp = link.target as string;
        nodesMap.set(targetIp, {
            count: nodesMap.get(targetIp)!.count,
            linkCount: nodesMap.get(targetIp)!.linkCount ? nodesMap.get(targetIp)!.linkCount! + 1 : 1
        })
    });

    // Convert nodes to array 
    let nodes: Array<GraphNode> = []
    nodesMap.forEach((val, key) => {
        let record: GraphNode = {
            ip: key,
            count: val.count,
            linkCount: val.linkCount!,
        };
        nodes.push(record);
    })

    let graph: Graph = {
        nodes,
        links,
        linksSingleDirection: linksSingleDirection
    };
    return graph;
}