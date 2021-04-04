import { hhmmss } from './../../utils/dateUtils';
import { Dataset, Packet, Mode } from "../../types/Dataset";
import * as d3 from 'd3';
import { Flow } from "../../utils/flowUtils";
import { getAxisFormat, getCountFormat, computeBytesTickValues } from "../../utils/numberFormats";
import { mousemove, mouseleave, mouseOverThing } from "../../utils/tooltipUtils";

export interface MyBin {
    x0: number;
    x1: number;
    length: number;
}

export type BinAggregationMode = 'packets' | 'bytes' | 'packetSize' | 'flows' | 'biflows';


/**
 * Computes bins (to be used as bars in volume graphs) from the provided dataset using the provided thickValues and mode
 */
export const generateBins = (tickValues: number[], tickWidth: number, dataset: Dataset | Flow[], mode: BinAggregationMode) => {
    if (tickValues.length <= 1) return [];
    let bins: MyBin[] = [];
    for (let i = 0; i < tickValues.length; i++) {
        bins.push({
            x0: tickValues[i],
            x1: tickValues[i + 1] || tickValues[i] + tickWidth * 1.05,
            length: 0
        })
    };

    let index = 0;

    if (mode === 'packets' || mode === 'flows' || mode === 'biflows') {
        for (let i = 0; i < dataset.length; i++) {
            if (dataset[i].timestamp <= bins[index].x1) {
                bins[index].length += 1;
            } else {
                i--;
                index++;
            }
        }
    };

    if (mode === 'bytes') {
        for (let i = 0; i < dataset.length; i++) {
            if (dataset[i].timestamp <= bins[index].x1) {
                bins[index].length += +(dataset[i] as Packet).bytes;
            } else {
                i--;
                index++;
            }
        }
    };

    if (mode === 'packetSize') {
        for (let i = 0; i < dataset.length; i++) {
            if ((dataset[i] as Packet).bytes <= bins[index].x1) {
                bins[index].length += 1;
            } else {
                i--;
                index++;
            }
        }
    };
    return bins;
};


/**
 * Renders or updates rectangles based on the provided bins and scales
 */
export const updateRects = (groupSelector: string,
    bins: MyBin[],
    rectClasses: string,
    gAll: d3.Selection<SVGGElement, unknown, any, undefined>,
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>,
    HEIGHT: number,
    mode: Mode,
    tooltip?: any,
) => {
    if (bins.length <= 1) {
        gAll.select(groupSelector).selectAll("rect").transition().duration(500).attr('height', 0).remove()
    }
    else {
        var rects = gAll.select(groupSelector).selectAll("rect").data(bins);
        rects.exit().remove();
        // @ts-ignore
        let newRects = rects.enter().append("rect")
            .attr("class", rectClasses)
            .attr("x", 1)
            .attr("transform", (d: any) => {
                return `translate(${xScale(d.x0)}, ${HEIGHT})`;
            })
            .attr("width", (d: any) => xScale(d.x1) - xScale(d.x0) - 1)
            .attr("height", 2);

        // @ts-ignore
        rects = rects.merge(newRects);
        rects.transition().delay(10).duration(500)
            .attr("height", (d: any) => HEIGHT - yScale(d.length))
            .attr("width", (d: any) => xScale(d.x1) - xScale(d.x0) - 1)
            .attr("transform", (d: any) => {
                return "translate(" + xScale(d.x0) + "," + yScale(d.length) + ")";
            });

        updateTooltips(tooltip, rects, mode);
    }
};

/**
 * Renders or updates rectangles based on the provided bins and scales in the flipped/mirrod version of volume timeline graphs
 */
export const updateRectsFlipped = (
    groupSelector: string,
    bins: MyBin[],
    rectClasses: string,
    gAll: d3.Selection<SVGGElement, unknown, any, undefined>,
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>,
    mode: Mode,
    tooltip?: any,
) => {
    if (bins.length <= 1) {
        gAll.select(groupSelector).selectAll("rect").transition().duration(500).attr('height', 0).remove()
    }
    else {
        var rects = gAll.select(groupSelector).selectAll("rect").data(bins);
        rects.exit().transition().duration(500).attr('r', 0).remove();
        // @ts-ignore
        rects = rects.enter().append("rect")
            .attr("class", rectClasses)
            .attr("x", 1)
            .attr("transform", (d: any) => {
                return `translate(${xScale(d.x0)}, 0)`;
            })
            .attr("width", (d: any) => xScale(d.x1) - xScale(d.x0) - 1)
            .attr("height", 2);

        rects = gAll.select(groupSelector).selectAll("rect")
        rects.transition().delay(10).duration(500)
            .attr("height", (d: any) => yScale(d.length))
            .attr("transform", (d: any) => {
                return "translate(" + xScale(d.x0) + "," + 0 + ")";
            });


        updateTooltips(tooltip, rects, mode);
    }
};

