import * as d3 from 'd3';
// @ts-ignore
import * as iso2to3 from 'country-iso-2-to-3';
import { StatElement, layerString } from '../../utils/statsUtils';
import { geoServerURL } from '../../utils/config';

export interface ipLocation {
    country: string,
    city: string
    long?: number,
    lat?: number,
}

export interface LocationApiIPInfo {
    query: string,
    status: string,
    accuracyRadius?: number,
    city?: string,
    country?: string,
    countryCode?: string,
    lat?: number,
    long?: number,
    message?: string,
}

export type IpAddress = string;
export type Hostname = string;

/**
 * Function that fetches location data of the provided IPs from ip-api.com
 */
export const fetchFromIPAPI = (ips: string[]) =>
    fetch('http://ip-api.com/batch?fields=status,message,country,countryCode,query', {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        method: 'POST',
        body: JSON.stringify(ips.slice(0, 100)),
    });

/**
 * Function that fetches location data of the provided IPs from my own geolocation server
 */
export const fetchFromGeoServer = (ips: string[], signal?: AbortSignal) =>
    fetch(`${geoServerURL}/geoips`, {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify(ips),
        signal
    });


/**
 * Helper function to wake up the geoserver in case it needs to cold start
 */
export const wakeUpGeoServer = () => fetchFromGeoServer(['86.49.63.166']);


/**
 * Converts IP-API response into an ip-location Map()
 */
export function getMapFromIpApiResponse(response: LocationApiIPInfo[]): Map<IpAddress, ipLocation> {
    let ipCountryMap = new Map<IpAddress, ipLocation>();
    // eslint-disable-next-line
    let successCount = 0;
    response.forEach((item) => {
        if (item.status === 'success') {
            ipCountryMap.set(item.query, {
                country: iso2to3(item.countryCode),
                long: item.long,
                lat: item.lat,
                city: item.city!,
            });
            successCount += 1;
        }
    })
    return ipCountryMap;
}


// Hostname API

/**
 * Function that fetches hostname data of the provided IPs from ipinfo.io
 */
export const fetchHostnamesFromIPInfoIO = (ips: IpAddress[], signal?: AbortSignal) =>
    fetch('https://ipinfo.io/batch?token=55d73b2aff08b8&filter=1', {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify(ips.map(ip => `${ip}/hostname`)),
        signal
    });


/**
 * Converts hostname API response into an ip-hostname Map()
 */
export function getHostnameMapFromIPInfoResponse(response: any[]): Map<IpAddress, Hostname> {
    let ipHostnameMap = new Map<IpAddress, Hostname>();
    for (const [key, value] of Object.entries(response)) {
        if ((typeof value) === 'string' && value !== '') {
            let ip = key.split('/')[0];
            ipHostnameMap.set(ip, value);
        }
    }
    return ipHostnameMap;
}

// Country aggregations

/**
 * Function that aggregates the provided IP statistc by country
 * (countByCountry and ipsByCountry)
 */
export function getCountByCountry(stats: Array<StatElement>, statName: layerString, ipCountryMap: Map<IpAddress, ipLocation>) {
    const groupByCountryCode = function (stat: StatElement): string {
        let ip = stat[statName]!;
        return ipCountryMap.has(ip) ? ipCountryMap.get(ip)!.country : 'N/A';
    };
    const sumCountForEachCountry = function (v: StatElement[]): number {
        return d3.sum<StatElement>(v, (d: StatElement) => d.count);
    };

    let countByCountry = d3.nest<StatElement, number>()
        .key(groupByCountryCode)
        .rollup(sumCountForEachCountry)
        .map(stats);

    let ipsByCountry = d3.nest<StatElement, number>()
        .key(groupByCountryCode)
        .map(stats);

    return {
        countByCountry,
        ipsByCountry
    }
}

/**
 * Returns top country from the provided country-aggregated statistic
 */
export function getTopCountry(countryCount: d3.Map<number>) {
    let max = 0;
    let maxCountryCode = '';
    countryCount.each((val, key) => {
        if (val > max) {
            max = val;
            maxCountryCode = key;
        }
    })
    return { count: max, code: maxCountryCode };
}

/**
 * Country tooltip function for custom HTML tooltips
 */
export function getCountryTooltip(countFormat: (n: number) => string, countByCountry: d3.Map<any>, ipsByCountry: d3.Map<any>) {
    return (topo: any) => {
        let result = '';
        result += `${topo.properties.name}: ${countFormat(countByCountry.get(topo.id) || 0)}`;
        if (ipsByCountry.get(topo.id)) {
            let top10Ips: any[] = ipsByCountry.get(topo.id).slice(0, 10);
            result += `<p> Top Ips:<p/>`;
            result += top10Ips.map(d => `${d.Ip}, <i>${countFormat(d.count)}</i> <br/>`).join('');
        }
        return result;
    };
}

/**
 * Country tooltip function for native 'title' attribute tooltips
 */
export function getCountryTooltipText(countFormat: (n: number) => string, countByCountry: d3.Map<any>, ipsByCountry: d3.Map<any>) {
    return (topo: any) => {
        let result = '';
        result += `${topo.properties.name}: ${countFormat(countByCountry.get(topo.id) || 0)}`;
        if (ipsByCountry.get(topo.id)) {
            let top10Ips: any[] = ipsByCountry.get(topo.id).slice(0, 10);
            result += `\nTop Ips:\n`;
            result += top10Ips.map(d => `${d.Ip}, ${countFormat(d.count)} \n`).join('');
        }
        return result;
    };
}