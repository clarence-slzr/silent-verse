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

    // Collision objects (with radius for player collision)
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

export function createCharacter(scene, type = 'male') {
    const group = new THREE.Group();

    const skinColor = 0xf0c8a0;
    const clothColor = type === 'male' ? 0x4a6b9a : 0xb85a8a;

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 16, 16),
        new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8 })
    );
    head.position.y = 1.7;
    head.castShadow = true;
    group.add(head);

    const hair = new THREE.Mesh(
        new THREE.SphereGeometry(0.37, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6),
        new THREE.MeshStandardMaterial({
            color: type === 'male' ? 0x2a1a10 : 0x4a2010,
            roughness: 1
        })
    );
    hair.position.y = 1.75;
    group.add(hair);

    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.35, 1.0, 12),
        new THREE.MeshStandardMaterial({ color: clothColor, roughness: 0.8, flatShading: true })
    );
    body.position.y = 1.0;
    body.castShadow = true;
    group.add(body);

    const armMat = new THREE.MeshStandardMaterial({ color: clothColor, roughness: 0.8 });
    const armGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.8, 8);
    const armL = new THREE.Mesh(armGeo, armMat);
    armL.position.set(-0.4, 1.05, 0);
    armL.rotation.z = 0.15;
    group.add(armL);
    const armR = new THREE.Mesh(armGeo, armMat);
    armR.position.set(0.4, 1.05, 0);
    armR.rotation.z = -0.15;
    group.add(armR);

    const legMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.9 });
    const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.13, 0.4, 0);
    group.add(legL);
    const legR = new THREE.Mesh(legGeo, legMat);
    legR.position.set(0.13, 0.4, 0);
    group.add(legR);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2a });
    const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.13, 1.75, 0.31);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.13, 1.75, 0.31);
    group.add(eyeR);

    group.userData = { type, leftArm: armL, rightArm: armR, head };
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