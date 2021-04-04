import { GraphLink } from '../../types/Graph';

export type ReadabilityMode = 'everything' | 'justTopNodes' | 'aggregateBelowCutoff';


/**
 * Computes links below cutoff into 'incoming' and 'outgoing' aggregations
 * @param selectedIp 
 * @param otherLinks 
 */
export const computeAggregations = (selectedIp: string, otherLinks: GraphLink[]) => {
    let otherIncomingLinksAggregation: GraphLink = { source: 'Other source', target: selectedIp, count: 0, id: `Other source-${selectedIp}`, id_rev: `${selectedIp}-Other source` };
    let otherOutgoingLinksAggregation: GraphLink = { source: selectedIp, target: 'Other target', count: 0, id: `${selectedIp}-Other source`, id_rev: `Other source-${selectedIp}` };

    let otherLinksIncoming = otherLinks.filter((link) => link.target === selectedIp).reduce((accumulator, link) => {
        return { ...accumulator, count: accumulator.count + link.count }
    }, otherIncomingLinksAggregation);

    let otherLinksOutgoing = otherLinks.filter((link) => link.source === selectedIp).reduce((accumulator, link) => {
        return { ...accumulator, count: accumulator.count + link.count }
    }, otherOutgoingLinksAggregation);

    return {
        incoming: otherLinksIncoming,
        outgoing: otherLinksOutgoing
    }
}

/**
 * Construct a Sankey.js compatible graph for the selected IP from the provided GraphLinks
 * @param sankeyLinks 
 * @param selectedIp 
 * @param readabilityMode 
 * @param cutOff 
 */
export const constructSankeyGraph = (sankeyLinks: GraphLink[], selectedIp: string, readabilityMode: ReadabilityMode, cutOff: number) => {
    // Filter in just links that go through selected IP
    var otherLinks: GraphLink[] = []

    if (readabilityMode === 'justTopNodes' || readabilityMode === 'aggregateBelowCutoff') {
        otherLinks = sankeyLinks.slice(cutOff);
        sankeyLinks = sankeyLinks.sort((a: GraphLink, b: GraphLink) => b.count - a.count).slice(0, cutOff);
    }

    // Construct list of nodes for sankey
    let sankeyNodesDoubledSet = new Set([selectedIp]);
    sankeyLinks.forEach((link: GraphLink) => {
        if (link.source === selectedIp) {
            sankeyNodesDoubledSet.add(`${link.target} target`);
        };
        if (link.target === selectedIp) {
            sankeyNodesDoubledSet.add(`${link.source} source`);
        };
    });
    let sankeyNodesDoubledArray = Array.from(sankeyNodesDoubledSet).map((nodeString) => { return { 'id': nodeString, 'ip': nodeString.split(' ')[0] } })

    // Modify links to include source/target info: 'selectedIp -> 111.111.111.111' becomes 'selectedIp -> 111.111.111.111 target'
    sankeyLinks.forEach((link) => {
        if (link.source !== selectedIp) link.source = link.source + ' source';
        if (link.target !== selectedIp) link.target = link.target + ' target';
    })

    // // If selected and applicable, add aggregated cutoff links as 'other' to the nodes and links
    if (readabilityMode === 'aggregateBelowCutoff' && otherLinks.length > 0) {
        let otherLinksAggregations = computeAggregations(selectedIp, otherLinks)
        if (otherLinksAggregations.incoming.count > 0) {
            sankeyLinks.push(otherLinksAggregations.incoming);
            sankeyNodesDoubledArray.push({ id: 'Other source', ip: 'Others' });
        }
        if (otherLinksAggregations.outgoing.count > 0) {
            sankeyLinks.push(otherLinksAggregations.outgoing);
            sankeyNodesDoubledArray.push({ id: 'Other target', ip: 'Others' });
        }
    }

    // Convert links to use indexes and 'value'
    sankeyLinks.forEach((link: GraphLink) => {
        link.source = sankeyNodesDoubledArray.findIndex(node => node.id === link.source);
        link.target = sankeyNodesDoubledArray.findIndex(node => node.id === link.target);
        link.value = link.count;
    });
    return { nodes: sankeyNodesDoubledArray, links: sankeyLinks };
}

export const displayNAMessage = (gAll:d3.Selection<SVGGElement, unknown, null, undefined>) => {
    gAll.append('text')
        .attr('class', 'na_message')
        .text('Nothing to show')
        .attr('transform',
            'translate(' + 150 + ',' + 150 + ')');
}