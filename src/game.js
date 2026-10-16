import * as THREE from 'three';
import { audio } from './audio.js';
import { PUZZLES, FINAL_POEM_URL } from './puzzles.js';
import {
    createWorld, createPoemOrbs, createCharacter, createCat,
    createFlower, createButterflies, createBirds
} from './world.js';

const WALKING_NOTES = [
    'The valley remembers every step...',
    'A poem waits nearby.',
    'Listen to the whisper of the wind.',
    'Two souls await each other.',
    'Every riddle is a doorway.',
    'Light bends where love lingers.',
    'The sunset is closer than you think.',
    'Silence speaks in verses.',
    'You are not alone here.',
    'Follow the glow.',
];

export class Game {
    constructor() {
        this.canvas = document.getElementById('scene');
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a0a2a);

        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);

        const ambient = new THREE.AmbientLight(0x8060a0, 1.0);
        this.scene.add(ambient);
        const hemi = new THREE.HemisphereLight(0xc9a0ff, 0x2a3a2a, 0.8);
        this.scene.add(hemi);

        this.sun = new THREE.DirectionalLight(0xffd8a0, 1.4);
        this.sun.position.set(60, 80, 40);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(2048, 2048);
        this.sun.shadow.camera.left = -120;
        this.sun.shadow.camera.right = 120;
        this.sun.shadow.camera.top = 120;
        this.sun.shadow.camera.bottom = -120;
        this.sun.shadow.camera.far = 300;
        this.scene.add(this.sun);

        const worldData = createWorld(this.scene);
        this.getGroundHeight = worldData.getGroundHeight;
        this.collidables = worldData.collidables;

        this.orbs = createPoemOrbs(this.scene, PUZZLES, this.getGroundHeight);
        this.collectedCount = 0;

        this.gender = null;
        this.playerName = '';
        this.player = null;
        this.partner = null;
        this.partnerCat = null;

        this.cameraMode = 'third';
        this.cameraAngle = { yaw: 0, pitch: 0.25 };
        this.firstPersonPitch = 0;
        this.cameraDistance = 6;
        this.cameraSensitivity = 0.015;

        this.nearOrb = null;
        this.puzzleActive = false;
        this.ended = false;
        this.endingMode = false;

        this.velocityY = 0;
        this.isJumping = false;
        this.groundY = 0;

        this.walkCycle = 0;
        this.currentLives = 3;
        this.wrongAnswers = 0;

        this.moveTarget = null;
        this.moveMarker = null;

        this.noteTimer = 0;
        this.nextNoteTime = 8;
        this.notesContainer = document.getElementById('notes-container');

        this.counterEl = document.getElementById('counter');
        this.livesEl = document.getElementById('lives-display');
        this.nameDisplay = document.getElementById('player-name-display');
        this.puzzleModal = document.getElementById('puzzle-modal');
        this.puzzlePoem = document.getElementById('puzzle-poem');
        this.puzzleQuestion = document.getElementById('puzzle-question');
        this.puzzleChoices = document.getElementById('puzzle-choices');
        this.puzzleFeedback = document.getElementById('puzzle-feedback');
        this.interactPrompt = document.getElementById('interact-prompt');
        this.interactText = document.getElementById('interact-text');

        this.cameraToggle = document.getElementById('camera-toggle');
        this.cameraMenu = document.getElementById('camera-menu');
        this.cameraOptions = document.querySelectorAll('.camera-option');
        this.sensitivitySlider = document.getElementById('sensitivity-slider');
        this.sensitivityValue = document.getElementById('sensitivity-value');

        this.bindEvents();
        this.animate();
    }

    start(gender, playerName) {
        this.gender = gender;
        this.playerName = playerName || 'Wanderer';
        this.player = createCharacter(this.scene, gender);
        this.player.position.set(0, this.getGroundHeight(0, 0), 0);
        this.groundY = this.player.position.y;
        this.updatePlayerVisibility();

        if (this.nameDisplay) {
            this.nameDisplay.textContent = `— ${this.playerName} —`;
        }

        audio.startBg();
    }

    updatePlayerVisibility() {
        if (!this.player) return;
        this.player.visible = (this.cameraMode === 'third');
    }

    updateLivesDisplay() {
        const full = '❤️'.repeat(this.currentLives);
        const empty = '🖤'.repeat(3 - this.currentLives);
        if (this.livesEl) this.livesEl.textContent = full + empty;
    }

    bindEvents() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'e' && this.nearOrb && !this.puzzleActive && !this.ended) {
                this.openPuzzle(this.nearOrb);
            }
        });

        // ===== CLICK-TO-MOVE =====
        this.canvas.addEventListener('click', (e) => {
            if (this.puzzleActive || this.ended) return;
            if (this.nearOrb) {
                this.openPuzzle(this.nearOrb);
                return;
            }
            this.setMoveTarget(e.clientX, e.clientY);
        });

        this.canvas.addEventListener('touchstart', (e) => {
            if (this.puzzleActive || this.ended) return;
            const touch = e.touches[0];
            if (this.nearOrb) {
                this.openPuzzle(this.nearOrb);
                return;
            }
            this.setMoveTarget(touch.clientX, touch.clientY);
        }, { passive: true });

        // ===== MOUSE CAMERA ROTATION (right-click drag) =====
        let dragging = false;
        let dragStart = null;

        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 2) {
                dragging = true;
                dragStart = { x: e.clientX, y: e.clientY };
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (dragging) {
                const dx = e.clientX - dragStart.x;
                const dy = e.clientY - dragStart.y;
                this.cameraAngle.yaw -= dx * this.cameraSensitivity;
                this.cameraAngle.pitch -= dy * this.cameraSensitivity;
                this.cameraAngle.pitch = Math.max(-0.3, Math.min(0.9, this.cameraAngle.pitch));
                dragStart = { x: e.clientX, y: e.clientY };
            }
        });

        document.addEventListener('mouseup', () => {
            dragging = false;
        });

        // ===== TOUCH CAMERA ROTATION (2 fingers) =====
        let touchStart = null;
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                touchStart = {
                    x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                    y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
                };
            }
        }, { passive: true });

        this.canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && touchStart) {
                const x = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const y = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                const dx = x - touchStart.x;
                const dy = y - touchStart.y;
                this.cameraAngle.yaw -= dx * this.cameraSensitivity * 0.8;
                this.cameraAngle.pitch -= dy * this.cameraSensitivity * 0.8;
                this.cameraAngle.pitch = Math.max(-0.3, Math.min(0.9, this.cameraAngle.pitch));
                touchStart = { x, y };
            }
        }, { passive: true });

        this.canvas.addEventListener('touchend', () => {
            touchStart = null;
        });

        // ===== JUMP =====
        const jumpBtn = document.getElementById('jump-btn');
        if (jumpBtn) {
            jumpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.jump(); });
            jumpBtn.addEventListener('click', () => this.jump());
        }

        // ===== CAMERA MENU =====
        this.cameraToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.cameraMenu.classList.toggle('show');
        });

        this.cameraOptions.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.setCameraMode(btn.dataset.mode);
            });
        });

        document.addEventListener('click', (e) => {
            if (!this.cameraMenu.contains(e.target) && e.target !== this.cameraToggle) {
                this.cameraMenu.classList.remove('show');
            }
        });

        // ===== CAMERA SENSITIVITY =====
        if (this.sensitivitySlider) {
            const saved = localStorage.getItem('cameraSensitivity');
            if (saved) {
                this.cameraSensitivity = parseFloat(saved);
                this.sensitivitySlider.value = this.cameraSensitivity * 1000;
                if (this.sensitivityValue) {
                    this.sensitivityValue.textContent = Math.round(this.cameraSensitivity * 1000);
                }
            }

            this.sensitivitySlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value) / 1000;
                this.cameraSensitivity = val;
                if (this.sensitivityValue) {
                    this.sensitivityValue.textContent = e.target.value;
                }
                localStorage.setItem('cameraSensitivity', val);
            });
        }

        document.getElementById('close-puzzle').addEventListener('click', () => this.closePuzzle());

        const finalBtn = document.getElementById('final-poem-btn');
        if (finalBtn) {
            finalBtn.addEventListener('click', () => {
                window.open(FINAL_POEM_URL, '_blank');
            });
        }

        document.getElementById('restart-btn').addEventListener('click', () => {
            location.reload();
        });

        // ===== MUSIC MENU =====
        const musicToggle = document.getElementById('music-toggle');
        const musicMenu = document.getElementById('music-menu');
        const musicOptions = document.querySelectorAll('.music-option');
        const volumeSlider = document.getElementById('volume-slider');
        const volumeValue = document.getElementById('volume-value');

        if (musicToggle && musicMenu) {
            musicToggle.addEventListener('click', (e) => {
                e.stopPropagation();
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

            // Load saved music state
            const savedSong = localStorage.getItem('currentSong');
            if (savedSong !== null) {
                const songId = parseInt(savedSong);
                musicOptions.forEach(b => {
                    b.classList.toggle('active', parseInt(b.dataset.song) === songId);
                });
                if (songId !== 0) {
                    musicToggle.classList.add('playing');
                }
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

            // Close menu on outside click
            document.addEventListener('click', (e) => {
                if (!musicMenu.contains(e.target) && e.target !== musicToggle) {
                    musicMenu.classList.remove('show');
                }
            });
        }
    }

    setCameraMode(mode) {
        this.cameraMode = mode;
        this.cameraOptions.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
        if (mode === 'first') this.firstPersonPitch = 0;
        else this.cameraAngle.pitch = 0.25;
        this.updatePlayerVisibility();
    }

    setMoveTarget(clientX, clientY) {
        if (!this.player || !this.camera) return;

        const rect = this.canvas.getBoundingClientRect();
        const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);

        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const point = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, point)) {
            this.moveTarget = point;
            this.showMoveMarker(point);
        }
    }

    showMoveMarker(pos) {
        if (!this.moveMarker) {
            const geo = new THREE.RingGeometry(0.4, 0.7, 32);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xc9a0ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide
            });
            this.moveMarker = new THREE.Mesh(geo, mat);
            this.moveMarker.rotation.x = -Math.PI / 2;
            this.scene.add(this.moveMarker);
        }
        this.moveMarker.position.set(pos.x, this.getGroundHeight(pos.x, pos.z) + 0.1, pos.z);
        this.moveMarker.visible = true;

        let scale = 1;
        const pulse = () => {
            scale -= 0.04;
            if (scale < 0.5) {
                this.moveMarker.scale.setScalar(1);
                return;
            }
            this.moveMarker.scale.setScalar(scale);
            requestAnimationFrame(pulse);
        };
        pulse();

        clearTimeout(this._markerTimeout);
        this._markerTimeout = setTimeout(() => {
            if (this.moveMarker) this.moveMarker.visible = false;
        }, 2000);
    }

    jump() {
        if (!this.player || this.isJumping) return;
        this.velocityY = 8;
        this.isJumping = true;
    }

    updatePlayer(dt) {
        if (!this.player || this.puzzleActive || this.ended) return;

        const speed = 6;
        let move = new THREE.Vector3();
        let isMoving = false;

        if (this.moveTarget) {
            const dir = new THREE.Vector3(
                this.moveTarget.x - this.player.position.x, 0,
                this.moveTarget.z - this.player.position.z
            );
            const dist = dir.length();

            if (dist > 0.4) {
                move = dir.normalize();
                isMoving = true;
            } else {
                this.moveTarget = null;
            }
        }

        if (isMoving) {
            const next = this.player.position.clone().addScaledVector(move, speed * dt);

            let blocked = false;
            for (const c of this.collidables) {
                const dx = next.x - c.x;
                const dz = next.z - c.z;
                const d = Math.sqrt(dx * dx + dz * dz);
                if (d < c.radius + 0.4) { blocked = true; break; }
            }

            if (!blocked) {
                next.y = this.getGroundHeight(next.x, next.z);
                if (next.length() < 95) {
                    this.player.position.x = next.x;
                    this.player.position.z = next.z;
                }
            } else {
                this.moveTarget = null;
            }

            const targetRot = Math.atan2(move.x, move.z);
            this.player.rotation.y = this.lerpAngle(this.player.rotation.y, targetRot, 0.2);
        }

        const groundY = this.getGroundHeight(this.player.position.x, this.player.position.z);
        this.groundY = groundY;

        if (this.isJumping) {
            this.player.position.y += this.velocityY * dt;
            this.velocityY -= 20 * dt;
            if (this.player.position.y <= groundY) {
                this.player.position.y = groundY;
                this.isJumping = false;
                this.velocityY = 0;
            }
        } else {
            this.player.position.y = groundY;
        }

        const u = this.player.userData;
        if (isMoving && !this.isJumping) {
            this.walkCycle += dt * 9;
            const swing = Math.sin(this.walkCycle);
            const counterSwing = Math.sin(this.walkCycle + Math.PI);

            if (u.leftArm) u.leftArm.rotation.x = swing * 0.7;
            if (u.rightArm) u.rightArm.rotation.x = -swing * 0.7;
            if (u.leftLeg) u.leftLeg.rotation.x = counterSwing * 0.6;
            if (u.rightLeg) u.rightLeg.rotation.x = swing * 0.6;

            const bob = Math.abs(Math.sin(this.walkCycle)) * 0.08;
            this.player.position.y += bob;
        } else {
            const resetLerp = 0.15;
            if (u.leftArm) u.leftArm.rotation.x *= (1 - resetLerp);
            if (u.rightArm) u.rightArm.rotation.x *= (1 - resetLerp);
            if (u.leftLeg) u.leftLeg.rotation.x *= (1 - resetLerp);
            if (u.rightLeg) u.rightLeg.rotation.x *= (1 - resetLerp);
        }
    }

    lerpAngle(a, b, t) {
        let diff = b - a;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return a + diff * t;
    }

    updateCamera(dt) {
        if (!this.player || this.endingMode) return;

        if (this.cameraMode === 'first') {
            const eyeHeight = this.player.position.y + 1.65;
            this.camera.position.lerp(
                new THREE.Vector3(this.player.position.x, eyeHeight, this.player.position.z),
                1 - Math.pow(0.0001, dt)
            );
            const dir = new THREE.Vector3(
                -Math.sin(this.cameraAngle.yaw) * Math.cos(this.firstPersonPitch),
                Math.sin(this.firstPersonPitch),
                -Math.cos(this.cameraAngle.yaw) * Math.cos(this.firstPersonPitch)
            );
            this.camera.lookAt(
                this.camera.position.x + dir.x,
                this.camera.position.y + dir.y,
                this.camera.position.z + dir.z
            );
        } else {
            const targetY = this.player.position.y + 1.2;
            const dist = this.cameraDistance;
            const camX = this.player.position.x + Math.sin(this.cameraAngle.yaw) * dist;
            const camZ = this.player.position.z + Math.cos(this.cameraAngle.yaw) * dist;
            const camY = targetY + 2.5 + this.cameraAngle.pitch * 5;

            this.camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 1 - Math.pow(0.001, dt));
            this.camera.lookAt(this.player.position.x, targetY, this.player.position.z);
        }
    }

    updateOrbs(dt) {
        if (!this.player) return;
        const t = performance.now() * 0.001;
        this.nearOrb = null;
        let nearestDist = 3.5;

        this.orbs.forEach((orb) => {
            if (orb.userData.collected) return;
            orb.userData.time += dt;
            orb.position.y = orb.userData.baseY + Math.sin(t * 1.5 + orb.userData.time) * 0.2;
            orb.rotation.y += dt * 0.5;
            orb.userData.shell.rotation.x += dt * 0.3;
            orb.userData.shell.rotation.z += dt * 0.4;

            const dist = orb.position.distanceTo(this.player.position);
            if (dist < nearestDist) { nearestDist = dist; this.nearOrb = orb; }
        });

        if (this.nearOrb && !this.puzzleActive && !this.ended) {
            this.interactPrompt.classList.add('show');
            const idx = this.nearOrb.userData.index;
            this.interactText.innerHTML = `Press <b>E</b> or <b>Tap</b> to read Poem #${idx + 1}`;
        } else {
            this.interactPrompt.classList.remove('show');
        }
    }

    spawnNote() {
        const text = WALKING_NOTES[Math.floor(Math.random() * WALKING_NOTES.length)];
        const note = document.createElement('div');
        note.className = 'note';
        note.textContent = text;
        this.notesContainer.appendChild(note);
        setTimeout(() => { if (note.parentNode) note.parentNode.removeChild(note); }, 4200);
    }

    openPuzzle(orb) {
        if (orb.userData.collected) return;
        this.puzzleActive = true;
        this.currentOrb = orb;

        this.currentLives = 3;
        this.wrongAnswers = 0;
        this.updateLivesDisplay();

        const p = orb.userData.puzzle;
        const idx = orb.userData.index;
        this.puzzlePoem.textContent = p.excerpt;
        this.puzzleQuestion.textContent = `${idx + 1}. ${p.question}`;
        this.puzzleFeedback.textContent = '';
        this.puzzleFeedback.className = 'feedback';

        this.puzzleChoices.innerHTML = '';
        const letters = ['A', 'B', 'C', 'D'];
        p.choices.forEach((choice, i) => {
            const btn = document.createElement('button');
            btn.className = 'choice-option';
            btn.innerHTML = `<span class="choice-letter">${letters[i]}</span><span>${choice}</span>`;
            btn.addEventListener('click', () => this.checkAnswer(choice, btn));
            this.puzzleChoices.appendChild(btn);
        });

        this.puzzleModal.classList.add('active');
    }

    checkAnswer(choice, btn) {
        if (!this.currentOrb) return;
        const p = this.currentOrb.userData.puzzle;

        if (choice === p.correct) {
            btn.classList.add('correct');
            this.puzzleFeedback.textContent = '✨ Correct! The poem fades into light.';
            this.puzzleFeedback.className = 'feedback ok';
            audio.correct();
            this.puzzleChoices.querySelectorAll('button').forEach(b => b.disabled = true);
            setTimeout(() => this.solvePuzzle(this.currentOrb), 900);
        } else {
            btn.classList.add('wrong');
            btn.disabled = true;
            this.currentLives--;
            this.wrongAnswers++;
            this.updateLivesDisplay();
            audio.wrong();

            if (this.currentLives <= 0) {
                this.puzzleFeedback.textContent = '💔 Out of lives! The poem fades away... Find it elsewhere.';
                this.puzzleFeedback.className = 'feedback err';
                this.puzzleChoices.querySelectorAll('button').forEach(b => b.disabled = true);

                setTimeout(() => {
                    this.relocateOrb(this.currentOrb);
                    this.closePuzzle();
                }, 2000);
            } else {
                this.puzzleFeedback.textContent = `🌙 Not quite... ${this.currentLives} ${this.currentLives === 1 ? 'life' : 'lives'} left.`;
                this.puzzleFeedback.className = 'feedback err';
            }
        }
    }

    relocateOrb(orb) {
        let newX, newZ, newY, attempts = 0;
        do {
            const angle = Math.random() * Math.PI * 2;
            const radius = 30 + Math.random() * 60;
            newX = Math.cos(angle) * radius;
            newZ = Math.sin(angle) * radius;
            newY = this.getGroundHeight(newX, newZ);
            attempts++;
        } while (this.player && Math.hypot(newX - this.player.position.x, newZ - this.player.position.z) < 15 && attempts < 20);

        orb.position.set(newX, newY + 1.5, newZ);
        orb.userData.baseY = newY + 1.5;

        const note = document.createElement('div');
        note.className = 'note';
        note.textContent = '✨ The poem moved to a new place...';
        this.notesContainer.appendChild(note);
        setTimeout(() => { if (note.parentNode) note.parentNode.removeChild(note); }, 4200);
    }

    solvePuzzle(orb) {
        orb.userData.collected = true;
        this.collectedCount++;
        this.counterEl.textContent = `Found: ${this.collectedCount} / ${PUZZLES.length}`;

        let scale = 1;
        const dissolve = () => {
            scale -= 0.05;
            orb.scale.setScalar(Math.max(0, scale));
            orb.userData.light.intensity = Math.max(0, orb.userData.light.intensity - 0.1);
            if (scale > 0) requestAnimationFrame(dissolve);
            else orb.visible = false;
        };
        audio.pickup();
        dissolve();

        this.closePuzzle();

        if (this.collectedCount >= PUZZLES.length) {
            setTimeout(() => this.startEnding(), 1200);
        }
    }

    closePuzzle() {
        this.puzzleActive = false;
        this.puzzleModal.classList.remove('active');
        this.currentOrb = null;
        this.currentLives = 3;
        this.updateLivesDisplay();
    }

    startEnding() {
        this.ended = true;
        this.endingMode = true;
        this.interactPrompt.classList.remove('show');
        this.cameraMenu.classList.remove('show');

        const endX = 0, endZ = 0;
        this.player.position.set(endX - 8, this.getGroundHeight(endX - 8, endZ), endZ);
        this.player.rotation.y = Math.PI / 2;
        this.player.visible = true;

        const u = this.player.userData;
        if (u.leftArm) u.leftArm.rotation.x = 0;
        if (u.rightArm) u.rightArm.rotation.x = 0;
        if (u.leftLeg) u.leftLeg.rotation.x = 0;
        if (u.rightLeg) u.rightLeg.rotation.x = 0;

        const partnerGender = this.gender === 'male' ? 'female' : 'male';
        this.partner = createCharacter(this.scene, partnerGender);
        this.partner.position.set(endX + 8, this.getGroundHeight(endX + 8, endZ), endZ);
        this.partner.rotation.y = -Math.PI / 2;

        this.partnerCat = createCat(this.partner, true);

        this.flower = createFlower();
        this.flower.position.set(-0.5, 1.2, 0.35);
        this.player.add(this.flower);

        this.animateSunset();
        this.runEndingSequence();
    }

    runEndingSequence() {
        const walkDuration = 3500;
        const startTime = performance.now();

        const walkPhase = () => {
            const t = Math.min(1, (performance.now() - startTime) / walkDuration);
            const ease = 1 - Math.pow(1 - t, 3);

            const playerStartX = -8;
            const playerTargetX = -1.2;
            this.player.position.x = playerStartX + (playerTargetX - playerStartX) * ease;

            const partnerStartX = 8;
            const partnerTargetX = 1.2;
            this.partner.position.x = partnerStartX + (partnerTargetX - partnerStartX) * ease;

            const walkCycle = performance.now() * 0.012;
            const swing = Math.sin(walkCycle);

            const uP = this.player.userData;
            if (uP.leftArm) uP.leftArm.rotation.x = swing * 0.7;
            if (uP.rightArm) uP.rightArm.rotation.x = -swing * 0.7;
            if (uP.leftLeg) uP.leftLeg.rotation.x = -swing * 0.6;
            if (uP.rightLeg) uP.rightLeg.rotation.x = swing * 0.6;

            const uPtn = this.partner.userData;
            if (uPtn.leftArm) uPtn.leftArm.rotation.x = -swing * 0.7;
            if (uPtn.rightArm) uPtn.rightArm.rotation.x = swing * 0.7;
            if (uPtn.leftLeg) uPtn.leftLeg.rotation.x = swing * 0.6;
            if (uPtn.rightLeg) uPtn.rightLeg.rotation.x = -swing * 0.6;

            if (t < 1) requestAnimationFrame(walkPhase);
            else {
                const resetLimbs = (u) => {
                    if (u.leftArm) u.leftArm.rotation.x = 0;
                    if (u.rightArm) u.rightArm.rotation.x = 0;
                    if (u.leftLeg) u.leftLeg.rotation.x = 0;
                    if (u.rightLeg) u.rightLeg.rotation.x = 0;
                };
                resetLimbs(uP);
                resetLimbs(uPtn);
                setTimeout(() => this.giveFlowerPhase(), 500);
            }
        };
        walkPhase();
    }

    giveFlowerPhase() {
        const startPos = new THREE.Vector3(-0.5, 1.2, 0.35);
        const duration = 1500;
        const start = performance.now();

        this.player.remove(this.flower);
        this.scene.add(this.flower);
        this.flower.position.copy(this.player.position).add(startPos);

        const animate = () => {
            const t = Math.min(1, (performance.now() - start) / duration);
            const ease = 1 - Math.pow(1 - t, 3);

            const targetWorld = new THREE.Vector3(
                this.partner.position.x - 0.5,
                this.partner.position.y + 1.2,
                this.partner.position.z + 0.35
            );

            const currentPos = this.flower.position.clone().lerp(targetWorld, ease);
            currentPos.y += Math.sin(t * Math.PI) * 0.5;
            this.flower.position.copy(currentPos);
            this.flower.rotation.y += 0.05;

            if (t < 1) requestAnimationFrame(animate);
            else {
                this.scene.remove(this.flower);
                this.flower.position.set(-0.5, 1.2, 0.35);
                this.partner.add(this.flower);
                setTimeout(() => this.sitDownPhase(), 800);
            }
        };
        animate();
    }

    sitDownPhase() {
        this.player.rotation.y = Math.PI;
        this.partner.rotation.y = Math.PI;

        const sitOffset = -0.5;
        const duration = 1500;
        const start = performance.now();
        const startY1 = this.player.position.y;
        const startY2 = this.partner.position.y;

        const animate = () => {
            const t = Math.min(1, (performance.now() - start) / duration);
            const ease = 1 - Math.pow(1 - t, 3);
            this.player.position.y = startY1 + sitOffset * ease;
            this.partner.position.y = startY2 + sitOffset * ease;
            if (t < 1) requestAnimationFrame(animate);
            else {
                this.spawnEndingEffects();
                this.showEndingUI();
            }
        };
        animate();
    }

    spawnEndingEffects() {
        this.butterflies = createButterflies(25);
        this.scene.add(this.butterflies.group);
        this.birds = createBirds(10);
        this.scene.add(this.birds.group);
    }

    animateSunset() {
        const startBg = new THREE.Color(0x1a0a2a);
        const midBg = new THREE.Color(0xff8060);
        const endBg = new THREE.Color(0xffb080);

        const startSunColor = new THREE.Color(0xffd8a0);
        const endSunColor = new THREE.Color(0xff6040);

        const startPos = this.sun.position.clone();
        const endPos = new THREE.Vector3(-80, 8, -120);

        const duration = 5000;
        const start = performance.now();

        const animate = () => {
            const t = Math.min(1, (performance.now() - start) / duration);
            const ease = 1 - Math.pow(1 - t, 3);

            if (ease < 0.5) {
                const t2 = ease * 2;
                this.scene.background.copy(startBg).lerp(midBg, t2);
                this.scene.fog.color.copy(startBg).lerp(midBg, t2);
            } else {
                const t2 = (ease - 0.5) * 2;
                this.scene.background.copy(midBg).lerp(endBg, t2);
                this.scene.fog.color.copy(midBg).lerp(endBg, t2);
            }

            this.sun.color.copy(startSunColor).lerp(endSunColor, ease);
            this.sun.position.lerpVectors(startPos, endPos, ease);
            this.sun.intensity = 1.4 + ease * 0.6;

            if (t < 1) requestAnimationFrame(animate);
        };
        animate();
    }

    showEndingUI() {
        const endingScreen = document.getElementById('ending-screen');
        endingScreen.classList.add('active');

        const finalPoem = document.getElementById('final-poem-text');
        if (finalPoem) {
            const playerName = this.playerName;

            finalPoem.innerHTML = `
        <p class="poem-line">Sa ilalim ng papalubog na araw,</p>
        <p class="poem-line">kung saan nagtatagpo ang langit at lupa,</p>
        <p class="poem-line">narito tayo — ikaw at ako —</p>
        <p class="poem-line">nakaupo sa damong tahimik.</p>
        <br/>
        <p class="poem-line">Hinawakan mo ang aking kamay,</p>
        <p class="poem-line">at sa sandaling iyon,</p>
        <p class="poem-line">hindi ko na kailangan ang mga salita —</p>
        <p class="poem-line">dahil ang iyong mga mata,</p>
        <p class="poem-line">tulad ng araw na unti-unting lumulubog,</p>
        <p class="poem-line">ay nagbibigay ng liwanag na hindi kailanman mamamatay.</p>
        <br/>
        <p class="poem-line">Gusto kong masaksihan nang lubos</p>
        <p class="poem-line">kung paano nagbabaga ang ningning ng iyong mga mata</p>
        <p class="poem-line">sa tuwing ang iyong mga labi ay nakangiti nang wagas —</p>
        <p class="poem-line">hindi ang ngiting pangharap lamang,</p>
        <p class="poem-line">kundi ang ngiting nagmumula sa kailaliman ng iyong kaluluwa.</p>
        <br/>
        <p class="poem-line">Mahal ko ang mga mata mo,</p>
        <p class="poem-line">lalo na kapag ito'y kumikinang na tila mga bituin</p>
        <p class="poem-line">na hindi kayang tapatan ng buong kalawakan.</p>
        <br/>
        <p class="poem-line">At habang lumulubog ang araw,</p>
        <p class="poem-line">at ang langit ay nagiging ginto at rosas,</p>
        <p class="poem-line">ako ay nananatili —</p>
        <p class="poem-line">nakatingin sa iyong mga mata,</p>
        <p class="poem-line">naghihintay ng bawat ngiti,</p>
        <p class="poem-line">nagsusumamo sa bawat sulyap.</p>
        <br/>
        <p class="poem-line final">Kung sakaling ako ang maging dahilan ng ngiting iyon,</p>
        <p class="poem-line final">ito ang magiging pinakamahalagang sandali ng aking buhay —</p>
        <p class="poem-line final">ang makita kang masaya,</p>
        <p class="poem-line final">hindi lamang sa larawan,</p>
        <p class="poem-line final">kundi sa tunay na mundo —</p>
        <p class="poem-line final">kasama ako.</p>
        <br/>
        <p class="poem-line signature">— ${playerName}, 2026</p>
      `;

            finalPoem.style.animation = 'none';
            void finalPoem.offsetWidth;
            finalPoem.style.animation = 'autoScroll 60s linear forwards';
            finalPoem.style.animationDelay = '2s';
        }
    }

    updateEndingCamera(dt) {
        if (!this.endingMode || !this.player) return;

        const midX = (this.player.position.x + (this.partner?.position.x || 0)) / 2;
        const midZ = (this.player.position.z + (this.partner?.position.z || 0)) / 2;

        const targetX = midX + 1;
        const targetZ = midZ + 8;
        const targetY = this.getGroundHeight(midX, midZ) + 3.5;

        this.camera.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 1 - Math.pow(0.001, dt));
        this.camera.lookAt(midX, this.getGroundHeight(midX, midZ) + 1.2, midZ - 20);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const now = performance.now();
        const dt = Math.min((now - (this.lastTime || now)) / 1000, 0.05);
        this.lastTime = now;

        if (this.player) {
            if (this.endingMode) {
                this.updateEndingCamera(dt);
            } else {
                this.updatePlayer(dt);
                this.updateCamera(dt);
                this.updateOrbs(dt);

                this.noteTimer += dt;
                if (this.noteTimer > this.nextNoteTime && !this.ended && !this.puzzleActive) {
                    this.noteTimer = 0;
                    this.nextNoteTime = 8 + Math.random() * 6;
                    this.spawnNote();
                }
            }
        }

        if (this.butterflies) this.butterflies.update(dt);
        if (this.birds) this.birds.update(dt);

        this.scene.traverse(obj => {
            if (obj.userData.isFireLight) {
                obj.intensity = 2.5 + Math.sin(performance.now() * 0.005) * 0.8;
            }
        });

        if (this.partnerCat?.userData.tail) {
            this.partnerCat.userData.tail.rotation.z = Math.sin(performance.now() * 0.003) * 0.3;
        }

        this.renderer.render(this.scene, this.camera);
    }
}