export const updateVolumeTimelineAxes = (
    gAll: d3.Selection<SVGGElement, unknown, any, undefined>,
    tickValues: number[],
    minTimestamp: number,
    timespan: number,
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>,
    mode: Mode,
    lowerLabelDensity?: boolean,
) => {
    // add the x Axis
    gAll.select(".xAxis")
        .transition().duration(500)
        // @ts-ignore
        .call(d3.axisBottom(xScale)
            .tickValues(tickValues)
            // @ts-ignore
            .tickFormat(simpleTickFormat(lowerLabelDensity, minTimestamp, timespan))) // Displays time labels as 01:04:20
        // .tickFormat(tickFormatWithTimeUnits(lowerLabelDensity, minTimestamp, timespan))) // Displays time labels as 01h:04m:20s 
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");

    // Update the y Axis
    let yAxisTicks = yScale.ticks()
        .filter(tick => Number.isInteger(tick));
    if (mode === 'bytes') yAxisTicks = computeBytesTickValues(yAxisTicks, yScale.domain()[1]);

    gAll.select(".yAxis")
        .transition().duration(500)
        // @ts-ignore
        .call(d3.axisLeft(yScale)
            .tickValues(yAxisTicks)
            .tickFormat((d) => getAxisFormat(mode)(d as number))
        );
}

export const updateVolumeTimelineAxesFlipped = (
    gAll: d3.Selection<SVGGElement, unknown, any, undefined>,
    tickValues: number[],
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>,
    mode: Mode,
) => {
    gAll.select(".xAxis")
        .transition().duration(500)
        // @ts-ignore+
        .call(d3.axisTop(xScale)
            .tickValues(tickValues)
            // @ts-ignore
            .tickFormat(''));

    // Update the y Axis
    let yAxisTicks = yScale.ticks()
        .filter(tick => Number.isInteger(tick));
    if (mode === 'bytes') yAxisTicks = computeBytesTickValues(yAxisTicks, yScale.domain()[1]);

    gAll.select(".yAxis")
        .transition().duration(500)
        // @ts-ignore
        .call(d3.axisLeft(yScale)
            .tickValues(yAxisTicks)
            .tickFormat((d) => getAxisFormat(mode)(d as number))
        );
}


/**
 * Format for tick labels in timeline volume charts including time units, e.g. 01h:04m:20s
 */
export const tickFormatWithTimeUnits = (lowerLabelDensity: boolean | undefined, minTimestamp: number, timespan: number) => {
    return (timestamp: number, index: number) => {
        if (lowerLabelDensity && index % 2 === 1)
            return ""; // Only display every other label if the lowerLabelDensity flag is on
        let secondsSinceFirstPacket = (timestamp - minTimestamp) * 1000;
        if (timespan <= 60)
            return d3.format(".2~f")(secondsSinceFirstPacket) + 's';
        if (timespan > 60) {
            let mmss = new Date(secondsSinceFirstPacket).toISOString().substr(14, 5);
            let mm = mmss.split(':')[0];
            let ss = mmss.split(':')[1];
            return `${mm}m:${ss}s`;
        }
        if (timespan > 3600) {
            let hhmmss = new Date(secondsSinceFirstPacket).toISOString().substr(11, 8);
            let hh = hhmmss.split(':')[0];
            let mm = hhmmss.split(':')[1];
            let ss = hhmmss.split(':')[2];
            return `${hh}h:${mm}m:${ss}s`;
        }
    };
}

/**
 * Simple format for tick labels in timeline volume charts
 */
export const simpleTickFormat = (lowerLabelDensity: boolean | undefined, minTimestamp: number, timespan: number) => {
    return (timestamp: number, index: number) => {
        if (lowerLabelDensity && index % 2 === 1) return ""; // Only display every other label if the lowerLabelDensity flag is on
        let date = new Date((timestamp) * 1000);
        let result = hhmmss(date);
        return result;
    }
}

export const updateTooltips = (tooltip: any, rects: d3.Selection<d3.BaseType, MyBin, d3.BaseType, unknown>, mode: Mode) => {
    let countFormat = getCountFormat(mode);
    if (tooltip) {
        rects.on("mouseover", mouseOverThing(tooltip, d => `${countFormat(d.length)}`))
            .on("mousemove", mousemove(tooltip))
            .on("mouseleave", mouseleave(tooltip));
    }
    else {
        rects.selectAll('title').remove();
        rects.append('title').text((d: MyBin) => countFormat(d.length as number));
    }
}