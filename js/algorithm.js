import * as THREE from 'three';

export function runAlgorithms(geometry, k) {
    // 1. Extract Points
    const attr = geometry.attributes.position;
    const points = []; 
    for(let i=0; i<attr.count; i++) {
        points.push([attr.getX(i), attr.getY(i), attr.getZ(i)]);
    }

    if (points.length === 0) return [];

    // 2. K-Means
    const clusters = kMeans(points, k);

    // 3. PCA & OBB for each cluster
    const results = [];
    clusters.forEach(clusterPoints => {
        if (clusterPoints.length < 4) return;
        const obbData = computeOBB(clusterPoints);
        results.push(obbData);
    });
    return results;
}

function kMeans(points, k) {
    let centroids = [];
    for (let i = 0; i < k; i++) {
        centroids.push(points[Math.floor(Math.random() * points.length)].slice());
    }

    let assignments = new Int32Array(points.length);
    let changed = true;
    let iter = 0;
    const maxIter = 20;

    while (changed && iter < maxIter) {
        changed = false;
        iter++;
        let clusters = Array(k).fill(0).map(() => ({ sum: [0,0,0], count: 0 }));

        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            let minDist = Infinity;
            let bestK = 0;
            for (let j = 0; j < k; j++) {
                const c = centroids[j];
                const d = (p[0]-c[0])**2 + (p[1]-c[1])**2 + (p[2]-c[2])**2;
                if (d < minDist) { minDist = d; bestK = j; }
            }
            if (assignments[i] !== bestK) { assignments[i] = bestK; changed = true; }
            clusters[bestK].sum[0] += p[0];
            clusters[bestK].sum[1] += p[1];
            clusters[bestK].sum[2] += p[2];
            clusters[bestK].count++;
        }

        for (let j = 0; j < k; j++) {
            if (clusters[j].count > 0) {
                centroids[j][0] = clusters[j].sum[0] / clusters[j].count;
                centroids[j][1] = clusters[j].sum[1] / clusters[j].count;
                centroids[j][2] = clusters[j].sum[2] / clusters[j].count;
            }
        }
    }

    const result = Array(k).fill(0).map(() => []);
    for (let i = 0; i < points.length; i++) {
        result[assignments[i]].push(points[i]);
    }
    return result.filter(arr => arr.length > 0);
}

function computeOBB(points) {
    const n = points.length;
    let mean = [0,0,0];
    for (let p of points) { mean[0]+=p[0]; mean[1]+=p[1]; mean[2]+=p[2]; }
    mean[0]/=n; mean[1]/=n; mean[2]/=n;

    let cov = [[0,0,0],[0,0,0],[0,0,0]];
    for (let p of points) {
        const x = p[0] - mean[0];
        const y = p[1] - mean[1];
        const z = p[2] - mean[2];
        cov[0][0] += x*x; cov[0][1] += x*y; cov[0][2] += x*z;
        cov[1][1] += y*y; cov[1][2] += y*z;
        cov[2][2] += z*z;
    }
    cov[0][1]/=n; cov[0][2]/=n; cov[1][2]/=n;
    cov[1][0]=cov[0][1]; cov[2][0]=cov[0][2]; cov[2][1]=cov[1][2];
    cov[0][0]/=n; cov[1][1]/=n; cov[2][2]/=n;

    // Use global 'numeric' from script tag
    // @ts-ignore
    const eig = numeric.eig(cov);
    const eigenvalues = eig.lambda.x;
    const eigenvectors = eig.E.x; 

    let axes = [0,1,2].map(i => ({ val: eigenvalues[i], vec: eigenvectors[i] }));
    axes.sort((a,b) => b.val - a.val);

    const axisX = normalize(axes[0].vec);
    const axisY = normalize(axes[1].vec);
    const axisZ = normalize(axes[2].vec);
    
    // Project to find extent
    let min = [Infinity, Infinity, Infinity];
    let max = [-Infinity, -Infinity, -Infinity];

    for (let p of points) {
        const d = [p[0]-mean[0], p[1]-mean[1], p[2]-mean[2]];
        const dotX = dot(d, axisX);
        const dotY = dot(d, axisY);
        const dotZ = dot(d, axisZ);
        if(dotX < min[0]) min[0] = dotX; if(dotX > max[0]) max[0] = dotX;
        if(dotY < min[1]) min[1] = dotY; if(dotY > max[1]) max[1] = dotY;
        if(dotZ < min[2]) min[2] = dotZ; if(dotZ > max[2]) max[2] = dotZ;
    }

    const centerLocal = [(min[0]+max[0])/2, (min[1]+max[1])/2, (min[2]+max[2])/2];
    const size = [max[0]-min[0], max[1]-min[1], max[2]-min[2]];

    const centerWorld = [
        mean[0] + centerLocal[0]*axisX[0] + centerLocal[1]*axisY[0] + centerLocal[2]*axisZ[0],
        mean[1] + centerLocal[0]*axisX[1] + centerLocal[1]*axisY[1] + centerLocal[2]*axisZ[1],
        mean[2] + centerLocal[0]*axisX[2] + centerLocal[1]*axisY[2] + centerLocal[2]*axisZ[2]
    ];

    const rotMatrix = new THREE.Matrix4();
    rotMatrix.makeBasis(
        new THREE.Vector3(...axisX),
        new THREE.Vector3(...axisY),
        new THREE.Vector3(...axisZ)
    );

    return { center: centerWorld, size: size, rotationMatrix: rotMatrix };
}

function dot(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
function normalize(a) {
    const l = Math.sqrt(dot(a, a));
    return l > 0 ? [a[0]/l, a[1]/l, a[2]/l] : [0,0,0];
}
