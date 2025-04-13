import * as aliTts from './tts';
import * as cosyVoiceTts from './cosyVoiceTts';

// Available TTS provider types
export type TtsProviderType = 'ali' | 'cosyvoice';

// Current active TTS provider
let currentProvider: TtsProviderType = 'cosyvoice'; // Default to CosyVoice TTS

// Flag to prevent infinite fallback loops
let isFallbackAttempted = false;

/**
 * Set the active TTS provider
 * @param provider The TTS provider to use
 */
export function setTtsProvider(provider: TtsProviderType): void {
    // Stop any current playback when switching
    stopPlayback(true);

    // Update the current provider
    currentProvider = provider;
    // Reset fallback flag
    isFallbackAttempted = false;
    console.log(`[TTS Provider] Switched to ${provider} TTS provider`);
}

/**
 * Get the currently active TTS provider
 * @returns The current TTS provider
 */
export function getCurrentTtsProvider(): TtsProviderType {
    return currentProvider;
}

/**
 * Synthesizes speech from text using the current TTS provider and plays it.
 * @param text The text to synthesize.
 * @param voice The voice model to use.
 * @param format The audio format (e.g., 'mp3').
 * @param sampleRate The audio sample rate.
 * @param onEnded Callback function when playback finishes.
 * @param onError Callback function for errors during synthesis or playback.
 */
export async function synthesizeAndPlay(
    text: string,
    voice?: string,
    format: string = 'mp3',
    sampleRate?: number,
    onEnded?: () => void,
    onError?: (error: any) => void
): Promise<void> {
    // If no text, don't do anything
    if (!text.trim()) {
        console.warn('[TTS Provider] Empty text provided, skipping synthesis');
        return;
    }

    // Make sure there's no ongoing playback
    stopPlayback(true);
    console.log('[TTS Provider] Synthesizing with:')

    // Create wrapped callbacks to handle fallback
    const wrappedOnError = (error: any) => {
        console.error(`[TTS Provider] ${currentProvider} TTS failed:`, error);

        // Try fallback if we haven't already
        if (!isFallbackAttempted) {
            isFallbackAttempted = true;
            console.log(`[TTS Provider] Trying fallback to ${currentProvider === 'cosyvoice' ? 'ali' : 'cosyvoice'} TTS`);

            // Switch provider temporarily
            const originalProvider = currentProvider;
            currentProvider = currentProvider === 'cosyvoice' ? 'ali' : 'cosyvoice';

            // Try with alternate provider
            synthesizeAndPlay(text, voice, format, sampleRate, onEnded, (fallbackError) => {
                console.error(`[TTS Provider] Fallback to ${currentProvider} also failed:`, fallbackError);
                currentProvider = originalProvider; // Restore original provider
                isFallbackAttempted = false; // Reset flag
                if (onError) onError(error); // Pass original error to caller
            }).catch(err => {
                console.error(`[TTS Provider] Unexpected error in fallback:`, err);
                currentProvider = originalProvider; // Restore original provider
                isFallbackAttempted = false; // Reset flag
                if (onError) onError(error); // Pass original error to caller
            });
            return;
        }

        // If we already tried fallback or this is a fallback error, call original error handler
        if (onError) onError(error);
    };

    const wrappedOnEnded = () => {
        isFallbackAttempted = false; // Reset flag
        if (onEnded) onEnded();
    };

    // Select the appropriate defaults and provider for synthesis
    console.log('[TTS Provider] Current TTS provider:', currentProvider);
    if (currentProvider === 'cosyvoice') {
        const cosyVoice = voice || 'longxiaochun';
        const cosySampleRate = sampleRate || 22050;

        console.log('[TTS Provider] Synthesizing with CosyVoice:', {
            text,
            voice: cosyVoice,
            format,
            sampleRate: cosySampleRate
        });

        try {
            return await cosyVoiceTts.synthesizeAndPlay(
                text,
                cosyVoice,
                format,
                cosySampleRate,
                wrappedOnEnded,
                wrappedOnError
            );
        } catch (error) {
            wrappedOnError(error);
        }
    } else {
        // Default to Alibaba Cloud TTS
        const aliVoice = voice || 'longwan';
        const aliSampleRate = sampleRate || 16000;

        console.log('[TTS Provider] Synthesizing with Ali TTS:', {
            text,
            voice: aliVoice,
            format,
            sampleRate: aliSampleRate
        });

        try {
            return await aliTts.synthesizeAndPlay(
                text,
                aliVoice,
                format,
                aliSampleRate,
                wrappedOnEnded,
                wrappedOnError
            );
        } catch (error) {
            wrappedOnError(error);
        }
    }
}

/**
 * Stops the current TTS playback for the active provider.
 * @param suppressErrors If true, errors from stopping playback will be suppressed.
 */
export function stopPlayback(suppressErrors: boolean = false): void {
    // Stop both providers to be safe
    aliTts.stopPlayback(suppressErrors);
    cosyVoiceTts.stopPlayback();
    // Reset fallback flag
    isFallbackAttempted = false;
} 