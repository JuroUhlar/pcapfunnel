import { Dataset, Mode } from "../types/Dataset";
import { flowsFromPackets, flowsFromPacketsBiDirectional, Flow } from "./flowUtils";

export interface StatElement {
    networkProtocol?: string,
    transportProtocol?: string,
    applicationProtocol?: string,
    sourceIp?: string,
    destinationIp?: string,
    sourcePort?: string,
    destinationPort?: string,
    Ip?: string,
    Port?: string,
    app?: string,
    count: number
}

export interface Stats {
    networkProtocol: Array<StatElement>,
    transportProtocol: Array<StatElement>,
    applicationProtocol: Array<StatElement>,
    sourceIp: Array<StatElement>,
    destinationIp: Array<StatElement>,
    sourcePort: Array<StatElement>,
    destinationPort: Array<StatElement>,
    Ip: Array<StatElement>,
    Port: Array<StatElement>,
    app: Array<StatElement>
}

export const emptyStats: Stats = {
    networkProtocol: [],
    transportProtocol: [],
    applicationProtocol: [],
    sourceIp: [],
    destinationIp: [],
    sourcePort: [],
    destinationPort: [],
    Ip: [],
    Port: [],
    app: [],
}

export type statString = 'networkProtocol' | 'transportProtocol' | 'applicationProtocol' | 'sourceIp' | 'destinationIp' | 'sourcePort' | 'destinationPort' | 'app';
export type layerString = 'networkProtocol' | 'transportProtocol' | 'applicationProtocol' | 'sourceIp' | 'destinationIp' | 'sourcePort' | 'destinationPort' | 'Ip' | 'Port' | 'app';
export const layerStringArray: layerString[] = [
    'networkProtocol',
    'transportProtocol',
    // 'applicationProtocol',
    'Ip',
    'Port',
    'app'
];

export const propertyDisplayNames = {
    networkProtocol: 'Network protocol',
    transportProtocol: 'Transport protocol',
    applicationProtocol: 'Application protocol',
    sourceIp: 'Source IP',
    destinationIp: 'Destination IP', 
    sourcePort: 'Source port',
    destinationPort: 'Destination port',
    Ip: 'IP',
    Port: 'Port', 
    app: 'Application'
}

/**
 * Computes statistics of the given property from the provided dataset using the provided mode
 * @param property 
 * @param dataset 
 * @param mode 
 */
export function computePropertyStat(property: layerString, dataset: Dataset, mode: Mode) {
    let map = new Map<string, number>();

    if (mode === 'packets') {
        if (property === 'Ip' || property === 'Port') {
            dataset.forEach((packet) => {
                let value1 = packet['source' + property];
                let value2 = packet['destination' + property];
                map.set(value1, map.has(value1) ? map.get(value1)! + 1 : 1);
                map.set(value2, map.has(value2) ? map.get(value2)! + 1 : 1);
            });
        } else {
            dataset.forEach((packet) => {
                let value = packet[property] as string;
                if (value === undefined) value = 'N/A';
                map.set(value, map.has(value) ? map.get(value)! + 1 : 1);
            });
        }
    }

    if (mode === 'bytes') {
        if (property === 'Ip' || property === 'Port') {
            dataset.forEach((packet) => {
                let value1 = packet['source' + property] as string;
                let value2 = packet['destination' + property] as string;
                map.set(value1, map.has(value1) ? map.get(value1)! + +packet.bytes : +packet.bytes);
                map.set(value2, map.has(value2) ? map.get(value2)! + +packet.bytes : +packet.bytes);
            });
        } else {
            dataset.forEach((packet) => {
                let value = packet[property] as string;
                if (value === undefined) value = 'N/A';
                map.set(value, map.has(value) ? map.get(value)! + +packet.bytes : +packet.bytes);
            });
        }
    }

    if (mode === 'flows' || mode === 'biflows') {
        let flows: Flow[] = []
        if (mode === 'flows') flows = flowsFromPackets(dataset);
        if (mode === 'biflows') flows = flowsFromPacketsBiDirectional(dataset);

        if (property === 'Ip' || property === 'Port') {
            flows.forEach((flow) => {
                let value1 = flow['source' + property];
                let value2 = flow['destination' + property];
                map.set(value1, map.has(value1) ? map.get(value1)! + 1 : 1);
                map.set(value2, map.has(value2) ? map.get(value2)! + 1 : 1);
            });
        } else {
            flows.forEach((flow) => {
                let value = flow[property] as string;
                if (value === undefined || value === 'undefined') value = 'N/A';
                map.set(value, map.has(value) ? map.get(value)! + 1 : 1);
            });
        }
    }

    let result: Array<StatElement> = [];
    map.forEach((val, key) => {
        let record: StatElement = { count: val };
        record[property] = key;
        result.push(record);
    })
    result.sort((a, b) => {
        return b.count - a.count;
    })
    return result;
}

/**
 * Computes statistics of all the properties from the provided dataset using the provided mode 
 * @param dataset 
 * @param mode 
 */
export function computeStats(dataset: Dataset, mode: Mode): Stats {
    let topNetworkProtocols = computePropertyStat("networkProtocol", dataset, mode);
    let topTransportProtocols = computePropertyStat("transportProtocol", dataset, mode);
    let topApplicationProtocols = computePropertyStat("applicationProtocol", dataset, mode);
    let topSourceIps = computePropertyStat("sourceIp", dataset, mode);
    let topDestinationIps = computePropertyStat("destinationIp", dataset, mode);
    let topSourcePorts = computePropertyStat("sourcePort", dataset, mode);
    let topDestinationPorts = computePropertyStat("destinationPort", dataset, mode);
    let topIps = computePropertyStat("Ip", dataset, mode);
    let topApps = computePropertyStat("app", dataset, mode);

    let stats: Stats = {
        networkProtocol: topNetworkProtocols,
        transportProtocol: topTransportProtocols,
        applicationProtocol: topApplicationProtocols,
        sourceIp: topSourceIps,
        destinationIp: topDestinationIps,
        sourcePort: topSourcePorts,
        destinationPort: topDestinationPorts,
        Ip: topIps,
        Port: [],
        app: topApps,
    }
    return (stats);
}

export function arrayUnion(arrayA: Array<any>, arrayB: Array<any>) {
    var union = new Set(arrayA);
    for (var elem of arrayB) {
        union.add(elem);
    }
    return Array.from(union);
}
