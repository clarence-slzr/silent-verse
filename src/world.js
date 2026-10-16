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
        color: 0x3e5a3a, roughness: 0.95, metalness: 0.05, flatShading: true
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    world.add(ground);

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

    const starGeo = new THREE.SphereGeometry(0.15, 6, 6);
    for (let i = 0; i < 200; i++) {
        const starMat = new THREE.MeshBasicMaterial({
            color: [0xffffff, 0xffe0a0, 0xa0d8ff, 0xffb3d9][Math.floor(Math.random() * 4)]
        });
        const star = new THREE.Mesh(starGeo, starMat);
        const angle = Math.random() * Math.PI * 2;
        const radius = 80 + Math.random() * 150;
        const height = 40 + Math.random() * 60;
        star.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
        star.scale.setScalar(0.5 + Math.random() * 1.5);
        world.add(star);
    }

    const collidables = [];

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

    const swingPos = { x: 35, z: -25 };
    const swingY = Math.sin(swingPos.x * 0.05) * Math.cos(swingPos.z * 0.05) * 1.5;
    world.add(createSwing(swingPos.x, swingY, swingPos.z));
    collidables.push({ x: swingPos.x, z: swingPos.z, radius: 1.5 });

    const campPos = { x: -45, z: 35 };
    const campY = Math.sin(campPos.x * 0.05) * Math.cos(campPos.z * 0.05) * 1.5;
    world.add(createCampfire(campPos.x, campY, campPos.z));
    collidables.push({ x: campPos.x, z: campPos.z, radius: 1.8 });

    const housePos = { x: 60, z: 40 };
    const houseY = Math.sin(housePos.x * 0.05) * Math.cos(housePos.z * 0.05) * 1.5;
    world.add(createHouse(housePos.x, houseY, housePos.z));
    collidables.push({ x: housePos.x, z: housePos.z, radius: 3.5 });

    const waterfallPos = { x: -55, z: -45 };
    const waterfallY = Math.sin(waterfallPos.x * 0.05) * Math.cos(waterfallPos.z * 0.05) * 1.5;
    world.add(createWaterfall(waterfallPos.x, waterfallY, waterfallPos.z));
    collidables.push({ x: waterfallPos.x, z: waterfallPos.z, radius: 4 });

    return {
        world, ground, collidables, grass,
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
            new THREE.IcosahedronGeometry(1.6 - i * 0.3, 0), foliageMat
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

function createSwing(x, y, z) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.55, 5, 6),
        new THREE.MeshStandardMaterial({ color: 0x4a3428, roughness: 1, flatShading: true })
    );
    trunk.position.y = 2.5;
    trunk.castShadow = true;
    group.add(trunk);

    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x4d7b4d, roughness: 1, flatShading: true });
    for (let i = 0; i < 3; i++) {
        const foliage = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8 - i * 0.35, 0), foliageMat);
        foliage.position.y = 5 + i * 1.2;
        group.add(foliage);
    }

    const branch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 3, 6),
        new THREE.MeshStandardMaterial({ color: 0x4a3428, roughness: 1 })
    );
    branch.position.set(1.8, 5.5, 0);
    branch.rotation.z = Math.PI / 2.2;
    group.add(branch);

    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1 });
    const rope1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 4), ropeMat);
    rope1.position.set(2.7, 4.2, 0.3);
    group.add(rope1);
    const rope2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 4), ropeMat);
    rope2.position.set(2.7, 4.2, -0.3);
    group.add(rope2);

    const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.1, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.9, flatShading: true })
    );
    seat.position.set(2.7, 2.9, 0);
    seat.castShadow = true;
    group.add(seat);

    group.position.set(x, y, z);
    return group;
}

