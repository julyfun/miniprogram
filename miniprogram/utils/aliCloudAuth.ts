/**
 * aliCloudAuth.ts
 * 
 * Custom implementation for Alibaba Cloud authentication
 */

// Import secrets from the dedicated file
import { ALI_CLOUD_SECRETS } from './secrets';

// Alibaba Cloud configuration (using imported secrets)
const ALI_CLOUD_CONFIG = {
    AKID: ALI_CLOUD_SECRETS.AKID,
    AKKEY: ALI_CLOUD_SECRETS.AKKEY,
    APPKEY: ALI_CLOUD_SECRETS.APPKEY,
    URL: 'https://nls-meta.cn-shanghai.aliyuncs.com', // Non-sensitive URL
    WSS_URL: 'wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1' // Non-sensitive URL
};

/**
 * Generate a UUID v4
 */
function generateUUID(format?: boolean): string {
    const s: string[] = [];
    const hexDigits = "0123456789abcdef";
    for (let i = 0; i < 36; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = "4";
    s[19] = hexDigits.substr((parseInt(s[19], 16) & 0x3) | 0x8, 1);
    s[8] = s[13] = s[18] = s[23] = "-";

    const uuid = s.join("");
    if (format) {
        return uuid.split("-").join("");
    }
    return uuid;
}

/**
 * Format UTC timestamp
 */
function getUTCTimestamp(): string {
    const date = new Date();

    function pad(num: number): string {
        return (num < 10 ? '0' + num : '' + num);
    }

    const YYYY = date.getUTCFullYear();
    const MM = pad(date.getUTCMonth() + 1);
    const DD = pad(date.getUTCDate());
    const HH = pad(date.getUTCHours());
    const mm = pad(date.getUTCMinutes());
    const ss = pad(date.getUTCSeconds());

    return YYYY + '-' + MM + '-' + DD + 'T' + HH + ':' + mm + ':' + ss + 'Z';
}

/**
 * HMAC-SHA1 implementation
 */
function b64_hmac_sha1(k: string, d: string, _p?: string, _z?: number): string {
    // Use regular parameter handling
    var _pValue = _p || '=';
    var _zValue = _z || 8;

    function _f(t: number, b: number, c: number, d: number): number {
        if (t < 20) { return (b & c) | ((~b) & d); }
        if (t < 40) { return b ^ c ^ d; }
        if (t < 60) { return (b & c) | (b & d) | (c & d); }
        return b ^ c ^ d;
    }

    function _k(t: number): number {
        if (t < 20) { return 1518500249; }
        if (t < 40) { return 1859775393; }
        if (t < 60) { return -1894007588; }
        return -899497514;
    }

    function _s(x: number, y: number): number {
        const l = (x & 0xFFFF) + (y & 0xFFFF);
        const m = (x >> 16) + (y >> 16) + (l >> 16);
        return (m << 16) | (l & 0xFFFF);
    }

    function _r(n: number, c: number): number {
        return (n << c) | (n >>> (32 - c));
    }

    function _c(x: number[], l: number): number[] {
        x[l >> 5] |= 0x80 << (24 - l % 32);
        x[((l + 64 >> 9) << 4) + 15] = l;
        const w: number[] = new Array(80);
        let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878, e = -1009589776;
        for (let i = 0; i < x.length; i += 16) {
            const o = a, p = b, q = c, r = d, s = e;
            for (let j = 0; j < 80; j++) {
                if (j < 16) { w[j] = x[i + j]; }
                else { w[j] = _r(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1); }
                const t = _s(_s(_r(a, 5), _f(j, b, c, d)), _s(_s(e, w[j]), _k(j)));
                e = d; d = c; c = _r(b, 30); b = a; a = t;
            }
            a = _s(a, o); b = _s(b, p); c = _s(c, q); d = _s(d, r); e = _s(e, s);
        }
        return [a, b, c, d, e];
    }

    function _b(s: string): number[] {
        const b: number[] = [];
        const m = (1 << _zValue) - 1;
        for (let i = 0; i < s.length * _zValue; i += _zValue) {
            b[i >> 5] |= (s.charCodeAt(i / 8) & m) << (32 - _zValue - i % 32);
        }
        return b;
    }

    function _h(k: string, d: string): number[] {
        const b = _b(k);
        if (b.length > 16) {
            _c(b, k.length * _zValue);
        }
        const p: number[] = new Array(16);
        const o: number[] = new Array(16);
        for (let i = 0; i < 16; i++) {
            p[i] = b[i] ^ 0x36363636;
            o[i] = b[i] ^ 0x5C5C5C5C;
        }
        const h = _c(p.concat(_b(d)), 512 + d.length * _zValue);
        return _c(o.concat(h), 512 + 160);
    }

    function _n(b: number[]): string {
        const t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let s = '';
        for (let i = 0; i < b.length * 4; i += 3) {
            const r = (((b[i >> 2] >> 8 * (3 - i % 4)) & 0xFF) << 16) | (((b[i + 1 >> 2] >> 8 * (3 - (i + 1) % 4)) & 0xFF) << 8) | ((b[i + 2 >> 2] >> 8 * (3 - (i + 2) % 4)) & 0xFF);
            for (let j = 0; j < 4; j++) {
                if (i * 8 + j * 6 > b.length * 32) {
                    s += _pValue;
                } else {
                    s += t.charAt((r >> 6 * (3 - j)) & 0x3F);
                }
            }
        }
        return s;
    }

    function _x(k: string, d: string): string {
        return _n(_h(k, d));
    }

    return _x(k, d);
}

/**
 * Normalize parameters for the request
 */
const normalizeParams = (params: Record<string, string>): string => {
    let result = "";
    for (const key in params) {
        if (params.hasOwnProperty(key)) {
            result += encodeURIComponent(key) + '=' + encodeURIComponent(params[key]) + '&';
        }
    }
    return result.substring(0, result.length - 1);
};

/**
 * Get token from Alibaba Cloud
 */
async function getTokenFromServer(akid: string, akkey: string, url = ALI_CLOUD_CONFIG.URL): Promise<any> {
    // Method 1: Standard parameter approach
    const params: Record<string, string> = {
        AccessKeyId: akid,
        Action: "CreateToken",
        Format: "JSON",
        RegionId: "cn-shanghai",
        SignatureMethod: "HMAC-SHA1",
        SignatureNonce: generateUUID(),
        SignatureVersion: "1.0",
        Timestamp: getUTCTimestamp(),
        Version: "2019-02-28"
    };

    const normalizedParams = normalizeParams(params);
    const encodedNorm = "GET&" + encodeURIComponent("/") + "&" + encodeURIComponent(normalizedParams);
    const signature = b64_hmac_sha1(akkey + "&", encodedNorm);
    const finalParams = "Signature=" + encodeURIComponent(signature) + "&" + normalizedParams;

    // Try the direct token endpoint first (most reliable)
    try {
        console.log("Trying direct token endpoint...");
        const directResult = await new Promise<any>((resolve, reject) => {
            wx.request({
                url: 'https://nls-meta.cn-shanghai.aliyuncs.com/pop/2018-05-18/tokens',
                method: 'POST',
                header: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                data: {
                    "accessKeyId": akid,
                    "accessKeySecret": akkey
                },
                success: (res) => {
                    console.log("Direct token endpoint response:", res);
                    resolve(res);
                },
                fail: (err) => {
                    console.error("Direct token endpoint failed:", err);
                    reject(err);
                }
            });
        });

        if (directResult && directResult.statusCode === 200) {
            return directResult;
        }
    } catch (error) {
        console.error("Direct token approach failed, falling back to standard method:", error);
    }

    // Fallback to standard method
    console.log("Falling back to standard NLS Meta API...");
    return new Promise((resolve, reject) => {
        wx.request({
            url: url + "/?" + finalParams,
            success: (res) => {
                console.log("Standard API response:", res);
                resolve(res);
            },
            fail: (res) => {
                console.error("Standard API failed:", res);
                reject(res);
            }
        });
    });
}

/**
 * Get token with caching
 */
async function getToken(akid: string = ALI_CLOUD_CONFIG.AKID, akkey: string = ALI_CLOUD_CONFIG.AKKEY): Promise<string> {
    const cacheKey = akid + "&" + akkey;
    console.log("[getToken] Attempting to get token for key:", cacheKey);

    return new Promise<string>((resolve, reject) => {
        // Try to get token from storage first
        wx.getStorage({
            key: cacheKey,
            encrypt: true,
            success: async (res) => {
                console.log("[getToken] Found potential token in storage.");
                try {
                    const tokenData = JSON.parse(res.data);
                    if (tokenData && tokenData.Id && tokenData.ExpireTime) {
                        const now = Date.now();
                        const expireTime = tokenData.ExpireTime * 1000;
                        console.log("[getToken] Cached token expires at:", new Date(expireTime).toISOString());
                        if (now < expireTime) {
                            // Token is still valid
                            console.log("[getToken] Using valid cached token:", tokenData.Id.substring(0, 5) + "...");
                            return resolve(tokenData.Id);
                        } else {
                            console.log("[getToken] Cached token has expired.");
                        }
                    } else {
                        console.log("[getToken] Invalid token data structure in cache.");
                    }
                    // Token is expired or invalid, get a new one
                    console.log("[getToken] Refreshing token due to expiration or invalid cache.");
                    refreshToken(akid, akkey, cacheKey, resolve, reject);
                } catch (e) {
                    // Error parsing stored token, get a new one
                    console.error("[getToken] Error parsing cached token:", e);
                    console.log("[getToken] Refreshing token due to parsing error.");
                    refreshToken(akid, akkey, cacheKey, resolve, reject);
                }
            },
            fail: async () => {
                console.log("[getToken] No token found in storage or failed to read.");
                // No token in storage, get a new one
                console.log("[getToken] Refreshing token as none exists in cache.");
                refreshToken(akid, akkey, cacheKey, resolve, reject);
            }
        });
    });
}

/**
 * Helper function to refresh token
 */
async function refreshToken(
    akid: string = ALI_CLOUD_CONFIG.AKID,
    akkey: string = ALI_CLOUD_CONFIG.AKKEY,
    cacheKey: string,
    resolve: (token: string) => void,
    reject: (error: any) => void
): Promise<void> {
    console.log("[refreshToken] Attempting to fetch new token from server...");
    try {
        const tokenObj = await getTokenFromServer(akid, akkey);

        // Debug: Log the full response structure
        console.log("[refreshToken] Raw server response:", JSON.stringify(tokenObj));

        // Handle token from direct endpoint first (/pop/2018-05-18/tokens)
        if (tokenObj.data && tokenObj.data.Token && tokenObj.data.Token.Id) { // Ensure Id exists
            console.log("[refreshToken] Extracted token from direct endpoint structure.");
            const tokenData = tokenObj.data.Token;
            wx.setStorage({
                key: cacheKey,
                data: JSON.stringify(tokenData),
                encrypt: true,
                success: () => {
                    console.log("[refreshToken] Token cached successfully (direct endpoint).");
                },
                complete: () => {
                    console.log("[refreshToken] Resolving with token:", tokenData.Id.substring(0, 5) + "...");
                    resolve(tokenData.Id);
                }
            });
            return;
        }

        // Case 1: Standard structure from documentation
        if (tokenObj.data && tokenObj.data.Token && tokenObj.data.Token.Id && tokenObj.data.Token.ExpireTime) {
            console.log("[refreshToken] Extracted token from standard API structure.");
            // Store token in cache
            wx.setStorage({
                key: cacheKey,
                data: JSON.stringify(tokenObj.data.Token),
                encrypt: true,
                success: () => {
                    console.log("[refreshToken] Token cached successfully (standard).");
                },
                complete: () => {
                    console.log("[refreshToken] Resolving with token:", tokenObj.data.Token.Id.substring(0, 5) + "...");
                    resolve(tokenObj.data.Token.Id);
                }
            });
            return;
        }

        // Case 2: Direct structure without 'Token' wrapper
        if (tokenObj.data && tokenObj.data.Id && tokenObj.data.ExpireTime) {
            console.log("[refreshToken] Extracted token from direct data structure (no 'Token' wrapper).");
            wx.setStorage({
                key: cacheKey,
                data: JSON.stringify(tokenObj.data),
                encrypt: true,
                success: () => {
                    console.log("[refreshToken] Token cached successfully (alt structure).");
                },
                complete: () => {
                    console.log("[refreshToken] Resolving with token:", tokenObj.data.Id.substring(0, 5) + "...");
                    resolve(tokenObj.data.Id);
                }
            });
            return;
        }

        // Case 3: Success status but different format (or error message within data)
        if (tokenObj.statusCode === 200 && tokenObj.data) {
            // Check specifically for NLS error messages within the data payload
            if (tokenObj.data.ErrMsg && tokenObj.data.ErrMsg !== "") {
                console.error("[refreshToken] Server returned 200 OK but with error message:", tokenObj.data.ErrMsg, "(Code:", tokenObj.data.ErrCode, ")");
                reject(new Error("Server returned error: " + tokenObj.data.ErrMsg + " (Code: " + tokenObj.data.ErrCode + ")"));
                return;
            }

            // Try to find any token-like field in the response (less reliable)
            const dataStr = JSON.stringify(tokenObj.data);
            console.log("[refreshToken] Trying to extract token from potentially unknown successful structure:", dataStr);
            try {
                const parsedData = typeof tokenObj.data === 'string'
                    ? JSON.parse(tokenObj.data)
                    : tokenObj.data;
                let token = null;
                if (parsedData.Token && parsedData.Token.Id) {
                    token = parsedData.Token.Id;
                } else if (parsedData.token) {
                    token = parsedData.token;
                } else if (parsedData.id) {
                    token = parsedData.id;
                } else if (parsedData.Id) {
                    token = parsedData.Id;
                } else if (parsedData.access_token) {
                    token = parsedData.access_token;
                }

                if (token) {
                    console.log("[refreshToken] Found token in alternate location:", token.substring(0, 5) + "...");
                    // We might not have ExpireTime here, cache cautiously or don't cache
                    wx.setStorage({
                        key: cacheKey,
                        // Storing potentially incomplete data
                        data: JSON.stringify(parsedData),
                        encrypt: true,
                        complete: () => {
                            console.log("[refreshToken] Resolving with token from alternate location.");
                            resolve(token);
                        }
                    });
                    return;
                }
            } catch (e) {
                console.error("[refreshToken] Error parsing response data:", e);
            }
        }

        // If none of the above conditions were met, it's an invalid response
        console.error("[refreshToken] Failed to extract valid token. Response status:", tokenObj.statusCode, "Data:", JSON.stringify(tokenObj.data));
        reject(new Error("Failed to extract valid token from server response. Status: " + tokenObj.statusCode));

    } catch (error) {
        console.error("[refreshToken] Network or other error during token refresh:", error);
        reject(error);
    }
}

// Export the non-sensitive config if needed elsewhere, but primarily use secrets internally
export {
    // ALI_CLOUD_CONFIG, // Consider if this needs to be exported
    getToken, // Keep exporting functions
    generateUUID,
    getUTCTimestamp,
    b64_hmac_sha1
}; 