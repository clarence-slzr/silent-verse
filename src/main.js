import './style.css';
import { Game } from './game.js';

const game = new Game();

// Start screen logic
const startScreen = document.getElementById('start-screen');

document.getElementById('pick-male').addEventListener('click', () => {
    startScreen.classList.remove('active');
    game.start('male');
});

document.getElementById('pick-female').addEventListener('click', () => {
    startScreen.classList.remove('active');
    game.start('female');
});

// Global error handler
window.addEventListener('error', (e) => {
    console.error('Error:', e.error);
});

export default game;