import jsZip from 'jszip'

/*
Compress the data using deflate. Returns an UInt8Array that can be decompressed
to get the data back. Since UInt8Array is supported on IE10+,
(https://caniuse.com/mdn-javascript_builtins_uint8array) no browser compatibility
check is performed. If an object is given, it will first be stringified
 */
async function compress(data: object): Promise<Uint8Array>
async function compress(data: string): Promise<Uint8Array>
async function compress(data: string | object): Promise<Uint8Array> {
    let toCompress: string = typeof data === "object" ? JSON.stringify(data) : data
    let zip = new jsZip();

    zip.file('data', toCompress, {
        comment: typeof data === "object" ? "object" : "string"
    })

    return await zip.generateAsync({
        compression: 'DEFLATE',
        type: 'uint8array',
        compressionOptions: {
            level: 7
        }
    })
}

/*
The reverse operation of compress
 */
async function decompress(data: Uint8Array): Promise<string | object> {
    let zip = new jsZip();
    await zip.loadAsync(data)
    let file = zip.file('data')
    if (file === null) {
        throw Error("Error during decompressing data")
    }
    let content = await file.async('string')
    switch (file.comment) {
        case "string":
            return content
        case "object":
            return JSON.parse(content)
        default:
            throw Error("Unable to decode file type")
    }
}

export {compress, decompress}
