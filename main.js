import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js'
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/controls/OrbitControls.js'
import { loadGeoJson } from './geoLoader.js'

const view = document.getElementById("view")

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x202020)

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000)
camera.position.set(10,10,10)

const renderer = new THREE.WebGLRenderer({antialias:true})
view.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)

scene.add(new THREE.AmbientLight(0xffffff, 1))
scene.add(new THREE.GridHelper(50,50))

let mesh
let obb

function resize(){
  const w = view.clientWidth
  const h = view.clientHeight
  camera.aspect = w/h
  camera.updateProjectionMatrix()
  renderer.setSize(w,h)
}
window.addEventListener('resize', resize)
resize()

document.getElementById("file").onchange = async e=>{
  if(mesh) scene.remove(mesh)
  const geo = await loadGeoJson(e.target.files[0])
  geo.computeVertexNormals()

  const mat = new THREE.MeshStandardMaterial({color:0xcccccc, wireframe:false})
  mesh = new THREE.Mesh(geo, mat)
  scene.add(mesh)

  camera.position.set(10,10,10)
  controls.target.set(0,0,0)
  controls.update()
}

document.getElementById("gen").onclick = ()=>{
  if(!mesh) return
  if(obb) scene.remove(obb)

  const box = new THREE.Box3().setFromObject(mesh)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())

  const geo = new THREE.BoxGeometry(size.x,size.y,size.z)
  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(geo),
    new THREE.LineBasicMaterial({color:0x00ff00})
  )
  wire.position.copy(center)
  scene.add(wire)
  obb = wire

  const out = {
    OBB:[{
      Size:[size.x,size.y,size.z],
      Position:[center.x,center.y,center.z]
    }]
  }
  document.getElementById("json").value = JSON.stringify(out,null,2)
}

function loop(){
  requestAnimationFrame(loop)
  controls.update()
  renderer.render(scene,camera)
}
loop()
