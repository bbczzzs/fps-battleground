import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Free CC0 3D models from poly.pizza and other sources
export const MODELS = {
  // Characters
  soldier: 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/soldier/model.gltf',
  zombie: 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/zombie/model.gltf',
  
  // Weapons
  rifle: 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/rifle/model.gltf',
  pistol: 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/pistol/model.gltf',
  
  // Vehicles
  car: 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/car-police/model.gltf',
  truck: 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/truck/model.gltf',
  helicopter: 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/helicopter/model.gltf',
  
  // Environment
  tree: 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/tree-spruce/model.gltf',
  rock: 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/rock-tall/model.gltf',
  crate: 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/crate/model.gltf',
  barrel: 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/barrel/model.gltf',
  
  // Buildings
  house: 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/low-poly-house/model.gltf',
  tower: 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/watch-tower/model.gltf',
};

export type ModelName = keyof typeof MODELS;

class ModelLoaderClass {
  private loader: GLTFLoader;
  private cache: Map<string, GLTF> = new Map();
  private loading: Map<string, Promise<GLTF>> = new Map();

  constructor() {
    this.loader = new GLTFLoader();
  }

  async load(name: ModelName): Promise<GLTF> {
    const url = MODELS[name];
    
    // Return cached model
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    // Return existing loading promise
    if (this.loading.has(url)) {
      return this.loading.get(url)!;
    }

    // Start loading
    const promise = new Promise<GLTF>((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          this.cache.set(url, gltf);
          this.loading.delete(url);
          resolve(gltf);
        },
        undefined,
        (error) => {
          console.error(`Failed to load model ${name}:`, error);
          this.loading.delete(url);
          reject(error);
        }
      );
    });

    this.loading.set(url, promise);
    return promise;
  }

  async loadAndClone(name: ModelName, scale = 1): Promise<THREE.Group> {
    try {
      const gltf = await this.load(name);
      const clone = gltf.scene.clone();
      clone.scale.setScalar(scale);
      
      // Enable shadows
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      return clone;
    } catch (error) {
      // Return fallback cube on error
      console.warn(`Using fallback for ${name}`);
      const fallback = new THREE.Group();
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0xff00ff })
      );
      fallback.add(mesh);
      fallback.scale.setScalar(scale);
      return fallback;
    }
  }

  // Get animations from a loaded model
  getAnimations(gltf: GLTF): THREE.AnimationClip[] {
    return gltf.animations || [];
  }

  // Create an animation mixer for a model
  createMixer(model: THREE.Object3D): THREE.AnimationMixer {
    return new THREE.AnimationMixer(model);
  }

  // Preload commonly used models
  async preloadAll(): Promise<void> {
    const models = Object.keys(MODELS) as ModelName[];
    await Promise.allSettled(models.map(name => this.load(name)));
    console.log('All models preloaded');
  }
}

export const ModelLoader = new ModelLoaderClass();
