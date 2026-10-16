import * as THREE from 'three';

export function createWorld(scene) {
    const world = new THREE.Group();
    scene.add(world);

    scene.fog = new THREE.FogExp2(0x2a1a4a, 0.012);

    const groundGeo = new THREE.PlaneGeometry(400, 400, 64, 64);
    const positions = groundGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 1.5;
        positions.setZ(i, z);
    }
    groundGeo.computeVertexNormals();
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x3e5a3a,
        roughness: 0.95,
        metalness: 0.05,
        flatShading: true
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    world.add(ground);

    // Grass
    const bladeGeo = new THREE.ConeGeometry(0.08, 0.6, 3);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x5a8a4a, roughness: 1 });
    const grassCount = 2500;
    const grass = new THREE.InstancedMesh(bladeGeo, bladeMat, grassCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < grassCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 90 + 5;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 1.5;
        dummy.position.set(x, y + 0.3, z);
        dummy.rotation.y = Math.random() * Math.PI * 2;
        dummy.scale.setScalar(0.7 + Math.random() * 0.6);
        dummy.updateMatrix();
        grass.setMatrixAt(i, dummy.matrix);
    }
    world.add(grass);

    // Collision objects
    const collidables = [];

    // Trees
    for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 20 + Math.random() * 70;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 1.5;
        const tree = createTree(x, y, z);
        world.add(tree);
        collidables.push({ x, z, radius: 1.2 });
    }

    // Rocks
    for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 15 + Math.random() * 80;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 1.5;
        const size = 0.5 + Math.random() * 0.8;
        const rockGeo = new THREE.DodecahedronGeometry(size, 0);
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x665577, roughness: 0.9, flatShading: true });
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.set(x, y + size * 0.5, z);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.castShadow = true;
        world.add(rock);
        collidables.push({ x, z, radius: size });
    }

    // Glowing flowers
    for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * 90;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 1.5;
        const colors = [0xffb3d9, 0xc9a0ff, 0xa0d8ff, 0xffe0a0];
        const c = colors[Math.floor(Math.random() * colors.length)];
        const flower = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 8, 8),
            new THREE.MeshBasicMaterial({ color: c })
        );
        flower.position.set(x, y + 0.3, z);
        world.add(flower);
        const light = new THREE.PointLight(c, 0.5, 5);
        light.position.copy(flower.position);
        world.add(light);
    }

    return {
        world,
        ground,
        collidables,
        getGroundHeight: (x, z) => Math.sin(x * 0.05) * Math.cos(z * 0.05) * 1.5
    };
}

function createTree(x, y, z) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.5, 4, 6),
        new THREE.MeshStandardMaterial({ color: 0x4a3428, roughness: 1, flatShading: true })
    );
    trunk.position.y = 2;
    trunk.castShadow = true;
    group.add(trunk);

    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x4d7b4d, roughness: 1, flatShading: true });
    for (let i = 0; i < 3; i++) {
        const foliage = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.6 - i * 0.3, 0),
            foliageMat
        );
        foliage.position.y = 4 + i * 1.1;
        foliage.rotation.set(Math.random(), Math.random(), Math.random());
        foliage.castShadow = true;
        group.add(foliage);
    }

    group.position.set(x, y, z);
    group.scale.setScalar(0.8 + Math.random() * 0.6);
    group.rotation.y = Math.random() * Math.PI * 2;
    return group;
}

export function createPoemOrbs(scene, puzzles, getGroundHeight) {
    const orbs = [];
    const colors = [0xc9a0ff, 0xffb3d9, 0xa0d8ff, 0xffe0a0, 0xb0ffd0, 0xff9aa0, 0xa0ffb0];

    const positions = [
        { x: 20, z: -15 },
        { x: -30, z: 25 },
        { x: 40, z: 30 },
        { x: -25, z: -35 },
        { x: 0, z: 55 },
        { x: -50, z: -10 },
        { x: 55, z: -40 }
    ];

    puzzles.forEach((p, i) => {
        const pos = positions[i] || { x: 0, z: 0 };
        const y = getGroundHeight(pos.x, pos.z);

        const group = new THREE.Group();
        group.position.set(pos.x, y + 1.5, pos.z);

        const coreMat = new THREE.MeshBasicMaterial({ color: colors[i % colors.length] });
        const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), coreMat);
        group.add(core);

        const shellMat = new THREE.MeshBasicMaterial({
            color: colors[i % colors.length],
            transparent: true,
            opacity: 0.3,
            wireframe: true
        });
        const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 1), shellMat);
        group.add(shell);

        const light = new THREE.PointLight(colors[i % colors.length], 2, 15);
        group.add(light);

        group.userData = {
            index: i,
            puzzle: p,
            baseY: y + 1.5,
            time: Math.random() * Math.PI * 2,
            collected: false,
            core,
            shell,
            light
        };

        scene.add(group);
        orbs.push(group);
    });

    return orbs;
}

