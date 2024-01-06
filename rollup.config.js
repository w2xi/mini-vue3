export default {
    input: './src/index.js',
    output: [
        {
            file: './dist/mini-vue.esm.js',
            format: 'esm',
            sourcemap: true
        },
        {
            file: './dist/mini-vue.umd.js',
            format: 'umd',
            sourcemap: true,
            name: 'MiniVue',
        }
    ]
}