export function extendedJSONReviver(options : { withDates: true }) {
    const regexISODate = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/
    
    return (key : string, value : any) => {
        if (typeof value !== 'string') {
            return value
        }

        const dateMatch = regexISODate.exec(value)
        if (!dateMatch) {
            return value
        }

        return new Date(value)
    }
}