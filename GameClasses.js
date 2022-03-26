import * as THREE from 'three';
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
      this.skinInstance.setAnimation('Run');
      this.turnSpeed = globals.moveSpeed / 4;
      this.offscreenTimer = 0;
      this.maxTimeOffScreen = 3;
    }
  
    update() {
      const {deltaTime, moveSpeed, cameraInfo} = globals;
      const {transform} = this.gameObject;
      const delta = (inputManager.keys.left.down  ?  1 : 0) +
                    (inputManager.keys.right.down ? -1 : 0);
      transform.rotation.y += this.turnSpeed * delta * deltaTime;
      transform.translateOnAxis(kForward, moveSpeed * deltaTime);
  
      const {frustum} = cameraInfo;
      if (frustum.containsPoint(transform.position)) {
        this.offscreenTimer = 0;
      } else {
        this.offscreenTimer += deltaTime;
        if (this.offscreenTimer >= this.maxTimeOffScreen) {
          transform.position.set(0, 0, 0);
        }
      }
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
    constructor(gameObject) {
      super(gameObject);
      this.projScreenMatrix = new THREE.Matrix4();
      this.frustum = new THREE.Frustum();
    }
    update() {
      const {camera} = globals;
      this.projScreenMatrix.multiplyMatrices(
          camera.projectionMatrix,
          camera.matrixWorldInverse);
      this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
      
    }
  }
export {GameObject,Component,SafeArray,GameObjectManager,SkinInstance,Player,Animal,CameraInfo};  