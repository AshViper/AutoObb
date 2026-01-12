import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js'
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/controls/OrbitControls.js'
import { loadGeoJson } from './geoLoader.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x222222)

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  10000
)
camera.position.set(10, 10, 10)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

scene.add(new THREE.AmbientLight(0xffffff, 1))
scene.add(new THREE.GridHelper(100, 100))

let mesh = null

document.getElementById("file").addEventListener("change", async (e) => {
  if (mesh) {
    scene.remove(mesh)
    mesh.geometry.dispose()
    mesh.material.dispose()
  }

  try {
    const geo = await loadGeoJson(e.target.files[0])
    geo.computeVertexNormals()

    const mat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.8,
      metalness: 0.1
    })

    mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)

    // カメラをモデルにフィット
    const box = new THREE.Box3().setFromObject(mesh)
    const size = box.getSize(new THREE.Vector3()).length()
    const center = box.getCenter(new THREE.Vector3())

    camera.near = size / 100
    camera.far = size * 100
    camera.updateProjectionMatrix()

    camera.position.copy(center).add(new THREE.Vector3(size, size, size))
    controls.target.copy(center)
    controls.update()

    console.log("Loaded geometry vertices:", geo.attributes.position.count)

  } catch (err) {
    alert("Load failed: " + err.message)
    console.error(err)
  }
})

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}
animate()