// ===== DETAILED CHARACTER (Male & Female) =====
export function createCharacter(scene, type = 'male') {
    const group = new THREE.Group();
    const isMale = type === 'male';

    // Colors
    const skinColor = isMale ? 0xf0c8a0 : 0xf5d0b0;
    const hairColor = isMale ? 0x2a1a10 : 0x3a1810;
    const beardColor = 0x1a0f08;
    const jacketColor = isMale ? 0xc45a3a : 0xd9748a;
    const shirtColor = isMale ? 0x5a3a2a : 0xf5e0e8;
    const pantsColor = isMale ? 0x3a4a5a : 0x4a3a5a;

    // ===== HEAD =====
    const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.85, 0.7),
        new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8, flatShading: true })
    );
    head.position.y = 1.75;
    head.castShadow = true;
    group.add(head);

    const faceFront = new THREE.Mesh(
        new THREE.BoxGeometry(0.78, 0.4, 0.72),
        new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.75, flatShading: true })
    );
    faceFront.position.set(0, 1.65, 0.01);
    group.add(faceFront);

    // ===== HAIR =====
    if (isMale) {
        const hairTop = new THREE.Mesh(
            new THREE.BoxGeometry(0.82, 0.35, 0.78),
            new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.95, flatShading: true })
        );
        hairTop.position.set(0, 2.1, 0);
        group.add(hairTop);

        const spike1 = new THREE.Mesh(
            new THREE.ConeGeometry(0.12, 0.25, 4),
            new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.95, flatShading: true })
        );
        spike1.position.set(-0.15, 2.3, 0.15);
        spike1.rotation.z = 0.4;
        group.add(spike1);

        const spike2 = new THREE.Mesh(
            new THREE.ConeGeometry(0.13, 0.3, 4),
            new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.95, flatShading: true })
        );
        spike2.position.set(0.1, 2.32, 0.1);
        spike2.rotation.z = -0.2;
        group.add(spike2);

        // Beard
        const beard = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 0.35, 0.15),
            new THREE.MeshStandardMaterial({ color: beardColor, roughness: 0.95, flatShading: true })
        );
        beard.position.set(0, 1.55, 0.38);
        group.add(beard);

        // Mustache
        const mustache = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.08, 0.1),
            new THREE.MeshStandardMaterial({ color: beardColor, roughness: 0.95 })
        );
        mustache.position.set(0, 1.68, 0.42);
        group.add(mustache);

        // Sideburns
        const sideburnL = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.4, 0.15),
            new THREE.MeshStandardMaterial({ color: beardColor, roughness: 0.95 })
        );
        sideburnL.position.set(-0.4, 1.65, 0.3);
        group.add(sideburnL);
        const sideburnR = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.4, 0.15),
            new THREE.MeshStandardMaterial({ color: beardColor, roughness: 0.95 })
        );
        sideburnR.position.set(0.4, 1.65, 0.3);
        group.add(sideburnR);

        // Eyebrows
        const browL = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.05, 0.08),
            new THREE.MeshStandardMaterial({ color: beardColor, roughness: 0.9 })
        );
        browL.position.set(-0.18, 1.92, 0.38);
        browL.rotation.z = 0.15;
        group.add(browL);
        const browR = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.05, 0.08),
            new THREE.MeshStandardMaterial({ color: beardColor, roughness: 0.9 })
        );
        browR.position.set(0.18, 1.92, 0.38);
        browR.rotation.z = -0.15;
        group.add(browR);

    } else {
        // Female hair
        const hairTop = new THREE.Mesh(
            new THREE.BoxGeometry(0.85, 0.45, 0.8),
            new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.95, flatShading: true })
        );
        hairTop.position.set(0, 2.1, -0.05);
        group.add(hairTop);

        const hairL = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.9, 0.15),
            new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.95, flatShading: true })
        );
        hairL.position.set(-0.44, 1.65, 0);
        group.add(hairL);
        const hairR = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.9, 0.15),
            new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.95, flatShading: true })
        );
        hairR.position.set(0.44, 1.65, 0);
        group.add(hairR);

        const hairBack = new THREE.Mesh(
            new THREE.BoxGeometry(0.75, 0.8, 0.15),
            new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.95, flatShading: true })
        );
        hairBack.position.set(0, 1.6, -0.4);
        group.add(hairBack);

        const bangs = new THREE.Mesh(
            new THREE.BoxGeometry(0.85, 0.2, 0.1),
            new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.95, flatShading: true })
        );
        bangs.position.set(0, 2.05, 0.36);
        group.add(bangs);

        const browL = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.03, 0.06),
            new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 })
        );
        browL.position.set(-0.18, 1.92, 0.38);
        browL.rotation.z = 0.15;
        group.add(browL);
        const browR = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.03, 0.06),
            new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 })
        );
        browR.position.set(0.18, 1.92, 0.38);
        browR.rotation.z = -0.15;
        group.add(browR);
    }

    // ===== EYES =====
    const eyeGeo = new THREE.SphereGeometry(0.07, 12, 12);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2a });

    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.18, 1.82, 0.37);
    group.add(eyeL);
    const pupilL = new THREE.Mesh(pupilGeo, pupilMat);
    pupilL.position.set(-0.18, 1.82, 0.42);
    group.add(pupilL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.18, 1.82, 0.37);
    group.add(eyeR);
    const pupilR = new THREE.Mesh(pupilGeo, pupilMat);
    pupilR.position.set(0.18, 1.82, 0.42);
    group.add(pupilR);

    // ===== NOSE =====
    const nose = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.15, 4),
        new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8, flatShading: true })
    );
    nose.position.set(0, 1.72, 0.42);
    nose.rotation.x = Math.PI / 2;
    group.add(nose);

    // ===== BODY =====
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 1.1, 0.55),
        new THREE.MeshStandardMaterial({ color: jacketColor, roughness: 0.85, flatShading: true })
    );
    body.position.y = 1.05;
    body.castShadow = true;
    group.add(body);

    const shirt = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 1.05, 0.56),
        new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.85 })
    );
    shirt.position.set(0, 1.05, 0.01);
    group.add(shirt);

    const collar = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.15, 0.6),
        new THREE.MeshStandardMaterial({ color: jacketColor, roughness: 0.85, flatShading: true })
    );
    collar.position.set(0, 1.62, 0);
    group.add(collar);

    // ===== ARMS =====
    const armGeo = new THREE.BoxGeometry(0.22, 0.95, 0.22);
    const armMat = new THREE.MeshStandardMaterial({ color: jacketColor, roughness: 0.85, flatShading: true });
    const handMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8, flatShading: true });

    const armL = new THREE.Mesh(armGeo, armMat);
    armL.position.set(-0.55, 1.05, 0);
    armL.castShadow = true;
    group.add(armL);
    const handL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.22), handMat);
    handL.position.set(-0.55, 0.5, 0);
    group.add(handL);

    const armR = new THREE.Mesh(armGeo, armMat);
    armR.position.set(0.55, 1.05, 0);
    armR.castShadow = true;
    group.add(armR);
    const handR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.22), handMat);
    handR.position.set(0.55, 0.5, 0);
    group.add(handR);

    // ===== LEGS =====
    const legGeo = new THREE.BoxGeometry(0.25, 1.0, 0.25);
    const legMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.9, flatShading: true });

    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.22, 0.5, 0);
    legL.castShadow = true;
    group.add(legL);
    const legR = new THREE.Mesh(legGeo, legMat);
    legR.position.set(0.22, 0.5, 0);
    legR.castShadow = true;
    group.add(legR);

    // ===== SHOES =====
    const shoeGeo = new THREE.BoxGeometry(0.3, 0.15, 0.4);
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, flatShading: true });
    const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
    shoeL.position.set(-0.22, 0.05, 0.05);
    group.add(shoeL);
    const shoeR = new THREE.Mesh(shoeGeo, shoeMat);
    shoeR.position.set(0.22, 0.05, 0.05);
    group.add(shoeR);

    group.userData = {
        type,
        leftArm: armL,
        rightArm: armR,
        leftLeg: legL,
        rightLeg: legR,
        head
    };

    return group;
}

