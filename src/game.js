import * as THREE from 'three';
import { audio } from './audio.js';
import { PUZZLES } from './puzzles.js';
import { createWorld, createPoemOrbs, createCharacter, createFlower } from './world.js';

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

        this.camera = new THREE.PerspectiveCamera(
            65,
            window.innerWidth / window.innerHeight,
            0.1,
            500
        );

        const ambient = new THREE.AmbientLight(0x403060, 0.8);
        this.scene.add(ambient);

        const hemi = new THREE.HemisphereLight(0xc9a0ff, 0x1a2a1a, 0.6);
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

        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        this.cameraAngle = { yaw: 0, pitch: -0.15 };
        this.velocity = new THREE.Vector3();
        this.isRunning = false;
        this.nearOrb = null;
        this.puzzleActive = false;
        this.ended = false;

        this.counterEl = document.getElementById('counter');
        this.puzzleModal = document.getElementById('puzzle-modal');
        this.puzzlePoem = document.getElementById('puzzle-poem');
        this.puzzleQuestion = document.getElementById('puzzle-question');
        this.puzzleInput = document.getElementById('puzzle-input');
        this.puzzleFeedback = document.getElementById('puzzle-feedback');
        this.interactPrompt = document.getElementById('interact-prompt');

        this.bindEvents();
        this.animate();
    }

    start(gender) {
        this.gender = gender;
        this.player = createCharacter(this.scene, gender);
        this.player.position.set(0, this.getGroundHeight(0, 0), 0);
        this.updateCamera(0);
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
                this.cameraAngle.yaw -= e.movementX * 0.0025;
                this.cameraAngle.pitch -= e.movementY * 0.0025;
                this.cameraAngle.pitch = Math.max(-0.8, Math.min(0.5, this.cameraAngle.pitch));
            }
        });

        document.getElementById('submit-answer').addEventListener('click', () => this.submitAnswer());
        document.getElementById('close-puzzle').addEventListener('click', () => this.closePuzzle());
        this.puzzleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.submitAnswer();
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            location.reload();
        });
    }

    updateCamera(dt) {
        if (!this.player) return;
        const targetY = this.player.position.y + 1.6;

        const dist = 7;
        const camX = this.player.position.x + Math.sin(this.cameraAngle.yaw) * dist * Math.cos(this.cameraAngle.pitch);
        const camZ = this.player.position.z + Math.cos(this.cameraAngle.yaw) * dist * Math.cos(this.cameraAngle.pitch);
        const camY = targetY + 3 + Math.sin(this.cameraAngle.pitch) * dist;

        this.camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 1 - Math.pow(0.001, dt));
        this.camera.lookAt(this.player.position.x, targetY, this.player.position.z);
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
                const targetRot = Math.atan2(move.x, move.z);
                this.player.rotation.y = this.lerpAngle(this.player.rotation.y, targetRot, 0.15);
            }
        }

        const t = performance.now() * 0.005;
        this.player.children.forEach((c, i) => {
            if (c.geometry && c.geometry.type === 'CylinderGeometry' && i < 2) {
                c.rotation.x = Math.sin(t + i) * 0.15 * (move.length() > 0 ? 1 : 0);
            }
        });
    }

    lerpAngle(a, b, t) {
        let diff = b - a;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return a + diff * t;
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
            this.interactPrompt.innerHTML = `Pindutin ang <b>E</b> upang basahin ang Tula #${idx + 1}`;
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
        this.puzzlePoem.textContent = p.poem;
        this.puzzleQuestion.textContent = `${idx + 1}. ${p.question}`;
        this.puzzleInput.value = '';
        this.puzzleFeedback.textContent = '';
        this.puzzleFeedback.className = 'feedback';
        this.puzzleModal.classList.add('active');
        setTimeout(() => this.puzzleInput.focus(), 100);
    }

    submitAnswer() {
        if (!this.currentOrb) return;
        const p = this.currentOrb.userData.puzzle;
        const ans = this.puzzleInput.value.trim().toLowerCase();

        const normalized = p.answers.map(a => a.toLowerCase());
        const isCorrect = normalized.some(a => a === ans) || normalized.some(a => ans.includes(a) && ans.length >= a.length);

        if (isCorrect) {
            this.puzzleFeedback.textContent = '✨ Tama! Naglaho ang tula at sumikat ang ilaw.';
            this.puzzleFeedback.className = 'feedback ok';
            audio.correct();
            setTimeout(() => this.solvePuzzle(this.currentOrb), 900);
        } else {
            this.puzzleFeedback.textContent = '🌙 Mali... Basahin muli ang tula.';
            this.puzzleFeedback.className = 'feedback err';
            audio.wrong();
        }
    }

    solvePuzzle(orb) {
        orb.userData.collected = true;
        this.collectedCount++;
        this.counterEl.textContent = `Nahanap: ${this.collectedCount} / ${PUZZLES.length}`;

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
        this.interactPrompt.classList.remove('show');

        const endX = 0, endZ = 0;
        this.player.position.set(endX, this.getGroundHeight(endX, endZ), endZ);
        this.player.rotation.y = 0;

        const partnerGender = this.gender === 'male' ? 'female' : 'male';
        this.partner = createCharacter(this.scene, partnerGender);
        const px = endX, pz = endZ - 3;
        this.partner.position.set(px, this.getGroundHeight(px, pz), pz);
        this.partner.rotation.y = Math.PI;

        this.flower = createFlower();
        this.flower.position.set(0, this.getGroundHeight(0, -1.5) + 1, -1.5);
        this.flower.visible = false;
        this.scene.add(this.flower);

        this.animateSunset();

        this.cameraAngle.yaw = Math.PI;
        this.cameraAngle.pitch = -0.1;

        setTimeout(() => {
            this.flower.visible = true;
            audio.endingChime();
            this.flowerAnimation();
        }, 3500);

        setTimeout(() => this.showEndingPoem(), 6000);
    }

    animateSunset() {
        const startBg = new THREE.Color(0x1a1030);
        const endBg = new THREE.Color(0xff7a4a);
        const startSun = new THREE.Color(0xffd8a0);
        const endSun = new THREE.Color(0xff5030);
        const startPos = this.sun.position.clone();
        const endPos = new THREE.Vector3(-80, 20, -100);

        const duration = 5000;
        const start = performance.now();

        const animate = () => {
            const t = Math.min(1, (performance.now() - start) / duration);
            const ease = 1 - Math.pow(1 - t, 3);

            this.scene.background.copy(startBg).lerp(endBg, ease);
            this.scene.fog.color.copy(startBg).lerp(endBg, ease);
            this.sun.color.copy(startSun).lerp(endSun, ease);
            this.sun.position.lerpVectors(startPos, endPos, ease);
            this.sun.intensity = 1.2 - ease * 0.5;

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

    showEndingPoem() {
        const isMale = this.gender === 'male';
        const poem = isMale
            ? `Sa ilalim ng nagbabagang takipsilim,
ang bulaklak ay iniabot ng iyong kamay.
Ngumiti siya — tahimik, wagas, wagas.
Hinawakan mo ang kanyang palad,
at doon nagsimula ang walang hanggang tula.

"Dalawang kaluluwa, isang lilim,
sa dulo ng daan, ikaw at ako.
Ang bawat bugtong ay naging daan,
patungo sa puso mong tahanan."`
            : `Sa ilalim ng nagbabagang takipsilim,
iniabot niya sa iyo ang bulaklak.
Ngumiti ka — tahimik, wagas, wagas.
Hinawakan niya ang iyong palad,
at doon nagsimula ang walang hanggang tula.

"Dalawang kaluluwa, isang lilim,
sa dulo ng daan, ikaw at ako.
Ang bawat bugtong ay naging daan,
patungo sa puso mong tahanan."`;

        const endingScreen = document.getElementById('ending-screen');
        document.getElementById('ending-poem').textContent = poem;
        endingScreen.classList.add('active');

        this.handHoldAnimation();
    }

    handHoldAnimation() {
        if (!this.partner || !this.player) return;
        const targetPartnerX = this.player.position.x + 0.7;
        const targetPartnerZ = this.player.position.z - 1.2;
        const startX = this.partner.position.x;
        const startZ = this.partner.position.z;
        const duration = 3000;
        const start = performance.now();

        const animate = () => {
            const t = Math.min(1, (performance.now() - start) / duration);
            const ease = 1 - Math.pow(1 - t, 3);
            this.partner.position.x = startX + (targetPartnerX - startX) * ease;
            this.partner.position.z = startZ + (targetPartnerZ - startZ) * ease;
            if (t < 1) requestAnimationFrame(animate);
        };
        animate();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const now = performance.now();
        const dt = Math.min((now - (this.lastTime || now)) / 1000, 0.05);
        this.lastTime = now;

        if (this.player) {
            this.updatePlayer(dt);
            this.updateCamera(dt);
            this.updateOrbs(dt);
        }

        this.renderer.render(this.scene, this.camera);
    }
}