/* jshint esversion:11 */
import { terser } from "rollup-plugin-terser";
import strip from '@rollup/plugin-strip';
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default [
	{	
		input: "src/aframe-instance-outline.js",
		external: ['three'],
		output: {
			format: "iife",
			sourcemap: true,
			file: 'build/aframe-instance-outline.js',
			globals: {
				three: 'THREE'
			}
		},
		plugins: [
			resolve(),
			commonjs({
				include: ["node_modules/**"],
			}),
			// strip({labels: ['documentation']}),
			// replace({ varType: 'const', replacementLookup: globals })
		]
	},
	{
		input: "src/aframe-instance-outline.js",
		external: ['three'],
		output: {
			format: "iife",
			sourcemap: true,
			file: 'build/aframe-instance-outline.min.js',
			globals: {
				three: 'THREE'
			}
		},
		plugins: [
			resolve(),
			commonjs({
				include: ["node_modules/**"],
			}),
			// replace({ varType: 'const', replacementLookup: globals }),
			strip({labels: ['documentation']}),
			terser()
		]
	},
];
