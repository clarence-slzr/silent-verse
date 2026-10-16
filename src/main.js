import './style.css';
import { audio } from './audio.js';
import { Game } from './game.js';

const game = new Game();

const startScreen = document.getElementById('start-screen');
const nameInput = document.getElementById('name-input');
const startBtn = document.getElementById('start-btn');

// ===== START BUTTON =====
if (startBtn) {
    startBtn.addEventListener('click', () => {
        const name = nameInput.value.trim() || 'Wanderer';
        startScreen.classList.remove('active');
        game.start('female', name);
        setTimeout(() => audio.startBg(), 500);
    });
}

// Enter key in name input also starts
if (nameInput) {
    nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && startBtn) {
            startBtn.click();
        }
    });
}

// ===== MUSIC MENU =====
const musicToggle = document.getElementById('music-toggle');
const musicMenu = document.getElementById('music-menu');
const musicOptions = document.querySelectorAll('.music-option');
const volumeSlider = document.getElementById('volume-slider');
const volumeValue = document.getElementById('volume-value');

if (musicToggle && musicMenu) {
    musicToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        musicMenu.classList.toggle('show');
    });

    musicOptions.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const songId = parseInt(btn.dataset.song);
            audio.playSong(songId);

            musicOptions.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (songId === 0) {
                musicToggle.classList.remove('playing');
            } else {
                musicToggle.classList.add('playing');
            }

            musicMenu.classList.remove('show');
        });
    });

    const savedSong = localStorage.getItem('currentSong');
    if (savedSong !== null) {
        const songId = parseInt(savedSong);
        musicOptions.forEach(b => {
            b.classList.toggle('active', parseInt(b.dataset.song) === songId);
        });
        if (songId !== 0) musicToggle.classList.add('playing');
    } else {
        musicToggle.classList.add('playing');
    }

    if (volumeSlider && volumeValue) {
        const savedVol = localStorage.getItem('musicVolume');
        if (savedVol) {
            volumeSlider.value = parseFloat(savedVol) * 100;
            volumeValue.textContent = Math.round(parseFloat(savedVol) * 100);
        }

        volumeSlider.addEventListener('input', (e) => {
            const vol = parseInt(e.target.value);
            volumeValue.textContent = vol;
            audio.setVolume(vol);
        });
    }

    document.addEventListener('click', (e) => {
        if (!musicMenu.contains(e.target) && e.target !== musicToggle) {
            musicMenu.classList.remove('show');
        }
    });
}

window.addEventListener('error', (e) => {
    console.error('Error:', e.error);
});

export default game;