export function createFlower() {
    const group = new THREE.Group();

    const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6),
        new THREE.MeshStandardMaterial({ color: 0x3a7a3a, roughness: 1 })
    );
    stem.position.y = 0.3;
    group.add(stem);

    const petalMat = new THREE.MeshStandardMaterial({
        color: 0xff5a9a,
        emissive: 0xff2060,
        emissiveIntensity: 0.6,
        roughness: 0.6
    });
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), petalMat);
        petal.position.set(Math.cos(angle) * 0.15, 0.65, Math.sin(angle) * 0.15);
        petal.scale.set(1, 0.6, 1);
        group.add(petal);
    }

    const center = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffe066 })
    );
    center.position.y = 0.65;
    group.add(center);

    const light = new THREE.PointLight(0xff7ab0, 1.5, 5);
    light.position.y = 0.7;
    group.add(light);

    return group;
}

export function createRainbow() {
    const group = new THREE.Group();
    const colors = [0xff0000, 0xff7700, 0xffff00, 0x00ff00, 0x0088ff, 0x4400ff, 0x8800ff];
    const radiusBase = 30;

    colors.forEach((color, i) => {
        const radius = radiusBase + i * 0.8;
        const curve = new THREE.EllipseCurve(0, 0, radius, radius, Math.PI, 0, false, 0);
        const points = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(
            points.map(p => new THREE.Vector3(p.x, p.y, 0))
        );
        const material = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.6
        });
        const arc = new THREE.Line(geometry, material);
        group.add(arc);
    });

    return group;
}

