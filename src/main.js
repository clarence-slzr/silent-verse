import './style.css';
import { Game } from './game.js';

const game = new Game();

const startScreen = document.getElementById('start-screen');
const nameInput = document.getElementById('name-input');

document.getElementById('pick-male').addEventListener('click', () => {
    const name = nameInput.value.trim() || 'Wanderer';
    startScreen.classList.remove('active');
    game.start('male', name);
});

document.getElementById('pick-female').addEventListener('click', () => {
    const name = nameInput.value.trim() || 'Wanderer';
    startScreen.classList.remove('active');
    game.start('female', name);
});

// Press Enter in name input to focus
nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        nameInput.blur();
    }
});

window.addEventListener('error', (e) => {
    console.error('Error:', e.error);
});

export default game;