import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Tiger3DCanvas({ className = "w-full h-48", mode = "scanner" }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth || 300;
    const height = currentMount.clientHeight || 200;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentMount.appendChild(renderer.domElement);

    // Geometry & Materials for Visual Identity / Stripe Pattern Scanner
    const group = new THREE.Group();

    if (mode === "scanner") {
      // 3D Visual Identity Particle Sphere / Ring
      const geometry = new THREE.IcosahedronGeometry(1.6, 2);
      const wireframeMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
      });
      const wireframeMesh = new THREE.Mesh(geometry, wireframeMat);
      group.add(wireframeMesh);

      // Inner Core Node (Tiger Embedding Vector Representation)
      const coreGeo = new THREE.SphereGeometry(0.8, 16, 16);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0x059669,
        roughness: 0.2,
        metalness: 0.8,
        emissive: 0x047857,
        emissiveIntensity: 0.4
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      group.add(coreMesh);

      // Scanning Orbit Ring
      const ringGeo = new THREE.TorusGeometry(2.1, 0.03, 16, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.6 });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 3;
      group.add(ringMesh);
    } else {
      // Ambient Camera Trap Surveillance Radar
      const cylinderGeo = new THREE.CylinderGeometry(2, 2, 0.1, 32);
      const cylinderMat = new THREE.MeshBasicMaterial({ color: 0x064e3b, wireframe: true, transparent: true, opacity: 0.25 });
      const cylinder = new THREE.Mesh(cylinderGeo, cylinderMat);
      group.add(cylinder);

      const sweepGeo = new THREE.ConeGeometry(2, 0.5, 32, 1, true, 0, Math.PI / 3);
      const sweepMat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
      const sweep = new THREE.Mesh(sweepGeo, sweepMat);
      sweep.rotation.x = Math.PI / 2;
      group.add(sweep);
    }

    scene.add(group);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x34d399, 2, 50);
    pointLight.position.set(3, 3, 3);
    scene.add(pointLight);

    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      group.rotation.y += 0.012;
      group.rotation.x += 0.005;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!currentMount) return;
      const w = currentMount.clientWidth;
      const h = currentMount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [mode]);

  return (
    <div className={`relative ${className} flex items-center justify-center overflow-hidden`}>
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
