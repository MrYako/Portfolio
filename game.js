import * as THREE from '/build/three.module.js';
import {InputManager} from '/InputManager.js';
import {GLTFLoader} from '/tree/main/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from '/tree/main/examples/jsm/utils/SkeletonUtils.js';

function main() {
  const canvas = document.querySelector('#c');
  const renderer = new THREE.WebGLRenderer({canvas});
  renderer.outputEncoding = THREE.sRGBEncoding;



  const scene = new THREE.Scene();
  scene.background = new THREE.Color('white');

  function addLight(...pos) {
    const color = 0xFFFFFF;
    const intensity = 0.8;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(...pos);
    scene.add(light);
    scene.add(light.target);
  }
  addLight(5, 5, 2);
  addLight(-5, 5, 5);

 //plane 
 const planeSize = 800;
 
 const loader = new THREE.TextureLoader();
 const texture = loader.load('textures/Back.png');
 texture.wrapS = THREE.RepeatWrapping;
 texture.wrapT = THREE.RepeatWrapping;
 texture.magFilter = THREE.NearestFilter;
 const repeats = planeSize / 800;
 texture.repeat.set(repeats, repeats);

 const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
 const planeMat = new THREE.MeshPhongMaterial({
 map: texture,
 side: THREE.DoubleSide,
 });
 const mesh = new THREE.Mesh(planeGeo, planeMat);
 mesh.rotation.x = Math.PI * -.5;
 //mesh.position.y = -10;
 scene.add(mesh);


  const manager = new THREE.LoadingManager();
  manager.onLoad = init;

  const progressbarElem = document.querySelector('#progressbar');
  manager.onProgress = (url, itemsLoaded, itemsTotal) => {
    progressbarElem.style.width = `${itemsLoaded / itemsTotal * 100 | 0}%`;
  };

  const models = {
    pig:    { url: 'resources/models/animals/Pig.gltf' },
    cow:    { url: 'resources/models/animals/Cow.gltf' },
    llama:  { url: 'resources/models/animals/Llama.gltf' },
    //pug:    { url: 'resources/models/animals/Pug.gltf' },
    //sheep:  { url: 'resources/models/animals/Sheep.gltf' },
    zebra:  { url: 'resources/models/animals/Zebra.gltf' },
    horse:  { url: 'resources/models/animals/Horse.gltf' },
    knight: { url: 'resources/models/knight/KnightCharacter.gltf' },
  };

  {
    const gltfLoader = new GLTFLoader(manager);
    for (const model of Object.values(models)) {
      gltfLoader.load(model.url, (gltf) => {
        model.gltf = gltf;
      });
    }
  }
  
  function prepModelsAndAnimations() {
    Object.values(models).forEach(model => {
      console.log('------->:', model.url);
      const animsByName = {};
      model.gltf.animations.forEach((clip) => {
        animsByName[clip.name] = clip;
        console.log('  ', clip.name);
      });
      model.animations = animsByName;
    });
  }

  
function removeArrayElement(array, element) {
  const ndx = array.indexOf(element);
  if (ndx >= 0) {
    array.splice(ndx, 1);
  }
}

class GameObject {
  constructor(parent, name) {
    this.name = name;
    this.components = [];
    this.transform = new THREE.Object3D();
    parent.add(this.transform);
  }
  addComponent(ComponentType, ...args) {
    const component = new ComponentType(this, ...args);
    this.components.push(component);
    return component;
  }
  removeComponent(component) {
    removeArrayElement(this.components, component);
  }
  getComponent(ComponentType) {
    return this.components.find(c => c instanceof ComponentType);
  }
  update() {
    for (const component of this.components) {
      component.update();
    }
  }
}

class Component {
  constructor(gameObject) {
    this.gameObject = gameObject;
  }
  update() {
  }
}

class SafeArray {
  constructor() {
    this.array = [];
    this.addQueue = [];
    this.removeQueue = new Set();
  }
  get isEmpty() {
    return this.addQueue.length + this.array.length > 0;
  }
  add(element) {
    this.addQueue.push(element);
  }
  remove(element) {
    this.removeQueue.add(element);
  }
  forEach(fn) {
    this._addQueued();
    this._removeQueued();
    for (const element of this.array) {
      if (this.removeQueue.has(element)) {
        continue;
      }
      fn(element);
    }
    this._removeQueued();
  }
  _addQueued() {
    if (this.addQueue.length) {
      this.array.splice(this.array.length, 0, ...this.addQueue);
      this.addQueue = [];
    }
  }
  _removeQueued() {
    if (this.removeQueue.size) {
      this.array = this.array.filter(element => !this.removeQueue.has(element));
      this.removeQueue.clear();
    }
  }
}

class GameObjectManager {
  constructor() {
    this.gameObjects = new SafeArray();
  }
  createGameObject(parent, name) {
    const gameObject = new GameObject(parent, name);
    this.gameObjects.add(gameObject);
    return gameObject;
  }
  removeGameObject(gameObject) {
    this.gameObjects.remove(gameObject);
  }
  update() {
    this.gameObjects.forEach(gameObject => gameObject.update());
  }
}

const kForward = new THREE.Vector3(0, 0, 1);
const globals = {
  time: 0,
  deltaTime: 0,
  moveSpeed: 16,
};


class SkinInstance extends Component {
  constructor(gameObject, model) {
    super(gameObject);
    this.model = model;
    this.animRoot = SkeletonUtils.clone(this.model.gltf.scene);
    this.mixer = new THREE.AnimationMixer(this.animRoot);
    gameObject.transform.add(this.animRoot);
    this.actions = {};
  }
  setAnimation(animName) {
    const clip = this.model.animations[animName];
    // turn off all current actions
    for (const action of Object.values(this.actions)) {
      action.enabled = false;
    }
    // get or create existing action for clip
    const action = this.mixer.clipAction(clip);
    action.enabled = true;
    action.reset();
    action.play();
    this.actions[animName] = action;
  }
  update() {
    this.mixer.update(globals.deltaTime);
  }
}


class Player extends Component {
  constructor(gameObject) {
    super(gameObject);
    const model = models.knight;
    this.skinInstance = gameObject.addComponent(SkinInstance, model);
    this.skinInstance.setAnimation('Idle');
    this.currentAnimation = 'Idle';
    this.turnSpeed = globals.moveSpeed / 4;
    this.offscreenTimer = 0;
    this.maxTimeOffScreen = 3;
  }

  update() {
    //console.log(this.gameObject.transform.position);
    const {deltaTime, moveSpeed, cameraInfo} = globals;
    const {transform} = this.gameObject;
    const deltaLeftRight = (inputManager.keys.left.down  ?  1 : 0) +
                  (inputManager.keys.right.down ? -1 : 0);
    const deltaUpDown = (inputManager.keys.up.down  ?  1 : 0) +
    (inputManager.keys.down.down ? -1 : 0);
    var futureAnimation = (deltaUpDown != 0 ? 'Run' : 'Idle' );
    if(futureAnimation!=this.currentAnimation)
    {
      this.skinInstance.setAnimation(futureAnimation);
      this.currentAnimation = futureAnimation;
    }


    transform.rotation.y += this.turnSpeed * deltaLeftRight * deltaTime;
    transform.translateOnAxis(kForward, moveSpeed * deltaUpDown * deltaTime);
  }
}

class Animal extends Component {
  constructor(gameObject, model) {
    super(gameObject);
    const skinInstance = gameObject.addComponent(SkinInstance, model);
    skinInstance.mixer.timeScale = globals.moveSpeed / 4;
    skinInstance.setAnimation('Idle');
  }
}


class CameraInfo extends Component {
  constructor(gameObject, target) {
    super(gameObject);


    const fov = 45;
    const aspect = 2;  // the canvas default
    const near = 0.1;
    const far = 400;

    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(30, 40, 30);
    //camera.target(0,0,0);
    //camera.rotation.set(0,-90,0);
    camera.lookAt(0,0,0);
    gameObject.transform.add(camera);
    globals.camera = camera;


    this.target = target;
  }
  update() {
    this.gameObject.transform.position.copy(this.target.transform.position);
  }
}


  const mixerInfos = [];


  const gameObjectManager = new GameObjectManager();
  const inputManager = new InputManager();

  function init() {
    // hide the loading bar
    const loadingElem = document.querySelector('#loading');
    loadingElem.style.display = 'none';
    
    prepModelsAndAnimations();
    
    // {
    //   const gameObject = gameObjectManager.createGameObject(scene, 'camera');
    //   globals.cameraInfo = gameObject.addComponent(CameraInfo);
    // }

    {
      const gameObject1 = gameObjectManager.createGameObject(scene, 'player');
      gameObject1.addComponent(Player);
      const gameObject = gameObjectManager.createGameObject(scene, 'camera');
      globals.cameraInfo = gameObject.addComponent(CameraInfo, gameObject1);
    }

    const animalModelNames = [
      'pig',
      // 'cow',
      // 'llama',
      // 'pug',
      // 'sheep',
      // 'zebra',
      // 'horse',
    ];
    animalModelNames.forEach((name, ndx) => {
      const gameObject = gameObjectManager.createGameObject(scene, name);
      gameObject.addComponent(Animal, models[name]);
      gameObject.transform.position.x = (ndx + 1) * 5;
    });
    requestAnimationFrame(render);
  }

 

  function playNextAction(mixerInfo) {
    const {actions, actionNdx} = mixerInfo;
    const nextActionNdx = (actionNdx + 1) % actions.length;
    mixerInfo.actionNdx = nextActionNdx;
    actions.forEach((action, ndx) => {
      const enabled = ndx === nextActionNdx;
      action.enabled = enabled;
      if (enabled) {
        action.play();
      }
    });
  }

  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  let then = 0;
  function render(now) {
    // convert to seconds
    globals.time = now * 0.001;
    // make sure delta time isn't too big.
    globals.deltaTime = Math.min(globals.time - then, 1 / 20);
    then = globals.time;
  
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      //console.log(globals);
      globals.camera.aspect = canvas.clientWidth / canvas.clientHeight;
      globals.camera.updateProjectionMatrix();
    }
  
    gameObjectManager.update();
    inputManager.update();
    renderer.render(scene, globals.camera);
    requestAnimationFrame(render);
  }
  
}
main();
