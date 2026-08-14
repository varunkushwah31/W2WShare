/**
 * W2W Share - Offline Pure JavaScript ZIP Archive Builder
 * Generates standard PKZIP 2.0 uncompressed (store mode) zip archives in memory.
 * Supports full directory trees and relative paths.
 * Zero external libraries, works 100% offline.
 */
class W2WZip {
    constructor() {
        this.files = [];
        this.crcTable = this.makeCrcTable();
    }

    addFile(filePath, arrayBuffer) {
        const bytes = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);
        // Normalize path: forward slashes, strip leading slash
        const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
        this.files.push({
            name: normalizedPath,
            data: bytes,
            crc: this.calculateCrc32(bytes)
        });
    }

    makeCrcTable() {
        let c;
        const table = [];
        for (let n = 0; n < 256; n++) {
            c = n;
            for (let k = 0; k < 8; k++) {
                c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            }
            table[n] = c;
        }
        return table;
    }

    calculateCrc32(bytes) {
        let crc = 0 ^ (-1);
        for (let i = 0; i < bytes.length; i++) {
            crc = (crc >>> 8) ^ this.crcTable[(crc ^ bytes[i]) & 0xFF];
        }
        return (crc ^ (-1)) >>> 0;
    }

    generateZipBlob() {
        let totalSize = 0;
        const encodedNames = this.files.map(f => new TextEncoder().encode(f.name));

        // 1. Calculate Local File Headers and Data size
        this.files.forEach((f, i) => {
            totalSize += 30 + encodedNames[i].length + f.data.length;
        });

        // 2. Central directory size
        let cdSize = 0;
        this.files.forEach((f, i) => {
            cdSize += 46 + encodedNames[i].length;
        });
        totalSize += cdSize + 22; // End of central directory record

        const buffer = new ArrayBuffer(totalSize);
        const view = new DataView(buffer);
        const uint8 = new Uint8Array(buffer);

        let offset = 0;
        const localOffsets = [];

        // Write Local File Headers
        this.files.forEach((f, i) => {
            localOffsets.push(offset);
            const nameBytes = encodedNames[i];

            view.setUint32(offset, 0x04034b50, true); // Local file header signature
            view.setUint16(offset + 4, 20, true);     // Version needed (2.0)
            view.setUint16(offset + 6, 0x0800, true);  // General purpose bit flag (UTF-8)
            view.setUint16(offset + 8, 0, true);       // Compression method (0 = store)
            view.setUint16(offset + 10, 0, true);      // File last mod time
            view.setUint16(offset + 12, 0, true);      // File last mod date
            view.setUint32(offset + 14, f.crc, true);  // CRC-32
            view.setUint32(offset + 18, f.data.length, true); // Compressed size
            view.setUint32(offset + 22, f.data.length, true); // Uncompressed size
            view.setUint16(offset + 26, nameBytes.length, true); // Filename length
            view.setUint16(offset + 28, 0, true);      // Extra field length

            offset += 30;
            uint8.set(nameBytes, offset);
            offset += nameBytes.length;

            uint8.set(f.data, offset);
            offset += f.data.length;
        });

        // Write Central Directory Headers
        const cdStartOffset = offset;
        this.files.forEach((f, i) => {
            const nameBytes = encodedNames[i];

            view.setUint32(offset, 0x02014b50, true); // Central directory signature
            view.setUint16(offset + 4, 20, true);     // Version made by
            view.setUint16(offset + 6, 20, true);     // Version needed
            view.setUint16(offset + 8, 0x0800, true);  // Bit flag (UTF-8)
            view.setUint16(offset + 10, 0, true);     // Compression method
            view.setUint16(offset + 12, 0, true);     // Mod time
            view.setUint16(offset + 14, 0, true);     // Mod date
            view.setUint32(offset + 16, f.crc, true); // CRC-32
            view.setUint32(offset + 20, f.data.length, true); // Compressed size
            view.setUint32(offset + 24, f.data.length, true); // Uncompressed size
            view.setUint16(offset + 28, nameBytes.length, true); // Filename length
            view.setUint16(offset + 30, 0, true);     // Extra field length
            view.setUint16(offset + 32, 0, true);     // Comment length
            view.setUint16(offset + 34, 0, true);     // Disk number start
            view.setUint16(offset + 36, 0, true);     // Internal file attributes
            view.setUint32(offset + 38, 0, true);     // External file attributes
            view.setUint32(offset + 42, localOffsets[i], true); // Relative offset of local header

            offset += 46;
            uint8.set(nameBytes, offset);
            offset += nameBytes.length;
        });

        const cdEndOffset = offset;

        // Write End of Central Directory Record
        view.setUint32(offset, 0x06054b50, true); // EOCD signature
        view.setUint16(offset + 4, 0, true);      // Number of this disk
        view.setUint16(offset + 6, 0, true);      // Disk with start of CD
        view.setUint16(offset + 8, this.files.length, true);  // Total entries on this disk
        view.setUint16(offset + 10, this.files.length, true); // Total entries overall
        view.setUint32(offset + 12, cdEndOffset - cdStartOffset, true); // Size of central directory
        view.setUint32(offset + 16, cdStartOffset, true); // Offset of central directory
        view.setUint16(offset + 20, 0, true);     // Comment length

        return new Blob([buffer], { type: 'application/zip' });
    }
}

window.W2WZip = W2WZip;
