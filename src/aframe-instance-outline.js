/* jshint esversion: 9, -W097 */
/* For dealing with spline curves */
/* global THREE, AFRAME, setTimeout, console */
'use strict';

import { InstancedSkinnedMesh } from './InstancedSkinnedMesh.js';

function onBeforeCompile( shader ) {
    // const material = this;
	console.log(shader);

	shader.vertexShader = shader.vertexShader.replace('void main() {', `
	flat varying int instanceID;
	#ifdef USE_ENVMAP
		#ifndef ENV_WORLDPOS
			varying vec3 vWorldPosition;
		#endif
	#else
		varying vec3 vWorldPosition;
	#endif
	void main() {
	`);

	shader.vertexShader = shader.vertexShader
	.replace('#include <project_vertex>',`
	vec4 mvPosition = vec4( transformed, 1.0 );
	#ifdef USE_INSTANCING
		mvPosition = instanceMatrix * mvPosition;
	#endif
	mvPosition = modelViewMatrix * mvPosition;
	mvPosition += vec4(vNormal * 0.015 * (1.0 - float(gl_InstanceID)), .0);
	gl_Position = projectionMatrix * mvPosition;
    instanceID = gl_InstanceID;
	`);

	shader.fragmentShader = shader.fragmentShader.replace('void main() {', `
	flat varying int instanceID;
	uniform mat4 modelViewMatrix;
	#ifdef USE_ENVMAP
		#ifndef ENV_WORLDPOS
			varying vec3 vWorldPosition;
		#endif
	#else
		varying vec3 vWorldPosition;
	#endif
	#ifndef OBJECTSPACE_NORMALMAP
	uniform mat3 normalMatrix;
	#endif
	void main() {
	`);
	shader.fragmentShader = shader.fragmentShader.replace('}', `
	vec4 posInView = modelViewMatrix * vec4(vWorldPosition, 1.0);
	posInView /= posInView[3];
	vec3 VinView = normalize(-posInView.xyz);
	gl_FragColor.rgb = vec3(1.,1.,1.);
	gl_FragColor.a = float(instanceID);
}`);
}

const tempMatrix = new THREE.Matrix4().makeScale(1,1,1);
export function makeOutline(object) {
	const after = [];
	object.traverse(o => {
		if (
			(o instanceof THREE.Mesh) &&
			!(o instanceof THREE.InstancedMesh || o instanceof InstancedSkinnedMesh)
		) {
			const newMesh = o instanceof THREE.SkinnedMesh ?
				new InstancedSkinnedMesh(o.geometry, o.material, 2):
				new THREE.InstancedMesh(o.geometry, o.material, 2);

			o.material.onBeforeCompile = onBeforeCompile;
			o.material.transparent = true;
			o.material.side = THREE.DoubleSide;

			o.updateMatrixWorld();
			newMesh.setMatrixAt(0, tempMatrix);
			newMesh.setMatrixAt(1, tempMatrix);

			const array = o.parent.children;
			const index = array.indexOf(o);

			newMesh.children = o.children;
			newMesh.parent = o.parent;

			after.push(() => array[index] = newMesh);
		}
	});
	for (const fn of after) fn();
}

AFRAME.registerComponent('outline', {
	schema: {},
	init() {
		this.onLoad = () => makeOutline(this.el.object3D);
		this.el.addEventListener('object3dset', this.onLoad);
		this.onLoad();
	}
});