function createCampfire(x, y, z) {
    const group = new THREE.Group();
    const logMat = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 1, flatShading: true });
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.2, 6), logMat);
        log.position.set(Math.cos(angle) * 0.4, 0.3, Math.sin(angle) * 0.4);
        log.rotation.z = Math.PI / 2.5;
        log.rotation.y = angle;
        group.add(log);
    }

    const fire1 = new THREE.Mesh(
        new THREE.ConeGeometry(0.35, 0.8, 6),
        new THREE.MeshBasicMaterial({ color: 0xff6020, transparent: true, opacity: 0.9 })
    );
    fire1.position.y = 0.9;
    group.add(fire1);

    const fire2 = new THREE.Mesh(
        new THREE.ConeGeometry(0.25, 0.6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffcc40, transparent: true, opacity: 0.9 })
    );
    fire2.position.y = 1.0;
    group.add(fire2);

    const fireLight = new THREE.PointLight(0xff8040, 3, 15);
    fireLight.position.y = 1.2;
    fireLight.userData.isFireLight = true;
    group.add(fireLight);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x554466, roughness: 0.9, flatShading: true });
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), stoneMat);
        stone.position.set(Math.cos(angle) * 1.1, 0.15, Math.sin(angle) * 1.1);
        group.add(stone);
    }

    const tentBody = new THREE.Mesh(
        new THREE.ConeGeometry(1.2, 1.6, 4),
        new THREE.MeshStandardMaterial({ color: 0x5a8a4a, roughness: 1, flatShading: true })
    );
    tentBody.position.set(-2.5, 0.8, 1);
    tentBody.rotation.y = Math.PI / 4;
    group.add(tentBody);

    group.position.set(x, y, z);
    return group;
}

function createHouse(x, y, z) {
    const group = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xa08070, roughness: 0.9, flatShading: true });
    const walls = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 4), wallMat);
    walls.position.y = 1.25;
    walls.castShadow = true;
    walls.receiveShadow = true;
    group.add(walls);

    const roofMat = new THREE.MeshStandardMaterial({ color: 0x8a3a2a, roughness: 0.9, flatShading: true });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 2, 4), roofMat);
    roof.position.y = 3.5;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    const doorMat = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 1 });
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.1), doorMat);
    door.position.set(0, 0.8, 2.05);
    group.add(door);

    const windowMat = new THREE.MeshBasicMaterial({ color: 0xffe0a0 });
    const win1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.1), windowMat);
    win1.position.set(-1.4, 1.5, 2.05);
    group.add(win1);
    const win2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.1), windowMat);
    win2.position.set(1.4, 1.5, 2.05);
    group.add(win2);

    const winLight = new THREE.PointLight(0xffe0a0, 2, 8);
    winLight.position.set(0, 1.5, 2.5);
    group.add(winLight);

    group.position.set(x, y, z);
    return group;
}

function createWaterfall(x, y, z) {
    const group = new THREE.Group();

    const rockMat = new THREE.MeshStandardMaterial({
        color: 0x5a5a6a, roughness: 0.95, flatShading: true
    });

    const cliff = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 3), rockMat);
    cliff.position.set(0, 3, 0);
    cliff.castShadow = true;
    cliff.receiveShadow = true;
    group.add(cliff);

    const rock1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5, 0), rockMat);
    rock1.position.set(-3.5, 5.5, 0.5);
    group.add(rock1);

    const rock2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 0), rockMat);
    rock2.position.set(3.5, 5.8, -0.3);
    group.add(rock2);

    const rock3 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 0), rockMat);
    rock3.position.set(-2, 0.8, 1.2);
    group.add(rock3);

    const waterMat = new THREE.MeshBasicMaterial({
        color: 0xa0d8ff, transparent: true, opacity: 0.6
    });

    const stream = new THREE.Mesh(new THREE.BoxGeometry(4.5, 6, 0.3), waterMat);
    stream.position.set(0, 3, 1.6);
    group.add(stream);

    const stream2 = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, 5.8, 0.3),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })
    );
    stream2.position.set(0, 3.1, 1.75);
    group.add(stream2);

    const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
    for (let i = 0; i < 8; i++) {
        const foam = new THREE.Mesh(new THREE.SphereGeometry(0.3 + Math.random() * 0.3, 8, 8), foamMat);
        foam.position.set(-1.5 + Math.random() * 3, 0.3 + Math.random() * 0.8, 2.2 + Math.random() * 0.5);
        group.add(foam);
    }

    const poolMat = new THREE.MeshBasicMaterial({ color: 0x60a8d8, transparent: true, opacity: 0.7 });
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 0.3, 16), poolMat);
    pool.position.set(0, 0.15, 3);
    pool.receiveShadow = true;
    group.add(pool);

    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.3, 0), rockMat);
        rock.position.set(Math.cos(angle) * 3.7, 0.2, 3 + Math.sin(angle) * 3.7);
        group.add(rock);
    }

    const mistLight = new THREE.PointLight(0xa0d8ff, 1.2, 10);
    mistLight.position.set(0, 2, 2.5);
    group.add(mistLight);

    group.userData.isWaterfall = true;
    group.userData.stream = stream;
    group.userData.stream2 = stream2;
    group.userData.baseStreamY = stream.position.y;
    group.userData.baseStream2Y = stream2.position.y;

    group.position.set(x, y, z);
    return group;
}

