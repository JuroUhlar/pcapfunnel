export interface GraphLink {
    source: string | GraphNode | number;
    target: string | GraphNode | number;
    count: number;
    value?: number;
    id: string;
    id_rev: string;
}

export interface GraphNode {
    ip: string,
    id?: string,
    count: number,
    linkCount: number,
    x?: number,
    y?: number,
    fx?: number,
    fy?: number,
}

export interface Graph {
    nodes: GraphNode[];
    links: GraphLink[];
    linksSingleDirection?: GraphLink[];
}

export const emptyGraph = {
    nodes: [],
    links: [],
}
