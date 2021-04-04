import { NumberStatsState } from "../charts/NumberStats/NumberStats";
import { Dataset } from "../types/Dataset";
import { flowsFromPackets } from "../utils/flowUtils";

const countIpsInDataset = (dataset: Dataset) => {
  let ips = new Set<string>();
  dataset.forEach(packet => {
    ips.add(packet.destinationIp);
    ips.add(packet.sourceIp);
  });
  return ips.size;
}

/**
 * Computes simple number statistics from the provided dataset
 * @param dataset
 */
export function getNumberStatsFromDataset(dataset: Dataset): NumberStatsState {
  let numberStats = {
    packets: dataset.length,
    flows: flowsFromPackets(dataset).length,
    bytes: dataset.reduce((acc, packet) => (packet.bytes + acc), 0),
    ips: countIpsInDataset(dataset),
  }

  return numberStats;
}