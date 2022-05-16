(function (exports, three) {
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
	function makeOutline(object) {
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

	exports.makeOutline = makeOutline;

	Object.defineProperty(exports, '__esModule', { value: true });

	return exports;

})({}, THREE);
//# sourceMappingURL=aframe-instance-outline.js.map
