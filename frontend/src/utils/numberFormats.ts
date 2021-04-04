import { modeDisplayNames } from './../types/Dataset';
import * as d3 from 'd3';
import { Mode } from '../types/Dataset';

/**
 * Formats number of bytes into the appropriate data size unit (KB,MB,GB, etc.)
 * @param bytes 
 */
export const bytesCountFormat = (bytes: number) => {
    var fmt = d3.format('.1~f');
    if (bytes < 1024) {
        return fmt(bytes) + ' B';
    } else if (bytes < 1024 * 1024) {
        return fmt(bytes / 1024) + ' KB';
    } else if (bytes < 1024 * 1024 * 1024) {
        return fmt(bytes / 1024 / 1024) + ' MB';
    };
    return fmt(bytes / 1024 / 1024 / 1024) + ' GB';
}

export const percentFormat = d3.format(".2~%");
export const naturalFormat = d3.format('.3~s');

export const getCountFormat = (mode: Mode) => {
    if (mode === 'bytes') {
        return bytesCountFormat
    } else {
        return (n: number) => `${naturalFormat(n)} ${modeDisplayNames[mode]}`;
    }
}

export const getAxisFormat = (mode: Mode) => {
    if (mode === 'bytes') return bytesCountFormat;
    return naturalFormat;
};


/**
 * Tranforms normal D3 tick values into binary-friendly tick values that go up by natural binary increments (1 MB instead 1.08 MB, etc.)
 * @param normalTickValues 
 * @param domainMax 
 */
export const computeBytesTickValues = (normalTickValues: number[], domainMax: number) => {
    let ogTickStep = normalTickValues[1] - normalTickValues[0];
    let scale = 32;
    if (ogTickStep >= 100) scale = 128;
    if (ogTickStep >= 500) scale = 512;
    if (ogTickStep >= 1000) scale = 1024;
    if (ogTickStep >= 10000) scale = 1024 * 32;
    if (ogTickStep >= 100000) scale = 1024 * 128;
    if (ogTickStep >= 1000000) scale = 1024 * 1024;
    if (ogTickStep >= 1000000000) scale = 1024 * 1024 * 1024;

    let byteTickStep = Math.ceil(ogTickStep / scale) * scale;
    let newTicks = d3.range(0, domainMax, byteTickStep);
    return newTicks;
}