export function createButterflies(count = 30) {
    const group = new THREE.Group();
    const butterflies = [];

    for (let i = 0; i < count; i++) {
        const bf = new THREE.Group();
        const colors = [0xff69b4, 0xffa500, 0xffe066, 0xc9a0ff, 0x87ceeb];
        const color = colors[Math.floor(Math.random() * colors.length)];

        const wingMat = new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });

        const wingL = new THREE.Mesh(new THREE.CircleGeometry(0.15, 8), wingMat);
        wingL.position.x = -0.1;
        bf.add(wingL);

        const wingR = new THREE.Mesh(new THREE.CircleGeometry(0.15, 8), wingMat);
        wingR.position.x = 0.1;
        bf.add(wingR);

        bf.userData = {
            wingL, wingR,
            phase: Math.random() * Math.PI * 2,
            speed: 0.5 + Math.random() * 1,
            radius: 5 + Math.random() * 25,
            height: 2 + Math.random() * 6,
            angle: Math.random() * Math.PI * 2,
            centerX: (Math.random() - 0.5) * 20,
            centerZ: -20 - Math.random() * 40
        };

        group.add(bf);
        butterflies.push(bf);
    }

    return {
        group,
        update: (dt) => {
            butterflies.forEach(bf => {
                const u = bf.userData;
                u.angle += dt * u.speed;
                bf.position.x = u.centerX + Math.cos(u.angle) * u.radius;
                bf.position.z = u.centerZ + Math.sin(u.angle) * u.radius;
                bf.position.y = u.height + Math.sin(u.angle * 3) * 0.5;

                const flap = Math.sin(performance.now() * 0.01 + u.phase) * 0.8;
                u.wingL.rotation.y = flap;
                u.wingR.rotation.y = -flap;
            });
        }
    };
}

export function createBirds(count = 12) {
    const group = new THREE.Group();
    const birds = [];

    for (let i = 0; i < count; i++) {
        const bird = new THREE.Group();
        const mat = new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide });
        const wingL = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.15), mat);
        wingL.position.x = -0.3;
        bird.add(wingL);
        const wingR = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.15), mat);
        wingR.position.x = 0.3;
        bird.add(wingR);

        bird.userData = {
            wingL, wingR,
            phase: Math.random() * Math.PI * 2,
            speed: 0.3 + Math.random() * 0.4,
            radius: 30 + Math.random() * 40,
            height: 12 + Math.random() * 10,
            angle: Math.random() * Math.PI * 2,
            centerZ: -50
        };

        group.add(bird);
        birds.push(bird);
    }

    return {
        group,
        update: (dt) => {
            birds.forEach(bird => {
                const u = bird.userData;
                u.angle += dt * u.speed * 0.3;
                bird.position.x = Math.cos(u.angle) * u.radius;
                bird.position.z = u.centerZ + Math.sin(u.angle) * u.radius * 0.5;
                bird.position.y = u.height + Math.sin(u.angle * 2) * 1;
                bird.rotation.y = -u.angle + Math.PI / 2;

                const flap = Math.sin(performance.now() * 0.008 + u.phase) * 0.6;
                u.wingL.rotation.z = flap;
                u.wingR.rotation.z = -flap;
            });
        }
    };
}