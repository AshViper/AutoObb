import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js'
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/controls/OrbitControls.js'
import { loadGeoJson } from './geoLoader.js'

let scene = new THREE.Scene()
scene.background = new THREE.Color(0x222222)

let camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000)
camera.position.set(10,10,10)

let renderer = new THREE.WebGLRenderer({antialias:true})
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

let controls = new OrbitControls(camera, renderer.domElement)

scene.add(new THREE.AmbientLight(0xffffff,1))
scene.add(new THREE.GridHelper(50,50))

let mesh = null

document.getElementById("file").onchange = async e=>{
  if(mesh) scene.remove(mesh)

  try {
    const geo = await loadGeoJson(e.target.files[0])
    geo.computeVertexNormals()

    const mat = new THREE.MeshStandardMaterial({color:0xcccccc, flatShading:false})
    mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)

    // 自動でカメラをフィット
    const box = new THREE.Box3().setFromObject(mesh)
    const size = box.getSize(new THREE.Vector3()).length()
    const center = box.getCenter(new THREE.Vector3())

    camera.position.copy(center).add(new THREE.Vector3(size, size, size))
    controls.target.copy(center)
    controls.update()

  } catch(err){
    alert(err.message)
    console.error(err)
  }
}

window.onresize = ()=>{
  camera.aspect = window.innerWidth/window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth,window.innerHeight)
}

function loop(){
  requestAnimationFrame(loop)
  controls.update()
  renderer.render(scene,camera)
}
loop()
