import * as THREE from 'three';
import { audio } from './audio.js';
import { PUZZLES, FINAL_POEM_URL } from './puzzles.js';
import { createWorld, createPoemOrbs, createCharacter, createFlower, createRainbow, createButterflies, createBirds } from './world.js';

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
        this.renderer.toneMappingExposure = 1.1;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1030);

        // First-person camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            500
        );

        const ambient = new THREE.AmbientLight(0x403060, 0.9);
        this.scene.add(ambient);

        const hemi = new THREE.HemisphereLight(0xc9a0ff, 0x1a2a1a, 0.7);
        this.scene.add(hemi);

        this.sun = new THREE.DirectionalLight(0xffd8a0, 1.2);
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

        this.gender = null;
        this.player = null;

        this.orbs = createPoemOrbs(this.scene, PUZZLES, this.getGroundHeight);
        this.collectedCount = 0;

        this.partner = null;
        this.rainbow = null;
        this.butterflies = null;
        this.birds = null;

        this.keys = {};
        this.cameraAngle = { yaw: 0, pitch: 0 };
        this.isRunning = false;
        this.nearOrb = null;
        this.puzzleActive = false;
        this.ended = false;
        this.endingMode = false;

        this.counterEl = document.getElementById('counter');
        this.puzzleModal = document.getElementById('puzzle-modal');
        this.puzzlePoem = document.getElementById('puzzle-poem');
        this.puzzleQuestion = document.getElementById('puzzle-question');
        this.puzzleChoices = document.getElementById('puzzle-choices');
        this.puzzleFeedback = document.getElementById('puzzle-feedback');
        this.interactPrompt = document.getElementById('interact-prompt');

        this.bindEvents();
        this.animate();
    }

    start(gender) {
        this.gender = gender;
        // Create the player (body visible only in ending)
        this.player = createCharacter(this.scene, gender);
        this.player.position.set(0, this.getGroundHeight(0, 0), 0);
        this.player.visible = false; // POV — hide own body
        audio.startBg();
    }

    bindEvents() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            if (e.key === 'Shift') this.isRunning = true;
            if (e.key.toLowerCase() === 'e' && this.nearOrb && !this.puzzleActive && !this.ended) {
                this.openPuzzle(this.nearOrb);
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
            if (e.key === 'Shift') this.isRunning = false;
        });

        this.canvas.addEventListener('click', () => {
            if (this.puzzleActive || this.ended) return;
            if (!document.pointerLockElement && this.player) {
                this.canvas.requestPointerLock();
            }
            if (this.nearOrb && !this.puzzleActive) {
                this.openPuzzle(this.nearOrb);
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.canvas) {
                this.cameraAngle.yaw -= e.movementX * 0.0022;
                this.cameraAngle.pitch -= e.movementY * 0.0022;
                this.cameraAngle.pitch = Math.max(-1.2, Math.min(1.2, this.cameraAngle.pitch));
            }
        });

        document.getElementById('close-puzzle').addEventListener('click', () => this.closePuzzle());

        document.getElementById('restart-btn').addEventListener('click', () => {
            location.reload();
        });

        // Ending popup button
        const finalBtn = document.getElementById('final-poem-btn');
        if (finalBtn) {
            finalBtn.addEventListener('click', () => {
                window.open(FINAL_POEM_URL, '_blank');
            });
        }
    }

    updateCamera(dt) {
        if (!this.player || this.endingMode) return;

        // First-person: camera is at eye-level of player
        const eyeHeight = this.player.position.y + 1.7;
        this.camera.position.set(
            this.player.position.x,
            eyeHeight,
            this.player.position.z
        );

        // Look direction based on yaw/pitch
        const dir = new THREE.Vector3(
            -Math.sin(this.cameraAngle.yaw) * Math.cos(this.cameraAngle.pitch),
            Math.sin(this.cameraAngle.pitch),
            -Math.cos(this.cameraAngle.yaw) * Math.cos(this.cameraAngle.pitch)
        );
        this.camera.lookAt(
            this.camera.position.x + dir.x,
            this.camera.position.y + dir.y,
            this.camera.position.z + dir.z
        );
    }

    updatePlayer(dt) {
        if (!this.player || this.puzzleActive || this.ended) return;

        const speed = this.isRunning ? 14 : 7;
        const forward = new THREE.Vector3(
            -Math.sin(this.cameraAngle.yaw),
            0,
            -Math.cos(this.cameraAngle.yaw)
        );
        const right = new THREE.Vector3(
            -Math.cos(this.cameraAngle.yaw),
            0,
            Math.sin(this.cameraAngle.yaw)
        );

        const move = new THREE.Vector3();
        if (this.keys['w'] || this.keys['arrowup']) move.add(forward);
        if (this.keys['s'] || this.keys['arrowdown']) move.sub(forward);
        if (this.keys['a'] || this.keys['arrowleft']) move.sub(right);
        if (this.keys['d'] || this.keys['arrowright']) move.add(right);

        if (move.length() > 0) {
            move.normalize();
            const next = this.player.position.clone().addScaledVector(move, speed * dt);
            const maxR = 95;
            if (next.length() < maxR) {
                next.y = this.getGroundHeight(next.x, next.z);
                this.player.position.copy(next);
            }
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
            this.interactPrompt.innerHTML = `Press <b>E</b> or <b>Click</b> to read Poem #${idx + 1}`;
        } else {
            this.interactPrompt.classList.remove('show');
        }
    }

    openPuzzle(orb) {
        if (orb.userData.collected) return;
        this.puzzleActive = true;
        this.currentOrb = orb;
        document.exitPointerLock?.();

        const p = orb.userData.puzzle;
        const idx = orb.userData.index;
        this.puzzlePoem.textContent = p.excerpt;
        this.puzzleQuestion.textContent = `${idx + 1}. ${p.question}`;
        this.puzzleFeedback.textContent = '';
        this.puzzleFeedback.className = 'feedback';

        // Build multiple choice buttons
        this.puzzleChoices.innerHTML = '';
        const shuffled = [...p.choices].sort(() => Math.random() - 0.5);
        shuffled.forEach((choice) => {
            const btn = document.createElement('button');
            btn.className = 'choice-option';
            btn.textContent = choice;
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
            // Disable all buttons
            this.puzzleChoices.querySelectorAll('button').forEach(b => b.disabled = true);
            setTimeout(() => this.solvePuzzle(this.currentOrb), 900);
        } else {
            btn.classList.add('wrong');
            btn.disabled = true;
            this.puzzleFeedback.textContent = '🌙 Not quite... Read the excerpt again.';
            this.puzzleFeedback.className = 'feedback err';
            audio.wrong();
        }
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
    }

    startEnding() {
        this.ended = true;
        this.endingMode = true;
        this.interactPrompt.classList.remove('show');

        // Position player and partner side by side, both facing sunset (POV)
        const endX = 0, endZ = 0;
        this.player.position.set(endX - 0.7, this.getGroundHeight(endX - 0.7, endZ), endZ);
        this.player.visible = true;
        this.player.rotation.y = 0;

        const partnerGender = this.gender === 'male' ? 'female' : 'male';
        this.partner = createCharacter(this.scene, partnerGender);
        this.partner.position.set(endX + 0.7, this.getGroundHeight(endX + 0.7, endZ), endZ);
        this.partner.rotation.y = 0;

        // Flower
        this.flower = createFlower();
        this.flower.position.set(0, this.getGroundHeight(0, -1.5) + 1, -1.5);
        this.flower.visible = false;
        this.scene.add(this.flower);

        // Cinematic: camera behind characters looking at sunset
        this.animateSunset();

        // Set camera to look forward (towards sunset at -Z)
        this.cameraAngle.yaw = 0;
        this.cameraAngle.pitch = 0;
        this.endingCameraDist = 6;

        setTimeout(() => {
            this.flower.visible = true;
            audio.endingChime();
            this.flowerAnimation();
            this.spawnEndingEffects();
        }, 3000);

        // Show final popup after sunset
        setTimeout(() => this.showEndingUI(), 8000);
    }

    spawnEndingEffects() {
        // Rainbow
        this.rainbow = createRainbow();
        this.rainbow.position.set(0, 20, -80);
        this.scene.add(this.rainbow);

        // Butterflies
        this.butterflies = createButterflies(30);
        this.scene.add(this.butterflies.group);

        // Birds
        this.birds = createBirds(12);
        this.scene.add(this.birds.group);
    }

    animateSunset() {
        const startBg = new THREE.Color(0x1a1030);
        const endBg = new THREE.Color(0xffb080);
        const startSun = new THREE.Color(0xffd8a0);
        const endSun = new THREE.Color(0xff8060);
        const startPos = this.sun.position.clone();
        const endPos = new THREE.Vector3(-100, 15, -120);
        const startAmbient = 0.9;
        const endAmbient = 1.6;

        const duration = 6000;
        const start = performance.now();

        const animate = () => {
            const t = Math.min(1, (performance.now() - start) / duration);
            const ease = 1 - Math.pow(1 - t, 3);

            this.scene.background.copy(startBg).lerp(endBg, ease);
            this.scene.fog.color.copy(startBg).lerp(endBg, ease);
            this.sun.color.copy(startSun).lerp(endSun, ease);
            this.sun.position.lerpVectors(startPos, endPos, ease);
            this.sun.intensity = 1.2 + ease * 0.8;

            if (t < 1) requestAnimationFrame(animate);
        };
        animate();
    }

    flowerAnimation() {
        const startY = this.flower.position.y;
        const targetY = this.player.position.y + 1.3;
        const duration = 2000;
        const start = performance.now();

        const animate = () => {
            const t = Math.min(1, (performance.now() - start) / duration);
            const ease = 1 - Math.pow(1 - t, 3);
            this.flower.position.y = startY + (targetY - startY) * ease;
            this.flower.rotation.y += 0.02;
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

        // Cinematic: pull back and show both characters from behind
        const midX = (this.player.position.x + (this.partner?.position.x || 0)) / 2;
        const midZ = (this.player.position.z + (this.partner?.position.z || 0)) / 2;

        const targetX = midX;
        const targetZ = midZ + this.endingCameraDist;
        const targetY = this.getGroundHeight(midX, midZ) + 2.5;

        this.camera.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 1 - Math.pow(0.001, dt));
        this.camera.lookAt(midX, this.getGroundHeight(midX, midZ) + 1.5, midZ - 30);
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
            }
        }

        // Animate butterflies and birds
        if (this.butterflies) this.butterflies.update(dt);
        if (this.birds) this.birds.update(dt);

        this.renderer.render(this.scene, this.camera);
    }
}