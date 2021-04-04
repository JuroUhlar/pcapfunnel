import React, { ReactElement } from 'react'
import Flag from 'react-flagkit';
import { IpAddress, ipLocation } from '../charts/Geo/geoUtils';
const getCountryISO2 = require("country-iso-3-to-2");

interface Props {
    ip: IpAddress,
    ipLocationMap: Map<string, ipLocation> | undefined,
    flagSize?: number,
    classes?: string,
    returnPlaceholder?: boolean,
}

/**
 * Renders a flag of the country of the provided IP if available.
 * Can return null or a placeholder image if the location is unknown.
 */
export default function IpFlag({ ip, ipLocationMap, flagSize, classes, returnPlaceholder }: Props): ReactElement | null {
    const locations = ipLocationMap;
    if (!flagSize) flagSize = 16;
    if (locations && locations.has(ip)) {
        let ISO3CountryCode = locations.get(ip)?.country;
        return <Flag country={getCountryISO2(ISO3CountryCode)} size={flagSize} title={ISO3CountryCode} className={classes} />;
    }
    if (returnPlaceholder) return <svg width={flagSize} height={flagSize}></svg>;
    return (null);
}



