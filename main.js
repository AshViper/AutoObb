import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js'
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/controls/OrbitControls.js'
import { loadGeoJson } from './geoLoader.js'

let scene = new THREE.Scene()
let cam = new THREE.PerspectiveCamera(60,1,0.1,1000)
cam.position.set(10,10,10)

let renderer = new THREE.WebGLRenderer({antialias:true})
document.getElementById("view").appendChild(renderer.domElement)

let controls = new OrbitControls(cam, renderer.domElement)

let mesh, obbGroup = new THREE.Group()
scene.add(obbGroup)

function resize(){
  const w = document.getElementById("view").clientWidth
  const h = window.innerHeight
  cam.aspect=w/h
  cam.updateProjectionMatrix()
  renderer.setSize(w,h)
}
window.onresize=resize
resize()

scene.add(new THREE.GridHelper(20,20))
scene.add(new THREE.AmbientLight(0xffffff,1))

document.getElementById("file").onchange = async e=>{
  const geo = await loadGeoJson(e.target.files[0])
  const mat = new THREE.MeshNormalMaterial({wireframe:true})
  mesh = new THREE.Mesh(geo,mat)
  scene.add(mesh)
}

document.getElementById("gen").onclick = ()=>{
  if(!mesh) return
  generateOBB(mesh.geometry)
}

function generateOBB(geo){
  obbGroup.clear()

  const pos = geo.attributes.position.array
  let min = new THREE.Vector3(1e9,1e9,1e9)
  let max = new THREE.Vector3(-1e9,-1e9,-1e9)

  for(let i=0;i<pos.length;i+=3){
    min.min(new THREE.Vector3(pos[i],pos[i+1],pos[i+2]))
    max.max(new THREE.Vector3(pos[i],pos[i+1],pos[i+2]))
  }

  const size = new THREE.Vector3().subVectors(max,min)
  const center = new THREE.Vector3().addVectors(max,min).multiplyScalar(0.5)

  const box = new THREE.BoxGeometry(size.x,size.y,size.z)
  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(box),
    new THREE.LineBasicMaterial({color:0x00ff00})
  )
  wire.position.copy(center)
  obbGroup.add(wire)

  const json = {
    OBB:[{
      Size:[size.x,size.y,size.z],
      Position:[center.x,center.y,center.z]
    }]
  }
  document.getElementById("out").value = JSON.stringify(json,null,2)
}

function loop(){
  requestAnimationFrame(loop)
  controls.update()
  renderer.render(scene,cam)
}
loop()
