/**
 * [x] vue2 的双向数据绑定基于 Object.defineProperty();
 *     创建一个 Vue 实例时，for..in 遍历 vm.data 中的所有属性，使用 Object.defineProperty() 将属性转换为 getter 和 setter
 * [x] vue3 的双向数据绑定基于 Proxy 代理对象
 *
 * 优势
 * 1. 省略 for..in 遍历
 * 2. 可以监听数组的 length 属性，数组的索引
 * 3. 可以监听新增属性操作、删除属性操作
 */

import { track, trigger } from "./effect";
// import { track, trigger } from './effect_with_class'

function isObject(target: any) {
  return target !== null && typeof target === "object";
}

export function reactive<T extends object>(target: T) {
  return new Proxy(target /** 被代理对象 */, {
    // 拦截获取属性操作
    get(target, key, receiver) {
      const ret = Reflect.get(target, key, receiver);
      track(target, key); // 跟踪依赖
      // return ret
      if (isObject(ret)) {
        return reactive(ret as object);
      }
      return ret;
    },
    // 拦截设置属性操作
    set(target, key, value, receiver) {
      const ret = Reflect.set(target, key, value, receiver);
      trigger(target, key); // 触发更新
      return ret;
    },
  });
}
