import * as THREE from 'three';
import { initViewer } from './viewer.js';
import { loadGeoJson } from './loader.js';
import { setModel, getModelGeometry } from './model-manager.js';
import { runAlgorithms } from './algorithm.js';
import { clearObbs, createObbMesh, getObbMeshes, addNewObb, deleteSelectedObb, setDelegates } from './obb-manager.js';
import { initEditor, setSelection, setTransformMode } from './editor.js';

// --- Logic ---

const r2d = THREE.MathUtils.radToDeg;
const d2r = THREE.MathUtils.degToRad;

function init() {
    initViewer();
    initEditor(syncUIFromObb);
    
    // Obb Manager Delegates
    setDelegates(
        (mesh) => { // On Selection
            const panel = document.getElementById('editPanel');
            if(mesh) {
                panel.style.display = 'block';
                syncUIFromObb(mesh);
                setSelection(mesh); 
            } else {
                panel.style.display = 'none';
                setSelection(null);
            }
        },
        () => { // On Update (List change)
            updateJsonOutput();
        }
    );

    // DEBUG: Test Cube
    import('./viewer.js').then(m => {
        const s = m.getScene();
        if(s) {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshBasicMaterial({color:0xff0000, wireframe:true}));
            mesh.position.set(0, 5, 0); 
            s.add(mesh);
            console.log("Debug Cube Added");
        }
    });

    // Initial binding
    bindEvents();
}

function bindEvents() {
    document.getElementById('fileInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if(!file) return;
        try {
            const geo = await loadGeoJson(file);
            setModel(geo);
        } catch(err) {
            alert(err.message);
            console.error(err);
        }
    });

    document.getElementById('clusterRange').addEventListener('input', (e) => {
        document.getElementById('clusterVal').innerText = e.target.value;
    });

    document.getElementById('btnGenerate').addEventListener('click', () => {
        const geo = getModelGeometry();
        if (!geo) { alert("Load model first"); return; }
        
        const k = parseInt(document.getElementById('clusterRange').value);
        const overlay = document.getElementById('loading-overlay');
        overlay.style.display = 'flex';
        
        setTimeout(() => {
            try {
                clearObbs();
                const results = runAlgorithms(geo, k);
                results.forEach(d => createObbMesh(d));
                updateJsonOutput();
            } catch(e) {
                console.error(e);
                alert(e.message);
            }
            overlay.style.display = 'none';
        }, 50);
    });

    document.getElementById('btnCopy').addEventListener('click', () => {
        const el = document.getElementById('jsonOutput');
        el.select();
        document.execCommand('copy');
    });

    // Editor Buttons
    document.getElementById('btnModeTranslate').onclick = () => setTransformMode('translate');
    document.getElementById('btnModeScale').onclick = () => setTransformMode('scale');
    document.getElementById('btnModeRotate').onclick = () => setTransformMode('rotate');
    document.getElementById('btnDelete').onclick = deleteSelectedObb;
    document.getElementById('btnAddOBB').onclick = addNewObb;
    
    // Inputs
    ['PosX','PosY','PosZ','SizeX','SizeY','SizeZ','RotX','RotY','RotZ'].forEach(field => {
        let elem = document.getElementById('inp' + field);
        elem.addEventListener('change', applyNumericEdit);
        elem.addEventListener('input', applyNumericEdit);
    });
}

function syncUIFromObb(mesh) {
    if (!mesh) return;
    document.getElementById('inpPosX').value = mesh.position.x.toFixed(3);
    document.getElementById('inpPosY').value = mesh.position.y.toFixed(3);
    document.getElementById('inpPosZ').value = mesh.position.z.toFixed(3);

    document.getElementById('inpSizeX').value = mesh.scale.x.toFixed(3);
    document.getElementById('inpSizeY').value = mesh.scale.y.toFixed(3);
    document.getElementById('inpSizeZ').value = mesh.scale.z.toFixed(3);

    const euler = new THREE.Euler().setFromQuaternion(mesh.quaternion);
    document.getElementById('inpRotX').value = r2d(euler.x).toFixed(1);
    document.getElementById('inpRotY').value = r2d(euler.y).toFixed(1);
    document.getElementById('inpRotZ').value = r2d(euler.z).toFixed(1);
    
    updateJsonOutput();
}

function applyNumericEdit() {
    const obbMeshes = getObbMeshes(); // Need currently selected. Manager holds it but we don't expose getter easily?
    // Actually obb-manager has getSelectedObb
    // We need to import it or rely on passed context.
    // Let's import getSelectedObb from obb-manager.
    // (Added import at top)
    const { getSelectedObb } = await import('./obb-manager.js'); 
    const mesh = getSelectedObb();
    if(!mesh) return;

    const px = parseFloat(document.getElementById('inpPosX').value) || 0;
    const py = parseFloat(document.getElementById('inpPosY').value) || 0;
    const pz = parseFloat(document.getElementById('inpPosZ').value) || 0;
    const sx = parseFloat(document.getElementById('inpSizeX').value) || 0.1;
    const sy = parseFloat(document.getElementById('inpSizeY').value) || 0.1;
    const sz = parseFloat(document.getElementById('inpSizeZ').value) || 0.1;
    const rx = parseFloat(document.getElementById('inpRotX').value) || 0;
    const ry = parseFloat(document.getElementById('inpRotY').value) || 0;
    const rz = parseFloat(document.getElementById('inpRotZ').value) || 0;

    mesh.position.set(px, py, pz);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.set(d2r(rx), d2r(ry), d2r(rz));

    updateJsonOutput();
}

function updateJsonOutput() {
    const obbMeshes = getObbMeshes();
    const data = {
        OBB: obbMeshes.map(m => {
            return {
                Size: [
                    parseFloat(m.scale.x.toFixed(4)),
                    parseFloat(m.scale.y.toFixed(4)),
                    parseFloat(m.scale.z.toFixed(4))
                ],
                Position: [
                    parseFloat(m.position.x.toFixed(4)),
                    parseFloat(m.position.y.toFixed(4)),
                    parseFloat(m.position.z.toFixed(4))
                ],
                Rotation: [
                    parseFloat(r2d(m.rotation.x).toFixed(2)),
                    parseFloat(r2d(m.rotation.y).toFixed(2)),
                    parseFloat(r2d(m.rotation.z).toFixed(2))
                ]
            };
        })
    };
    document.getElementById('jsonOutput').value = JSON.stringify(data, null, 2);
}

// Start
init();