export function createPoemOrbs(scene, puzzles, getGroundHeight) {
    const orbs = [];
    const colors = [0xc9a0ff, 0xffb3d9, 0xa0d8ff, 0xffe0a0, 0xb0ffd0, 0xff9aa0, 0xa0ffb0, 0xffd0a0, 0xd0a0ff, 0xa0ffd0];

    const positions = [
        { x: 20, z: -15 },
        { x: -30, z: 25 },
        { x: 40, z: 30 },
        { x: -25, z: -35 },
        { x: 0, z: 55 },
        { x: -50, z: -10 },
        { x: 55, z: -40 },
        { x: 30, z: 60 },
        { x: -60, z: 20 },
        { x: 70, z: 10 }
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
            color: colors[i % colors.length], transparent: true, opacity: 0.3, wireframe: true
        });
        const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 1), shellMat);
        group.add(shell);

        const light = new THREE.PointLight(colors[i % colors.length], 2, 15);
        group.add(light);

        group.userData = {
            index: i, puzzle: p, baseY: y + 1.5,
            time: Math.random() * Math.PI * 2,
            collected: false, core, shell, light
        };

        scene.add(group);
        orbs.push(group);
    });

    return orbs;
}

export function createCharacter(scene, type = 'female') {
    const group = new THREE.Group();

    const skinColor = 0xf5d0b0;
    const hairColor = 0x3a1810;
    const hairHighlight = 0x5a2818;
    const dressColor = 0xd9748a;
    const dressAccent = 0xc96078;
    const shoeColor = 0x3a1a2a;

    const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.8, 0.65),
        new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.85, flatShading: true })
    );
    head.position.y = 1.72;
    head.castShadow = true;
    group.add(head);

    const hairTop = new THREE.Mesh(
        new THREE.BoxGeometry(0.76, 0.35, 0.72),
        new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.95, flatShading: true })
    );
    hairTop.position.set(0, 2.05, -0.02);
    group.add(hairTop);

    const bangs = new THREE.Mesh(
        new THREE.BoxGeometry(0.78, 0.2, 0.12),
        new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.95, flatShading: true })
    );
    bangs.position.set(0, 1.98, 0.34);
    group.add(bangs);

    const sideBangL = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.5, 0.12),
        new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.95, flatShading: true })
    );
    sideBangL.position.set(-0.38, 1.7, 0.28);
    group.add(sideBangL);

    const sideBangR = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.5, 0.12),
        new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.95, flatShading: true })
    );
    sideBangR.position.set(0.38, 1.7, 0.28);
    group.add(sideBangR);

    const longL = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 1.1, 0.18),
        new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.95, flatShading: true })
    );
    longL.position.set(-0.42, 1.25, -0.05);
    group.add(longL);

    const longR = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 1.1, 0.18),
        new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.95, flatShading: true })
    );
    longR.position.set(0.42, 1.25, -0.05);
    group.add(longR);

    const backHair = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 1.3, 0.2),
        new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.95, flatShading: true })
    );
    backHair.position.set(0, 1.35, -0.42);
    group.add(backHair);

    const highlight = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 1.2, 0.06),
        new THREE.MeshStandardMaterial({ color: hairHighlight, roughness: 0.85 })
    );
    highlight.position.set(-0.2, 1.35, -0.5);
    group.add(highlight);

    const eyeGeo = new THREE.SphereGeometry(0.07, 12, 12);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.16, 1.78, 0.34);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.16, 1.78, 0.34);
    group.add(eyeR);

    const pupilGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x4a2a1a });
    const pupilL = new THREE.Mesh(pupilGeo, pupilMat);
    pupilL.position.set(-0.16, 1.78, 0.4);
    group.add(pupilL);
    const pupilR = new THREE.Mesh(pupilGeo, pupilMat);
    pupilR.position.set(0.16, 1.78, 0.4);
    group.add(pupilR);

    const lashMat = new THREE.MeshBasicMaterial({ color: 0x1a0a05 });
    const lashL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.04), lashMat);
    lashL.position.set(-0.16, 1.85, 0.36);
    group.add(lashL);
    const lashR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.04), lashMat);
    lashR.position.set(0.16, 1.85, 0.36);
    group.add(lashR);

    const browMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 });
    const browL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.05), browMat);
    browL.position.set(-0.16, 1.9, 0.35);
    browL.rotation.z = 0.15;
    group.add(browL);
    const browR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.05), browMat);
    browR.position.set(0.16, 1.9, 0.35);
    browR.rotation.z = -0.15;
    group.add(browR);

    const nose = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.12, 4),
        new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.85, flatShading: true })
    );
    nose.position.set(0, 1.68, 0.38);
    nose.rotation.x = Math.PI / 2;
    group.add(nose);

    const lips = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.05, 0.05),
        new THREE.MeshStandardMaterial({ color: 0xd97080, roughness: 0.6 })
    );
    lips.position.set(0, 1.6, 0.36);
    group.add(lips);

    const blushMat = new THREE.MeshBasicMaterial({ color: 0xffb0b0, transparent: true, opacity: 0.5 });
    const blushL = new THREE.Mesh(new THREE.CircleGeometry(0.06, 8), blushMat);
    blushL.position.set(-0.24, 1.68, 0.35);
    group.add(blushL);
    const blushR = new THREE.Mesh(new THREE.CircleGeometry(0.06, 8), blushMat);
    blushR.position.set(0.24, 1.68, 0.35);
    group.add(blushR);

    const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.15, 8),
        new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.85 })
    );
    neck.position.y = 1.32;
    group.add(neck);

    const bodyTop = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.85, 0.42),
        new THREE.MeshStandardMaterial({ color: dressColor, roughness: 0.8, flatShading: true })
    );
    bodyTop.position.y = 1.05;
    bodyTop.castShadow = true;
    group.add(bodyTop);

    const waist = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.2, 0.38),
        new THREE.MeshStandardMaterial({ color: dressAccent, roughness: 0.8, flatShading: true })
    );
    waist.position.y = 0.55;
    group.add(waist);

    const skirt = new THREE.Mesh(
        new THREE.ConeGeometry(0.7, 0.8, 8),
        new THREE.MeshStandardMaterial({ color: dressColor, roughness: 0.8, flatShading: true })
    );
    skirt.position.y = 0.2;
    skirt.rotation.y = Math.PI / 8;
    group.add(skirt);

    const armMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.85, flatShading: true });
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.9, 0.16), armMat);
    armL.position.set(-0.48, 1.05, 0);
    armL.castShadow = true;
    group.add(armL);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.9, 0.16), armMat);
    armR.position.set(0.48, 1.05, 0);
    armR.castShadow = true;
    group.add(armR);

    const handL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), armMat);
    handL.position.set(-0.48, 0.55, 0);
    group.add(handL);
    const handR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), armMat);
    handR.position.set(0.48, 0.55, 0);
    group.add(handR);

    const legMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.85, flatShading: true });
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.18), legMat);
    legL.position.set(-0.18, -0.05, 0);
    legL.castShadow = true;
    group.add(legL);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.18), legMat);
    legR.position.set(0.18, -0.05, 0);
    legR.castShadow = true;
    group.add(legR);

    const shoeMat = new THREE.MeshStandardMaterial({ color: shoeColor, roughness: 0.9, flatShading: true });
    const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.3), shoeMat);
    shoeL.position.set(-0.18, -0.32, 0.04);
    group.add(shoeL);
    const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.3), shoeMat);
    shoeR.position.set(0.18, -0.32, 0.04);
    group.add(shoeR);

    group.userData = {
        type: 'female',
        leftArm: armL, rightArm: armR,
        leftLeg: legL, rightLeg: legR,
        head
    };

    scene.add(group);
    return group;
}

