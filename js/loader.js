import * as THREE from 'three';

export function loadGeoJson(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const json = JSON.parse(e.target.result);
                console.log("Loaded JSON Keys:", Object.keys(json));
                
                let geometry = tryParse(json);
                if (!geometry) {
                    reject(new Error("No valid geometry found."));
                    return;
                }

                // Post-process
                geometry.computeBoundingBox();
                try { geometry.center(); } catch(e){}

                resolve(geometry);
            } catch (err) {
                reject(err);
            }
        };
        reader.readAsText(file);
    });
}

function tryParse(json) {
    let errorLog = [];
    const log = (n, e) => errorLog.push(`${n}: ${e.message}`);
    
    // 1. Manual Parse (Bedrock/Generic) - Priority
    try {
        const res = parseAnyModel(json);
        if (res) return res;
    } catch(e) { log("Manual Parser", e); }

    // 2. BufferGeometry
    if (json.type === 'BufferGeometry') {
        try { return new THREE.BufferGeometryLoader().parse(json); } 
        catch(e) { log("BufferGeometryLoader", e); }
    }

    // 3. Raw Attributes
    if (json.attributes) {
        try { return new THREE.BufferGeometryLoader().parse({ data: json }); }
        catch(e) { log("Raw Attributes", e); }
    }

    // 4. ObjectLoader
    try {
        const obj = new THREE.ObjectLoader().parse(json);
        if (obj.isMesh) return obj.geometry;
        if (obj.children) {
            let found = null;
            obj.traverse(c => { if(c.isMesh && !found) found = c.geometry; });
            return found;
        }
    } catch(e) { log("ObjectLoader", e); }

    console.warn("Parse attempts failed:", errorLog);
    return null;
}

// --- Unified Manual Parser ---

function parseAnyModel(json) {
    let geometries = [];

    // A. Bedrock Hierarchical
    if (json['minecraft:geometry']) {
        const geos = json['minecraft:geometry'];
        if (Array.isArray(geos) && geos.length > 0) {
             const model = geos[0];
             const bones = model.bones || [];
             
             // Hierarchy map
             const boneMap = {};
             bones.forEach(b => { boneMap[b.name] = { ...b, children: [] }; });
             const roots = [];
             bones.forEach(b => {
                 if (b.parent && boneMap[b.parent]) boneMap[b.parent].children.push(boneMap[b.name]);
                 else roots.push(boneMap[b.name]);
             });

             const deg2rad = Math.PI / 180;
             const eulerOrder = 'ZYX';
             
             // Recursive Matrix Calc
             const calcMatrix = (bone, parentMat) => {
                 const pivot = bone.pivot || [0,0,0];
                 const rot = bone.rotation || [0,0,0];
                 
                 const matT = new THREE.Matrix4().makeTranslation(pivot[0], pivot[1], pivot[2]);
                 const matR = new THREE.Matrix4().makeRotationFromEuler(
                     new THREE.Euler(rot[0]*deg2rad, rot[1]*deg2rad, rot[2]*deg2rad, eulerOrder)
                 );
                 const matTInv = new THREE.Matrix4().makeTranslation(-pivot[0], -pivot[1], -pivot[2]);
                 
                 const localMat = matT.multiply(matR).multiply(matTInv);
                 const worldMat = parentMat ? parentMat.clone().multiply(localMat) : localMat;
                 
                 if (bone.cubes) {
                     bone.cubes.forEach(cube => {
                         const g = createGeometryFromBedrockCube(cube);
                         g.applyMatrix4(worldMat);
                         geometries.push(g);
                     });
                 }
                 if (bone.children) {
                     bone.children.forEach(child => calcMatrix(child, worldMat));
                 }
             };
             if(bones.length > 0) console.log("First Bone:", bones[0]);
             roots.forEach(r => calcMatrix(r, null));
        }
    }
    // B. Blockbench Generic
    else if (json.elements) {
         console.log("Parsing as Generic Elements");
         json.elements.forEach(el => geometries.push(createGeometryFromGenericElement(el)));
    }
    // C. Legacy Cubes
    else if (json.cubes) {
        json.cubes.forEach(cube => {
            const size = cube.size || [1,1,1];
            const origin = cube.origin || [0,0,0];
            const g = new THREE.BoxGeometry(size[0], size[1], size[2]);
            g.translate(origin[0]+size[0]/2, origin[1]+size[1]/2, origin[2]+size[2]/2);
            geometries.push(g);
        });
    }

    if (geometries.length === 0) return null;
    return mergeGeometries(geometries);
}

function createGeometryFromBedrockCube(cube) {
     const size = cube.size || [0,0,0];
     const origin = cube.origin || [0,0,0];
     const rot = cube.rotation; 
     const pivot = cube.pivot || origin; 
     const inflate = cube.inflate || 0;

     if (size[0]<=0 && size[1]<=0 && size[2]<=0) return new THREE.BufferGeometry();

     const w = size[0] + inflate*2;
     const h = size[1] + inflate*2;
     const d = size[2] + inflate*2;

     const box = new THREE.BoxGeometry(w, h, d);
     const cx = origin[0] + size[0]/2;
     const cy = origin[1] + size[1]/2;
     const cz = origin[2] + size[2]/2;
     
     box.translate(cx, cy, cz); 
     
     if (rot) {
         const deg2rad = Math.PI / 180;
         const px = pivot[0], py = pivot[1], pz = pivot[2];
         box.translate(-px, -py, -pz);
         box.rotateX((rot[0]||0)*deg2rad);
         box.rotateY((rot[1]||0)*deg2rad);
         box.rotateZ((rot[2]||0)*deg2rad);
         box.translate(px, py, pz);
     }
     return box;
}

function createGeometryFromGenericElement(el) {
    const from = el.from || [0,0,0];
    const to = el.to || [1,1,1];
    const w = Math.abs(to[0]-from[0]);
    const h = Math.abs(to[1]-from[1]);
    const d = Math.abs(to[2]-from[2]);
    const box = new THREE.BoxGeometry(w, h, d);
    const cx = (from[0]+to[0])/2;
    const cy = (from[1]+to[1])/2;
    const cz = (from[2]+to[2])/2;
    box.translate(cx, cy, cz);
    
    if (el.rotation) {
        const o = el.rotation.origin || [cx, cy, cz];
        const angle = THREE.MathUtils.degToRad(el.rotation.angle || 0);
        box.translate(-o[0], -o[1], -o[2]);
        if (el.rotation.axis === 'x') box.rotateX(angle);
        if (el.rotation.axis === 'y') box.rotateY(angle);
        if (el.rotation.axis === 'z') box.rotateZ(angle);
        box.translate(o[0], o[1], o[2]);
    }
    return box;
}

function mergeGeometries(geometries) {
    let totalVertices = 0;
    geometries.forEach(g => {
        if(g&&g.attributes.position) totalVertices += g.attributes.position.count;
    });
    if (totalVertices === 0) return null;

    const arr = new Float32Array(totalVertices * 3);
    let offset = 0;
    geometries.forEach(g => {
        if(!g||!g.attributes.position) return;
        arr.set(g.attributes.position.array, offset*3);
        offset += g.attributes.position.count;
        g.dispose();
    });
    const m = new THREE.BufferGeometry();
    m.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return m;
}
