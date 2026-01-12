import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { getScene, getCamera, getRenderer, getControls } from './viewer.js';
import { selectObb, getSelectedObb, getObbMeshes } from './obb-manager.js';

let transformControl;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

// Callbacks
let onUpdateUI = null;

export function initEditor(updateUiCallback) {
    onUpdateUI = updateUiCallback;
    
    transformControl = new TransformControls(getCamera(), getRenderer().domElement);
    transformControl.addEventListener('dragging-changed', function (event) {
        getControls().enabled = !event.value;
    });
    transformControl.addEventListener('change', () => {
        const sel = getSelectedObb();
        if (sel && onUpdateUI) {
            onUpdateUI(sel);
        }
    });
    getScene().add(transformControl);

    // Click Selection
    getRenderer().domElement.addEventListener('pointerdown', onPointerDown);
}

function onPointerDown(event) {
    const rect = getRenderer().domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, getCamera());

    // Intersect with OBBs
    const intersects = raycaster.intersectObjects(getObbMeshes());
    
    if (intersects.length > 0) {
        setSelection(intersects[0].object);
    } else {
        // If cliking on gizmo, TransformControls handles it. 
        // We need to check if we clicked NOTHING to deselect.
        // But raycaster here only checks OBBs.
        // For now, if no OBB hit, check if gizmo is hovered? 
        // TransformControls usually consumes event if interacting.
        // Simple heuristic: If we didn't hit an OBB, distinct click likely means deselect, unless dragging.
        // But the event is pointerdown.
        setSelection(null); 
    }
}

export function setSelection(mesh) {
    selectObb(mesh);
    if (mesh) {
        transformControl.attach(mesh);
    } else {
        transformControl.detach();
    }
}

export function setTransformMode(mode) {
    transformControl.setMode(mode);
}
