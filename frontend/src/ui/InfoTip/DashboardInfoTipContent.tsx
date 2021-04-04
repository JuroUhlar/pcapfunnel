import React, { ReactElement } from 'react'
import { FiPlusSquare } from 'react-icons/fi'

/**
 * Renders a brief explanation of how the PCAFFunnel dashboard works
 */
export default function DashboardInfoTipContent(): ReactElement {
    return (
        <div style={{textAlign: 'left'}}>
            <p>PCAPFunnel allows you to explore your PCAP data by filtering and visualizing it step by step.</p>
            <ul>
                <li>Explore demo datasets of upload your own PCAP file<span style={{color: "red"}}>*</span></li>
                <li>Use the left column to filter your data, first by time, then by packet properties</li>
                <li>Each filtration layer only displays data that passed through previous layers</li>
                <li>Click <FiPlusSquare/> to add, remove or reorder filtration layers of your funnnel</li>
                <li>Packets that pass all layers are displayed on the right</li>
                <li>Click nodes or connections in the graph to see a detailed view</li>
            </ul>
            <p style={{color: "#f26868"}}>
                <i>
                <span style={{color: "red"}}>*</span>Do not upload sensitive data. Please note, that the uploaded files are available publicly and the authors are not responsible for their misuse.
                </i>
            </p>
        </div>
    )
}
