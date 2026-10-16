class AudioManager {
    constructor() {
        this.ctx = null;
        this.enabled = false;
        this.bgAudio = null;
        this.currentSong = 1;
        this.volume = 0.35;

        this.songs = {
            0: null,
            1: '/song1.mp3',
            2: '/song2.mp3',
            3: '/song3.mp3'
        };
    }

    init() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) { }
    }

    startBg() {
        const saved = localStorage.getItem('currentSong');
        if (saved !== null) this.currentSong = parseInt(saved);
        const savedVol = localStorage.getItem('musicVolume');
        if (savedVol) this.volume = parseFloat(savedVol);
        this.playSong(this.currentSong);
    }

    playSong(songId) {
        if (this.bgAudio) {
            this.bgAudio.pause();
            this.bgAudio.currentTime = 0;
            this.bgAudio = null;
        }

        this.currentSong = songId;
        localStorage.setItem('currentSong', songId);

        if (songId === 0) {
            this.startProceduralBg();
            return;
        }

        const url = this.songs[songId];
        if (!url) return;

        this.bgAudio = new Audio(url);
        this.bgAudio.loop = true;
        this.bgAudio.volume = this.volume;

        this.bgAudio.play().catch((err) => {
            console.log('MP3 play failed:', err);
            this.startProceduralBg();
        });
    }

    setVolume(vol) {
        this.volume = vol / 100;
        localStorage.setItem('musicVolume', this.volume);
        if (this.bgAudio) this.bgAudio.volume = this.volume;
        if (this.masterGain) this.masterGain.gain.value = this.volume * 0.2;
    }

    startProceduralBg() {
        this.init();
        if (!this.ctx || this.enabled) return;
        this.enabled = true;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const masterGain = this.ctx.createGain();
        masterGain.gain.value = this.volume * 0.2;
        masterGain.connect(this.ctx.destination);
        this.masterGain = masterGain;

        const chords = [
            [220, 277.18, 329.63],
            [246.94, 293.66, 369.99],
            [196, 246.94, 293.66],
            [174.61, 220, 261.63],
        ];

        let idx = 0;
        const playChord = () => {
            if (!this.enabled) return;
            const chord = chords[idx % chords.length];
            idx++;
            const now = this.ctx.currentTime;
            chord.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const g = this.ctx.createGain();
                osc.type = i === 0 ? 'sine' : 'triangle';
                osc.frequency.value = freq;
                g.gain.setValueAtTime(0, now);
                g.gain.linearRampToValueAtTime(0.06, now + 1.5);
                g.gain.linearRampToValueAtTime(0, now + 6);
                osc.connect(g);
                g.connect(masterGain);
                osc.start(now);
                osc.stop(now + 6.5);
            });
        };
        playChord();
        this.bgInterval = setInterval(playChord, 5500);
    }

    stopBg() {
        this.enabled = false;
        if (this.bgInterval) clearInterval(this.bgInterval);
        if (this.masterGain) { try { this.masterGain.disconnect(); } catch (e) { } }
        if (this.bgAudio) this.bgAudio.pause();
    }

    pickup() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99].forEach((f, i) => {
            const o = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            o.frequency.value = f;
            o.type = 'sine';
            g.gain.setValueAtTime(0, now + i * 0.08);
            g.gain.linearRampToValueAtTime(0.15, now + i * 0.08 + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.7);
            o.connect(g); g.connect(this.ctx.destination);
            o.start(now + i * 0.08);
            o.stop(now + i * 0.08 + 0.8);
        });
    }

    correct() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [440, 554.37, 659.25, 880].forEach((f, i) => {
            const o = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            o.frequency.value = f;
            o.type = 'triangle';
            g.gain.setValueAtTime(0, now + i * 0.09);
            g.gain.linearRampToValueAtTime(0.12, now + i * 0.09 + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.6);
            o.connect(g); g.connect(this.ctx.destination);
            o.start(now + i * 0.09); o.stop(now + i * 0.09 + 0.7);
        });
    }

    wrong() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.frequency.value = 180;
        o.type = 'sawtooth';
        g.gain.setValueAtTime(0.15, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        o.connect(g); g.connect(this.ctx.destination);
        o.start(now); o.stop(now + 0.5);
    }

    endingChime() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
        notes.forEach((f, i) => {
            const o = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            o.frequency.value = f;
            o.type = 'sine';
            g.gain.setValueAtTime(0, now + i * 0.15);
            g.gain.linearRampToValueAtTime(0.1, now + i * 0.15 + 0.05);
            g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 1.5);
            o.connect(g); g.connect(this.ctx.destination);
            o.start(now + i * 0.15); o.stop(now + i * 0.15 + 1.6);
        });
    }
}

export const audio = new AudioManager();