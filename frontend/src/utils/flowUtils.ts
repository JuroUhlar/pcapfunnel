import { Packet } from "../types/Dataset";

export interface Flow {
    sourceIp: string,
    sourcePort: number,
    destinationIp: string,
    destinationPort: number,
    transportProtocol: string,
    count: number;
    timestamp: number;
    networkProtocol: string,
    applicationProtocol: string,
    app?: string | null,
    [k: string]: any
}

interface FlowMapRecord {
    count: number,
    timestamp: number,
    networkProtocol: string,
    applicationProtocol: string,
    app: string | null,
}

/**
 * Aggregates the provided packets into one-directional flows
 * @param packets 
 */
export const flowsFromPackets = (packets: Packet[]) => {
    let flowsMap = new Map<string, FlowMapRecord>();
    packets.forEach((d) => {
        let key = `${d.sourceIp}/${d.sourcePort}-${d.destinationIp}/${d.destinationPort}-${d.transportProtocol}`;
        updateFlowsMap(flowsMap, key, d);
    });
    let flows = flowMapToArray(flowsMap);
    return flows;
}

/**
 * Aggregates the provided packets into bi-directional flows
 * @param packets 
 */
export const flowsFromPacketsBiDirectional = (packets: Packet[]) => {
    let flowsMap = new Map<string, FlowMapRecord>();
    packets.forEach((d) => {
        let key = '';
        if (d.sourceIp <= d.destinationIp) key = `${d.sourceIp}/${d.sourcePort}-${d.destinationIp}/${d.destinationPort}-${d.transportProtocol}`;
        if (d.destinationIp < d.sourceIp) key = `${d.destinationIp}/${d.destinationPort}-${d.sourceIp}/${d.sourcePort}-${d.transportProtocol}`;
        updateFlowsMap(flowsMap, key, d);
    });
    let flows = flowMapToArray(flowsMap);
    return flows;
}

/**
 * Converts a map of flows into an array
 * @param flowsMap
 */
export const flowMapToArray = (flowsMap: Map<string, FlowMapRecord>): Flow[] => {
    var flows: Flow[] = [];
    flowsMap.forEach(function (val, key) {
        let parts = key.split('-');
        let transportProtocol = parts[2];
        let sourceIp = parts[0].split('/')[0];
        let sourcePort = +parts[0].split('/')[1];
        let destinationIp = parts[1].split('/')[0];
        let destinationPort = +parts[1].split('/')[1];
        let count = val.count;
        let timestamp = val.timestamp;
        let networkProtocol = val.networkProtocol;
        let applicationProtocol = val.applicationProtocol;
        let app = val.app;

        flows.push({
            sourceIp,
            sourcePort,
            destinationIp,
            destinationPort,
            transportProtocol,
            count,
            timestamp,
            networkProtocol,
            applicationProtocol,
            app
        });
    });
    flows = flows.sort((a, b) => a.timestamp - b.timestamp);
    return flows;
}

/**
 * Updates or inserts a record into the map of flows
 * @param flowsMap
 * @param key 
 * @param packet 
 */
function updateFlowsMap(flowsMap: Map<string, FlowMapRecord>, key: string, packet: Packet) {
    if (flowsMap.has(key)) {
        let oldRecord = flowsMap.get(key)!;
        flowsMap.set(key, {
            ...oldRecord,
            count: oldRecord.count + 1,
            timestamp: Math.min(packet.timestamp, oldRecord.timestamp),
        });
    }
    else {
        flowsMap.set(key, {
            count: 1,
            timestamp: packet.timestamp,
            applicationProtocol: packet.applicationProtocol,
            networkProtocol: packet.networkProtocol,
            app: packet.app ? packet.app : 'N/A',
        });
    }
}
