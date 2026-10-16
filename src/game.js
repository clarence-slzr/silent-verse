import * as THREE from 'three';
import { audio } from './audio.js';
import { PUZZLES, FINAL_POEM_URL } from './puzzles.js';
import {
    createWorld,
    createPoemOrbs,
    createCharacter,
    createFlower,
    createButterflies,
    createBirds
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
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a0a2a);

        this.camera = new THREE.PerspectiveCamera(
            70,
            window.innerWidth / window.innerHeight,
            0.1,
            500
        );

        // Lighting
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

        // World
        const worldData = createWorld(this.scene);
        this.getGroundHeight = worldData.getGroundHeight;
        this.collidables = worldData.collidables;

        // Orbs
        this.orbs = createPoemOrbs(this.scene, PUZZLES, this.getGroundHeight);
        this.collectedCount = 0;

        // State
        this.gender = null;
        this.playerName = '';
        this.player = null;
        this.partner = null;
        this.keys = {};

        // Camera
        this.cameraMode = 'third';
        this.cameraAngle = { yaw: 0, pitch: 0.25 };
        this.firstPersonPitch = 0;
        this.cameraDistance = 6;

        this.isRunning = false;
        this.nearOrb = null;
        this.puzzleActive = false;
        this.ended = false;
        this.endingMode = false;

        // Physics
        this.velocityY = 0;
        this.isJumping = false;
        this.groundY = 0;

        // Animation
        this.walkCycle = 0;

        // Lives system (per puzzle)
        this.currentLives = 3;
        this.wrongAnswers = 0;

        // Click-to-move
        this.moveTarget = null;
        this.moveMarker = null;

        // Notes
        this.noteTimer = 0;
        this.nextNoteTime = 8;
        this.notesContainer = document.getElementById('notes-container');

        // UI
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

        // Display name
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
            const k = e.key.toLowerCase();
            this.keys[k] = true;
            if (e.key === 'Shift') this.isRunning = true;
            if (e.key === ' ' && this.player && !this.puzzleActive && !this.ended) {
                this.jump();
                e.preventDefault();
            }
            if (k === 'e' && this.nearOrb && !this.puzzleActive && !this.ended) {
                this.openPuzzle(this.nearOrb);
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
            if (e.key === 'Shift') this.isRunning = false;
        });

        this.canvas.addEventListener('click', (e) => {
            if (this.puzzleActive || this.ended) return;

            if (this.nearOrb) {
                this.openPuzzle(this.nearOrb);
                return;
            }

            const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
            if (isMobile) {
                this.setMoveTarget(e.clientX, e.clientY);
                return;
            }

            if (!document.pointerLockElement) {
                this.canvas.requestPointerLock();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.canvas) {
                if (this.cameraMode === 'first') {
                    this.cameraAngle.yaw -= e.movementX * 0.0022;
                    this.firstPersonPitch -= e.movementY * 0.0022;
                    this.firstPersonPitch = Math.max(-1.2, Math.min(1.2, this.firstPersonPitch));
                } else {
                    this.cameraAngle.yaw -= e.movementX * 0.0025;
                    this.cameraAngle.pitch -= e.movementY * 0.0025;
                    this.cameraAngle.pitch = Math.max(-0.3, Math.min(0.9, this.cameraAngle.pitch));
                }
            }
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

        const jumpBtn = document.getElementById('jump-btn');
        if (jumpBtn) {
            jumpBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.jump();
            });
            jumpBtn.addEventListener('click', () => this.jump());
        }

        this.cameraToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.cameraMenu.classList.toggle('show');
        });

        this.cameraOptions.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.setCameraMode(btn.dataset.mode);
                this.cameraMenu.classList.remove('show');
            });
        });

        document.addEventListener('click', (e) => {
            if (!this.cameraMenu.contains(e.target) && e.target !== this.cameraToggle) {
                this.cameraMenu.classList.remove('show');
            }
        });

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
    }

    setCameraMode(mode) {
        this.cameraMode = mode;
        this.cameraOptions.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        if (mode === 'first') {
            this.firstPersonPitch = 0;
        } else {
            this.cameraAngle.pitch = 0.25;
        }
        this.updatePlayerVisibility();
    }

    setMoveTarget(clientX, clientY) {
        if (!this.player || !this.camera) return;
        const rect = this.canvas.getBoundingClientRect();
        const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);

        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.groundY);
        const point = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, point)) {
            this.moveTarget = point;
            this.showMoveMarker(point);
        }
    }

    showMoveMarker(pos) {
        if (!this.moveMarker) {
            const geo = new THREE.RingGeometry(0.4, 0.6, 32);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xc9a0ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide
            });
            this.moveMarker = new THREE.Mesh(geo, mat);
            this.moveMarker.rotation.x = -Math.PI / 2;
            this.scene.add(this.moveMarker);
        }
        this.moveMarker.position.set(pos.x, this.getGroundHeight(pos.x, pos.z) + 0.05, pos.z);
        this.moveMarker.visible = true;

        clearTimeout(this._markerTimeout);
        this._markerTimeout = setTimeout(() => {
            if (this.moveMarker) this.moveMarker.visible = false;
        }, 1500);
    }

    jump() {
        if (!this.player || this.isJumping) return;
        this.velocityY = 8;
        this.isJumping = true;
    }

    updatePlayer(dt) {
        if (!this.player || this.puzzleActive || this.ended) return;

        const speed = this.isRunning ? 12 : 6;
        const forward = new THREE.Vector3(
            -Math.sin(this.cameraAngle.yaw), 0, -Math.cos(this.cameraAngle.yaw)
        );
        const right = new THREE.Vector3(
            -Math.cos(this.cameraAngle.yaw), 0, Math.sin(this.cameraAngle.yaw)
        );

        let move = new THREE.Vector3();

        if (this.keys['w'] || this.keys['arrowup']) move.add(forward);
        if (this.keys['s'] || this.keys['arrowdown']) move.sub(forward);
        if (this.keys['a'] || this.keys['arrowleft']) move.sub(right);
        if (this.keys['d'] || this.keys['arrowright']) move.add(right);

        if (move.length() === 0 && this.moveTarget) {
            const dir = new THREE.Vector3(
                this.moveTarget.x - this.player.position.x, 0,
                this.moveTarget.z - this.player.position.z
            );
            if (dir.length() > 0.5) {
                move = dir.normalize();
            } else {
                this.moveTarget = null;
            }
        }

        const isMoving = move.length() > 0;

        if (isMoving) {
            move.normalize();
            const next = this.player.position.clone().addScaledVector(move, speed * dt);

            let blocked = false;
            for (const c of this.collidables) {
                const dx = next.x - c.x;
                const dz = next.z - c.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < c.radius + 0.4) {
                    blocked = true;
                    break;
                }
            }

            if (!blocked) {
                next.y = this.getGroundHeight(next.x, next.z);
                const maxR = 95;
                if (next.length() < maxR) {
                    this.player.position.x = next.x;
                    this.player.position.z = next.z;
                }
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

        // 3D Walk animation
        const u = this.player.userData;
        if (isMoving && !this.isJumping) {
            this.walkCycle += dt * (this.isRunning ? 14 : 9);
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

            this.camera.position.lerp(
                new THREE.Vector3(camX, camY, camZ),
                1 - Math.pow(0.001, dt)
            );
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
            if (dist < nearestDist) {
                nearestDist = dist;
                this.nearOrb = orb;
            }
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
        setTimeout(() => {
            if (note.parentNode) note.parentNode.removeChild(note);
        }, 4200);
    }

    openPuzzle(orb) {
        if (orb.userData.collected) return;
        this.puzzleActive = true;
        this.currentOrb = orb;
        document.exitPointerLock?.();

        // Reset lives for this puzzle
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
            // Wrong answer
            btn.classList.add('wrong');
            btn.disabled = true;
            this.currentLives--;
            this.wrongAnswers++;
            this.updateLivesDisplay();
            audio.wrong();

            if (this.currentLives <= 0) {
                // Out of lives — orb disappears and relocates
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
        // Pick new random position, away from player
        let newX, newZ, newY;
        let attempts = 0;
        do {
            const angle = Math.random() * Math.PI * 2;
            const radius = 30 + Math.random() * 60;
            newX = Math.cos(angle) * radius;
            newZ = Math.sin(angle) * radius;
            newY = this.getGroundHeight(newX, newZ);
            attempts++;
        } while (
            this.player &&
            Math.hypot(newX - this.player.position.x, newZ - this.player.position.z) < 15 &&
            attempts < 20
        );

        orb.position.set(newX, newY + 1.5, newZ);
        orb.userData.baseY = newY + 1.5;

        // Add a small note showing relocation
        const note = document.createElement('div');
        note.className = 'note';
        note.textContent = '✨ The poem moved to a new place...';
        this.notesContainer.appendChild(note);
        setTimeout(() => {
            if (note.parentNode) note.parentNode.removeChild(note);
        }, 4200);
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
        this.player.position.set(endX - 0.7, this.getGroundHeight(endX - 0.7, endZ), endZ);
        this.player.rotation.y = Math.PI;
        this.player.visible = true;

        const u = this.player.userData;
        if (u.leftArm) u.leftArm.rotation.x = 0;
        if (u.rightArm) u.rightArm.rotation.x = 0;
        if (u.leftLeg) u.leftLeg.rotation.x = 0;
        if (u.rightLeg) u.rightLeg.rotation.x = 0;

        const partnerGender = this.gender === 'male' ? 'female' : 'male';
        this.partner = createCharacter(this.scene, partnerGender);
        this.partner.position.set(endX + 0.7, this.getGroundHeight(endX + 0.7, endZ), endZ);
        this.partner.rotation.y = Math.PI;

        this.flower = createFlower();
        this.flower.position.set(0, this.getGroundHeight(0, -1.5) + 1, -1.5);
        this.flower.visible = false;
        this.scene.add(this.flower);

        this.animateSunset();

        setTimeout(() => {
            this.flower.visible = true;
            audio.endingChime();
            this.flowerAnimation();
        }, 2000);

        setTimeout(() => this.spawnEndingEffects(), 4000);
        setTimeout(() => this.sitDownAnimation(), 5500);
        setTimeout(() => this.showEndingUI(), 8000);
    }

    flowerAnimation() {
        const startY = this.flower.position.y;
        const startZ = this.flower.position.z;
        const targetY = this.player.position.y + 1.2;
        const targetZ = this.player.position.z - 0.8;
        const duration = 2000;
        const start = performance.now();

        const animate = () => {
            const t = Math.min(1, (performance.now() - start) / duration);
            const ease = 1 - Math.pow(1 - t, 3);
            this.flower.position.y = startY + (targetY - startY) * ease;
            this.flower.position.z = startZ + (targetZ - startZ) * ease;
            this.flower.rotation.y += 0.03;
            if (t < 1) requestAnimationFrame(animate);
        };
        animate();
    }

    sitDownAnimation() {
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
    }

    updateEndingCamera(dt) {
        if (!this.endingMode || !this.player) return;

        const midX = (this.player.position.x + (this.partner?.position.x || 0)) / 2;
        const midZ = (this.player.position.z + (this.partner?.position.z || 0)) / 2;

        const targetX = midX;
        const targetZ = midZ + 7;
        const targetY = this.getGroundHeight(midX, midZ) + 3;

        this.camera.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 1 - Math.pow(0.001, dt));
        this.camera.lookAt(midX, this.getGroundHeight(midX, midZ) + 1.2, midZ - 30);
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

        // Animate campfire light
        this.scene.traverse(obj => {
            if (obj.userData.isFireLight) {
                obj.intensity = 2.5 + Math.sin(performance.now() * 0.005) * 0.8;
            }
        });

        this.renderer.render(this.scene, this.camera);
    }
}