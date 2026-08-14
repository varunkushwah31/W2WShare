/**
 * W2W Share - Offline QR Code Generator
 * Self-contained, lightweight canvas QR generator with error correction.
 * Requires ZERO external libraries or CDNs. Works 100% offline.
 */
(function (global) {
    'use strict';

    // Minimalist Reed-Solomon QR Code implementation (Version 1-10 Byte Mode)
    const QR = {
        PAD0: 0xEC,
        PAD1: 0x11,

        // Mode indicators
        MODE_8BIT_BYTE: 1 << 2,

        // Error correction levels: L=1, M=0, Q=3, H=2
        ECL_M: 0,

        // Generate and render QR Code onto a canvas element
        render: function (canvas, text, options) {
            options = options || {};
            const size = options.size || 220;
            const darkColor = options.dark || '#0f172a';
            const lightColor = options.light || '#ffffff';
            const margin = options.margin !== undefined ? options.margin : 2;

            const qrModel = this.create(text);
            const moduleCount = qrModel.getModuleCount();

            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            const totalModules = moduleCount + margin * 2;
            const cellSize = size / totalModules;

            ctx.fillStyle = lightColor;
            ctx.fillRect(0, 0, size, size);

            ctx.fillStyle = darkColor;
            for (let row = 0; row < moduleCount; row++) {
                for (let col = 0; col < moduleCount; col++) {
                    if (qrModel.isDark(row, col)) {
                        ctx.fillRect(
                            Math.round((col + margin) * cellSize),
                            Math.round((row + margin) * cellSize),
                            Math.ceil(cellSize),
                            Math.ceil(cellSize)
                        );
                    }
                }
            }
        },

        create: function (data) {
            // Determine minimal QR version needed for text
            const bytes = [];
            for (let i = 0; i < data.length; i++) {
                const code = data.charCodeAt(i);
                if (code > 0x7f) {
                    const encoded = encodeURI(data.charAt(i)).split('%');
                    for (let j = 1; j < encoded.length; j++) {
                        bytes.push(parseInt(encoded[j], 16));
                    }
                } else {
                    bytes.push(code);
                }
            }

            let typeNumber = 1;
            const capacities = [17, 32, 53, 78, 106, 134, 154, 192, 230, 271];
            for (let i = 0; i < capacities.length; i++) {
                if (bytes.length <= capacities[i]) {
                    typeNumber = i + 1;
                    break;
                }
            }

            const model = new QRModel(typeNumber, this.ECL_M);
            model.addData(bytes);
            model.make();
            return model;
        }
    };

    function QRModel(typeNumber, errorCorrectLevel) {
        this.typeNumber = typeNumber;
        this.errorCorrectLevel = errorCorrectLevel;
        this.modules = null;
        this.moduleCount = 0;
        this.dataCache = null;
        this.dataList = [];
    }

    QRModel.prototype = {
        addData: function (data) {
            this.dataList.push(data);
            this.dataCache = null;
        },

        isDark: function (row, col) {
            if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
                throw new Error(row + ',' + col);
            }
            return this.modules[row][col];
        },

        getModuleCount: function () {
            return this.moduleCount;
        },

        make: function () {
            this.makeImpl(false, this.getBestMaskPattern());
        },

        makeImpl: function (test, maskPattern) {
            this.moduleCount = this.typeNumber * 4 + 17;
            this.modules = new Array(this.moduleCount);

            for (let row = 0; row < this.moduleCount; row++) {
                this.modules[row] = new Array(this.moduleCount);
                for (let col = 0; col < this.moduleCount; col++) {
                    this.modules[row][col] = null;
                }
            }

            this.setupPositionProbePattern(0, 0);
            this.setupPositionProbePattern(this.moduleCount - 7, 0);
            this.setupPositionProbePattern(0, this.moduleCount - 7);
            this.setupPositionAdjustPattern();
            this.setupTimingPattern();
            this.setupTypeInfo(test, maskPattern);

            if (this.typeNumber >= 7) {
                this.setupTypeNumber(test);
            }

            if (this.dataCache == null) {
                this.dataCache = this.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
            }

            this.mapData(this.dataCache, maskPattern);
        },

        setupPositionProbePattern: function (row, col) {
            for (let r = -1; r <= 7; r++) {
                if (row + r <= -1 || this.moduleCount <= row + r) continue;
                for (let c = -1; c <= 7; c++) {
                    if (col + c <= -1 || this.moduleCount <= col + c) continue;
                    if ((0 <= r && r <= 6 && (c === 0 || c === 6)) ||
                        (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
                        (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
                        this.modules[row + r][col + c] = true;
                    } else {
                        this.modules[row + r][col + c] = false;
                    }
                }
            }
        },

        getBestMaskPattern: function () {
            let minLostPoint = 0;
            let pattern = 0;
            for (let i = 0; i < 8; i++) {
                this.makeImpl(true, i);
                const lostPoint = this.getLostPoint();
                if (i === 0 || minLostPoint > lostPoint) {
                    minLostPoint = lostPoint;
                    pattern = i;
                }
            }
            return pattern;
        },

        setupTimingPattern: function () {
            for (let r = 8; r < this.moduleCount - 8; r++) {
                if (this.modules[r][6] != null) continue;
                this.modules[r][6] = (r % 2 === 0);
            }
            for (let c = 8; c < this.moduleCount - 8; c++) {
                if (this.modules[6][c] != null) continue;
                this.modules[6][c] = (c % 2 === 0);
            }
        },

        setupPositionAdjustPattern: function () {
            const pos = QRRS.getPatternPosition(this.typeNumber);
            for (let i = 0; i < pos.length; i++) {
                for (let j = 0; j < pos.length; j++) {
                    const row = pos[i];
                    const col = pos[j];
                    if (this.modules[row][col] != null) continue;
                    for (let r = -2; r <= 2; r++) {
                        for (let c = -2; c <= 2; c++) {
                            if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
                                this.modules[row + r][col + c] = true;
                            } else {
                                this.modules[row + r][col + c] = false;
                            }
                        }
                    }
                }
            }
        },

        setupTypeInfo: function (test, maskPattern) {
            const data = (this.errorCorrectLevel << 3) | maskPattern;
            const bits = QRRS.getBCHTypeInfo(data);
            for (let i = 0; i < 15; i++) {
                const mod = (!test && ((bits >> i) & 1) === 1);
                if (i < 6) {
                    this.modules[i][8] = mod;
                } else if (i < 8) {
                    this.modules[i + 1][8] = mod;
                } else {
                    this.modules[this.moduleCount - 15 + i][8] = mod;
                }

                if (i < 8) {
                    this.modules[8][this.moduleCount - i - 1] = mod;
                } else if (i < 9) {
                    this.modules[8][15 - i - 1 + 1] = mod;
                } else {
                    this.modules[8][15 - i - 1] = mod;
                }
            }
            this.modules[this.moduleCount - 8][8] = !test;
        },

        setupTypeNumber: function (test) {
            const bits = QRRS.getBCHTypeNumber(this.typeNumber);
            for (let i = 0; i < 18; i++) {
                const mod = (!test && ((bits >> i) & 1) === 1);
                this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
                this.modules[i % 3 + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
            }
        },

        mapData: function (data, maskPattern) {
            let inc = -1;
            let row = this.moduleCount - 1;
            let bitIndex = 7;
            let byteIndex = 0;

            for (let col = this.moduleCount - 1; col > 0; col -= 2) {
                if (col === 6) col--;
                while (true) {
                    for (let c = 0; c < 2; c++) {
                        if (this.modules[row][col - c] == null) {
                            let dark = false;
                            if (byteIndex < data.length) {
                                dark = (((data[byteIndex] >>> bitIndex) & 1) === 1);
                            }
                            const mask = QRRS.getMask(maskPattern, row, col - c);
                            if (mask) dark = !dark;
                            this.modules[row][col - c] = dark;
                            bitIndex--;
                            if (bitIndex === -1) {
                                byteIndex++;
                                bitIndex = 7;
                            }
                        }
                    }
                    row += inc;
                    if (row < 0 || this.moduleCount <= row) {
                        row -= inc;
                        inc = -inc;
                        break;
                    }
                }
            }
        },

        createData: function (typeNumber, errorCorrectLevel, dataList) {
            const rsBlocks = QRRS.getRSBlocks(typeNumber, errorCorrectLevel);
            const buffer = new QRBitBuffer();

            for (let i = 0; i < dataList.length; i++) {
                const data = dataList[i];
                buffer.put(QR.MODE_8BIT_BYTE, 4);
                buffer.put(data.length, QRRS.getLengthInBits(QR.MODE_8BIT_BYTE, typeNumber));
                for (let j = 0; j < data.length; j++) {
                    buffer.put(data[j], 8);
                }
            }

            let totalDataCount = 0;
            for (let i = 0; i < rsBlocks.length; i++) {
                totalDataCount += rsBlocks[i].dataCount;
            }

            if (buffer.getLengthInBits() > totalDataCount * 8) {
                throw new Error('Data overflow: ' + buffer.getLengthInBits() + ' > ' + (totalDataCount * 8));
            }

            if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
                buffer.put(0, 4);
            }

            while (buffer.getLengthInBits() % 8 !== 0) {
                buffer.putBit(false);
            }

            while (true) {
                if (buffer.getLengthInBits() >= totalDataCount * 8) break;
                buffer.put(QR.PAD0, 8);
                if (buffer.getLengthInBits() >= totalDataCount * 8) break;
                buffer.put(QR.PAD1, 8);
            }

            return this.createBytes(buffer, rsBlocks);
        },

        createBytes: function (buffer, rsBlocks) {
            let offset = 0;
            let maxDcCount = 0;
            let maxEcCount = 0;
            const dcdata = new Array(rsBlocks.length);
            const ecdata = new Array(rsBlocks.length);

            for (let r = 0; r < rsBlocks.length; r++) {
                const dcCount = rsBlocks[r].dataCount;
                const ecCount = rsBlocks[r].totalCount - dcCount;
                maxDcCount = Math.max(maxDcCount, dcCount);
                maxEcCount = Math.max(maxEcCount, ecCount);

                dcdata[r] = new Array(dcCount);
                for (let i = 0; i < dcdata[r].length; i++) {
                    dcdata[r][i] = 0xff & buffer.buffer[i + offset];
                }
                offset += dcCount;

                const rsPoly = QRRS.getErrorCorrectPolynomial(ecCount);
                const rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
                const modPoly = rawPoly.mod(rsPoly);
                ecdata[r] = new Array(rsPoly.getLength() - 1);
                for (let i = 0; i < ecdata[r].length; i++) {
                    const modIndex = i + modPoly.getLength() - ecdata[r].length;
                    ecdata[r][i] = (modIndex >= 0) ? modPoly.get(modIndex) : 0;
                }
            }

            let totalCodeCount = 0;
            for (let i = 0; i < rsBlocks.length; i++) {
                totalCodeCount += rsBlocks[i].totalCount;
            }

            const data = new Array(totalCodeCount);
            let index = 0;

            for (let i = 0; i < maxDcCount; i++) {
                for (let r = 0; r < rsBlocks.length; r++) {
                    if (i < dcdata[r].length) {
                        data[index++] = dcdata[r][i];
                    }
                }
            }

            for (let i = 0; i < maxEcCount; i++) {
                for (let r = 0; r < rsBlocks.length; r++) {
                    if (i < ecdata[r].length) {
                        data[index++] = ecdata[r][i];
                    }
                }
            }

            return data;
        },

        getLostPoint: function () {
            return 0; // Simplified evaluation for offline renderer
        }
    };

    function QRBitBuffer() {
        this.buffer = [];
        this.length = 0;
    }

    QRBitBuffer.prototype = {
        get: function (index) {
            const bufIndex = Math.floor(index / 8);
            return ((this.buffer[bufIndex] >>> (7 - index % 8)) & 1) === 1;
        },
        put: function (num, length) {
            for (let i = 0; i < length; i++) {
                this.putBit(((num >>> (length - i - 1)) & 1) === 1);
            }
        },
        getLengthInBits: function () {
            return this.length;
        },
        putBit: function (bit) {
            const bufIndex = Math.floor(this.length / 8);
            if (this.buffer.length <= bufIndex) {
                this.buffer.push(0);
            }
            if (bit) {
                this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
            }
            this.length++;
        }
    };

    const QRRS = {
        PATTERN_POSITION_TABLE: [
            [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
            [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]
        ],
        G15: (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
        G18: (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
        G15_MASK: (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1),

        getPatternPosition: function (typeNumber) {
            return this.PATTERN_POSITION_TABLE[typeNumber - 1] || [];
        },
        getMask: function (maskPattern, i, j) {
            switch (maskPattern) {
                case 0: return (i + j) % 2 === 0;
                case 1: return i % 2 === 0;
                case 2: return j % 3 === 0;
                case 3: return (i + j) % 3 === 0;
                case 4: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
                case 5: return (i * j) % 2 + (i * j) % 3 === 0;
                case 6: return ((i * j) % 2 + (i * j) % 3) % 2 === 0;
                case 7: return ((i * j) % 3 + (i + j) % 2) % 2 === 0;
                default: return false;
            }
        },
        getErrorCorrectPolynomial: function (errorCorrectLength) {
            let a = new QRPolynomial([1], 0);
            for (let i = 0; i < errorCorrectLength; i++) {
                a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
            }
            return a;
        },
        getLengthInBits: function (mode, type) {
            return 8; // standard byte mode for versions 1-9
        },
        getBCHTypeInfo: function (data) {
            let d = data << 10;
            while (QRMath.getBCHDigit(d) - QRMath.getBCHDigit(this.G15) >= 0) {
                d ^= (this.G15 << (QRMath.getBCHDigit(d) - QRMath.getBCHDigit(this.G15)));
            }
            return ((data << 10) | d) ^ this.G15_MASK;
        },
        getBCHTypeNumber: function (data) {
            let d = data << 12;
            while (QRMath.getBCHDigit(d) - QRMath.getBCHDigit(this.G18) >= 0) {
                d ^= (this.G18 << (QRMath.getBCHDigit(d) - QRMath.getBCHDigit(this.G18)));
            }
            return (data << 12) | d;
        },
        getRSBlocks: function (typeNumber, errorCorrectLevel) {
            // Version 1-10 RS Blocks for ECL M
            const table = [
                [1, 26, 16], [1, 44, 28], [1, 70, 44], [1, 100, 64], [1, 134, 86],
                [2, 86, 54], [2, 98, 62], [2, 121, 76], [2, 146, 92], [2, 147, 91]
            ];
            const entry = table[typeNumber - 1] || table[0];
            return [{ totalCount: entry[1], dataCount: entry[2] }];
        }
    };

    const QRMath = {
        glog: function (n) {
            if (n < 1) throw new Error('glog(' + n + ')');
            return QRMath.LOG_TABLE[n];
        },
        gexp: function (n) {
            while (n < 0) n += 255;
            while (n >= 256) n -= 255;
            return QRMath.EXP_TABLE[n];
        },
        EXP_TABLE: new Array(256),
        LOG_TABLE: new Array(256),
        getBCHDigit: function (data) {
            let digit = 0;
            while (data !== 0) {
                digit++;
                data >>>= 1;
            }
            return digit;
        }
    };

    for (let i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
    for (let i = 8; i < 256; i++) {
        QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4] ^ QRMath.EXP_TABLE[i - 5] ^ QRMath.EXP_TABLE[i - 6] ^ QRMath.EXP_TABLE[i - 8];
    }
    for (let i = 0; i < 255; i++) QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;

    function QRPolynomial(num, shift) {
        let offset = 0;
        while (offset < num.length && num[offset] === 0) offset++;
        this.num = new Array(num.length - offset + shift);
        for (let i = 0; i < num.length - offset; i++) {
            this.num[i] = num[i + offset];
        }
    }

    QRPolynomial.prototype = {
        get: function (index) { return this.num[index]; },
        getLength: function () { return this.num.length; },
        multiply: function (e) {
            const num = new Array(this.getLength() + e.getLength() - 1);
            for (let i = 0; i < this.getLength(); i++) {
                for (let j = 0; j < e.getLength(); j++) {
                    num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
                }
            }
            return new QRPolynomial(num, 0);
        },
        mod: function (e) {
            if (this.getLength() - e.getLength() < 0) return this;
            const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
            const num = new Array(this.getLength());
            for (let i = 0; i < this.getLength(); i++) num[i] = this.get(i);
            for (let i = 0; i < e.getLength(); i++) {
                num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
            }
            return new QRPolynomial(num, 0).mod(e);
        }
    };

    global.W2WQR = QR;
})(window);
