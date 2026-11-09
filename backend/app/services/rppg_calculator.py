import numpy as np
from scipy.signal import butter, filtfilt

WINDOW_SIZE = 400 
EXPECTED_FPS = 30.0

def _sampling_rate(timestamps: np.ndarray | None) -> float:
    """Return an observed rate, falling back only when timing is unavailable."""
    if timestamps is None or len(timestamps) < 2:
        return EXPECTED_FPS
    deltas = np.diff(np.asarray(timestamps, dtype=np.float64))
    deltas = deltas[np.isfinite(deltas) & (deltas > 0)]
    if not len(deltas):
        return EXPECTED_FPS
    rate = 1.0 / float(np.median(deltas))
    # A browser can be throttled, but invalid client clocks must not produce a
    # mathematically plausible yet meaningless BPM result.
    if not np.isfinite(rate) or rate < 8.0 or rate > 90.0:
        raise ValueError(f"unsupported_rppg_sample_rate:{rate:.3f}")
    return rate


def calculate_bpm_from_signal(g_signal, timestamps=None):
    g_detrended = g_signal - np.mean(g_signal)
    lowcut = 0.8
    highcut = 3.0
    sample_rate = _sampling_rate(timestamps)
    nyq = 0.5 * sample_rate
    b, a = butter(2, [lowcut/nyq, highcut/nyq], btype='band')
    filtered = filtfilt(b, a, g_detrended)
    
    N = len(filtered)
    freqs = np.fft.rfftfreq(N, d=1.0/sample_rate)
    fft_mag = np.abs(np.fft.rfft(filtered))
    
    valid_idx = np.where((freqs >= lowcut) & (freqs <= highcut))[0]
    if len(valid_idx) == 0:
        return None
    
    valid_freqs = freqs[valid_idx]
    valid_mag = fft_mag[valid_idx]
    peak_freq = valid_freqs[np.argmax(valid_mag)]
    return peak_freq * 60.0

def calculate_bpm_from_rgb(r_arr, g_arr, b_arr, timestamps=None):
    r = np.array(r_arr, dtype=np.float64)
    g = np.array(g_arr, dtype=np.float64)
    b = np.array(b_arr, dtype=np.float64)

    if len(r) != len(g) or len(r) != len(b) or (timestamps is not None and len(r) != len(timestamps)):
        raise ValueError("rppg_channels_must_have_matching_lengths")
    if len(r) < 10:
        return None

    sample_rate = _sampling_rate(timestamps)
    r = (r - np.mean(r)) / (np.std(r) + 1e-8)
    g = (g - np.mean(g)) / (np.std(g) + 1e-8)
    b = (b - np.mean(b)) / (np.std(b) + 1e-8)

    s1 = g - b
    s2 = g + b - 2 * r
    alpha = np.std(s1) / (np.std(s2) + 1e-8)
    pulse = s1 - alpha * s2

    lowcut = 0.8
    highcut = 3.0
    nyq = 0.5 * sample_rate
    b_f, a_f = butter(2, [lowcut / nyq, highcut / nyq], btype="band")
    filtered = filtfilt(b_f, a_f, pulse)

    N = len(filtered)
    freqs = np.fft.rfftfreq(N, d=1.0 / sample_rate)
    fft_mag = np.abs(np.fft.rfft(filtered))

    valid_idx = np.where((freqs >= lowcut) & (freqs <= highcut))[0]
    if len(valid_idx) == 0:
        return None

    valid_freqs = freqs[valid_idx]
    valid_mag = fft_mag[valid_idx]
    peak_freq = valid_freqs[np.argmax(valid_mag)]
    return peak_freq * 60.0
