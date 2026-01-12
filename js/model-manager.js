import * as THREE from 'three';
import { getScene } from './viewer.js';

let currentModel = null;
let currentWireframe = null;

export function setModel(geometry) {
    clearModel();

    if (!geometry) return;

    const scene = getScene();
    
    // Main Material
    const material = new THREE.MeshStandardMaterial({ 
        color: 0xaaaaaa, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    
    currentModel = new THREE.Mesh(geometry, material);
    scene.add(currentModel);
    
    // Wireframe Overlay
    const wireMat = new THREE.MeshBasicMaterial({ 
        color: 0xffffff, 
        wireframe: true, 
        transparent: true, 
        opacity: 0.15 
    });
    const wireMesh = new THREE.Mesh(geometry, wireMat);
    currentModel.add(wireMesh);
    currentWireframe = wireMesh;

    console.log("Model set to scene.");
}

export function clearModel() {
    if (currentModel) {
        const scene = getScene();
        scene.remove(currentModel);
        if (currentModel.geometry) currentModel.geometry.dispose();
        if (currentModel.material) currentModel.material.dispose();
        currentModel = null;
    }
}

export function getModelGeometry() {
    return currentModel ? currentModel.geometry : null;
}
