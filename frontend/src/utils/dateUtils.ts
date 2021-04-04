export const niceTimestamp = (date: Date) => {
    return `${date.toLocaleDateString()} ${hhmmss(date)} `
}

export const hhmmss = (date: Date) => {
    // return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
    return date.toTimeString().substr(0, 8);
}