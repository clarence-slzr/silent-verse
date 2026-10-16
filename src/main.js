import './style.css';
import { audio } from './audio.js';
import { Game } from './game.js';

const game = new Game();

const startScreen = document.getElementById('start-screen');
const nameInput = document.getElementById('name-input');

// ===== CHARACTER SELECTION =====
document.getElementById('pick-male').addEventListener('click', () => {
    const name = nameInput.value.trim() || 'Wanderer';
    startScreen.classList.remove('active');
    game.start('male', name);
    setTimeout(() => audio.startBg(), 500);
});

document.getElementById('pick-female').addEventListener('click', () => {
    const name = nameInput.value.trim() || 'Wanderer';
    startScreen.classList.remove('active');
    game.start('female', name);
    setTimeout(() => audio.startBg(), 500);
});

nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') nameInput.blur();
});

// ===== MUSIC MENU LOGIC =====
document.addEventListener('DOMContentLoaded', setupMusicMenu);
setupMusicMenu();

function setupMusicMenu() {
    const musicToggle = document.getElementById('music-toggle');
    const musicMenu = document.getElementById('music-menu');
    const musicOptions = document.querySelectorAll('.music-option');
    const volumeSlider = document.getElementById('volume-slider');
    const volumeValue = document.getElementById('volume-value');

    if (!musicToggle || !musicMenu) return;

    // Toggle menu on click
    musicToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        musicMenu.classList.toggle('show');
    });

    // Song selection
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

    // Load saved state
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

    // Volume slider
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

    // Close on outside click
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