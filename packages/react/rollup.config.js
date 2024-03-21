import nodeResolve from "@rollup/plugin-node-resolve"
import dts from "rollup-plugin-dts";

export default [{
    input: 'lib/esm/index.js',
    external: ['api-fetch-client', 'eventsource'],
    output: {
        sourcemap: true,
        format: 'esm',
        file: 'lib/index.mjs',
    }, plugins: [
        nodeResolve()
    ]
},
{
    input: 'lib/esm/index.js',
    external: ['api-fetch-client', 'eventsource'],
    output: {
        sourcemap: true,
        format: 'cjs',
        file: 'lib/index.cjs',
    }, plugins: [
        nodeResolve()
    ]
}, {
    input: 'lib/esm/index.d.ts',
    external: [
        'api-fetch-client',
        'eventsource'
    ],
    output: {
        sourcemap: true,
        file: 'lib/index.d.ts',
        format: 'esm'
    },
    plugins: [dts({
        respectExternal: true
    })]
},
{
    input: 'lib/esm/index.js',
    external: ['eventsource'],
    output: {
        name: "ComposableAI",
        file: 'lib/composable-ai.js',
        format: 'iife',
        globals: {
            EventSource: "EventSource"
        }
    },
    plugins: [
        nodeResolve()
    ]
}]
