export interface Packet {
    index: number
    timestamp: number
    networkProtocol: string
    transportProtocol: string
    applicationProtocol: string
    sourceIp: string
    destinationIp: string
    sourcePort: number
    destinationPort: number
    bytes: number
    app?: string
    [k: string]: any
}

export type Mode = 'packets' | 'bytes' | 'flows' | 'biflows';

export const modeDisplayNames = {
    packets: 'packets',
    bytes: 'bytes',
    flows: 'connections',
    biflows: 'bi-connections'
}

export type VolumeTimelineMode = Mode;
export type Dataset = Array<Packet>