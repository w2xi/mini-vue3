
# mini-vue3

## 已实现

- 响应式系统
    - [x] effect 副作用函数
    - [x] reactive
    - [x] ref
    - [x] 自动脱 ref
    - [x] computed
    - [x] watch
- 模板编译器
    - [x] 解析模板器 parser
    - [x] 转换器 transform
    - [x] 代码生成 codegen
    - [x] 编译 compile
- 挂载
- 更新 (简单的 patch diff)

## Counter 计数器 demo

```html
 <div id="app">
     <div class="demo">
        <button @click="minus">-1</button>
        <span class="count">{{ count }}</span>
        <button @click="plus">+1</button>
    </div>
</div>
<script src="./dist/mini-vue.umd.js"></script>
<script>
const { createApp, ref } = MiniVue
const count = ref(0)

createApp({
    setup() {
    const plus = () => {
        count.value++
    }
    const minus = () => {
        count.value--
    }
    return {
        count,
        plus,
        minus
    }
    }
}).mount('#app')
</script>
```

## Todo

- [ ] 完善响应式系统
- [ ] 指令 (v-if, v-for, v-model, v-on ...)
- [ ] 自定义组件
- [ ] 生命周期钩子
- [ ] patch diff
- [ ] 编译优化

## 目录结构

```
├──📄.gitignore
├──📁dist     // 打包后的文件
├──📁examples // 示例代码
├──📄package-lock.json
├──📄package.json
├──📄README.md
├──📄rollup.config.js
└──📁src
|   ├──📁compiler
|   |   ├──📄ast.js
|   |   ├──📄codegen.js
|   |   ├──📄compile.js
|   |   ├──📄index.js
|   |   ├──📄parse.js
|   |   ├──📄README.md
|   |   ├──📄runtimeHelpers.js
|   |   ├──📄transform.js
|   |   ├──📁transforms
|   |   |   ├──📄transformElement.js
|   |   |   ├──📄transformExpression.js
|   |   |   └──📄transformText.js
|   |   ├──📄util.js
|   |   └──📄vnode.js
|   ├──📄index.js
|   ├──📁reactivity
|   |   ├──📄computed.js
|   |   ├──📄effect.js
|   |   ├──📄index.js
|   |   ├──📄reactive.js
|   |   ├──📄ref.js
|   |   └──📄watch.js
|   ├──📁runtime
|   |   ├──📄createApp.js
|   |   ├──📄h.js
|   |   ├──📄index.js
|   |   └──📄patch.js
|   └──📁utils
|   |   ├──📄index.js
|   |   └──📄toDisplayString.js
```