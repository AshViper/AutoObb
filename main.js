import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js'
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/controls/TransformControls.js'
import { loadGeoJson } from './geoLoader.js'

let scene = new THREE.Scene()
let cam = new THREE.PerspectiveCamera(60,1,0.1,1000)
cam.position.set(10,8,10)

let renderer = new THREE.WebGLRenderer({antialias:true})
document.getElementById("view").appendChild(renderer.domElement)

let orbit = new OrbitControls(cam, renderer.domElement)
let transform = new TransformControls(cam, renderer.domElement)
scene.add(transform)

let model, obbs = []
let selected = null

scene.add(new THREE.GridHelper(50,50))
scene.add(new THREE.AmbientLight(0xffffff,1))

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
  if(model) scene.remove(model)
  const geo = await loadGeoJson(e.target.files[0])
  model = new THREE.Mesh(geo, new THREE.MeshNormalMaterial({wireframe:true}))
  scene.add(model)
}

document.getElementById("gen").onclick = ()=>{
  clearOBB()
  const n = document.getElementById("count").value
  const box = new THREE.Box3().setFromObject(model)
  for(let i=0;i<n;i++){
    const size = box.getSize(new THREE.Vector3()).multiplyScalar(1/n)
    const center = box.getCenter(new THREE.Vector3())
    center.x += (i - n/2) * size.x
    createOBB(size,center)
  }
  updateJSON()
}

document.getElementById("add").onclick = ()=>createOBB(new THREE.Vector3(1,1,1), new THREE.Vector3())
document.getElementById("del").onclick = ()=>{
  if(!selected) return
  scene.remove(selected)
  obbs = obbs.filter(o=>o!==selected)
  selected=null
  updateJSON()
}

function createOBB(size,center){
  const box = new THREE.BoxGeometry(size.x,size.y,size.z)
  const mesh = new THREE.LineSegments(
    new THREE.WireframeGeometry(box),
    new THREE.LineBasicMaterial({color:0x00ff00})
  )
  mesh.position.copy(center)
  scene.add(mesh)
  obbs.push(mesh)
}

renderer.domElement.addEventListener('pointerdown', e=>{
  const ray = new THREE.Raycaster()
  const mouse = new THREE.Vector2(
    (e.clientX/renderer.domElement.clientWidth)*2-1,
    -(e.clientY/window.innerHeight)*2+1
  )
  ray.setFromCamera(mouse,cam)
  const hit = ray.intersectObjects(obbs)
  if(hit.length){
    select(hit[0].object)
  }
})

function select(obj){
  if(selected) selected.material.color.set(0x00ff00)
  selected = obj
  obj.material.color.set(0xffff00)
  transform.attach(obj)
}

transform.addEventListener("objectChange", updateJSON)

function clearOBB(){
  obbs.forEach(o=>scene.remove(o))
  obbs=[]
}

function updateJSON(){
  const data = {
    OBB: obbs.map(o=>{
      const s = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3())
      return {
        Size:[s.x,s.y,s.z],
        Position:[o.position.x,o.position.y,o.position.z]
      }
    })
  }
  document.getElementById("json").value = JSON.stringify(data,null,2)
}

function loop(){
  requestAnimationFrame(loop)
  orbit.update()
  renderer.render(scene,cam)
}
loop()