export function createMaleCharacter(scene) {
    const group = new THREE.Group();

    const skinColor = 0xf0c8a0;
    const hairColor = 0x2a1a10;
    const beardColor = 0x1a0f08;
    const jacketColor = 0xc45a3a;
    const shirtColor = 0x5a3a2a;
    const pantsColor = 0x3a4a5a;

    const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.85, 0.7),
        new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8, flatShading: true })
    );
    head.position.y = 1.72;
    head.castShadow = true;
    group.add(head);

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

    const beard = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.35, 0.15),
        new THREE.MeshStandardMaterial({ color: beardColor, roughness: 0.95, flatShading: true })
    );
    beard.position.set(0, 1.55, 0.38);
    group.add(beard);

    const mustache = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.08, 0.1),
        new THREE.MeshStandardMaterial({ color: beardColor, roughness: 0.95 })
    );
    mustache.position.set(0, 1.68, 0.42);
    group.add(mustache);

    const eyeGeo = new THREE.SphereGeometry(0.07, 12, 12);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.18, 1.82, 0.37);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.18, 1.82, 0.37);
    group.add(eyeR);

    const pupilGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2a });
    const pupilL = new THREE.Mesh(pupilGeo, pupilMat);
    pupilL.position.set(-0.18, 1.82, 0.42);
    group.add(pupilL);
    const pupilR = new THREE.Mesh(pupilGeo, pupilMat);
    pupilR.position.set(0.18, 1.82, 0.42);
    group.add(pupilR);

    const nose = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.15, 4),
        new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8, flatShading: true })
    );
    nose.position.set(0, 1.72, 0.42);
    nose.rotation.x = Math.PI / 2;
    group.add(nose);

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

    const armMat = new THREE.MeshStandardMaterial({ color: jacketColor, roughness: 0.85, flatShading: true });
    const handMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8, flatShading: true });

    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.95, 0.22), armMat);
    armL.position.set(-0.55, 1.05, 0);
    armL.castShadow = true;
    group.add(armL);
    const handL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.22), handMat);
    handL.position.set(-0.55, 0.5, 0);
    group.add(handL);

    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.95, 0.22), armMat);
    armR.position.set(0.55, 1.05, 0);
    armR.castShadow = true;
    group.add(armR);
    const handR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.22), handMat);
    handR.position.set(0.55, 0.5, 0);
    group.add(handR);

    const legMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.9, flatShading: true });
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.0, 0.25), legMat);
    legL.position.set(-0.22, 0.5, 0);
    legL.castShadow = true;
    group.add(legL);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.0, 0.25), legMat);
    legR.position.set(0.22, 0.5, 0);
    legR.castShadow = true;
    group.add(legR);

    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, flatShading: true });
    const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.4), shoeMat);
    shoeL.position.set(-0.22, 0.05, 0.05);
    group.add(shoeL);
    const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.4), shoeMat);
    shoeR.position.set(0.22, 0.05, 0.05);
    group.add(shoeR);

    group.userData = {
        type: 'male',
        leftArm: armL, rightArm: armR,
        leftLeg: legL, rightLeg: legR,
        head
    };

    scene.add(group);
    return group;
}

