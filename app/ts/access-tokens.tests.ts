export function sequentialTokenGenerator() {
    let counter = 0
    return () => {
        return `token-${++counter}`
    }
}
