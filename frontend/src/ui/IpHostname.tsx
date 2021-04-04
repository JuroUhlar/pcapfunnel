import React, { ReactElement } from 'react'
import { Hostname, IpAddress } from '../charts/Geo/geoUtils'

interface IpHostnameProps {
    ip: IpAddress,
    hostnames: Map<IpAddress, Hostname> | undefined,
}

/**
 * Renders hostname of the provided IP if available
 */
export default function IpHostname({ ip, hostnames }: IpHostnameProps): ReactElement {
    if (hostnames && hostnames.has(ip)) {
        return <span title={ip}>{hostnames.get(ip)}</span>;
    }
    return <span>{ip}</span>;
}
