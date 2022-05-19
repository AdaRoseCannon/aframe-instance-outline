/* jshint esversion: 9, -W097 */
/* For dealing with spline curves */
/* global THREE, AFRAME, setTimeout, console */
'use strict';

import { InstancedSkinnedMesh } from './InstancedSkinnedMesh.js';

export function onBeforeCompile( shader ) {
	shader.vertexShader = shader.vertexShader.replace('void main() {', `
	#include <normal_pars_vertex>
	flat varying float instanceID;
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
	instanceID = float(gl_InstanceID);
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
	mvPosition += vec4(vNormal * 0.015 * instanceID, .0);
	gl_Position = projectionMatrix * mvPosition;
	`);

	shader.fragmentShader = shader.fragmentShader.replace('void main() {', `
	#ifdef FLAT_SHADED
	varying vec3 vNormal;
	#endif
	flat varying float instanceID;
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
		#include <normal_fragment_begin>
		vec4 posInView = modelViewMatrix * vec4(vWorldPosition, 1.0);
		posInView /= posInView[3];
		vec3 VinView = normalize(-posInView.xyz);
		if (instanceID == 1. && dot(VinView, vNormal) > .3) discard;
`);
		
	shader.fragmentShader = shader.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
	vec4 diffuseColor = vec4(mix(vec3(0.), vec3(1.), instanceID), opacity);
	`);

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
				side: THREE.DoubleSide,
				transparent: false,
				blending: THREE.AdditiveBlending
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
