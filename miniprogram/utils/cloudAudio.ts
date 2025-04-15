/**
 * Cloud Audio Utilities
 * Functions to handle audio files stored in cloud storage
 */

// Cache to store downloaded audio file paths
const audioCache: Record<string, string> = {};

/**
 * Download an audio file from cloud storage
 * Returns a promise that resolves with the local temporary file path
 * 
 * @param fileID The cloud file ID of the audio file
 * @param useCache Whether to use cached file path if available
 * @returns Promise<string> Temporary file path
 */
export function downloadCloudAudio(fileID: string, useCache: boolean = true): Promise<string> {
    // If cache is enabled and we have a cached file path, return it immediately
    if (useCache && audioCache[fileID]) {
        console.log(`[CloudAudio] Using cached audio file: ${fileID}`);
        return Promise.resolve(audioCache[fileID]);
    }

    console.log(`[CloudAudio] Downloading audio file: ${fileID}`);

    // Download the file from cloud storage
    return new Promise((resolve, reject) => {
        wx.cloud.downloadFile({
            fileID: fileID,
            success: res => {
                console.log(`[CloudAudio] Download success: ${fileID}`);
                // Cache the temporary file path
                audioCache[fileID] = res.tempFilePath;
                resolve(res.tempFilePath);
            },
            fail: err => {
                console.error(`[CloudAudio] Download failed: ${fileID}`, err);
                reject(err);
            }
        });
    });
}

/**
 * Convert a local asset path to a cloud file ID
 * 
 * @param localPath The local path to the audio file (e.g., /assets/audio/ringtone.mp3)
 * @returns The cloud file ID
 */
export function getCloudFileID(localPath: string): string {
    // Remove leading slash if present
    const normalizedPath = localPath.startsWith('/') ? localPath.substring(1) : localPath;

    // Create and return the full cloud file ID
    return `cloud://cloud1-6g9ht8y6f2744311.636c-cloud1-6g9ht8y6f2744311-1350392348/${normalizedPath}`;
}

/**
 * Clear the audio cache to free up storage space
 */
export function clearAudioCache(): void {
    console.log('[CloudAudio] Clearing audio cache');
    Object.keys(audioCache).forEach(key => {
        delete audioCache[key];
    });
}

/**
 * Get the cached audio file path
 * 
 * @param fileID The cloud file ID
 * @returns The cached file path or undefined if not cached
 */
export function getCachedAudioPath(fileID: string): string | undefined {
    return audioCache[fileID];
}

/**
 * Check if an audio file is cached
 * 
 * @param fileID The cloud file ID
 * @returns True if the file is cached, false otherwise
 */
export function isAudioCached(fileID: string): boolean {
    return !!audioCache[fileID];
} 