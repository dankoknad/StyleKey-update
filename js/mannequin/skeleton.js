// load skeleton information from a file
// @gender: {String}
// @node {THREE.Object3D} parent node of theskeleton
var loadSkeleton = function( gender ) {
  var fileName = "data/" + gender + "Bones.json";
  $.getJSON( fileName, function( hierarchyRoot ) {
    skeletonData = $.extend({}, hierarchyRoot );
    // Get bone lengths
    computeBoneLength( hierarchyRoot );
  })
  .success( function() {
    refSkel = createSkeleton(skeletonData);
    refSkel.updateMatrix();
    refSkel.updateMatrixWorld();
    loadingPromise.skeletonDone();
  })
  .fail(function(){
    console.log("Error can\'t read ", fileName);
  });
};

// Keep track of bone lengths in one array indexed by the bone name.
var computeBoneLength = function ( node ) {
  var boneLength;

  if (node.root) {
    stretcherTranslation[node.name] = new THREE.Matrix4();
  }
  if (node.stretcher === "true") {
    boneLength = node.stretcherData.boneData.boneLength;
    stretcherTranslation[node.name] = new THREE.Matrix4();
  }
  else {
    var endPointPosition = new THREE.Vector3(node.translation.x, node.translation.y, node.translation.z);
    var boneLength = endPointPosition.length();
  }

  boneLengthArray[node.name] = { length: boneLength, defaultLength: boneLength };
  node.children.forEach( function( child ) {
    computeBoneLength( child );
  });
};

// Create the skeleton for rendering.
// @node {Object} Node from the JSON object generated by loadSkeleton
// @parent: {THREE.Object3D} parent node of current skeleton node
// @returns: hierarchical custom skeleton
var createSkeleton = function( node ) {
  if (!node) return;
  if ($.isEmptyObject(node)) return;

  var thisBone = new THREE.Object3D();

  var rot = node.rotation;
  var tr = node.translation;

  var conv = Math.PI/180;   // convert to radians

  // ZYX order
  thisBone.rotateOnAxis( new THREE.Vector3(0,0,1), rot.z * conv);
  thisBone.rotateOnAxis( new THREE.Vector3(0,1,0), rot.y * conv);
  thisBone.rotateOnAxis( new THREE.Vector3(1,0,0), rot.x * conv);

  thisBone.name = node.name;

  var isStretcher = (node.stretcher === "true");

  thisBone.userData = {
    'bone': (node.bone === "true"),
    'length': 0,
    'stretcher': isStretcher,
    'stretcherData': node.stretcherData,
  };

  var boneLength = boneLengthArray[node.name].length;

  if (node.root) {
    // Just translate to its position
    thisBone.translateX( skeletonTranslation.x + tr.x );
    thisBone.translateY( skeletonTranslation.y + tr.y );
    thisBone.translateZ( skeletonTranslation.z + tr.z );
    thisBone.userData.stretcher = true;
    thisBone.userData.isRoot = true;
  }
  else if ( isStretcher ) {
    // Clara.io bones have their own local axis. We need to match it with the Y local axis
    // of all bones used in StyleKey
    var dir = thisBone.userData.stretcherData.boneData.boneDirection;
    var boneDir = new THREE.Vector3(dir.x, dir.y, dir.z);
    var axis = new THREE.Vector3().crossVectors( new THREE.Vector3(0,1,0), boneDir );

    thisBone.rotateOnAxis( axis.clone().normalize(), Math.asin( axis.length() / boneDir.length() ) );
    thisBone.userData.length = boneLength;

    thisBone.translateX( tr.x );
    thisBone.translateY( tr.y );
    thisBone.translateZ( tr.z );
  }
  else {
    thisBone.translateY(boneLength);
    thisBone.userData.length = boneLength;
  }
  // Add all children
  node.children.forEach( function( child ) {
    thisBone.add(createSkeleton(child));
  });

  return thisBone;
};

//--------------------------------------------------
// Skeleton display functions
// @bone {THREE.Object3D} bone joint to display
var displayBone = function( bone ) {
  var length = bone.userData.length || 0;
  if (length > 0) {

    var cylGeom = new THREE.CylinderGeometry(0.06, 0.06, length, 10, 10, false);
    var cylMat = new THREE.MeshNormalMaterial();

    var cylinder = new THREE.Mesh( cylGeom, cylMat);
    cylinder.translateY(-0.5*length);
    bone.add( cylinder );
  }
  bone.add(new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), new THREE.MeshNormalMaterial()));
};

// @node {THREE.Object3D} root node of the skeleton
var displaySkeleton = function( node ) {

  if ( node.userData ) {
    if (node.userData.stretcher) displayStretcher( node );
    else if ( node.userData.bone ) displayBone(node);
  }

  node.children.forEach( function( child ) {
    displaySkeleton( child );
  });
};

// @bone {THREE.Object3D} stretcher to display (this is a THREE.Object3D)
var displayStretcher = function( bone ) {
/*
  if ( bone.name === "Bone_Hip" ) {

    var length = bone.userData.length || 0.1;
    var topCapRadius = 5;
    var botCapRadius = 2;

    var cylGeom = new THREE.CylinderGeometry(botCapRadius, topCapRadius, length, 10, 10, false);
    var cylMat = new THREE.MeshBasicMaterial( { color: 0x4f94cd, wireframe: true } );

    var cylinder = new THREE.Mesh( cylGeom, cylMat );
    cylinder.translateY( 0.5*length );
    bone.add( cylinder );
  }
  //*/
};