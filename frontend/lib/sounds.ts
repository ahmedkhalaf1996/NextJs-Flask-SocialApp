let audioContext: AudioContext | null = null;

const getAudioContext = () => {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as unknown as { webKitAudioContext?: typeof AudioContext}).webKitAudioContext;

    if (!AudioContextClass) return null;

    if(!audioContext) {
        audioContext = new AudioContextClass();
    }

    if (audioContext.state === 'suspended'){
        audioContext.resume().catch(()=> {})
    }

    return audioContext;
}

const playTone = (frequency: number, startTime: number , duration: number, volume = 0.08) => {
    const context = getAudioContext();
    if(!context) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startTime)
    oscillator.stop(startTime + duration + 0.02);
};

export const playNotificatonSound = ()=> {
    const context = getAudioContext();
    if(!context) return;

    const now = context.currentTime;
    playTone(880, now, 0.11, 0.07)
    playTone(1174, now + 0.1, 0.16, 0.055)

}

export const playMessageSound = ()=> {
    const context = getAudioContext();
    if(!context) return;

    const now = context.currentTime;
    playTone(523, now, 0.09, 0.06)
    playTone(659, now + 0.08, 0.12, 0.05)


}
export const prepareNoificationSound = ()=> {
    const context = getAudioContext();
    if(!context) return;

    const now = context.currentTime;
    playTone(1, now, 0.01, 0.0001)
}
