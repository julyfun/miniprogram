import { ALI_TTS_SECRETS, ALI_CLOUD_SECRETS } from './secrets';
import { getToken } from './aliCloudAuth';

// InnerAudioContext for playback
let innerAudioContext: WechatMiniprogram.InnerAudioContext | null = null;

// Keep track of the current request task to allow cancellation
let currentRequestTask: WechatMiniprogram.RequestTask | null = null;

/**
 * Synthesizes speech from text using Alibaba Cloud TTS service and plays it.
 * @param text The text to synthesize.
 * @param voice The voice model to use (e.g., 'siyue').
 * @param format The audio format (e.g., 'mp3').
 * @param sampleRate The audio sample rate (e.g., 16000).
 * @param onEnded Callback function when playback finishes.
 * @param onError Callback function for errors during synthesis or playback.
 */
export async function synthesizeAndPlay(text: string, voice: string = 'longwan', format: string = 'mp3', sampleRate: number = 16000, onEnded?: () => void, onError?: (error: any) => void): Promise<void> {
    console.log('[TTS] Starting synthesis for:', text);
    stopPlayback(); // Stop any previous playback or request
    voice = '';

    try {
        // --- Get a valid NLS token --- 
        console.log('[TTS] Requesting NLS token...');
        // Use the main AKID/AKKEY from ALI_CLOUD_SECRETS for token generation
        const token = await getToken(ALI_CLOUD_SECRETS.AKID, ALI_CLOUD_SECRETS.AKKEY);
        console.log('[TTS] NLS token obtained.');

        // Construct URL with the obtained token
        const url = `${ALI_TTS_SECRETS.API_URL}?appkey=${ALI_TTS_SECRETS.APPKEY}&token=${token}&text=${encodeURIComponent(text)}&format=${format}&sample_rate=${sampleRate}&voice=${voice}`;

        console.log('[TTS] Request URL (excluding token for security):', url.replace(/token=[^&]+/, 'token=***'));

        // --- Use wx.request to get the audio stream --- 
        currentRequestTask = wx.request({
            url: url,
            method: 'GET',
            responseType: 'arraybuffer',
            success: (res) => {
                if (res.statusCode === 200 && res.data instanceof ArrayBuffer) {
                    console.log('[TTS] Synthesis successful, received audio data (bytes):', res.data.byteLength);
                    playAudioData(res.data, onEnded, onError);
                } else {
                    // Error details are likely in the ArrayBuffer, but decoding is complex/unreliable here.
                    const errorDetails = res.data instanceof ArrayBuffer ? `(Binary data, length: ${res.data.byteLength})` : res.data;
                    console.error('[TTS] Synthesis failed. Status:', res.statusCode, 'Details:', errorDetails);
                    if (onError) {
                        onError({
                            message: `TTS Synthesis failed with status ${res.statusCode}`,
                            details: errorDetails // Provide raw details
                        });
                    }
                }
            },
            fail: (error) => {
                console.error('[TTS] Synthesis request failed:', error);
                if (onError) {
                    onError(error);
                }
            },
            complete: () => {
                currentRequestTask = null; // Clear the task reference
            }
        });

    } catch (tokenError) {
        // Handle errors during token fetching
        console.error('[TTS] Failed to get NLS token:', tokenError);
        if (onError) {
            onError({
                message: 'Failed to get TTS authentication token',
                details: tokenError
            });
        }
    }
}

/**
 * Plays the synthesized audio data (ArrayBuffer).
 * @param audioData The ArrayBuffer containing the audio data.
 * @param onEnded Callback when playback ends.
 * @param onError Callback for playback errors.
 */
function playAudioData(audioData: ArrayBuffer, onEnded?: () => void, onError?: (error: any) => void): void {
    // Create a temporary file path
    const fs = wx.getFileSystemManager();
    const tempFilePath = `${wx.env.USER_DATA_PATH}/tts_${Date.now()}.mp3`;

    // Write the ArrayBuffer to a temporary file
    fs.writeFile({
        filePath: tempFilePath,
        data: audioData,
        encoding: 'binary', // Use binary encoding for ArrayBuffer
        success: () => {
            console.log('[TTS] Audio data written to temp file:', tempFilePath);
            // Initialize and play the audio
            innerAudioContext = wx.createInnerAudioContext();
            innerAudioContext.src = tempFilePath; // Play from the temp file
            innerAudioContext.autoplay = true;

            innerAudioContext.onEnded(() => {
                console.log('[TTS] Playback finished.');
                stopPlayback(); // Clean up context
                if (onEnded) {
                    onEnded();
                }
                // Optional: Clean up the temp file
                // fs.unlink({ filePath: tempFilePath, success: () => console.log('[TTS] Temp file removed.'), fail: (err) => console.error('[TTS] Failed to remove temp file:', err) });
            });

            innerAudioContext.onError((res) => {
                console.error('[TTS] Playback error:', res);
                stopPlayback(); // Clean up context
                if (onError) {
                    onError(res);
                }
                // Optional: Clean up the temp file on error too
                // fs.unlink({ filePath: tempFilePath, fail: (err) => console.error('[TTS] Failed to remove temp file after error:', err) });
            });

            console.log('[TTS] Starting playback...');
        },
        fail: (err) => {
            console.error('[TTS] Failed to write temp audio file:', err);
            if (onError) {
                onError(err);
            }
        }
    });
}

/**
 * Stops the current TTS playback and cancels any ongoing request.
 * @param suppressErrors If true, errors from stopping playback will be suppressed (for intentional stops).
 */
export function stopPlayback(suppressErrors: boolean = false): void {
    if (currentRequestTask) {
        console.log('[TTS] Aborting ongoing synthesis request...');
        currentRequestTask.abort();
        currentRequestTask = null;
    }
    if (innerAudioContext) {
        console.log('[TTS] Stopping playback...');

        // If we're suppressing errors, remove error handlers before stopping
        if (suppressErrors && innerAudioContext.offError) {
            innerAudioContext.offError();
        }

        innerAudioContext.stop();
        innerAudioContext.destroy();
        innerAudioContext = null;
    }
} 