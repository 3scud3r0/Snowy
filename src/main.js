import { Game } from './game/Game.js';
import { HUD } from './ui/HUD.js';

const ui = new HUD();
const game = new Game(document.querySelector('#game'), ui);
window.__snowy = game;

document.querySelector('#start').addEventListener('click', () => { document.body.classList.add('playing'); game.start(); });
document.querySelector('#again').addEventListener('click', () => { document.body.classList.add('playing'); game.start(); });

let audio;
document.querySelector('#sound').addEventListener('click', async (event) => {
  if (!audio) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audio = new AC();
    const buffer = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = audio.createBufferSource();
    src.buffer = buffer; src.loop = true;
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 900;
    const gain = audio.createGain(); gain.gain.value = .045;
    src.connect(filter).connect(gain).connect(audio.destination); src.start();
  }
  if (audio.state === 'running') {
    await audio.suspend();
    event.currentTarget.textContent = 'ÁUDIO OFF';
    event.currentTarget.setAttribute('aria-pressed', 'false');
  } else {
    await audio.resume();
    event.currentTarget.textContent = 'ÁUDIO ON';
    event.currentTarget.setAttribute('aria-pressed', 'true');
  }
});
