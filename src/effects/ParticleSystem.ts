import * as THREE from 'three';

export class ParticleSystem {
  private scene: THREE.Scene;
  private dust!: THREE.Points;
  private smoke: THREE.Points[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createDust();
    this.createSmoke();
  }

  private createDust(): void {
    const count = 300;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 200;
      pos[i * 3 + 1] = Math.random() * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 200;
      vel[i * 3] = (Math.random() - 0.5) * 1.5;
      vel[i * 3 + 1] = Math.random() * 0.3;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(vel, 3));

    this.dust = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xb89a6a, size: 0.25, transparent: true, opacity: 0.35
    }));
    this.scene.add(this.dust);
  }

  private createSmoke(): void {
    const spots = [[45, 45], [-50, 35], [60, -45], [-70, -20]];
    spots.forEach(([x, z]) => {
      const count = 60;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        const h = (i / count) * 25;
        pos[i * 3] = x + (Math.random() - 0.5) * h * 0.25;
        pos[i * 3 + 1] = h;
        pos[i * 3 + 2] = z + (Math.random() - 0.5) * h * 0.25;
      }

      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const s = new THREE.Points(geo, new THREE.PointsMaterial({
        color: 0x444444, size: 2.5, transparent: true, opacity: 0.4
      }));
      this.smoke.push(s);
      this.scene.add(s);
    });
  }

  public update(delta: number): void {
    const pos = this.dust.geometry.attributes.position.array as Float32Array;
    const vel = this.dust.geometry.attributes.velocity.array as Float32Array;

    for (let i = 0; i < pos.length; i += 3) {
      pos[i] += vel[i] * delta;
      pos[i + 1] += vel[i + 1] * delta;
      pos[i + 2] += vel[i + 2] * delta;
      if (Math.abs(pos[i]) > 100) pos[i] *= -0.9;
      if (pos[i + 1] > 8) pos[i + 1] = 0;
      if (Math.abs(pos[i + 2]) > 100) pos[i + 2] *= -0.9;
    }
    this.dust.geometry.attributes.position.needsUpdate = true;

    this.smoke.forEach(s => {
      const p = s.geometry.attributes.position.array as Float32Array;
      for (let i = 1; i < p.length; i += 3) {
        p[i] += delta * 1.5;
        if (p[i] > 25) p[i] = 0;
      }
      s.geometry.attributes.position.needsUpdate = true;
    });
  }

  public createExplosion(position: THREE.Vector3): void {
    const count = 40;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const vel = Array.from({ length: count }, () => new THREE.Vector3(
      (Math.random() - 0.5) * 18, Math.random() * 12, (Math.random() - 0.5) * 18
    ));

    for (let i = 0; i < count; i++) {
      pos[i * 3] = position.x;
      pos[i * 3 + 1] = position.y;
      pos[i * 3 + 2] = position.z;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({ color: 0xff5500, size: 0.5, transparent: true });
    const exp = new THREE.Points(geo, mat);
    this.scene.add(exp);

    let t = 0;
    const anim = () => {
      t += 0.016;
      const p = exp.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        p[i * 3] += vel[i].x * 0.016;
        p[i * 3 + 1] += vel[i].y * 0.016;
        p[i * 3 + 2] += vel[i].z * 0.016;
        vel[i].y -= 15 * 0.016;
      }
      exp.geometry.attributes.position.needsUpdate = true;
      mat.opacity = 1 - t;
      t < 1 ? requestAnimationFrame(anim) : (this.scene.remove(exp), geo.dispose(), mat.dispose());
    };
    anim();
  }

  public createMuzzleFlash(position: THREE.Vector3): void {
    const f = new THREE.PointLight(0xffaa00, 4, 4);
    f.position.copy(position);
    this.scene.add(f);
    setTimeout(() => (this.scene.remove(f), f.dispose()), 40);
  }
}
