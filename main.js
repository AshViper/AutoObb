import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js'
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/controls/TransformControls.js'
import { loadGeoJson } from './geoLoader.js'
import numeric from 'https://cdn.jsdelivr.net/npm/numeric@1.2.6/numeric.min.js'

let scene = new THREE.Scene()
let cam = new THREE.PerspectiveCamera(60,1,0.1,1000)
cam.position.set(10,8,10)

let renderer = new THREE.WebGLRenderer({antialias:true})
document.getElementById("view").appendChild(renderer.domElement)

let orbit = new OrbitControls(cam, renderer.domElement)
let transform = new TransformControls(cam, renderer.domElement)
scene.add(transform)

scene.add(new THREE.GridHelper(50,50))
scene.add(new THREE.AmbientLight(0xffffff,1))

let model, points=[], obbs=[], selected=null

function resize(){
  const w = document.getElementById("view").clientWidth
  const h = window.innerHeight
  cam.aspect=w/h
  cam.updateProjectionMatrix()
  renderer.setSize(w,h)
}
window.onresize=resize
resize()

document.getElementById("file").onchange = async e=>{
  const geo = await loadGeoJson(e.target.files[0])
  model = new THREE.Mesh(geo, new THREE.MeshNormalMaterial({wireframe:true}))
  scene.add(model)

  const pos = geo.attributes.position.array
  points=[]
  for(let i=0;i<pos.length;i+=3)
    points.push([pos[i],pos[i+1],pos[i+2]])
}

document.getElementById("gen").onclick = ()=>{
  clearOBB()
  const k = document.getElementById("count").value
  const clusters = kmeans(points,k)
  clusters.forEach(c=>{
    if(c.length>10) createOBBFromPoints(c)
  })
  updateJSON()
}

function kmeans(pts,k,it=15){
  let centers = pts.slice(0,k)
  for(let t=0;t<it;t++){
    let groups = Array.from({length:k},()=>[])
    for(let p of pts){
      let bi=0,bd=1e9
      for(let i=0;i<k;i++){
        let d = dist(p,centers[i])
        if(d<bd){bd=d;bi=i}
      }
      groups[bi].push(p)
    }
    for(let i=0;i<k;i++){
      if(groups[i].length)
        centers[i]=avg(groups[i])
    }
  }
  return groups
}

function PCA(pts){
  let m = avg(pts)
  let C = [[0,0,0],[0,0,0],[0,0,0]]
  for(let p of pts){
    let q=[p[0]-m[0],p[1]-m[1],p[2]-m[2]]
    for(let i=0;i<3;i++)
      for(let j=0;j<3;j++)
        C[i][j]+=q[i]*q[j]
  }
  let eig = numeric.eig(C).E.x
  return eig
}

function createOBBFromPoints(pts){
  const axes = PCA(pts)
  const c = avg(pts)
  let min=[1e9,1e9,1e9], max=[-1e9,-1e9,-1e9]

  for(let p of pts){
    let q=[p[0]-c[0],p[1]-c[1],p[2]-c[2]]
    for(let i=0;i<3;i++){
      let d = q[0]*axes[0][i]+q[1]*axes[1][i]+q[2]*axes[2][i]
      min[i]=Math.min(min[i],d)
      max[i]=Math.max(max[i],d)
    }
  }

  const size = new THREE.Vector3(max[0]-min[0],max[1]-min[1],max[2]-min[2])
  const center = new THREE.Vector3(
    c[0]+axes[0][0]*(min[0]+max[0])/2,
    c[1]+axes[1][1]*(min[1]+max[1])/2,
    c[2]+axes[2][2]*(min[2]+max[2])/2
  )

  const box = new THREE.BoxGeometry(size.x,size.y,size.z)
  const mesh = new THREE.LineSegments(
    new THREE.WireframeGeometry(box),
    new THREE.LineBasicMaterial({color:0x00ff00})
  )
  mesh.position.copy(center)
  scene.add(mesh)
  obbs.push(mesh)
}

function updateJSON(){
  const out = {
    OBB: obbs.map(o=>{
      const s = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3())
      return { Size:[s.x,s.y,s.z], Position:[o.position.x,o.position.y,o.position.z] }
    })
  }
  document.getElementById("json").value = JSON.stringify(out,null,2)
}

function avg(a){ return a.reduce((s,p)=>[s[0]+p[0],s[1]+p[1],s[2]+p[2]],[0,0,0]).map(v=>v/a.length)}
function dist(a,b){ return Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])}
function clearOBB(){ obbs.forEach(o=>scene.remove(o)); obbs=[] }

function loop(){
  requestAnimationFrame(loop)
  orbit.update()
  renderer.render(scene,cam)
}
loop()
