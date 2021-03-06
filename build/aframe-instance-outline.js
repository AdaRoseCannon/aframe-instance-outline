var AFRAME_OUTLINE = (function (exports, three) {
	'use strict';

	/* jshint esversion: 9, -W097 */

	const _instanceLocalMatrix = /*@__PURE__*/ new three.Matrix4();
	const _instanceWorldMatrix = /*@__PURE__*/ new three.Matrix4();

	const _instanceIntersects = [];

	class InstancedSkinnedMesh extends three.SkinnedMesh {

		constructor( geometry, material, count ) {

			super( geometry, material );

			this.instanceMatrix = new three.InstancedBufferAttribute( new Float32Array( count * 16 ), 16 );
			this.instanceColor = null;

			this.count = count;

			this.frustumCulled = false;

			this._mesh = null;

		}

		copy( source ) {

			super.copy( source );

			if ( source.isInstancedMesh ) {

				this.instanceMatrix.copy( source.instanceMatrix );

				if ( source.instanceColor !== null ) this.instanceColor = source.instanceColor.clone();

				this.count = source.count;

			}

			return this;

		}

		getColorAt( index, color ) {

			color.fromArray( this.instanceColor.array, index * 3 );

		}

		getMatrixAt( index, matrix ) {

			matrix.fromArray( this.instanceMatrix.array, index * 16 );

		}

		raycast( raycaster, intersects ) {

			const matrixWorld = this.matrixWorld;
			const raycastTimes = this.count;

			if ( this._mesh === null ) {

				this._mesh = new three.SkinnedMesh( this.geometry, this.material );
				this._mesh.copy( this );

			}

			const _mesh = this._mesh;

			if ( _mesh.material === undefined ) return;

			for ( let instanceId = 0; instanceId < raycastTimes; instanceId ++ ) {

				// calculate the world matrix for each instance

				this.getMatrixAt( instanceId, _instanceLocalMatrix );

				_instanceWorldMatrix.multiplyMatrices( matrixWorld, _instanceLocalMatrix );

				// the mesh represents this single instance

				_mesh.matrixWorld = _instanceWorldMatrix;

				_mesh.raycast( raycaster, _instanceIntersects );

				// process the result of raycast

				for ( let i = 0, l = _instanceIntersects.length; i < l; i ++ ) {

					const intersect = _instanceIntersects[ i ];
					intersect.instanceId = instanceId;
					intersect.object = this;
					intersects.push( intersect );

				}

				_instanceIntersects.length = 0;

			}

		}

		setColorAt( index, color ) {

			if ( this.instanceColor === null ) {

				this.instanceColor = new three.InstancedBufferAttribute( new Float32Array( this.instanceMatrix.count * 3 ), 3 );

			}

			color.toArray( this.instanceColor.array, index * 3 );

		}

		setMatrixAt( index, matrix ) {

			matrix.toArray( this.instanceMatrix.array, index * 16 );

		}

		updateMorphTargets() {

		}

		dispose() {

			this.dispatchEvent( { type: 'dispose' } );

		}

	}

	InstancedSkinnedMesh.prototype.isInstancedMesh = true;

	/* jshint esversion: 9, -W097 */

	function onBeforeCompile( shader ) {
		shader.vertexShader = shader.vertexShader.replace('void main() {', `
	#include <normal_pars_vertex>
	flat varying float instanceID;
	#ifdef FLAT_SHADED
		varying vec3 vNormal;
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
	flat varying float instanceID;
	void main() {
		if (instanceID == 1. && gl_FrontFacing) discard;
	`);
			
		shader.fragmentShader = shader.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
		vec4 diffuseColor = vec4(mix(vec3(0.), vec3(1.), instanceID), opacity);
	`);

	}

	const mat = new THREE.MeshBasicMaterial({
		onBeforeCompile: onBeforeCompile,
		side: THREE.DoubleSide,
		transparent: false,
		blending: THREE.AdditiveBlending
	});

	const tempMatrix = new THREE.Matrix4().makeScale(1,1,1);
	function makeOutline(object) {
		const after = [];
		object.traverse(o => {
			if (
				(o instanceof THREE.Mesh) &&
				!(o instanceof THREE.InstancedMesh || o instanceof InstancedSkinnedMesh)
			) {

				after.push(() => {
					const newMesh = o instanceof THREE.SkinnedMesh ?
						new InstancedSkinnedMesh(o.geometry, mat, 2):
						new THREE.InstancedMesh(o.geometry, mat, 2);
					
					tempMatrix.compose(o.position, o.quaternion, o.scale);
					newMesh.setMatrixAt(0, tempMatrix);
					newMesh.setMatrixAt(1, tempMatrix);

					const children = o.parent.children;
					const index = children.indexOf(o);

					newMesh.children = o.children;
					newMesh.parent = o.parent;
					children[index] = newMesh;
					
				});
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

	exports.makeOutline = makeOutline;
	exports.onBeforeCompile = onBeforeCompile;

	Object.defineProperty(exports, '__esModule', { value: true });

	return exports;

})({}, THREE);
//# sourceMappingURL=aframe-instance-outline.js.map