export function createCat(parent, isHeld = false) {
    const cat = new THREE.Group();

    const furColor = 0xffa060;
    const stripeColor = 0x8a4a20;
    const eyeColor = 0x40ff80;

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.35, 0.55),
        new THREE.MeshStandardMaterial({ color: furColor, roughness: 0.9, flatShading: true })
    );
    body.castShadow = true;
    cat.add(body);

    const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.32, 0.32),
        new THREE.MeshStandardMaterial({ color: furColor, roughness: 0.9, flatShading: true })
    );
    head.position.set(0, 0.18, 0.32);
    cat.add(head);

    const earGeo = new THREE.ConeGeometry(0.09, 0.15, 4);
    const earMat = new THREE.MeshStandardMaterial({ color: furColor, roughness: 0.9, flatShading: true });
    const earL = new THREE.Mesh(earGeo, earMat);
    earL.position.set(-0.11, 0.39, 0.3);
    cat.add(earL);
    const earR = new THREE.Mesh(earGeo, earMat);
    earR.position.set(0.11, 0.39, 0.3);
    cat.add(earR);

    const innerEarGeo = new THREE.ConeGeometry(0.05, 0.08, 4);
    const innerEarMat = new THREE.MeshBasicMaterial({ color: 0xff90b0 });
    const innerEarL = new THREE.Mesh(innerEarGeo, innerEarMat);
    innerEarL.position.set(-0.11, 0.4, 0.32);
    cat.add(innerEarL);
    const innerEarR = new THREE.Mesh(innerEarGeo, innerEarMat);
    innerEarR.position.set(0.11, 0.4, 0.32);
    cat.add(innerEarR);

    const catEyeGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const catEyeMat = new THREE.MeshBasicMaterial({ color: eyeColor });
    const catEyeL = new THREE.Mesh(catEyeGeo, catEyeMat);
    catEyeL.position.set(-0.09, 0.2, 0.48);
    cat.add(catEyeL);
    const catEyeR = new THREE.Mesh(catEyeGeo, catEyeMat);
    catEyeR.position.set(0.09, 0.2, 0.48);
    cat.add(catEyeR);

    const catPupilGeo = new THREE.SphereGeometry(0.025, 6, 6);
    const catPupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const catPupilL = new THREE.Mesh(catPupilGeo, catPupilMat);
    catPupilL.position.set(-0.09, 0.2, 0.5);
    cat.add(catPupilL);
    const catPupilR = new THREE.Mesh(catPupilGeo, catPupilMat);
    catPupilR.position.set(0.09, 0.2, 0.5);
    cat.add(catPupilR);

    const catNose = new THREE.Mesh(
        new THREE.ConeGeometry(0.03, 0.04, 4),
        new THREE.MeshBasicMaterial({ color: 0xff6090 })
    );
    catNose.position.set(0, 0.15, 0.49);
    catNose.rotation.x = Math.PI / 2;
    cat.add(catNose);

    const legMat = new THREE.MeshStandardMaterial({ color: furColor, roughness: 0.9, flatShading: true });
    const catLegGeo = new THREE.BoxGeometry(0.1, 0.15, 0.1);
    const catLegFL = new THREE.Mesh(catLegGeo, legMat);
    catLegFL.position.set(-0.15, -0.22, 0.2);
    cat.add(catLegFL);
    const catLegFR = new THREE.Mesh(catLegGeo, legMat);
    catLegFR.position.set(0.15, -0.22, 0.2);
    cat.add(catLegFR);
    const catLegBL = new THREE.Mesh(catLegGeo, legMat);
    catLegBL.position.set(-0.15, -0.22, -0.2);
    cat.add(catLegBL);
    const catLegBR = new THREE.Mesh(catLegGeo, legMat);
    catLegBR.position.set(0.15, -0.22, -0.2);
    cat.add(catLegBR);

    const tail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6),
        new THREE.MeshStandardMaterial({ color: furColor, roughness: 0.9, flatShading: true })
    );
    tail.position.set(0, 0.15, -0.35);
    tail.rotation.x = Math.PI / 4;
    cat.add(tail);

    const stripeMat = new THREE.MeshBasicMaterial({ color: stripeColor });
    for (let i = 0; i < 3; i++) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.05), stripeMat);
        stripe.position.set(0, 0.05 + i * 0.12, 0);
        cat.add(stripe);
    }

    cat.userData.isCat = true;
    cat.userData.tail = tail;

    if (parent) {
        cat.position.set(-0.5, 1.2, 0.35);
        cat.scale.setScalar(0.9);
        parent.add(cat);
    }

    return cat;
}

