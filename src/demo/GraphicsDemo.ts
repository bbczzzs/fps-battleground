import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class GraphicsDemo {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private composer: EffectComposer;
    private controls: OrbitControls;
    private particles: THREE.Points[] = [];
    private floatingObjects: THREE.Mesh[] = [];
    private time: number = 0;
    private waterMesh!: THREE.Mesh;
    private lights: THREE.PointLight[] = [];

    constructor() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a1a);
        this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.015);

        // Camera
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 15, 30);

        // Renderer with high quality settings
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        document.body.appendChild(this.renderer.domElement);

        // Orbit controls for easy viewing
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.5;

        // Post-processing
        this.composer = new EffectComposer(this.renderer);
        this.setupPostProcessing();

        // Create scene content
        this.createLighting();
        this.createGround();
        this.createWater();
        this.createPBRObjects();
        this.createGlowingSpheres();
        this.createParticles();
        this.createCrystals();
        this.createEnvironment();

        // UI
        this.createUI();

        // Events
        window.addEventListener('resize', () => this.onResize());

        // Start animation
        this.animate();
    }

    private setupPostProcessing(): void {
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // SSAO (Ambient Occlusion)
        const ssaoPass = new SSAOPass(this.scene, this.camera, window.innerWidth, window.innerHeight);
        ssaoPass.kernelRadius = 16;
        ssaoPass.minDistance = 0.005;
        ssaoPass.maxDistance = 0.1;
        this.composer.addPass(ssaoPass);

        // Bloom
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5,  // strength
            0.4,  // radius
            0.85  // threshold
        );
        this.composer.addPass(bloomPass);

        // Output
        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);
    }

    private createLighting(): void {
        // Ambient light
        const ambient = new THREE.AmbientLight(0x404080, 0.4);
        this.scene.add(ambient);

        // Main directional light (sun)
        const sun = new THREE.DirectionalLight(0xffeedd, 2);
        sun.position.set(50, 100, 50);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 500;
        sun.shadow.camera.left = -50;
        sun.shadow.camera.right = 50;
        sun.shadow.camera.top = 50;
        sun.shadow.camera.bottom = -50;
        sun.shadow.bias = -0.0001;
        this.scene.add(sun);

        // Colored point lights
        const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xff44ff, 0xffff44, 0x44ffff];
        for (let i = 0; i < 6; i++) {
            const light = new THREE.PointLight(colors[i], 50, 30);
            const angle = (i / 6) * Math.PI * 2;
            light.position.set(Math.cos(angle) * 15, 5, Math.sin(angle) * 15);
            light.castShadow = true;
            light.shadow.mapSize.width = 512;
            light.shadow.mapSize.height = 512;
            this.scene.add(light);
            this.lights.push(light);
        }

        // Hemisphere light for sky/ground color
        const hemi = new THREE.HemisphereLight(0x8888ff, 0x444422, 0.5);
        this.scene.add(hemi);
    }

    private createGround(): void {
        // Reflective ground
        const groundGeo = new THREE.PlaneGeometry(200, 200);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x222233,
            roughness: 0.1,
            metalness: 0.9,
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Grid helper for style
        const grid = new THREE.GridHelper(200, 50, 0x444488, 0x222244);
        grid.position.y = 0.01;
        this.scene.add(grid);
    }

    private createWater(): void {
        const waterGeo = new THREE.CircleGeometry(25, 64);
        const waterMat = new THREE.MeshPhysicalMaterial({
            color: 0x0066aa,
            metalness: 0.1,
            roughness: 0,
            transmission: 0.9,
            thickness: 1.5,
            transparent: true,
            opacity: 0.8,
        });
        this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
        this.waterMesh.rotation.x = -Math.PI / 2;
        this.waterMesh.position.y = 0.05;
        this.scene.add(this.waterMesh);
    }

    private createPBRObjects(): void {
        // Central platform
        const platformGeo = new THREE.CylinderGeometry(8, 10, 2, 32);
        const platformMat = new THREE.MeshStandardMaterial({
            color: 0x333344,
            roughness: 0.3,
            metalness: 0.8,
        });
        const platform = new THREE.Mesh(platformGeo, platformMat);
        platform.position.y = 1;
        platform.castShadow = true;
        platform.receiveShadow = true;
        this.scene.add(platform);

        // Golden metallic sphere
        const goldGeo = new THREE.SphereGeometry(2, 64, 64);
        const goldMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            roughness: 0.1,
            metalness: 1,
        });
        const goldSphere = new THREE.Mesh(goldGeo, goldMat);
        goldSphere.position.set(0, 6, 0);
        goldSphere.castShadow = true;
        this.scene.add(goldSphere);
        this.floatingObjects.push(goldSphere);

        // Chrome torus
        const torusGeo = new THREE.TorusGeometry(3, 0.5, 32, 100);
        const chromeMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0,
            metalness: 1,
        });
        const torus = new THREE.Mesh(torusGeo, chromeMat);
        torus.position.set(0, 6, 0);
        torus.castShadow = true;
        this.scene.add(torus);
        this.floatingObjects.push(torus);

        // Glass sphere
        const glassGeo = new THREE.SphereGeometry(1.5, 64, 64);
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0,
            roughness: 0,
            transmission: 1,
            thickness: 1.5,
            ior: 1.5,
        });
        const glassSphere = new THREE.Mesh(glassGeo, glassMat);
        glassSphere.position.set(5, 4, 5);
        glassSphere.castShadow = true;
        this.scene.add(glassSphere);
        this.floatingObjects.push(glassSphere);

        // Emissive cube
        const cubeGeo = new THREE.BoxGeometry(2, 2, 2);
        const cubeMat = new THREE.MeshStandardMaterial({
            color: 0xff3300,
            roughness: 0.5,
            metalness: 0.5,
            emissive: 0xff3300,
            emissiveIntensity: 2,
        });
        const cube = new THREE.Mesh(cubeGeo, cubeMat);
        cube.position.set(-5, 4, -5);
        cube.castShadow = true;
        this.scene.add(cube);
        this.floatingObjects.push(cube);
    }

    private createGlowingSpheres(): void {
        const colors = [0xff0066, 0x00ff66, 0x6600ff, 0xff6600, 0x00ffff];
        
        for (let i = 0; i < 20; i++) {
            const geo = new THREE.SphereGeometry(0.3 + Math.random() * 0.3, 32, 32);
            const color = colors[Math.floor(Math.random() * colors.length)];
            const mat = new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 3,
            });
            const sphere = new THREE.Mesh(geo, mat);
            
            const angle = Math.random() * Math.PI * 2;
            const radius = 10 + Math.random() * 20;
            sphere.position.set(
                Math.cos(angle) * radius,
                2 + Math.random() * 8,
                Math.sin(angle) * radius
            );
            sphere.castShadow = true;
            this.scene.add(sphere);
            this.floatingObjects.push(sphere);
        }
    }

    private createParticles(): void {
        // Dust particles
        const particleCount = 5000;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 1] = Math.random() * 50;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

            colors[i * 3] = 0.5 + Math.random() * 0.5;
            colors[i * 3 + 1] = 0.5 + Math.random() * 0.5;
            colors[i * 3 + 2] = 1;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
        });

        const particles = new THREE.Points(geo, mat);
        this.scene.add(particles);
        this.particles.push(particles);

        // Sparkle particles
        const sparkleCount = 1000;
        const sparklePositions = new Float32Array(sparkleCount * 3);

        for (let i = 0; i < sparkleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 5 + Math.random() * 30;
            sparklePositions[i * 3] = Math.cos(angle) * radius;
            sparklePositions[i * 3 + 1] = 1 + Math.random() * 15;
            sparklePositions[i * 3 + 2] = Math.sin(angle) * radius;
        }

        const sparkleGeo = new THREE.BufferGeometry();
        sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));

        const sparkleMat = new THREE.PointsMaterial({
            size: 0.2,
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
        });

        const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
        this.scene.add(sparkles);
        this.particles.push(sparkles);
    }

    private createCrystals(): void {
        const crystalGeo = new THREE.OctahedronGeometry(1.5, 0);
        
        for (let i = 0; i < 8; i++) {
            const hue = i / 8;
            const color = new THREE.Color().setHSL(hue, 1, 0.5);
            
            const crystalMat = new THREE.MeshPhysicalMaterial({
                color: color,
                metalness: 0.2,
                roughness: 0,
                transmission: 0.8,
                thickness: 2,
                ior: 2.4,
                emissive: color,
                emissiveIntensity: 0.5,
            });
            
            const crystal = new THREE.Mesh(crystalGeo, crystalMat);
            const angle = (i / 8) * Math.PI * 2;
            crystal.position.set(
                Math.cos(angle) * 12,
                3 + Math.sin(i) * 2,
                Math.sin(angle) * 12
            );
            crystal.rotation.set(Math.random(), Math.random(), Math.random());
            crystal.castShadow = true;
            this.scene.add(crystal);
            this.floatingObjects.push(crystal);
        }
    }

    private createEnvironment(): void {
        // Pillars
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const radius = 35;
            
            const pillarGeo = new THREE.CylinderGeometry(1, 1.2, 15, 8);
            const pillarMat = new THREE.MeshStandardMaterial({
                color: 0x445566,
                roughness: 0.4,
                metalness: 0.6,
            });
            const pillar = new THREE.Mesh(pillarGeo, pillarMat);
            pillar.position.set(
                Math.cos(angle) * radius,
                7.5,
                Math.sin(angle) * radius
            );
            pillar.castShadow = true;
            pillar.receiveShadow = true;
            this.scene.add(pillar);

            // Light on top
            const lightGeo = new THREE.SphereGeometry(0.5, 16, 16);
            const lightMat = new THREE.MeshStandardMaterial({
                color: 0x88aaff,
                emissive: 0x88aaff,
                emissiveIntensity: 2,
            });
            const lightBall = new THREE.Mesh(lightGeo, lightMat);
            lightBall.position.set(
                Math.cos(angle) * radius,
                16,
                Math.sin(angle) * radius
            );
            this.scene.add(lightBall);
        }
    }

    private createUI(): void {
        const ui = document.createElement('div');
        ui.innerHTML = `
            <div style="position: fixed; top: 20px; left: 20px; color: white; font-family: 'Segoe UI', Arial, sans-serif; z-index: 1000;">
                <h1 style="margin: 0; font-size: 28px; text-shadow: 0 0 20px rgba(100,150,255,0.8);">
                    🎮 WebGL Graphics Demo
                </h1>
                <p style="margin: 10px 0; opacity: 0.8; font-size: 14px;">
                    High-quality browser graphics showcase
                </p>
                <div style="background: rgba(0,0,0,0.5); padding: 15px; border-radius: 10px; margin-top: 15px; backdrop-filter: blur(10px);">
                    <h3 style="margin: 0 0 10px 0; color: #88aaff;">✨ Active Features:</h3>
                    <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
                        <li>PBR Materials (Metal, Glass, Chrome)</li>
                        <li>Real-time Shadows (PCF Soft)</li>
                        <li>Post-Processing (Bloom + SSAO)</li>
                        <li>ACES Filmic Tone Mapping</li>
                        <li>Physical Transmission (Glass/Water)</li>
                        <li>Dynamic Colored Lighting</li>
                        <li>5000+ Particles</li>
                        <li>Emissive Glow Effects</li>
                    </ul>
                </div>
                <p style="margin-top: 15px; opacity: 0.6; font-size: 12px;">
                    🖱️ Drag to rotate • Scroll to zoom
                </p>
            </div>
        `;
        document.body.appendChild(ui);
    }

    private onResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    private animate(): void {
        requestAnimationFrame(() => this.animate());
        
        this.time += 0.01;

        // Animate floating objects
        this.floatingObjects.forEach((obj, i) => {
            obj.position.y += Math.sin(this.time * 2 + i) * 0.005;
            obj.rotation.x += 0.005;
            obj.rotation.y += 0.01;
        });

        // Animate lights
        this.lights.forEach((light, i) => {
            const angle = this.time + (i / 6) * Math.PI * 2;
            light.position.x = Math.cos(angle) * 15;
            light.position.z = Math.sin(angle) * 15;
            light.position.y = 5 + Math.sin(this.time * 2 + i) * 2;
        });

        // Animate particles
        this.particles.forEach((p, i) => {
            p.rotation.y += 0.001 * (i + 1);
        });

        // Water wave effect
        if (this.waterMesh) {
            (this.waterMesh.material as THREE.MeshPhysicalMaterial).opacity = 
                0.7 + Math.sin(this.time * 3) * 0.1;
        }

        this.controls.update();
        this.composer.render();
    }
}
