import { Packet } from "../../types/Dataset";
import { Flow } from "../../utils/flowUtils";
import { FlowTableSortProperty } from "./FlowTable";
import { PacketTableSortProperty } from "./PacketTable";

export type SortDirection = 'asc' | 'desc';

/**
 * Sort function for rows of PacketTable or FlowTable
 */
export const sortTableRows = (rows: Packet[] | Flow[], property: PacketTableSortProperty | FlowTableSortProperty, direction: SortDirection) => {
    let sortedRows = [...rows];
    sortedRows.sort((a, b) => {
        let propertyA = a[property] || '';
        let propertyB = b[property] || '';
        if (propertyA < propertyB) {
            return direction === 'asc' ? -1 : 1;
        }
        if (propertyA > propertyB) {
            return direction === 'asc' ? 1 : -1;
        }
        return 0;
    });
    return sortedRows;
}
