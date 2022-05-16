/* jshint esversion: 9, -W097 */
/* For dealing with spline curves */
/* global THREE, AFRAME, setTimeout, console */
'use strict';

import { InstancedSkinnedMesh } from './InstancedSkinnedMesh.js';

function onBeforeCompile( shader ) {
    // const material = this;
	console.log(shader);

	shader.vertexShader = shader.vertexShader.replace('void main() {', `
	#include <normal_pars_vertex>
	flat varying int instanceID;
	#ifdef FLAT_SHADED
		varying vec3 vNormal;
	#endif
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
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#ifdef FLAT_SHADED
		vNormal = normalize( transformedNormal );
	#endif
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
	#ifdef FLAT_SHADED
		varying vec3 vNormal;
	#endif
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
			const mat = new THREE.MeshBasicMaterial({
				color: o.material.color,
				onBeforeCompile: onBeforeCompile,
				transparent: true,
				side: THREE.DoubleSide
			});
			const newMesh = o instanceof THREE.SkinnedMesh ?
				new InstancedSkinnedMesh(o.geometry, mat, 2):
				new THREE.InstancedMesh(o.geometry, mat, 2);

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
