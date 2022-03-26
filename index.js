//import * as THREE from 'three';
import {OrbitControls} from '/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'https://threejs.org/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from '/examples/jsm/utils/SkeletonUtils.js';

const manager = new THREE.LoadingManager();
manager.onLoad = init;

const progressbarElem = document.querySelector('#progressbar');
manager.onProgress = (url, itemsLoaded, itemsTotal) => {
  progressbarElem.style.width = `${itemsLoaded / itemsTotal * 100 | 0}%`;
};

const models = {
  //pig:    { url: 'resources/models/Pig.gltf' },
  //cow:    { url: 'resources/models/Cow.gltf' },
  llama:  { url: 'resources/models/Llama.gltf' },
  //pug:    { url: 'resources/models/Pug.gltf' },
  //sheep:  { url: 'resources/models/Sheep.gltf' },
  //zebra:  { url: 'resources/models/Zebra.gltf' },
  //horse:  { url: 'resources/models/Horse.gltf' },
  //knight: { url: 'resources/models/KnightCharacter.gltf' },
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
    const animsByName = {};
    model.gltf.animations.forEach((clip) => {
      animsByName[clip.name] = clip;
    });
    model.animations = animsByName;
  });
}

function init() {
    // hide the loading bar
    const loadingElem = document.querySelector('#loading');
    loadingElem.style.display = 'none';

    prepModelsAndAnimations();

    
    // Object.values(models).forEach((model, ndx) => {
    //   const clonedScene = SkeletonUtils.clone(model.gltf.scene);
    //   const root = new THREE.Object3D();
    //   root.add(clonedScene);
    //   scene.add(root);
    //   root.position.x = (ndx - 3) * 3;
    // });
}