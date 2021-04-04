/**
 * Converts CSV tshark output into an array of Packet objects used in the visualization
 * @param data 
 */

export function parsedCsvToDataset(data) {
    let dataset = [];
    data.forEach(packet => {
        let protocols = packet["frame.protocols"].split(':');
        let networkProtocol = protocols[2];
        let transportProtocol = protocols[3];
        let applicationProtocol = protocols[4];

        let sourceIp = '';
        let destinationIp = ''
        if (networkProtocol === "ip") {
            sourceIp = packet["ip.src"]
            destinationIp = packet["ip.dst"]
        }
        if (networkProtocol === "arp") {
            sourceIp = packet["arp.src.proto_ipv4"]
            destinationIp = packet["arp.dst.proto_ipv4"]
        }
        if (networkProtocol === "ipv6") {
            sourceIp = packet["ipv6.src"]
            destinationIp = packet["ipv6.dst"]
        }

        let sourcePort = ''
        let destinationPort = ''

        if (transportProtocol === 'tcp') {
            sourcePort = packet["tcp.srcport"]
            destinationPort = packet["tcp.dstport"]
        }
        if (transportProtocol === 'udp') {
            sourcePort = packet["udp.srcport"]
            destinationPort = packet["udp.dstport"]
        }
        if (transportProtocol === 'icmp') {
            if (protocols[5] === 'udp') {
                sourcePort = packet["udp.srcport"]
                destinationPort = packet["udp.dstport"]
            }
        }

        let extractedPacket = {
            index: packet['frame.number'],
            timestamp: packet["frame.time_epoch"],
            networkProtocol: networkProtocol,
            transportProtocol: transportProtocol,
            applicationProtocol: applicationProtocol,
            sourceIp: sourceIp,
            destinationIp: destinationIp,
            sourcePort: sourcePort,
            destinationPort: destinationPort,
            bytes: packet["frame.len"]
        }

        dataset.push(extractedPacket)
    });
    return dataset;
}