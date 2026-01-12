import * as THREE from 'three';
import { getScene } from './viewer.js';

let obbMeshes = [];
let selectedObb = null;

// Callbacks
let onSelectionChange = null;
let onObbUpdate = null;

export function setDelegates(selCb, upCb) {
    onSelectionChange = selCb;
    onObbUpdate = upCb;
}

export function clearObbs() {
    const scene = getScene();
    selectObb(null);
    obbMeshes.forEach(m => scene.remove(m));
    obbMeshes = [];
}

export function createObbMesh(obbData) {
    const scene = getScene();
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial( { color: 0x00ff00, wireframe: true, transparent: true, opacity: 0.5 } );
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(...obbData.center);
    mesh.scale.set(Math.max(0.01, obbData.size[0]), Math.max(0.01, obbData.size[1]), Math.max(0.01, obbData.size[2]));
    
    if (obbData.rotationMatrix) {
        const q = new THREE.Quaternion().setFromRotationMatrix(obbData.rotationMatrix);
        mesh.setRotationFromQuaternion(q);
    }

    mesh.userData = { isOBB: true };
    scene.add(mesh);
    obbMeshes.push(mesh);
    
    // Auto Update trigger? No, usually batch generation.
}

export function addNewObb() {
    createObbMesh({
        center: [0,0,0],
        size: [1,1,1],
        rotationMatrix: new THREE.Matrix4()
    });
    selectObb(obbMeshes[obbMeshes.length - 1]);
    if(onObbUpdate) onObbUpdate();
}

export function deleteSelectedObb() {
    if (!selectedObb) return;
    const scene = getScene();
    scene.remove(selectedObb);
    obbMeshes = obbMeshes.filter(m => m !== selectedObb);
    selectObb(null);
    if(onObbUpdate) onObbUpdate();
}

export function getObbMeshes() { return obbMeshes; }

export function selectObb(mesh) {
    if (selectedObb === mesh) return;

    if (selectedObb) {
        selectedObb.material.color.setHex(0x00ff00);
    }
    
    selectedObb = mesh;

    if (selectedObb) {
        selectedObb.material.color.setHex(0xffff00);
    }

    if (onSelectionChange) onSelectionChange(selectedObb);
}

export function getSelectedObb() { return selectedObb; }