export function createEnvelope() {
    const group = new THREE.Group();

    const envelopeBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.35, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xfff5e0, roughness: 0.7, flatShading: true })
    );
    group.add(envelopeBody);

    const flapShape = new THREE.Shape();
    flapShape.moveTo(-0.25, 0.175);
    flapShape.lineTo(0.25, 0.175);
    flapShape.lineTo(0, -0.05);
    flapShape.lineTo(-0.25, 0.175);

    const flapGeo = new THREE.ShapeGeometry(flapShape);
    const flap = new THREE.Mesh(
        flapGeo,
        new THREE.MeshStandardMaterial({ color: 0xe0d0b0, roughness: 0.8, side: THREE.DoubleSide })
    );
    flap.position.set(0, 0, 0.011);
    group.add(flap);

    const seal = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff3a6a })
    );
    seal.position.set(0, -0.02, 0.025);
    seal.scale.set(1, 1, 0.3);
    group.add(seal);

    const light = new THREE.PointLight(0xffe0a0, 0.5, 2);
    group.add(light);

    group.userData.isEnvelope = true;
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
        color: 0xff5a9a, emissive: 0xff2060, emissiveIntensity: 0.6, roughness: 0.6
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

export function createButterflies(count = 30) {
    const group = new THREE.Group();
    const butterflies = [];

    for (let i = 0; i < count; i++) {
        const bf = new THREE.Group();
        const colors = [0xff69b4, 0xffa500, 0xffe066, 0xc9a0ff, 0x87ceeb];
        const color = colors[Math.floor(Math.random() * colors.length)];

        const wingMat = new THREE.MeshBasicMaterial({
            color: color, side: THREE.DoubleSide, transparent: true, opacity: 0.9
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

export function createFireflies(count = 50) {
    const group = new THREE.Group();
    const fireflies = [];

    for (let i = 0; i < count; i++) {
        const ff = new THREE.Group();

        const bodyMat = new THREE.MeshBasicMaterial({ color: 0xfff8a0, transparent: true, opacity: 0.9 });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), bodyMat);
        ff.add(body);

        const light = new THREE.PointLight(0xfff8a0, 1.5, 6);
        ff.add(light);

        const haloMat = new THREE.MeshBasicMaterial({
            color: 0xffee80, transparent: true, opacity: 0.3, side: THREE.DoubleSide
        });
        const halo = new THREE.Mesh(new THREE.CircleGeometry(0.25, 12), haloMat);
        ff.add(halo);

        ff.userData = {
            phase: Math.random() * Math.PI * 2,
            speed: 0.3 + Math.random() * 0.5,
            radius: 3 + Math.random() * 8,
            height: 0.8 + Math.random() * 2.5,
            angle: Math.random() * Math.PI * 2,
            centerX: (Math.random() - 0.5) * 60,
            centerZ: (Math.random() - 0.5) * 60,
            flicker: Math.random() * Math.PI * 2,
            light, body, halo
        };

        group.add(ff);
        fireflies.push(ff);
    }

    return {
        group,
        update: (dt) => {
            const t = performance.now() * 0.001;
            fireflies.forEach(ff => {
                const u = ff.userData;
                u.angle += dt * u.speed;
                ff.position.x = u.centerX + Math.cos(u.angle) * u.radius;
                ff.position.z = u.centerZ + Math.sin(u.angle * 0.7) * u.radius;
                ff.position.y = u.height + Math.sin(t * 2 + u.phase) * 0.4;

                const flickerIntensity = 0.5 + Math.sin(t * 4 + u.flicker) * 0.5;
                u.light.intensity = 0.5 + flickerIntensity * 1.5;
                u.body.material.opacity = 0.5 + flickerIntensity * 0.5;
                u.halo.material.opacity = 0.15 + flickerIntensity * 0.25;

                ff.lookAt(ff.position.x, ff.position.y + 10, ff.position.z);
            });
        }
    };
}

export function createSkyGradient() {
    const geometry = new THREE.PlaneGeometry(800, 400);

    const material = new THREE.ShaderMaterial({
        uniforms: {
            topColor: { value: new THREE.Color(0x1a0a2a) },
            bottomColor: { value: new THREE.Color(0x2a1a4a) },
            offset: { value: 50 },
            exponent: { value: 0.8 }
        },
        vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
        fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(h, exponent), 0.0)), 1.0);
      }
    `,
        side: THREE.BackSide,
        depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 30, -200);
    return mesh;
}