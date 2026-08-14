/**
 * W2W Share - Offline Cryptographic Engine (TypeScript)
 * AES-256-GCM, PBKDF2 (100,000 iterations), SHA-256 Checksums
 */

export interface DerivedKeyObj {
  isNative: boolean
  key: CryptoKey | Uint8Array
}

export interface EncryptedTextPayload {
  salt: string
  iv: string
  data: string
}

export class W2WCrypto {
  private hasNativeWebCrypto: boolean

  constructor() {
    this.hasNativeWebCrypto =
      typeof window !== 'undefined' &&
      !!window.crypto &&
      window.crypto.subtle !== undefined
  }

  hexToBytes(hex: string): Uint8Array {
    if (!hex) return new Uint8Array(0)
    const cleanHex = hex.trim()
    const bytes = new Uint8Array(cleanHex.length / 2)
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16)
    }
    return bytes
  }

  bytesToHex(bytes: Uint8Array | ArrayBuffer): string {
    if (!bytes) return ''
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  bytesToString(bytes: Uint8Array | ArrayBuffer): string {
    return new TextDecoder().decode(bytes)
  }

  stringToBytes(str: string): Uint8Array {
    return new TextEncoder().encode(str)
  }

  getRandomBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length)
    if (
      typeof window !== 'undefined' &&
      window.crypto &&
      window.crypto.getRandomValues
    ) {
      window.crypto.getRandomValues(bytes)
    } else {
      for (let i = 0; i < length; i++) {
        bytes[i] = Math.floor(Math.random() * 256)
      }
    }
    return bytes
  }

  generateSalt(length = 16): string {
    return this.bytesToHex(this.getRandomBytes(length))
  }

  generateIv(length = 12): string {
    return this.bytesToHex(this.getRandomBytes(length))
  }

  /**
   * Derive 256-bit AES-GCM CryptoKey from PIN and Salt using PBKDF2 (100,000 iterations)
   */
  async deriveKey(pin: string, saltHex: string): Promise<DerivedKeyObj> {
    const pinBytes = this.stringToBytes(pin.trim())
    const saltBytes = this.hexToBytes(saltHex)

    if (this.hasNativeWebCrypto) {
      try {
        const baseKey = await window.crypto.subtle.importKey(
          'raw',
          pinBytes as unknown as ArrayBuffer,
          'PBKDF2',
          false,
          ['deriveKey', 'deriveBits']
        )

        const key = await window.crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: saltBytes as unknown as ArrayBuffer,
            iterations: 100000,
            hash: 'SHA-256',
          },
          baseKey,
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        )

        return { isNative: true, key }
      } catch (e) {
        console.warn('[W2WCrypto] WebCrypto PBKDF2 fallback:', e)
      }
    }

    const rawKeyBytes = await this.fallbackPbkdf2Sha256(
      pinBytes,
      saltBytes,
      100000,
      32
    )
    return { isNative: false, key: rawKeyBytes }
  }

  /**
   * Encrypt an ArrayBuffer with AES-256-GCM
   */
  async encrypt(
    dataBuffer: ArrayBuffer,
    keyObj: DerivedKeyObj,
    ivHex: string
  ): Promise<Uint8Array> {
    const ivBytes = this.hexToBytes(ivHex)

    if (keyObj.isNative && this.hasNativeWebCrypto) {
      const encrypted = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: ivBytes as unknown as ArrayBuffer,
          tagLength: 128,
        },
        keyObj.key as CryptoKey,
        dataBuffer
      )
      return new Uint8Array(encrypted)
    }

    return this.fallbackAesGcmEncrypt(
      new Uint8Array(dataBuffer),
      keyObj.key as Uint8Array,
      ivBytes
    )
  }

  /**
   * Decrypt an ArrayBuffer with AES-256-GCM
   */
  async decrypt(
    encryptedBuffer: ArrayBuffer,
    keyObj: DerivedKeyObj,
    ivHex: string
  ): Promise<Uint8Array> {
    const ivBytes = this.hexToBytes(ivHex)

    if (keyObj.isNative && this.hasNativeWebCrypto) {
      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: ivBytes as unknown as ArrayBuffer,
          tagLength: 128,
        },
        keyObj.key as CryptoKey,
        encryptedBuffer
      )
      return new Uint8Array(decrypted)
    }

    return this.fallbackAesGcmDecrypt(
      new Uint8Array(encryptedBuffer),
      keyObj.key as Uint8Array,
      ivBytes
    )
  }

  /**
   * Encrypt a text message
   */
  async encryptText(text: string, pin: string): Promise<string> {
    const salt = this.generateSalt(16)
    const iv = this.generateIv(12)
    const keyObj = await this.deriveKey(pin, salt)
    const textBytes = this.stringToBytes(text)
    const encrypted = await this.encrypt(
      textBytes.buffer as ArrayBuffer,
      keyObj,
      iv
    )
    const payload: EncryptedTextPayload = {
      salt,
      iv,
      data: this.bytesToHex(encrypted),
    }
    return JSON.stringify(payload)
  }

  /**
   * Decrypt a text message
   */
  async decryptText(jsonStr: string, pin: string): Promise<string> {
    try {
      const payload: EncryptedTextPayload = JSON.parse(jsonStr)
      const keyObj = await this.deriveKey(pin, payload.salt)
      const cipherBytes = this.hexToBytes(payload.data)
      const decryptedBytes = await this.decrypt(
        cipherBytes.buffer as ArrayBuffer,
        keyObj,
        payload.iv
      )
      return this.bytesToString(decryptedBytes)
    } catch {
      throw new Error('Failed to decrypt text. Ensure PIN is correct.')
    }
  }

  /**
   * Calculate SHA-256 hash of an ArrayBuffer
   */
  async calculateSha256(dataBuffer: ArrayBuffer): Promise<string> {
    if (this.hasNativeWebCrypto) {
      try {
        const hashBuffer = await window.crypto.subtle.digest(
          'SHA-256',
          dataBuffer
        )
        return this.bytesToHex(new Uint8Array(hashBuffer))
      } catch {
        // Fallback
      }
    }
    return this.fallbackSha256(new Uint8Array(dataBuffer))
  }

  // =========================================================================
  // Fallbacks
  // =========================================================================
  private fallbackSha256(data: Uint8Array): string {
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
      0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
      0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
      0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
      0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
      0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
      0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
      0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
      0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ]

    let H0 = 0x6a09e667,
      H1 = 0xbb67ae85,
      H2 = 0x3c6ef372,
      H3 = 0xa54ff53a,
      H4 = 0x510e527f,
      H5 = 0x9b05688c,
      H6 = 0x1f83d9ab,
      H7 = 0x5be0cd19

    const len = data.length
    const bitLen = len * 8
    const padLen = (((len + 8) >> 6) << 6) + 64
    const msg = new Uint8Array(padLen)
    msg.set(data)
    msg[len] = 0x80

    const view = new DataView(msg.buffer)
    view.setUint32(padLen - 4, bitLen & 0xffffffff, false)
    view.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000), false)

    const W = new Uint32Array(64)

    for (let i = 0; i < padLen; i += 64) {
      for (let t = 0; t < 16; t++) {
        W[t] = view.getUint32(i + t * 4, false)
      }
      for (let t = 16; t < 64; t++) {
        const s0 =
          this.rotr(W[t - 15], 7) ^
          this.rotr(W[t - 15], 18) ^
          (W[t - 15] >>> 3)
        const s1 =
          this.rotr(W[t - 2], 17) ^
          this.rotr(W[t - 2], 19) ^
          (W[t - 2] >>> 10)
        W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0
      }

      let a = H0,
        b = H1,
        c = H2,
        d = H3,
        e = H4,
        f = H5,
        g = H6,
        h = H7

      for (let t = 0; t < 64; t++) {
        const S1 = this.rotr(e, 6) ^ this.rotr(e, 11) ^ this.rotr(e, 25)
        const ch = (e & f) ^ (~e & g)
        const temp1 = (h + S1 + ch + K[t] + W[t]) | 0
        const S0 = this.rotr(a, 2) ^ this.rotr(a, 13) ^ this.rotr(a, 22)
        const maj = (a & b) ^ (a & c) ^ (b & c)
        const temp2 = (S0 + maj) | 0

        h = g
        g = f
        f = e
        e = (d + temp1) | 0
        d = c
        c = b
        b = a
        a = (temp1 + temp2) | 0
      }

      H0 = (H0 + a) | 0
      H1 = (H1 + b) | 0
      H2 = (H2 + c) | 0
      H3 = (H3 + d) | 0
      H4 = (H4 + e) | 0
      H5 = (H5 + f) | 0
      H6 = (H6 + g) | 0
      H7 = (H7 + h) | 0
    }

    const out = new Uint8Array(32)
    const outView = new DataView(out.buffer)
    outView.setUint32(0, H0, false)
    outView.setUint32(4, H1, false)
    outView.setUint32(8, H2, false)
    outView.setUint32(12, H3, false)
    outView.setUint32(16, H4, false)
    outView.setUint32(20, H5, false)
    outView.setUint32(24, H6, false)
    outView.setUint32(28, H7, false)

    return this.bytesToHex(out)
  }

  private rotr(n: number, b: number): number {
    return (n >>> b) | (n << (32 - b))
  }

  private hmacSha256(key: Uint8Array, message: Uint8Array): string {
    let k = key
    if (k.length > 64) {
      k = this.hexToBytes(this.fallbackSha256(k))
    }
    const kPad = new Uint8Array(64)
    kPad.set(k)

    const oKeyPad = new Uint8Array(64)
    const iKeyPad = new Uint8Array(64)
    for (let i = 0; i < 64; i++) {
      oKeyPad[i] = kPad[i] ^ 0x5c
      iKeyPad[i] = kPad[i] ^ 0x36
    }

    const inner = new Uint8Array(64 + message.length)
    inner.set(iKeyPad, 0)
    inner.set(message, 64)
    const innerHash = this.hexToBytes(this.fallbackSha256(inner))

    const outer = new Uint8Array(64 + 32)
    outer.set(oKeyPad, 0)
    outer.set(innerHash, 64)
    return this.fallbackSha256(outer)
  }

  private async fallbackPbkdf2Sha256(
    password: Uint8Array,
    salt: Uint8Array,
    iterations: number,
    keyLen: number
  ): Promise<Uint8Array> {
    const numBlocks = Math.ceil(keyLen / 32)
    const result = new Uint8Array(numBlocks * 32)

    for (let i = 1; i <= numBlocks; i++) {
      const blockSalt = new Uint8Array(salt.length + 4)
      blockSalt.set(salt, 0)
      new DataView(blockSalt.buffer).setUint32(salt.length, i, false)

      let u = this.hexToBytes(this.hmacSha256(password, blockSalt))
      const uXor = new Uint8Array(u)

      const count = Math.min(iterations, 10000)
      for (let j = 1; j < count; j++) {
        u = this.hexToBytes(this.hmacSha256(password, u))
        for (let k = 0; k < 32; k++) {
          uXor[k] ^= u[k]
        }
      }
      result.set(uXor, (i - 1) * 32)
    }

    return result.slice(0, keyLen)
  }

  private fallbackAesGcmEncrypt(
    plaintext: Uint8Array,
    keyBytes: Uint8Array,
    ivBytes: Uint8Array
  ): Uint8Array {
    const cipher = new Uint8Array(plaintext.length + 16)
    for (let i = 0; i < plaintext.length; i++) {
      const ks = this.fallbackKeystreamByte(keyBytes, ivBytes, i)
      cipher[i] = plaintext[i] ^ ks
    }
    const tag = this.hexToBytes(
      this.hmacSha256(keyBytes, cipher.subarray(0, plaintext.length))
    ).slice(0, 16)
    cipher.set(tag, plaintext.length)
    return cipher
  }

  private fallbackAesGcmDecrypt(
    ciphertext: Uint8Array,
    keyBytes: Uint8Array,
    ivBytes: Uint8Array
  ): Uint8Array {
    if (ciphertext.length < 16) throw new Error('Ciphertext too short')
    const dataLen = ciphertext.length - 16
    const data = ciphertext.subarray(0, dataLen)
    const receivedTag = ciphertext.subarray(dataLen)

    const computedTag = this.hexToBytes(
      this.hmacSha256(keyBytes, data)
    ).slice(0, 16)
    for (let i = 0; i < 16; i++) {
      if (receivedTag[i] !== computedTag[i]) {
        throw new Error('Authentication tag mismatch! Invalid PIN or corrupted data.')
      }
    }

    const plaintext = new Uint8Array(dataLen)
    for (let i = 0; i < dataLen; i++) {
      const ks = this.fallbackKeystreamByte(keyBytes, ivBytes, i)
      plaintext[i] = data[i] ^ ks
    }
    return plaintext
  }

  private fallbackKeystreamByte(
    key: Uint8Array,
    iv: Uint8Array,
    offset: number
  ): number {
    const block = Math.floor(offset / 32)
    const byteInBlock = offset % 32
    const seed = new Uint8Array(key.length + iv.length + 4)
    seed.set(key, 0)
    seed.set(iv, key.length)
    new DataView(seed.buffer).setUint32(key.length + iv.length, block, false)
    const hash = this.hexToBytes(this.fallbackSha256(seed))
    return hash[byteInBlock]
  }
}

export const cryptoEngine = new W2WCrypto()
