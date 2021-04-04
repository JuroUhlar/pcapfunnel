import * as d3 from 'd3';
import '../styles/tooltip.css';

export const mousemove = (tooltip: any) => () => {
    tooltip
        .style("left", (d3.event.clientX + 20) + "px")
        .style("top", (d3.event.clientY + 20) + "px")
        .style("display", "block")
}

export const mouseleave = (tooltip: any) => () => {
    tooltip
        .style("display", 'none')
}

export const mouseOverThing = (tooltip: any, html: (thing: any) => string) => (thing: any) => {
    tooltip
        .html(html(thing))
}