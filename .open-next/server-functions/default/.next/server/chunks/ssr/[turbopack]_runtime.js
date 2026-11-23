var RUNTIME_PUBLIC_PATH = "server/chunks/ssr/[turbopack]_runtime.js";
var RELATIVE_ROOT_PATH = "..";
var ASSET_PREFIX = "/_next/";
// Apply forwarded globals from workerData if running in a worker thread
if (typeof require !== 'undefined') {
    try {
        var { workerData } = require('worker_threads');
        if (workerData?.__turbopack_globals__) {
            Object.assign(globalThis, workerData.__turbopack_globals__);
            // Remove internal data so it's not visible to user code
            delete workerData.__turbopack_globals__;
        }
    } catch (_) {
        // Not in a worker thread context, ignore
    }
}
/**
 * This file contains runtime types and functions that are shared between all
 * TurboPack ECMAScript runtimes.
 *
 * It will be prepended to the runtime code of each runtime.
 */ /* eslint-disable @typescript-eslint/no-unused-vars */ /// <reference path="./runtime-types.d.ts" />
/// <reference path="./async-module.ts" />
/**
 * Describes why a module was instantiated.
 * Shared between browser and Node.js runtimes.
 */ var SourceType = /*#__PURE__*/ function(SourceType) {
    /**
   * The module was instantiated because it was included in an evaluated chunk's
   * runtime.
   * SourceData is a ChunkPath.
   */ SourceType[SourceType["Runtime"] = 0] = "Runtime";
    /**
   * The module was instantiated because a parent module imported it.
   * SourceData is a ModuleId.
   */ SourceType[SourceType["Parent"] = 1] = "Parent";
    /**
   * The module was instantiated because it was included in a chunk's hot module
   * update.
   * SourceData is an array of ModuleIds or undefined.
   */ SourceType[SourceType["Update"] = 2] = "Update";
    return SourceType;
}(SourceType || {});
/**
 * Flag indicating which module object type to create when a module is merged. Set to `true`
 * by each runtime that uses ModuleWithDirection (browser dev-base.ts, nodejs dev-base.ts,
 * nodejs build-base.ts). Browser production (build-base.ts) leaves it as `false` since it
 * uses plain Module objects.
 */ let createModuleWithDirectionFlag = false;
const REEXPORTED_OBJECTS = new WeakMap();
/**
 * Constructs the `__turbopack_context__` object for a module.
 */ function Context(module, exports) {
    this.m = module;
    // We need to store this here instead of accessing it from the module object to:
    // 1. Make it available to factories directly, since we rewrite `this` to
    //    `__turbopack_context__.e` in CJS modules.
    // 2. Support async modules which rewrite `module.exports` to a promise, so we
    //    can still access the original exports object from functions like
    //    `esmExport`
    // Ideally we could find a new approach for async modules and drop this property altogether.
    this.e = exports;
}
const contextPrototype = Context.prototype;
const hasOwnProperty = Object.prototype.hasOwnProperty;
const toStringTag = typeof Symbol !== 'undefined' && Symbol.toStringTag;
function defineProp(obj, name, options) {
    if (!hasOwnProperty.call(obj, name)) Object.defineProperty(obj, name, options);
}
function getOverwrittenModule(moduleCache, id) {
    let module = moduleCache.get(id);
    if (module === undefined) {
        if (createModuleWithDirectionFlag) {
            // set in development modes for hmr support
            module = createModuleWithDirection(id);
        } else {
            module = createModuleObject(id);
        }
        moduleCache.set(id, module);
    }
    return module;
}
/**
 * Creates the module object. Only done here to ensure all module objects have the same shape.
 */ function createModuleObject(id) {
    return {
        exports: {},
        error: undefined,
        id,
        namespaceObject: undefined
    };
}
function createModuleWithDirection(id) {
    return {
        exports: {},
        error: undefined,
        id,
        namespaceObject: undefined,
        parents: [],
        children: []
    };
}
const BindingTag_Value = 0;
/**
 * Terminates a module's group of entries in an {@link EsmReexports} list.
 */ const REEXPORT_GROUP_END = 0;
/**
 * Adds the getters to the exports object.
 */ function esm(exports, bindings, dynamic) {
    defineProp(exports, '__esModule', {
        value: true
    });
    if (toStringTag) defineProp(exports, toStringTag, {
        value: 'Module'
    });
    let i = 0;
    while(i < bindings.length){
        const propName = bindings[i++];
        const tagOrFunction = bindings[i++];
        if (typeof tagOrFunction === 'number') {
            if (tagOrFunction === BindingTag_Value) {
                defineProp(exports, propName, {
                    value: bindings[i++],
                    enumerable: true,
                    writable: false
                });
            } else {
                throw new Error(`unexpected tag: ${tagOrFunction}`);
            }
        } else {
            const getterFn = tagOrFunction;
            if (typeof bindings[i] === 'function') {
                const setterFn = bindings[i++];
                defineProp(exports, propName, {
                    get: getterFn,
                    set: setterFn,
                    enumerable: true
                });
            } else {
                defineProp(exports, propName, {
                    get: getterFn,
                    enumerable: true
                });
            }
        }
    }
    // The properties defined above are already non-configurable and
    // non-writable, so the namespace's existing exports are effectively
    // immutable. Sealing additionally makes the object non-extensible, matching
    // real ESM-namespace semantics. Modules with dynamic re-exports
    // (`export *` from a CommonJS module) must stay extensible so the dynamic
    // export proxy can surface keys discovered at runtime, so skip the seal for
    // them.
    if (!dynamic) Object.seal(exports);
}
/**
 * Makes the module an ESM with exports
 */ function esmExport(bindings, id, dynamic) {
    let module;
    let exports;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
        exports = module.exports;
    } else {
        module = this.m;
        exports = this.e;
    }
    module.namespaceObject = exports;
    esm(exports, bindings, dynamic);
}
contextPrototype.s = esmExport;
/**
 * Registers re-exports that all forward to properties of other modules.
 *
 * This is a compact spelling of the pattern
 *
 * ```js
 * var ns = context.i(moduleId)
 * context.s([exportName, () => ns[importedName], ...])
 * ```
 *
 * The list is a flat sequence of groups. Each group starts with the source the exports come from,
 * followed by that group's entries, and is terminated by the `0` sentinel (or the end of the list).
 *
 * The group head is either a **module id**, which is instantiated here:
 *
 * ```js
 * context.S([
 *   76061, 'default', 'f', 'named', 'A', 0,
 *   29842, 'otherModule', 'f',
 * ])
 * ```
 *
 * or the **namespace value** of a module that has already been imported, which is used directly:
 *
 * ```js
 * var ns1 = context.i(76061)
 * context.S([ns1, 'default', 'f', 'named', 'A'])
 * ```
 *
 * The producer picks the namespace form when it has generated the import anyway -- because some
 * later import must not be reordered past it -- so nothing is instantiated twice. The two are told
 * apart by type: a module id is always a string or number. A CommonJS function export produces a
 * callable namespace value, so namespace heads can be functions as well as objects.
 *
 * Entries are `exportName, importedName` pairs, except when a group holds exactly one string. That
 * string is then a comma-joined list of the same pairs, which saves the repeated quoting:
 *
 * ```js
 * context.S([
 *   76061, 'default,f,named,A', 0,
 *   29842, 'otherModule,f',
 * ])
 * ```
 *
 * The producer picks that spelling independently for each group whose names contain no commas,
 * since that group's names are recovered by splitting on them.
 *
 * Groups whose head is a module id are instantiated in list order, at the point where the call
 * appears, so the producer must not merge such a group across an import of another module. The
 * destination reuses a source data value or getter descriptor when one exists, falling back to a
 * wrapper getter for dynamic/proxy/inherited properties.
 *
 * `id` names the module the exports belong to when this module was merged into a scope-hoisting
 * group, exactly as it does for {@link EsmExport}.
 *
 * Only the source descriptor's payload (value or getter) is reused. {@link esm} still defines a
 * fresh enumerable, non-configurable destination property, and no source setter is ever forwarded.
 */ function esmReexport(list, id) {
    const bindings = [];
    let i = 0;
    while(i < list.length){
        const head = list[i++];
        const start = i;
        while(i < list.length && list[i] !== REEXPORT_GROUP_END)i++;
        const end = i;
        // Skip the sentinel, if this group was terminated by one rather than by the end of the list.
        i++;
        // Module ids are always strings or numbers. Other values are already-imported namespaces;
        // notably, interop with a CommonJS function export produces a callable namespace function.
        // `esmImport` may return a promise for an async module, but re-exports of async modules keep
        // going through `context.s`, so the producer never routes them here and this stays synchronous.
        const namespace = typeof head === 'string' || typeof head === 'number' ? esmImport.call(this, head) : head;
        if (end - start === 1) {
            const pairs = list[start].split(',');
            for(let j = 0; j < pairs.length; j += 2){
                appendReexportBinding(bindings, pairs[j], namespace, pairs[j + 1]);
            }
        } else {
            for(let j = start; j < end; j += 2){
                appendReexportBinding(bindings, list[j], namespace, list[j + 1]);
            }
        }
    }
    esmExport.call(this, bindings, id);
}
contextPrototype.S = esmReexport;
function appendReexportBinding(bindings, exportedName, namespace, importedName) {
    const descriptor = Reflect.getOwnPropertyDescriptor(namespace, importedName);
    if (descriptor) {
        if ('value' in descriptor) {
            // Code generation only routes immutable imported bindings through this helper, so a data
            // descriptor is a constant export and can be captured once.
            bindings.push(exportedName, BindingTag_Value, descriptor.value);
            return;
        }
        if (descriptor.get) {
            // Accessors remain live by reusing the source getter. `esmReexport` is only called by
            // generated code: every group head is either produced by
            // `this.i` or is the namespace variable from a generated `this.i` call. Every getter on such
            // a namespace is receiver-independent: ESM bindings are compiler-generated arrow functions,
            // and the CommonJS/dynamic-namespace paths create arrows in `createGetter` and
            // `getOwnPropertyDescriptor`. The destination can therefore reuse the exact function instead
            // of allocating another wrapper getter.
            bindings.push(exportedName, descriptor.get);
            return;
        }
    }
    // Dynamic/proxy/inherited CommonJS edge cases may not expose a usable own descriptor.
    bindings.push(exportedName, ()=>namespace[importedName]);
}
function ensureDynamicExports(module, exports) {
    let reexportedObjects = REEXPORTED_OBJECTS.get(module);
    if (!reexportedObjects) {
        REEXPORTED_OBJECTS.set(module, reexportedObjects = []);
        // Returns the re-exported object that provides `prop` as an own property,
        // or `undefined` if none does. The traps share this logic so they always
        // agree on which keys are synthesized from `reexportedObjects`. `default`
        // is never re-exported by `export *`, so it is never synthesized.
        const reexportOwning = (prop)=>{
            if (prop !== 'default') {
                for (const obj of reexportedObjects){
                    if (hasOwnProperty.call(obj, prop)) return obj;
                }
            }
            return undefined;
        };
        // Modules with dynamic re-exports are not sealed by `esm()`, so the
        // target beneath the namespace stays extensible. That is what lets the
        // `ownKeys` and `getOwnPropertyDescriptor` traps legally report keys that
        // exist on `reexportedObjects` but not on the target itself.
        module.exports = module.namespaceObject = new Proxy(exports, {
            get (target, prop) {
                if (hasOwnProperty.call(target, prop) || prop === 'default' || prop === '__esModule') {
                    return Reflect.get(target, prop);
                }
                const obj = reexportOwning(prop);
                return obj && Reflect.get(obj, prop);
            },
            // The namespace is read-only, like a real esm namespace object. The
            // re-exported modules can still mutate their own exports (exposed live
            // via `get`), but mutating the namespace itself is rejected. Refusing
            // here, rather than forwarding to the extensible target, also prevents an
            // assignment/definition from shadowing a dynamic re-export. It also
            // prevents delete from removing a static export.
            set () {
                return false;
            },
            defineProperty () {
                return false;
            },
            deleteProperty () {
                return false;
            },
            // The `has` trap ensures that `'exportName' in starImports` will reflect
            // the truth of whether a key is exported.
            has (target, prop) {
                if (Reflect.has(target, prop)) return true;
                if (prop === 'default' || prop === '__esModule') return false;
                return reexportOwning(prop) !== undefined;
            },
            // ownKeys and getOwnPropertyDescriptor together make the keys enumerable.
            // If a value is returned from `ownKeys` but its property descriptor is
            // not enumerable, it will not be visible to iterator methods.
            // Collectively, they allow code like the following:
            //
            // ```
            // // module.js re-exports dynamic CJS exports
            // export * from './legacyModule.cjs'
            //
            // // from another JS file, reference the re-exported dynamic values
            // import * as Namespace from './module.js'
            // Object.keys(Namespace)
            // ```
            ownKeys (target) {
                const keys = Reflect.ownKeys(target);
                for (const obj of reexportedObjects){
                    for (const key of Reflect.ownKeys(obj)){
                        if (key !== 'default' && !keys.includes(key)) keys.push(key);
                    }
                }
                return keys;
            },
            getOwnPropertyDescriptor (target, prop) {
                const own = Reflect.getOwnPropertyDescriptor(target, prop);
                if (own || prop === 'default' || prop === '__esModule') return own;
                const obj = reexportOwning(prop);
                if (obj) {
                    // Synthetic keys don't exist on the target, so they MUST be
                    // reported as configurable. However the set/delete traps above will
                    // prevent them from actually being changed
                    return {
                        enumerable: true,
                        configurable: true,
                        get: ()=>Reflect.get(obj, prop)
                    };
                }
                return undefined;
            }
        });
    }
    return reexportedObjects;
}
/**
 * Dynamically exports properties from an object
 */ function dynamicExport(object, id) {
    let module;
    let exports;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
        exports = module.exports;
    } else {
        module = this.m;
        exports = this.e;
    }
    const reexportedObjects = ensureDynamicExports(module, exports);
    if (typeof object === 'object' && object !== null) {
        reexportedObjects.push(object);
    }
}
contextPrototype.j = dynamicExport;
function exportValue(value, id) {
    let module;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
    } else {
        module = this.m;
    }
    module.exports = value;
}
contextPrototype.v = exportValue;
function exportNamespace(namespace, id) {
    let module;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
    } else {
        module = this.m;
    }
    module.exports = module.namespaceObject = namespace;
}
contextPrototype.n = exportNamespace;
function createGetter(obj, key) {
    return ()=>obj[key];
}
/**
 * @returns prototype of the object
 */ const getProto = Object.getPrototypeOf ? (obj)=>Object.getPrototypeOf(obj) : (obj)=>obj.__proto__;
/** Prototypes that are not expanded for exports */ const LEAF_PROTOTYPES = [
    null,
    getProto({}),
    getProto([]),
    getProto(getProto)
];
/**
 * @param raw
 * @param ns
 * @param allowExportDefault
 *   * `false`: will have the raw module as default export
 *   * `true`: will have the default property as default export
 */ function interopEsm(raw, ns, allowExportDefault) {
    const bindings = [];
    let defaultLocation = -1;
    for(let current = raw; (typeof current === 'object' || typeof current === 'function') && !LEAF_PROTOTYPES.includes(current); current = getProto(current)){
        for (const key of Object.getOwnPropertyNames(current)){
            bindings.push(key, createGetter(raw, key));
            if (defaultLocation === -1 && key === 'default') {
                defaultLocation = bindings.length - 1;
            }
        }
    }
    // this is not really correct
    // we should set the `default` getter if the imported module is a `.cjs file`
    if (!(allowExportDefault && defaultLocation >= 0)) {
        // Replace the binding with one for the namespace itself in order to preserve iteration order.
        if (defaultLocation >= 0) {
            // Replace the getter with the value
            bindings.splice(defaultLocation, 1, BindingTag_Value, raw);
        } else {
            bindings.push('default', BindingTag_Value, raw);
        }
    }
    esm(ns, bindings);
    return ns;
}
function createNS(raw) {
    if (typeof raw === 'function') {
        return function(...args) {
            return raw.apply(this, args);
        };
    } else {
        return Object.create(null);
    }
}
function esmImport(id) {
    const module = getOrInstantiateModuleFromParent(id, this.m);
    // any ES module has to have `module.namespaceObject` defined.
    if (module.namespaceObject) return module.namespaceObject;
    // only ESM can be an async module, so we don't need to worry about exports being a promise here.
    const raw = module.exports;
    return module.namespaceObject = interopEsm(raw, createNS(raw), raw && raw.__esModule);
}
contextPrototype.i = esmImport;
function asyncLoader(moduleId) {
    const loader = this.r(moduleId);
    return loader(esmImport.bind(this));
}
contextPrototype.A = asyncLoader;
// Add a simple runtime require so that environments without one can still pass
// `typeof require` CommonJS checks so that exports are correctly registered.
const runtimeRequire = // @ts-ignore
typeof require === 'function' ? require : function require1() {
    throw new Error('Unexpected use of runtime require');
};
contextPrototype.t = runtimeRequire;
function commonJsRequire(id) {
    return getOrInstantiateModuleFromParent(id, this.m).exports;
}
contextPrototype.r = commonJsRequire;
/**
 * Remove fragments and query parameters since they are never part of the context map keys
 *
 * This matches how we parse patterns at resolving time.  Arguably we should only do this for
 * strings passed to `import` but the resolve does it for `import` and `require` and so we do
 * here as well.
 */ function parseRequest(request) {
    // Per the URI spec fragments can contain `?` characters, so we should trim it off first
    // https://datatracker.ietf.org/doc/html/rfc3986#section-3.5
    const hashIndex = request.indexOf('#');
    if (hashIndex !== -1) {
        request = request.substring(0, hashIndex);
    }
    const queryIndex = request.indexOf('?');
    if (queryIndex !== -1) {
        request = request.substring(0, queryIndex);
    }
    return request;
}
/**
 * `require.context` and require/import expression runtime.
 */ function moduleContext(map) {
    function moduleContext(id) {
        id = parseRequest(id);
        if (hasOwnProperty.call(map, id)) {
            return map[id].module();
        }
        const e = new Error(`Cannot find module '${id}'`);
        e.code = 'MODULE_NOT_FOUND';
        throw e;
    }
    moduleContext.keys = ()=>{
        return Object.keys(map);
    };
    moduleContext.resolve = (id)=>{
        id = parseRequest(id);
        if (hasOwnProperty.call(map, id)) {
            return map[id].id();
        }
        const e = new Error(`Cannot find module '${id}'`);
        e.code = 'MODULE_NOT_FOUND';
        throw e;
    };
    moduleContext.import = async (id)=>{
        return await moduleContext(id);
    };
    return moduleContext;
}
contextPrototype.f = moduleContext;
/**
 * Returns the path of a chunk defined by its data.
 */ function getChunkPath(chunkData) {
    return typeof chunkData === 'string' ? chunkData : chunkData.path;
}
// Load the CompressedmoduleFactories of a chunk into the `moduleFactories` Map.
// The CompressedModuleFactories format is
// - 1 or more module ids
// - a module factory function
// So walking this is a little complex but the flat structure is also fast to
// traverse, we can use `typeof` operators to distinguish the two cases.
function installCompressedModuleFactories(chunkModules, offset, moduleFactories, newModuleId) {
    let i = offset;
    while(i < chunkModules.length){
        let end = i + 1;
        // Find our factory function
        while(end < chunkModules.length && typeof chunkModules[end] !== 'function'){
            end++;
        }
        if (end === chunkModules.length) {
            throw new Error('malformed chunk format, expected a factory function');
        }
        // Install the factory for each module ID that doesn't already have one.
        // When some IDs in this group already have a factory, reuse that existing
        // group factory for the missing IDs to keep all IDs in the group consistent.
        // Otherwise, install the factory from this chunk.
        const moduleFactoryFn = chunkModules[end];
        let existingGroupFactory = undefined;
        for(let j = i; j < end; j++){
            const id = chunkModules[j];
            const existingFactory = moduleFactories.get(id);
            if (existingFactory) {
                existingGroupFactory = existingFactory;
                break;
            }
        }
        const factoryToInstall = existingGroupFactory ?? moduleFactoryFn;
        let didInstallFactory = false;
        for(let j = i; j < end; j++){
            const id = chunkModules[j];
            if (!moduleFactories.has(id)) {
                if (!didInstallFactory) {
                    if (factoryToInstall === moduleFactoryFn) {
                        applyModuleFactoryName(moduleFactoryFn);
                    }
                    didInstallFactory = true;
                }
                moduleFactories.set(id, factoryToInstall);
                newModuleId?.(id);
            }
        }
        i = end + 1; // end is pointing at the last factory advance to the next id or the end of the array.
    }
}
/**
 * A pseudo "fake" URL object to resolve to its relative path.
 *
 * When UrlRewriteBehavior is set to relative, calls to the `new URL()` will construct url without base using this
 * runtime function to generate context-agnostic urls between different rendering context, i.e ssr / client to avoid
 * hydration mismatch.
 *
 * This is based on webpack's existing implementation:
 * https://github.com/webpack/webpack/blob/87660921808566ef3b8796f8df61bd79fc026108/lib/runtime/RelativeUrlRuntimeModule.js
 */ const relativeURL = function relativeURL(inputUrl) {
    const realUrl = new URL(inputUrl, 'x:/');
    const values = {};
    for(const key in realUrl)values[key] = realUrl[key];
    values.href = inputUrl;
    values.pathname = inputUrl.replace(/[?#].*/, '');
    values.origin = values.protocol = '';
    values.toString = values.toJSON = (..._args)=>inputUrl;
    for(const key in values)Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        value: values[key]
    });
};
relativeURL.prototype = URL.prototype;
contextPrototype.U = relativeURL;
/**
 * Utility function to ensure all variants of an enum are handled.
 */ function invariant(never, computeMessage) {
    throw new Error(`Invariant: ${computeMessage(never)}`);
}
/**
 * Constructs an error message for when a module factory is not available.
 */ function factoryNotAvailableMessage(moduleId, sourceType, sourceData) {
    let instantiationReason;
    switch(sourceType){
        case 0:
            instantiationReason = `as a runtime entry of chunk ${sourceData}`;
            break;
        case 1:
            instantiationReason = `because it was required from module ${sourceData}`;
            break;
        case 2:
            instantiationReason = 'because of an HMR update';
            break;
        default:
            invariant(sourceType, (sourceType)=>`Unknown source type: ${sourceType}`);
    }
    return `Module ${moduleId} was instantiated ${instantiationReason}, but the module factory is not available.`;
}
/**
 * Returns a `file://` URL under a synthetic directory named after `root`
 * (`ROOT` for the project root), for when the real filesystem path is unknown.
 * The root name and path segments are percent-encoded so the result is always
 * a valid file URI.
 */ function placeholderFileUrl(modulePath, root) {
    return `file:///${encodeURIComponent(root ?? 'ROOT')}/${modulePath.split('/').map(encodeURIComponent).join('/')}`;
}
/**
 * A stub function to make `require` available but non-functional in ESM.
 */ function requireStub(_moduleId) {
    throw new Error('dynamic usage of require is not supported');
}
contextPrototype.z = requireStub;
// Make `globalThis` available to the module in a way that cannot be shadowed by a local variable.
contextPrototype.g = globalThis;
function applyModuleFactoryName(factory) {
    // Give the module factory a nice name to improve stack traces.
    Object.defineProperty(factory, 'name', {
        value: 'module evaluation'
    });
}
/// <reference path="../shared/runtime/runtime-utils.ts" />
/// A 'base' utilities to support runtime can have externals.
/// Currently this is for node.js / edge runtime both.
/// If a fn requires node.js specific behavior, it should be placed in `node-external-utils` instead.
async function externalImport(id) {
    let raw;
    try {
        switch (id) {
  case "next/dist/compiled/@vercel/og/index.node.js":
    raw = await import("next/dist/compiled/@vercel/og/index.edge.js");
    break;
  default:
    raw = await import(id);
};
    } catch (err) {
        // TODO(alexkirsz) This can happen when a client-side module tries to load
        // an external module we don't provide a shim for (e.g. querystring, url).
        // For now, we fail semi-silently, but in the future this should be a
        // compilation error.
        throw new Error(`Failed to load external module ${id}: ${err}`);
    }
    if (raw && raw.__esModule && raw.default && 'default' in raw.default) {
        return interopEsm(raw.default, createNS(raw), true);
    }
    return raw;
}
contextPrototype.y = externalImport;
function externalRequire(id, thunk, esm = false) {
    let raw;
    try {
        raw = thunk();
    } catch (err) {
        // TODO(alexkirsz) This can happen when a client-side module tries to load
        // an external module we don't provide a shim for (e.g. querystring, url).
        // For now, we fail semi-silently, but in the future this should be a
        // compilation error.
        throw new Error(`Failed to load external module ${id}: ${err}`);
    }
    if (!esm || raw.__esModule) {
        return raw;
    }
    return interopEsm(raw, createNS(raw), true);
}
externalRequire.resolve = (id, options)=>{
    return require.resolve(id, options);
};
contextPrototype.x = externalRequire;
/* eslint-disable @typescript-eslint/no-unused-vars */ const path = require('path');
const relativePathToRuntimeRoot = path.relative(RUNTIME_PUBLIC_PATH, '.');
// Compute the relative path to the `distDir`.
const relativePathToDistRoot = path.join(relativePathToRuntimeRoot, RELATIVE_ROOT_PATH);
const RUNTIME_ROOT = path.resolve(__filename, relativePathToRuntimeRoot);
// Compute the absolute path to the root, by stripping distDir from the absolute path to this file.
const ABSOLUTE_ROOT = path.resolve(__filename, relativePathToDistRoot);
/**
 * Returns an absolute path to the given module path.
 * Module path should be relative, either path to a file or a directory.
 *
 * This fn allows to calculate an absolute path for some global static values, such as
 * `__dirname` or `import.meta.url` that Turbopack will not embeds in compile time.
 * See ImportMetaBinding::code_generation for the usage.
 */ function resolveAbsolutePath(modulePath) {
    if (modulePath) {
        return path.join(ABSOLUTE_ROOT, modulePath);
    }
    return ABSOLUTE_ROOT;
}
Context.prototype.P = resolveAbsolutePath;
/**
 * Returns an absolute `file://` URL for the given module path, which is
 * relative to the project root or the named `root`.
 *
 * Uses `url.pathToFileURL` so that the resulting URL is a valid file URI on
 * all platforms (forward slashes on Windows, drive letters handled
 * correctly, path segments URL-encoded).
 *
 * The location of a named `root` isn't known at runtime (the output may have
 * been moved away from the sources), so this returns a placeholder URL for it.
 */ function resolveFileUrl(modulePath, root) {
    if (root !== undefined) {
        return placeholderFileUrl(modulePath, root);
    }
    return require('url').pathToFileURL(resolveAbsolutePath(modulePath)).href;
}
Context.prototype.F = resolveFileUrl;
/* eslint-disable @typescript-eslint/no-unused-vars */ /// <reference path="../../shared/runtime/runtime-utils.ts" />
/// <reference path="../../shared-node/base-externals-utils.ts" />
/// <reference path="../../shared-node/node-externals-utils.ts" />
/// <reference path="./nodejs-globals.d.ts" />
/**
 * Base Node.js runtime shared between production and development.
 * Contains chunk loading, module caching, and other non-HMR functionality.
 */ process.env.TURBOPACK = '1';
const url = require('url');
const moduleFactories = new Map();
const moduleCache = new Map();
/**
 * Returns an absolute path to the given module's id.
 */ function resolvePathFromModule(moduleId) {
    const exported = this.r(moduleId);
    const exportedPath = exported?.default ?? exported;
    if (typeof exportedPath !== 'string') {
        return exported;
    }
    const strippedAssetPrefix = exportedPath.slice(ASSET_PREFIX.length);
    const resolved = path.resolve(RUNTIME_ROOT, strippedAssetPrefix);
    return url.pathToFileURL(resolved).href;
}
/**
 * Exports a URL value. No suffix is added in Node.js runtime.
 */ function exportUrl(urlValue, id) {
    exportValue.call(this, urlValue, id);
}
function loadRuntimeChunk(sourcePath, chunkData) {
    if (typeof chunkData === 'string') {
        loadRuntimeChunkPath(sourcePath, chunkData);
    } else {
        loadRuntimeChunkPath(sourcePath, chunkData.path);
    }
}
const loadedChunks = new Set();
const unsupportedLoadChunk = Promise.resolve(undefined);
const loadedChunk = Promise.resolve(undefined);
const chunkCache = new Map();
function clearChunkCache() {
    chunkCache.clear();
    loadedChunks.clear();
}
function loadRuntimeChunkPath(sourcePath, chunkPath) {
    if (!isJs(chunkPath)) {
        // We only support loading JS chunks in Node.js.
        // This branch can be hit when trying to load a CSS chunk.
        return;
    }
    if (loadedChunks.has(chunkPath)) {
        return;
    }
    try {
        const resolved = path.resolve(RUNTIME_ROOT, chunkPath);
        const chunkModules = requireChunk(chunkPath);
        installCompressedModuleFactories(chunkModules, 0, moduleFactories);
        loadedChunks.add(chunkPath);
    } catch (cause) {
        let errorMessage = `Failed to load chunk ${chunkPath}`;
        if (sourcePath) {
            errorMessage += ` from runtime for chunk ${sourcePath}`;
        }
        const error = new Error(errorMessage, {
            cause
        });
        error.name = 'ChunkLoadError';
        throw error;
    }
}
function loadChunkAsync(chunkData) {
    const chunkPath = typeof chunkData === 'string' ? chunkData : chunkData.path;
    if (!isJs(chunkPath)) {
        // We only support loading JS chunks in Node.js.
        // This branch can be hit when trying to load a CSS chunk.
        return unsupportedLoadChunk;
    }
    let entry = chunkCache.get(chunkPath);
    if (entry === undefined) {
        try {
            // resolve to an absolute path to simplify `require` handling
            const resolved = path.resolve(RUNTIME_ROOT, chunkPath);
            // TODO: consider switching to `import()` to enable concurrent chunk loading and async file io
            // However this is incompatible with hot reloading (since `import` doesn't use the require cache)
            const chunkModules = requireChunk(chunkPath);
            installCompressedModuleFactories(chunkModules, 0, moduleFactories);
            entry = loadedChunk;
        } catch (cause) {
            const errorMessage = `Failed to load chunk ${chunkPath} from module ${this.m.id}`;
            const error = new Error(errorMessage, {
                cause
            });
            error.name = 'ChunkLoadError';
            // Cache the failure promise, future requests will also get this same rejection
            entry = Promise.reject(error);
        }
        chunkCache.set(chunkPath, entry);
    }
    // TODO: Return an instrumented Promise that React can use instead of relying on referential equality.
    return entry;
}
contextPrototype.l = loadChunkAsync;
function loadChunkAsyncByUrl(chunkUrl) {
    const path1 = url.fileURLToPath(new URL(chunkUrl, RUNTIME_ROOT));
    return loadChunkAsync.call(this, path1);
}
contextPrototype.L = loadChunkAsyncByUrl;
// Shared runtime primitive: the root that on-disk chunk paths are resolved
// against. Used by the bundled wasm helper (exposed as `__turbopack_runtime_root__`).
contextPrototype.w = RUNTIME_ROOT;
const regexJsUrl = /\.js(?:\?[^#]*)?(?:#.*)?$/;
/**
 * Checks if a given path/URL ends with .js, optionally followed by ?query or #fragment.
 */ function isJs(chunkUrlOrPath) {
    return regexJsUrl.test(chunkUrlOrPath);
}
/* eslint-disable @typescript-eslint/no-unused-vars */ /// <reference path="./runtime-base.ts" />
/**
 * Production Node.js runtime.
 * Uses ModuleWithDirection and simple module instantiation without HMR support.
 */ // moduleCache and moduleFactories are declared in runtime-base.ts
// this is read in runtime-utils.ts so it creates a module with direction for hmr
createModuleWithDirectionFlag = true;
const nodeContextPrototype = Context.prototype;
nodeContextPrototype.q = exportUrl;
nodeContextPrototype.M = moduleFactories;
// Cast moduleCache to ModuleWithDirection for production mode
nodeContextPrototype.c = moduleCache;
nodeContextPrototype.R = resolvePathFromModule;
nodeContextPrototype.C = clearChunkCache;
function instantiateModule(id, sourceType, sourceData) {
    const moduleFactory = moduleFactories.get(id);
    if (typeof moduleFactory !== 'function') {
        // This can happen if modules incorrectly handle HMR disposes/updates,
        // e.g. when they keep a `setTimeout` around which still executes old code
        // and contains e.g. a `require("something")` call.
        throw new Error(factoryNotAvailableMessage(id, sourceType, sourceData));
    }
    const module1 = createModuleWithDirection(id);
    const exports = module1.exports;
    moduleCache.set(id, module1);
    const context = new Context(module1, exports);
    // NOTE(alexkirsz) This can fail when the module encounters a runtime error.
    try {
        moduleFactory(context, module1, exports);
    } catch (error) {
        module1.error = error;
        throw error;
    }
    ;
    module1.loaded = true;
    if (module1.namespaceObject && module1.exports !== module1.namespaceObject) {
        // in case of a circular dependency: cjs1 -> esm2 -> cjs1
        interopEsm(module1.exports, module1.namespaceObject);
    }
    return module1;
}
/**
 * Retrieves a module from the cache, or instantiate it if it is not cached.
 */ // @ts-ignore
function getOrInstantiateModuleFromParent(id, sourceModule) {
    const module1 = moduleCache.get(id);
    if (module1) {
        if (module1.error) {
            throw module1.error;
        }
        return module1;
    }
    return instantiateModule(id, SourceType.Parent, sourceModule.id);
}
/**
 * Instantiates a runtime module.
 */ function instantiateRuntimeModule(chunkPath, moduleId) {
    return instantiateModule(moduleId, SourceType.Runtime, chunkPath);
}
/**
 * Retrieves a module from the cache, or instantiate it as a runtime module if it is not cached.
 */ // @ts-ignore TypeScript doesn't separate this module space from the browser runtime
function getOrInstantiateRuntimeModule(chunkPath, moduleId) {
    const module1 = moduleCache.get(moduleId);
    if (module1) {
        if (module1.error) {
            throw module1.error;
        }
        return module1;
    }
    return instantiateRuntimeModule(chunkPath, moduleId);
}
module.exports = (sourcePath)=>({
        m: (id)=>getOrInstantiateRuntimeModule(sourcePath, id),
        c: (chunkData)=>loadRuntimeChunk(sourcePath, chunkData)
    });


//# sourceMappingURL=%5Bturbopack%5D_runtime.js.map

  function requireChunk(chunkPath) {
    switch(chunkPath) {
      case "server/chunks/[externals]__01t2nd50u5k0d._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/[externals]__01t2nd50u5k0d._.js");
      case "server/chunks/[root-of-the-server]__1lhhbc401j9gr._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1lhhbc401j9gr._.js");
      case "server/chunks/[turbopack]_runtime.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/[turbopack]_runtime.js");
      case "server/chunks/ssr/[root-of-the-server]__014b_xr2ew3_o._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__014b_xr2ew3_o._.js");
      case "server/chunks/ssr/[root-of-the-server]__0syn4a755ccyb._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0syn4a755ccyb._.js");
      case "server/chunks/ssr/[root-of-the-server]__1lj3ividuvpx7._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1lj3ividuvpx7._.js");
      case "server/chunks/ssr/[root-of-the-server]__1uofqxrimo_5s._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1uofqxrimo_5s._.js");
      case "server/chunks/ssr/[turbopack]_runtime.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[turbopack]_runtime.js");
      case "server/chunks/ssr/_1u_ggj0qgl_tm._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_1u_ggj0qgl_tm._.js");
      case "server/chunks/ssr/_next-internal_server_app__not-found_page_actions_0pt47yrisjoev.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app__not-found_page_actions_0pt47yrisjoev.js");
      case "server/chunks/ssr/components_1d0k35tn2j-km._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/components_1d0k35tn2j-km._.js");
      case "server/chunks/ssr/node_modules_0h91jdk0pr40d._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_0h91jdk0pr40d._.js");
      case "server/chunks/ssr/node_modules_1jbtcgyhj049i._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_1jbtcgyhj049i._.js");
      case "server/chunks/ssr/node_modules_next_19misn5bvv8e7._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_19misn5bvv8e7._.js");
      case "server/chunks/ssr/node_modules_next_dist_0-amwqbrge23p._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_0-amwqbrge23p._.js");
      case "server/chunks/ssr/node_modules_next_dist_1khq67j4vo9y4._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_1khq67j4vo9y4._.js");
      case "server/chunks/ssr/node_modules_next_dist_client_components_0wpq8j32_ibz4._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_client_components_0wpq8j32_ibz4._.js");
      case "server/chunks/ssr/node_modules_next_dist_client_components_builtin_forbidden_0symwr9mbf-fh.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_client_components_builtin_forbidden_0symwr9mbf-fh.js");
      case "server/chunks/ssr/node_modules_next_dist_client_components_builtin_unauthorized_0l_sp0xky89qu.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_client_components_builtin_unauthorized_0l_sp0xky89qu.js");
      case "server/chunks/ssr/node_modules_next_dist_compiled_@edge-runtime_cookies_index_1kiz_an963mbg.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_compiled_@edge-runtime_cookies_index_1kiz_an963mbg.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0048lj3x5xrfs.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0048lj3x5xrfs.js");
      case "server/chunks/ssr/[root-of-the-server]__03w_9e_k6kgud._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__03w_9e_k6kgud._.js");
      case "server/chunks/ssr/[root-of-the-server]__0g_i_gsk_pnac._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0g_i_gsk_pnac._.js");
      case "server/chunks/ssr/[root-of-the-server]__0py1t7q9ntzgc._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0py1t7q9ntzgc._.js");
      case "server/chunks/ssr/_next-internal_server_app__global-error_page_actions_0zi5s8-psc_d2.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app__global-error_page_actions_0zi5s8-psc_d2.js");
      case "server/chunks/ssr/node_modules_0gxlxpuufujz9._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_0gxlxpuufujz9._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_13q04th-918ib.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_13q04th-918ib.js");
      case "server/chunks/[root-of-the-server]__15bjnu5yieigz._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__15bjnu5yieigz._.js");
      case "server/chunks/[root-of-the-server]__1pmvfepob05g3._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1pmvfepob05g3._.js");
      case "server/chunks/_1thto32t0ezm_._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/_1thto32t0ezm_._.js");
      case "server/chunks/_next-internal_server_app_api_mnenie_glas_route_actions_0-wxrnxiyvfji.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_mnenie_glas_route_actions_0-wxrnxiyvfji.js");
      case "server/chunks/content_laws_json_[json]_cjs_18gmi4v5u3lh4._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/content_laws_json_[json]_cjs_18gmi4v5u3lh4._.js");
      case "server/chunks/node_modules_next_0g8xe7c6fvfgl._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/node_modules_next_0g8xe7c6fvfgl._.js");
      case "server/chunks/_0ypgdpqbabho0._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/_0ypgdpqbabho0._.js");
      case "server/chunks/_next-internal_server_app_api_mnenie_kod_route_actions_05sqk3fw33giv.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_mnenie_kod_route_actions_05sqk3fw33giv.js");
      case "server/chunks/_1d-c_06_m0vza._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/_1d-c_06_m0vza._.js");
      case "server/chunks/_next-internal_server_app_api_mnenie_potvardi_route_actions_14t4lu9bjkeo8.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_mnenie_potvardi_route_actions_14t4lu9bjkeo8.js");
      case "server/chunks/[externals]__1p2j9_5g429uh._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/[externals]__1p2j9_5g429uh._.js");
      case "server/chunks/_1sg598-bsduwp._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/_1sg598-bsduwp._.js");
      case "server/chunks/_next-internal_server_app_api_vhod_route_actions_0kua5nfmuh7ha.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_vhod_route_actions_0kua5nfmuh7ha.js");
      case "server/chunks/ssr/[root-of-the-server]__0lteqchr4g8ax._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0lteqchr4g8ax._.js");
      case "server/chunks/ssr/[root-of-the-server]__1cy28ma7zmalr._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1cy28ma7zmalr._.js");
      case "server/chunks/ssr/_1rggn7b0tcrrz._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_1rggn7b0tcrrz._.js");
      case "server/chunks/ssr/_next-internal_server_app_byudzhet_page_actions_1-y3fw3udfgz_.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_byudzhet_page_actions_1-y3fw3udfgz_.js");
      case "server/chunks/ssr/app_byudzhet_page_tsx_0h5k784817a6y._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_byudzhet_page_tsx_0h5k784817a6y._.js");
      case "server/chunks/ssr/components_LawAnalysis_tsx_1-n9o88myuklb._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/components_LawAnalysis_tsx_1-n9o88myuklb._.js");
      case "server/chunks/ssr/components_MoneyFlow_tsx_113d9uwqlybrb._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/components_MoneyFlow_tsx_113d9uwqlybrb._.js");
      case "server/chunks/ssr/components_ui_tsx_0a6897hm0f0ut._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/components_ui_tsx_0a6897hm0f0ut._.js");
      case "server/chunks/ssr/content_laws_json_[json]_cjs_0q6myszxpo13m._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/content_laws_json_[json]_cjs_0q6myszxpo13m._.js");
      case "server/chunks/ssr/data_budget_json_[json]_cjs_0v7102hkjs6og._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/data_budget_json_[json]_cjs_0v7102hkjs6og._.js");
      case "server/chunks/ssr/lib_voteExplain_ts_1j89rof3kysmo._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/lib_voteExplain_ts_1j89rof3kysmo._.js");
      case "server/chunks/ssr/node_modules_@opennextjs_cloudflare_dist_api_index_0sdymeh1eg4s8.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_@opennextjs_cloudflare_dist_api_index_0sdymeh1eg4s8.js");
      case "server/chunks/ssr/node_modules_next_dist_client_components_builtin_global-error_0q-w892nagajq.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_client_components_builtin_global-error_0q-w892nagajq.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0ayejwwq4vdjb.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0ayejwwq4vdjb.js");
      case "server/chunks/ssr/[root-of-the-server]__1g363qez_hjhr._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1g363qez_hjhr._.js");
      case "server/chunks/ssr/_1_j-_w8kubd5h._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_1_j-_w8kubd5h._.js");
      case "server/chunks/ssr/_next-internal_server_app_ceni_nadcenki_page_actions_1247vqs1_t481.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_ceni_nadcenki_page_actions_1247vqs1_t481.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_04r4f3i1vaiio.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_04r4f3i1vaiio.js");
      case "server/chunks/ssr/[root-of-the-server]__0lehp1c6l5bvl._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0lehp1c6l5bvl._.js");
      case "server/chunks/ssr/[root-of-the-server]__181rtjzsbr6cn._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__181rtjzsbr6cn._.js");
      case "server/chunks/ssr/_03czj290cv-ak._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_03czj290cv-ak._.js");
      case "server/chunks/ssr/_15uslbb74kvfo._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_15uslbb74kvfo._.js");
      case "server/chunks/ssr/_1acgisge6pwu0._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_1acgisge6pwu0._.js");
      case "server/chunks/ssr/_next-internal_server_app_ceni_page_actions_1n1u2vx7-8buv.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_ceni_page_actions_1n1u2vx7-8buv.js");
      case "server/chunks/ssr/app_ceni_page_tsx_14rhk5adq148q._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_ceni_page_tsx_14rhk5adq148q._.js");
      case "server/chunks/ssr/components_Charts_tsx_03md_afpax3kk._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/components_Charts_tsx_03md_afpax3kk._.js");
      case "server/chunks/ssr/data_funds_json_[json]_cjs_0bv_2-ocdxdtg._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/data_funds_json_[json]_cjs_0bv_2-ocdxdtg._.js");
      case "server/chunks/ssr/data_places_json_[json]_cjs_0-uc00e7v6_bd._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/data_places_json_[json]_cjs_0-uc00e7v6_bd._.js");
      case "server/chunks/ssr/lib_economy_ts_14vqc63lgcnix._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/lib_economy_ts_14vqc63lgcnix._.js");
      case "server/chunks/ssr/node_modules_@observablehq_plot_dist_plot_1-recl09tnb17.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_@observablehq_plot_dist_plot_1-recl09tnb17.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_06renk1rg5bik.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_06renk1rg5bik.js");
      case "server/chunks/_1mxn_lbuesj3_._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/_1mxn_lbuesj3_._.js");
      case "server/chunks/_next-internal_server_app_favicon_ico_route_actions_0g2jjlssn1kss.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_favicon_ico_route_actions_0g2jjlssn1kss.js");
      case "server/chunks/ssr/[root-of-the-server]__1tyq30gt79f6v._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1tyq30gt79f6v._.js");
      case "server/chunks/ssr/_next-internal_server_app_ikonomika_evrosredstva_page_actions_0j4ptya7qbjv1.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_ikonomika_evrosredstva_page_actions_0j4ptya7qbjv1.js");
      case "server/chunks/ssr/app_ikonomika_evrosredstva_page_tsx_00n_0bfph3nfr._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_ikonomika_evrosredstva_page_tsx_00n_0bfph3nfr._.js");
      case "server/chunks/ssr/components_ChoroMap_tsx_0y6lcftmkpld4._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/components_ChoroMap_tsx_0y6lcftmkpld4._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_04zym-b6jka3s.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_04zym-b6jka3s.js");
      case "server/chunks/ssr/1oeh_server_app_ikonomika_evrosredstva_politika_page_actions_0dirsxv54cjgp.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/1oeh_server_app_ikonomika_evrosredstva_politika_page_actions_0dirsxv54cjgp.js");
      case "server/chunks/ssr/[root-of-the-server]__06pw2oiez2e8t._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__06pw2oiez2e8t._.js");
      case "server/chunks/ssr/app_ikonomika_evrosredstva_politika_page_tsx_0z67xgkvhz5a9._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_ikonomika_evrosredstva_politika_page_tsx_0z67xgkvhz5a9._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1t3o5-ldgcusm.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1t3o5-ldgcusm.js");
      case "server/chunks/ssr/1oeh_server_app_ikonomika_evrosredstva_programa_[code]_page_actions_1cejupg6pnlou.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/1oeh_server_app_ikonomika_evrosredstva_programa_[code]_page_actions_1cejupg6pnlou.js");
      case "server/chunks/ssr/app_ikonomika_evrosredstva_programa_[code]_page_tsx_1ll_pfr-8-9lo._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_ikonomika_evrosredstva_programa_[code]_page_tsx_1ll_pfr-8-9lo._.js");
      case "server/chunks/ssr/node_modules_next_dist_19qpk8usuaybt._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_19qpk8usuaybt._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0899q6fxpx_xq.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0899q6fxpx_xq.js");
      case "server/chunks/ssr/[root-of-the-server]__0i5hm2k1gnhy3._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0i5hm2k1gnhy3._.js");
      case "server/chunks/ssr/_next-internal_server_app_ikonomika_investicii_page_actions_1-8ix4737glpu.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_ikonomika_investicii_page_actions_1-8ix4737glpu.js");
      case "server/chunks/ssr/app_ikonomika_investicii_page_tsx_1ygth3u4e72az._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_ikonomika_investicii_page_tsx_1ygth3u4e72az._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1vjs66p10o0a6.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1vjs66p10o0a6.js");
      case "server/chunks/ssr/_next-internal_server_app_ikonomika_page_actions_1tnfot8czi66y.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_ikonomika_page_actions_1tnfot8czi66y.js");
      case "server/chunks/ssr/app_ikonomika_page_tsx_1us3d_ahxojrm._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_ikonomika_page_tsx_1us3d_ahxojrm._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0rxlub0dejae2.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0rxlub0dejae2.js");
      case "server/chunks/ssr/_next-internal_server_app_ikonomika_pokupatelna-sila_page_actions_0lsb1io-yv3z_.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_ikonomika_pokupatelna-sila_page_actions_0lsb1io-yv3z_.js");
      case "server/chunks/ssr/app_ikonomika_pokupatelna-sila_page_tsx_0heofr-auhjf4._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_ikonomika_pokupatelna-sila_page_tsx_0heofr-auhjf4._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0x9wrxdrxj0s6.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0x9wrxdrxj0s6.js");
      case "server/chunks/ssr/[root-of-the-server]__0c_d5e7fy94jj._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0c_d5e7fy94jj._.js");
      case "server/chunks/ssr/_1_vl7rp8v1-l2._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_1_vl7rp8v1-l2._.js");
      case "server/chunks/ssr/_next-internal_server_app_ikonomika_potoci_page_actions_16jq85-0hj-ze.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_ikonomika_potoci_page_actions_16jq85-0hj-ze.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1jynkn9lwn347.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1jynkn9lwn347.js");
      case "server/chunks/ssr/_next-internal_server_app_ikonomika_sabitie_[slug]_page_actions_0-1sw8xpo_0vy.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_ikonomika_sabitie_[slug]_page_actions_0-1sw8xpo_0vy.js");
      case "server/chunks/ssr/app_ikonomika_sabitie_[slug]_page_tsx_0x13zrg_8v21m._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_ikonomika_sabitie_[slug]_page_tsx_0x13zrg_8v21m._.js");
      case "server/chunks/ssr/lib_statCatalog_ts_0-rlv26x8i59m._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/lib_statCatalog_ts_0-rlv26x8i59m._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1_syq8x8e0rrm.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1_syq8x8e0rrm.js");
      case "server/chunks/ssr/[root-of-the-server]__0s-zskluguijk._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0s-zskluguijk._.js");
      case "server/chunks/ssr/_next-internal_server_app_ikonomika_struktura_page_actions_1y3q8z96pp61t.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_ikonomika_struktura_page_actions_1y3q8z96pp61t.js");
      case "server/chunks/ssr/app_ikonomika_struktura_page_tsx_0m7tnjgkumzgo._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_ikonomika_struktura_page_tsx_0m7tnjgkumzgo._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_12nn93ujm106_.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_12nn93ujm106_.js");
      case "server/chunks/ssr/[root-of-the-server]__1ne324cpbuq3p._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1ne324cpbuq3p._.js");
      case "server/chunks/ssr/_0v_zf-ng3v0ba._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_0v_zf-ng3v0ba._.js");
      case "server/chunks/ssr/_next-internal_server_app_kalkulatori_danaci_page_actions_0t7vkbungroi6.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_kalkulatori_danaci_page_actions_0t7vkbungroi6.js");
      case "server/chunks/ssr/app_kalkulatori_danaci_Taxes_tsx_082ix5atk_ep8._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_kalkulatori_danaci_Taxes_tsx_082ix5atk_ep8._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_09tx7ekrjpwow.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_09tx7ekrjpwow.js");
      case "server/chunks/ssr/[root-of-the-server]__18u-u8_mh5tmu._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__18u-u8_mh5tmu._.js");
      case "server/chunks/ssr/_next-internal_server_app_kalkulatori_danaci-razhodi_page_actions_1oo1qvegsobdw.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_kalkulatori_danaci-razhodi_page_actions_1oo1qvegsobdw.js");
      case "server/chunks/ssr/app_kalkulatori_danaci-razhodi_17xkv8uy3ygb7._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_kalkulatori_danaci-razhodi_17xkv8uy3ygb7._.js");
      case "server/chunks/ssr/app_kalkulatori_danaci-razhodi_TaxVsSpend_tsx_0ep6jirjvyhsq._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_kalkulatori_danaci-razhodi_TaxVsSpend_tsx_0ep6jirjvyhsq._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0xbsgg17e9auv.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0xbsgg17e9auv.js");
      case "server/chunks/ssr/[root-of-the-server]__0sr3ht0zy2i5a._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0sr3ht0zy2i5a._.js");
      case "server/chunks/ssr/_next-internal_server_app_kalkulatori_kredit_page_actions_1yv3pno2jt_hr.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_kalkulatori_kredit_page_actions_1yv3pno2jt_hr.js");
      case "server/chunks/ssr/app_kalkulatori_kredit_Kredit_tsx_1-kfkjny6lul0._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_kalkulatori_kredit_Kredit_tsx_1-kfkjny6lul0._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_18qd8vhaeq7_j.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_18qd8vhaeq7_j.js");
      case "server/chunks/ssr/1oeh_server_app_kalkulatori_lichna-inflaciya_page_actions_0oqc2woh8iyb7.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/1oeh_server_app_kalkulatori_lichna-inflaciya_page_actions_0oqc2woh8iyb7.js");
      case "server/chunks/ssr/[root-of-the-server]__1je_8u0mgh4yg._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1je_8u0mgh4yg._.js");
      case "server/chunks/ssr/app_kalkulatori_lichna-inflaciya_Inflation_tsx_19h19hbzihtwm._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_kalkulatori_lichna-inflaciya_Inflation_tsx_19h19hbzihtwm._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1klh7fbgzi9ok.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1klh7fbgzi9ok.js");
      case "server/chunks/ssr/[root-of-the-server]__0l3ftdlj1_0e2._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0l3ftdlj1_0e2._.js");
      case "server/chunks/ssr/_next-internal_server_app_kalkulatori_nuzhen-dohod_page_actions_11q12_jm52bi0.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_kalkulatori_nuzhen-dohod_page_actions_11q12_jm52bi0.js");
      case "server/chunks/ssr/app_kalkulatori_nuzhen-dohod_Income_tsx_13l08bzn1t5c_._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_kalkulatori_nuzhen-dohod_Income_tsx_13l08bzn1t5c_._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_09nevnbrj46be.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_09nevnbrj46be.js");
      case "server/chunks/ssr/_1s8tqs5uxfptj._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_1s8tqs5uxfptj._.js");
      case "server/chunks/ssr/_next-internal_server_app_kalkulatori_page_actions_1urpuw0val9h2.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_kalkulatori_page_actions_1urpuw0val9h2.js");
      case "server/chunks/ssr/app_kalkulatori_page_tsx_0leunsus60v9c._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_kalkulatori_page_tsx_0leunsus60v9c._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0ha_qgpn9n2ty.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0ha_qgpn9n2ty.js");
      case "server/chunks/ssr/[root-of-the-server]__1n4j-vuypbde5._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1n4j-vuypbde5._.js");
      case "server/chunks/ssr/_next-internal_server_app_kalkulatori_slozhna-lihva_page_actions_0k-z4fxe0fuhq.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_kalkulatori_slozhna-lihva_page_actions_0k-z4fxe0fuhq.js");
      case "server/chunks/ssr/app_kalkulatori_slozhna-lihva_Compound_tsx_05fy5o3ltg3ur._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_kalkulatori_slozhna-lihva_Compound_tsx_05fy5o3ltg3ur._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1o_7yqco-q8a0.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1o_7yqco-q8a0.js");
      case "server/chunks/ssr/[root-of-the-server]__02p7r_v_ibi29._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__02p7r_v_ibi29._.js");
      case "server/chunks/ssr/[root-of-the-server]__0k0_cpom9487j._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0k0_cpom9487j._.js");
      case "server/chunks/ssr/_015gy21n5viov._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_015gy21n5viov._.js");
      case "server/chunks/ssr/_0m0vy5fm2_w92._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_0m0vy5fm2_w92._.js");
      case "server/chunks/ssr/_1n9mw50onbi0f._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_1n9mw50onbi0f._.js");
      case "server/chunks/ssr/_next-internal_server_app_lica_[slug]_page_actions_1zhuyv7o5yyz8.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_lica_[slug]_page_actions_1zhuyv7o5yyz8.js");
      case "server/chunks/ssr/app_lica_[slug]_page_tsx_0hj6y4r_4r60x._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_lica_[slug]_page_tsx_0hj6y4r_4r60x._.js");
      case "server/chunks/ssr/content_cases_json_[json]_cjs_1uksf0f7rldut._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/content_cases_json_[json]_cjs_1uksf0f7rldut._.js");
      case "server/chunks/ssr/data_mp-history_json_[json]_cjs_0sms59zz9kxc9._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/data_mp-history_json_[json]_cjs_0sms59zz9kxc9._.js");
      case "server/chunks/ssr/data_political-links_json_[json]_cjs_00uuysb7i0tkr._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/data_political-links_json_[json]_cjs_00uuysb7i0tkr._.js");
      case "server/chunks/ssr/lib_procurement_ts_1qs45605ofwe-._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/lib_procurement_ts_1qs45605ofwe-._.js");
      case "server/chunks/ssr/lib_projects_ts_0f-jqrg5ftipx._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/lib_projects_ts_0f-jqrg5ftipx._.js");
      case "server/chunks/ssr/node_modules_next_0sc9pqebtjyd5._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_0sc9pqebtjyd5._.js");
      case "server/chunks/ssr/node_modules_next_dist_1pkebwn_sj97u._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_1pkebwn_sj97u._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_17sq0bpi7lm0j.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_17sq0bpi7lm0j.js");
      case "server/chunks/ssr/[root-of-the-server]__0cq351sdnui0n._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0cq351sdnui0n._.js");
      case "server/chunks/ssr/_next-internal_server_app_mesta_[obl]_[muni]_[mesto]_page_actions_1dc3z3tf39u0k.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_mesta_[obl]_[muni]_[mesto]_page_actions_1dc3z3tf39u0k.js");
      case "server/chunks/ssr/app_mesta_[obl]_[muni]_[mesto]_page_tsx_1_b13h3p6nbv9._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_mesta_[obl]_[muni]_[mesto]_page_tsx_1_b13h3p6nbv9._.js");
      case "server/chunks/ssr/components_PlaceProcurement_tsx_1x5l3gam5x1cp._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/components_PlaceProcurement_tsx_1x5l3gam5x1cp._.js");
      case "server/chunks/ssr/components_proc_tsx_1l3l23h_y3b4t._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/components_proc_tsx_1l3l23h_y3b4t._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1mccwtdfl6i_t.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1mccwtdfl6i_t.js");
      case "server/chunks/ssr/1oeh_server_app_mesta_[obl]_[muni]_investicii_[id]_page_actions_1ew7wvcstithq.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/1oeh_server_app_mesta_[obl]_[muni]_investicii_[id]_page_actions_1ew7wvcstithq.js");
      case "server/chunks/ssr/[root-of-the-server]__0j5pdb7vat_nf._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0j5pdb7vat_nf._.js");
      case "server/chunks/ssr/app_mesta_[obl]_[muni]_investicii_[id]_page_tsx_15ig9py_ip10m._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_mesta_[obl]_[muni]_investicii_[id]_page_tsx_15ig9py_ip10m._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0td5hvfh9wxze.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0td5hvfh9wxze.js");
      case "server/chunks/ssr/[root-of-the-server]__1ly_2zsn_jfwe._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1ly_2zsn_jfwe._.js");
      case "server/chunks/ssr/_0q0c64kw5ktwt._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_0q0c64kw5ktwt._.js");
      case "server/chunks/ssr/_1xuic-v6n_352._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_1xuic-v6n_352._.js");
      case "server/chunks/ssr/_next-internal_server_app_mesta_[obl]_[muni]_page_actions_1oisrhx-5sf2b.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_mesta_[obl]_[muni]_page_actions_1oisrhx-5sf2b.js");
      case "server/chunks/ssr/components_MuniPower_tsx_0oj_x-uqqikdp._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/components_MuniPower_tsx_0oj_x-uqqikdp._.js");
      case "server/chunks/ssr/components_MuniProjects_tsx_1tf_6d98wfj-6._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/components_MuniProjects_tsx_1tf_6d98wfj-6._.js");
      case "server/chunks/ssr/components_SettlementMap_tsx_190t3t7n6z_h5._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/components_SettlementMap_tsx_190t3t7n6z_h5._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0rn2m-rr4_wqx.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0rn2m-rr4_wqx.js");
      case "server/chunks/ssr/[root-of-the-server]__06lupkat4vi4v._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__06lupkat4vi4v._.js");
      case "server/chunks/ssr/[root-of-the-server]__0w1ojvzh80pl1._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0w1ojvzh80pl1._.js");
      case "server/chunks/ssr/_next-internal_server_app_mesta_[obl]_[muni]_proekti_page_actions_05lyp50nc-xx3.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_mesta_[obl]_[muni]_proekti_page_actions_05lyp50nc-xx3.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0snr2ogylk5xp.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0snr2ogylk5xp.js");
      case "server/chunks/ssr/1oeh_server_app_mesta_[obl]_[muni]_resheniya_page_actions_1w-97avwwabo6.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/1oeh_server_app_mesta_[obl]_[muni]_resheniya_page_actions_1w-97avwwabo6.js");
      case "server/chunks/ssr/[root-of-the-server]__0hwb2dogv_f6o._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0hwb2dogv_f6o._.js");
      case "server/chunks/ssr/[root-of-the-server]__1k_rej2x-d89m._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1k_rej2x-d89m._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1d4f-hyajn-5-.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1d4f-hyajn-5-.js");
      case "server/chunks/ssr/[root-of-the-server]__136zmcrauqxrx._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__136zmcrauqxrx._.js");
      case "server/chunks/ssr/_next-internal_server_app_mesta_[obl]_[muni]_vlast_page_actions_1d9qs6h3955di.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_mesta_[obl]_[muni]_vlast_page_actions_1d9qs6h3955di.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1n8jas3dxkbia.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1n8jas3dxkbia.js");
      case "server/chunks/ssr/[root-of-the-server]__1tlg9itf5vk14._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1tlg9itf5vk14._.js");
      case "server/chunks/ssr/_next-internal_server_app_mesta_[obl]_page_actions_1h0ctx7dba8qs.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_mesta_[obl]_page_actions_1h0ctx7dba8qs.js");
      case "server/chunks/ssr/app_mesta_[obl]_page_tsx_0fcmiod02s3p-._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_mesta_[obl]_page_tsx_0fcmiod02s3p-._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0gfstfw8mx39y.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0gfstfw8mx39y.js");
      case "server/chunks/ssr/_next-internal_server_app_mesta_page_actions_0i47l0e9jhdxn.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_mesta_page_actions_0i47l0e9jhdxn.js");
      case "server/chunks/ssr/app_mesta_page_tsx_0pc3lcfy4pvne._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_mesta_page_tsx_0pc3lcfy4pvne._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0n5uq_d-phbwt.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0n5uq_d-phbwt.js");
      case "server/chunks/ssr/_0xlx6cu2rchp5._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_0xlx6cu2rchp5._.js");
      case "server/chunks/ssr/_next-internal_server_app_metodologiya_page_actions_1qv4qdk800ti4.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_metodologiya_page_actions_1qv4qdk800ti4.js");
      case "server/chunks/ssr/content_checks_json_[json]_cjs_0grvy2u0p25zn._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/content_checks_json_[json]_cjs_0grvy2u0p25zn._.js");
      case "server/chunks/ssr/content_promises_json_[json]_cjs_0zo9rnt0bsiz8._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/content_promises_json_[json]_cjs_0zo9rnt0bsiz8._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1k0pmukohipnn.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1k0pmukohipnn.js");
      case "server/chunks/ssr/[root-of-the-server]__1bj5uod8cectz._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1bj5uod8cectz._.js");
      case "server/chunks/ssr/_next-internal_server_app_mnenie_page_actions_1a3v3sb4a1kwu.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_mnenie_page_actions_1a3v3sb4a1kwu.js");
      case "server/chunks/ssr/app_mnenie_page_tsx_0w0hisc4625r-._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_mnenie_page_tsx_0w0hisc4625r-._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1vogk6209a1pb.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1vogk6209a1pb.js");
      case "server/chunks/ssr/[root-of-the-server]__0zd6guqj933cm._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0zd6guqj933cm._.js");
      case "server/chunks/ssr/_next-internal_server_app_novini_page_actions_14v389yc11jq8.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_novini_page_actions_14v389yc11jq8.js");
      case "server/chunks/ssr/app_novini_page_tsx_0-rn4j02m6vdv._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_novini_page_tsx_0-rn4j02m6vdv._.js");
      case "server/chunks/ssr/lib_news_ts_09vbqo4vcugkt._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/lib_news_ts_09vbqo4vcugkt._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_17p3_ghrmrhzl.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_17p3_ghrmrhzl.js");
      case "server/chunks/ssr/[root-of-the-server]__0-qpqcuq1f5bp._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0-qpqcuq1f5bp._.js");
      case "server/chunks/ssr/_next-internal_server_app_obeshtaniya_[gov]_page_actions_1hra-__lgk-7e.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_obeshtaniya_[gov]_page_actions_1hra-__lgk-7e.js");
      case "server/chunks/ssr/app_obeshtaniya_[gov]_page_tsx_002nqbl7f8nj0._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_obeshtaniya_[gov]_page_tsx_002nqbl7f8nj0._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1fmxvm_1-xr_k.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1fmxvm_1-xr_k.js");
      case "server/chunks/ssr/[root-of-the-server]__0lgg_x0r4_j-4._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0lgg_x0r4_j-4._.js");
      case "server/chunks/ssr/[root-of-the-server]__1v9ycui4kj7mm._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1v9ycui4kj7mm._.js");
      case "server/chunks/ssr/_next-internal_server_app_obeshtaniya_page_actions_10px2alku8w-1.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_obeshtaniya_page_actions_10px2alku8w-1.js");
      case "server/chunks/ssr/app_obeshtaniya_page_tsx_10tkhjr6w5edh._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_obeshtaniya_page_tsx_10tkhjr6w5edh._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1ln4imvyetr-u.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1ln4imvyetr-u.js");
      case "server/chunks/ssr/[root-of-the-server]__034ejfi7f9fu1._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__034ejfi7f9fu1._.js");
      case "server/chunks/ssr/_0dtpcsi06cjbn._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_0dtpcsi06cjbn._.js");
      case "server/chunks/ssr/_next-internal_server_app_page_actions_0hhsz1jew5ls7.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_page_actions_0hhsz1jew5ls7.js");
      case "server/chunks/ssr/app_page_tsx_1noek_qnm44jj._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_page_tsx_1noek_qnm44jj._.js");
      case "server/chunks/ssr/data_risk_json_[json]_cjs_20di2p-194hj1._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/data_risk_json_[json]_cjs_20di2p-194hj1._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_04tpgk4fjuqws.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_04tpgk4fjuqws.js");
      case "server/chunks/ssr/_next-internal_server_app_pari_dalg_page_actions_1yfpm608i4o2q.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_pari_dalg_page_actions_1yfpm608i4o2q.js");
      case "server/chunks/ssr/app_pari_dalg_page_tsx_0pikkk3pkndsi._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_pari_dalg_page_tsx_0pikkk3pkndsi._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_18a3tnnam15bu.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_18a3tnnam15bu.js");
      case "server/chunks/ssr/[root-of-the-server]__1hvgjlyrg4ciz._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1hvgjlyrg4ciz._.js");
      case "server/chunks/ssr/_05fbdc89hs4bw._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_05fbdc89hs4bw._.js");
      case "server/chunks/ssr/_12yqnirzeo9x8._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_12yqnirzeo9x8._.js");
      case "server/chunks/ssr/_13rriabwh_bai._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_13rriabwh_bai._.js");
      case "server/chunks/ssr/_1plyj5i769rtq._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_1plyj5i769rtq._.js");
      case "server/chunks/ssr/_next-internal_server_app_parlament_deputat_[id]_page_actions_13alrgcksqxhg.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_parlament_deputat_[id]_page_actions_13alrgcksqxhg.js");
      case "server/chunks/ssr/lib_11gkugydbxfz7._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/lib_11gkugydbxfz7._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0n9_6qz1fm5ao.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0n9_6qz1fm5ao.js");
      case "server/chunks/ssr/[root-of-the-server]__0b091l70ct6q7._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0b091l70ct6q7._.js");
      case "server/chunks/ssr/_next-internal_server_app_parlament_glasuvane_[id]_page_actions_1947stq87s610.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_parlament_glasuvane_[id]_page_actions_1947stq87s610.js");
      case "server/chunks/ssr/app_parlament_glasuvane_[id]_page_tsx_1mnn6x8-2gw6v._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_parlament_glasuvane_[id]_page_tsx_1mnn6x8-2gw6v._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0wcs-24zdkdzl.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0wcs-24zdkdzl.js");
      case "server/chunks/ssr/[root-of-the-server]__046j_dawrpa9x._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__046j_dawrpa9x._.js");
      case "server/chunks/ssr/_0dv9mhjvynon1._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_0dv9mhjvynon1._.js");
      case "server/chunks/ssr/_1ut138sqki-5_._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_1ut138sqki-5_._.js");
      case "server/chunks/ssr/_next-internal_server_app_parlament_page_actions_1tod7ma2tzh4d.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_parlament_page_actions_1tod7ma2tzh4d.js");
      case "server/chunks/ssr/app_parlament_VoteList_tsx_1ktnlycj8w9pe._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_parlament_VoteList_tsx_1ktnlycj8w9pe._.js");
      case "server/chunks/ssr/components_Term_tsx_0q8lgrk-qt3ng._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/components_Term_tsx_0q8lgrk-qt3ng._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0r3d432b4n8o1.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0r3d432b4n8o1.js");
      case "server/chunks/ssr/[root-of-the-server]__0ljgbu_z1pcr0._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0ljgbu_z1pcr0._.js");
      case "server/chunks/ssr/_next-internal_server_app_parlament_partii_page_actions_0n8gc2n60gike.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_parlament_partii_page_actions_0n8gc2n60gike.js");
      case "server/chunks/ssr/app_parlament_partii_page_tsx_1yalivzukbbzv._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_parlament_partii_page_tsx_1yalivzukbbzv._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1xbelhuzt-l4t.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1xbelhuzt-l4t.js");
      case "server/chunks/ssr/[root-of-the-server]__0ndvjeg1c53zq._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0ndvjeg1c53zq._.js");
      case "server/chunks/ssr/_1mrncnkoiooe6._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_1mrncnkoiooe6._.js");
      case "server/chunks/ssr/_next-internal_server_app_parlament_partiya_[slug]_page_actions_1ysnpxmk622mg.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_parlament_partiya_[slug]_page_actions_1ysnpxmk622mg.js");
      case "server/chunks/ssr/components_10qlcp5-4t6ic._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/components_10qlcp5-4t6ic._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_06ahu277dyyj7.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_06ahu277dyyj7.js");
      case "server/chunks/ssr/1oeh_server_app_parlament_predishni_[ns]_[mesec]_page_actions_0y5szr9cpsp4m.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/1oeh_server_app_parlament_predishni_[ns]_[mesec]_page_actions_0y5szr9cpsp4m.js");
      case "server/chunks/ssr/[root-of-the-server]__0nhwn46a_7tn2._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0nhwn46a_7tn2._.js");
      case "server/chunks/ssr/app_parlament_predishni_[ns]_[mesec]_page_tsx_08ektzdwv65v2._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_parlament_predishni_[ns]_[mesec]_page_tsx_08ektzdwv65v2._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1115a3tmudspv.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1115a3tmudspv.js");
      case "server/chunks/ssr/_next-internal_server_app_parlament_predishni_[ns]_page_actions_18i5rr-yyfm3d.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_parlament_predishni_[ns]_page_actions_18i5rr-yyfm3d.js");
      case "server/chunks/ssr/app_parlament_predishni_[ns]_page_tsx_1rgjvs7k1c3fa._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_parlament_predishni_[ns]_page_tsx_1rgjvs7k1c3fa._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1k0e8jtow64db.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1k0e8jtow64db.js");
      case "server/chunks/ssr/[root-of-the-server]__0vn1mm1fv4v43._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0vn1mm1fv4v43._.js");
      case "server/chunks/ssr/_next-internal_server_app_parlament_predishni_page_actions_01c093nt-fh40.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_parlament_predishni_page_actions_01c093nt-fh40.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0i9dw63n7idqu.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0i9dw63n7idqu.js");
      case "server/chunks/ssr/[root-of-the-server]__03mszys5gyxtn._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__03mszys5gyxtn._.js");
      case "server/chunks/ssr/_next-internal_server_app_parlament_signali_page_actions_0k9b0ukrop2rb.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_parlament_signali_page_actions_0k9b0ukrop2rb.js");
      case "server/chunks/ssr/app_parlament_signali_page_tsx_1umg0hib35o7h._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_parlament_signali_page_tsx_1umg0hib35o7h._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1kd3sg1dc986q.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1kd3sg1dc986q.js");
      case "server/chunks/ssr/[root-of-the-server]__1vazi6fleu809._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1vazi6fleu809._.js");
      case "server/chunks/ssr/[root-of-the-server]__1wbq1-wct_ii1._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1wbq1-wct_ii1._.js");
      case "server/chunks/ssr/_0avmncenud9bu._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_0avmncenud9bu._.js");
      case "server/chunks/ssr/_next-internal_server_app_parlament_zakon_[slug]_page_actions_0sp-hmlvqvw55.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_parlament_zakon_[slug]_page_actions_0sp-hmlvqvw55.js");
      case "server/chunks/ssr/components_CitizenVote_tsx_1trmmfxly8pcp._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/components_CitizenVote_tsx_1trmmfxly8pcp._.js");
      case "server/chunks/ssr/lib_0f0a5690jha_q._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/lib_0f0a5690jha_q._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0nijjxgtubqo4.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0nijjxgtubqo4.js");
      case "server/chunks/ssr/[root-of-the-server]__1cy7or06a0bc-._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1cy7or06a0bc-._.js");
      case "server/chunks/ssr/_next-internal_server_app_parlament_zakoni_page_actions_0_zdeso8nctui.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_parlament_zakoni_page_actions_0_zdeso8nctui.js");
      case "server/chunks/ssr/app_parlament_zakoni_page_tsx_0g-ohphxy4jz1._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_parlament_zakoni_page_tsx_0g-ohphxy4jz1._.js");
      case "server/chunks/ssr/lib_10ipno3jt1dfl._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/lib_10ipno3jt1dfl._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_16jl9q4ju55pz.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_16jl9q4ju55pz.js");
      case "server/chunks/ssr/_0tzuppy40zis5._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_0tzuppy40zis5._.js");
      case "server/chunks/ssr/_next-internal_server_app_parlament_zayaveno_page_actions_0vhg32g51y5r6.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_parlament_zayaveno_page_actions_0vhg32g51y5r6.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1osn7n6ji_4l5.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1osn7n6ji_4l5.js");
      case "server/chunks/ssr/[root-of-the-server]__0x8qjib5i84x6._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0x8qjib5i84x6._.js");
      case "server/chunks/ssr/[root-of-the-server]__1cze8t-xo4xip._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1cze8t-xo4xip._.js");
      case "server/chunks/ssr/_next-internal_server_app_porachki_dogovor_[id]_page_actions_0j8yz9-lnp59t.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_porachki_dogovor_[id]_page_actions_0j8yz9-lnp59t.js");
      case "server/chunks/ssr/app_porachki_dogovor_[id]_page_tsx_05qlkv85a0zlg._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_porachki_dogovor_[id]_page_tsx_05qlkv85a0zlg._.js");
      case "server/chunks/ssr/lib_buyerAnalysis_ts_0tq_3jtvbtqg7._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/lib_buyerAnalysis_ts_0tq_3jtvbtqg7._.js");
      case "server/chunks/ssr/lib_redFlags_ts_19g2-pumaqwsm._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/lib_redFlags_ts_19g2-pumaqwsm._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_07oftw5r_x_to.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_07oftw5r_x_to.js");
      case "server/chunks/ssr/[root-of-the-server]__0q0_-z3tlk-84._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0q0_-z3tlk-84._.js");
      case "server/chunks/ssr/_next-internal_server_app_porachki_firma_[eik]_page_actions_214z2vw_n6rls.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_porachki_firma_[eik]_page_actions_214z2vw_n6rls.js");
      case "server/chunks/ssr/app_porachki_firma_[eik]_page_tsx_1w6zvwwad5vow._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_porachki_firma_[eik]_page_tsx_1w6zvwwad5vow._.js");
      case "server/chunks/ssr/components_PaidBox_tsx_0ma_pnciv6l_i._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/components_PaidBox_tsx_0ma_pnciv6l_i._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0ctv97rxf2e-2.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0ctv97rxf2e-2.js");
      case "server/chunks/ssr/_next-internal_server_app_porachki_metodologiya_page_actions_0ih0lzod02nht.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_porachki_metodologiya_page_actions_0ih0lzod02nht.js");
      case "server/chunks/ssr/app_porachki_metodologiya_page_tsx_1-icwxooe6p18._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_porachki_metodologiya_page_tsx_1-icwxooe6p18._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_02gt02gdci86y.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_02gt02gdci86y.js");
      case "server/chunks/ssr/[root-of-the-server]__155opxofaffx-._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__155opxofaffx-._.js");
      case "server/chunks/ssr/_1oocozansi7rk._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_1oocozansi7rk._.js");
      case "server/chunks/ssr/_next-internal_server_app_porachki_page_actions_1vk969cwn9d_n.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_porachki_page_actions_1vk969cwn9d_n.js");
      case "server/chunks/ssr/components_PlaceFilterBar_tsx_0oup-5fv41lnv._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/components_PlaceFilterBar_tsx_0oup-5fv41lnv._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_00-jl9g4i7yrg.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_00-jl9g4i7yrg.js");
      case "server/chunks/ssr/[root-of-the-server]__10sb_pmq0itqm._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__10sb_pmq0itqm._.js");
      case "server/chunks/ssr/_next-internal_server_app_porachki_risk_page_actions_1upic-d7x43f0.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_porachki_risk_page_actions_1upic-d7x43f0.js");
      case "server/chunks/ssr/app_porachki_risk_page_tsx_1t8lmh00j_93z._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_porachki_risk_page_tsx_1t8lmh00j_93z._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_13v496h4qlleo.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_13v496h4qlleo.js");
      case "server/chunks/ssr/[root-of-the-server]__1fy2qd60i7ob4._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1fy2qd60i7ob4._.js");
      case "server/chunks/ssr/_next-internal_server_app_porachki_vazlozhitel_[eik]_page_actions_0gk-t7a2nyik4.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_porachki_vazlozhitel_[eik]_page_actions_0gk-t7a2nyik4.js");
      case "server/chunks/ssr/app_porachki_vazlozhitel_[eik]_page_tsx_1flrk5r_qzdrp._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_porachki_vazlozhitel_[eik]_page_tsx_1flrk5r_qzdrp._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1ooiote8gx3yw.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1ooiote8gx3yw.js");
      case "server/chunks/ssr/_next-internal_server_app_proverki_[slug]_page_actions_1uf-eu4q-fozg.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_proverki_[slug]_page_actions_1uf-eu4q-fozg.js");
      case "server/chunks/ssr/app_proverki_[slug]_page_tsx_07giw9q5bqsok._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_proverki_[slug]_page_tsx_07giw9q5bqsok._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_14b9a6k3i-715.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_14b9a6k3i-715.js");
      case "server/chunks/ssr/[root-of-the-server]__1905ud1un2rvs._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1905ud1un2rvs._.js");
      case "server/chunks/ssr/_next-internal_server_app_proverki_chisla_page_actions_1h5rwnsz9lgk5.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_proverki_chisla_page_actions_1h5rwnsz9lgk5.js");
      case "server/chunks/ssr/app_proverki_chisla_page_tsx_0iucnbp-eoua-._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_proverki_chisla_page_tsx_0iucnbp-eoua-._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0iqvtw2-hcl_0.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0iqvtw2-hcl_0.js");
      case "server/chunks/ssr/[root-of-the-server]__00hels7643ik1._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__00hels7643ik1._.js");
      case "server/chunks/ssr/_next-internal_server_app_proverki_dalg-2026_page_actions_1g3pifvyffshu.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_proverki_dalg-2026_page_actions_1g3pifvyffshu.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1g1fmmnztkkgp.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1g1fmmnztkkgp.js");
      case "server/chunks/ssr/_next-internal_server_app_proverki_dokladi_page_actions_0sbbxvla24s8y.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_proverki_dokladi_page_actions_0sbbxvla24s8y.js");
      case "server/chunks/ssr/app_proverki_dokladi_page_tsx_0b821v_lc-3m9._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_proverki_dokladi_page_tsx_0b821v_lc-3m9._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1z6k6cdkxvpnr.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1z6k6cdkxvpnr.js");
      case "server/chunks/ssr/_next-internal_server_app_proverki_page_actions_10oflthyiw1wg.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_proverki_page_actions_10oflthyiw1wg.js");
      case "server/chunks/ssr/app_proverki_1dxi2wl6cvzlp._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_proverki_1dxi2wl6cvzlp._.js");
      case "server/chunks/ssr/app_proverki_ClaimList_tsx_0vbgc0ypr9ja0._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_proverki_ClaimList_tsx_0vbgc0ypr9ja0._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1ua_inz4l-2ay.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1ua_inz4l-2ay.js");
      case "server/chunks/ssr/[root-of-the-server]__19txwz1t94toh._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__19txwz1t94toh._.js");
      case "server/chunks/ssr/_next-internal_server_app_proverki_sankcii_page_actions_09srwqd447vps.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_proverki_sankcii_page_actions_09srwqd447vps.js");
      case "server/chunks/ssr/app_proverki_sankcii_page_tsx_110yv2s5lta1a._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_proverki_sankcii_page_tsx_110yv2s5lta1a._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_02qyxy6fkarz0.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_02qyxy6fkarz0.js");
      case "server/chunks/ssr/[root-of-the-server]__0_-a6zlhs7yg4._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0_-a6zlhs7yg4._.js");
      case "server/chunks/ssr/[root-of-the-server]__0wikgwokxh1j-._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0wikgwokxh1j-._.js");
      case "server/chunks/ssr/_07il2g3tayui8._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_07il2g3tayui8._.js");
      case "server/chunks/ssr/_next-internal_server_app_proverki_sotsiologiya_page_actions_1_7-lg-6ixs4-.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_proverki_sotsiologiya_page_actions_1_7-lg-6ixs4-.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0m4_m40zxvzwg.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0m4_m40zxvzwg.js");
      case "server/chunks/ssr/_next-internal_server_app_rechnik_page_actions_1ug-msnjqkebz.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_rechnik_page_actions_1ug-msnjqkebz.js");
      case "server/chunks/ssr/app_rechnik_page_tsx_160ckoa2-am11._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_rechnik_page_tsx_160ckoa2-am11._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1-jn7j_o3edws.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1-jn7j_o3edws.js");
      case "server/chunks/_211voqeezkggc._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/_211voqeezkggc._.js");
      case "server/chunks/_next-internal_server_app_robots_txt_route_actions_15vc_89wprgh5.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_robots_txt_route_actions_15vc_89wprgh5.js");
      case "server/chunks/node_modules_next_dist_16uekqf-emgzs._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/node_modules_next_dist_16uekqf-emgzs._.js");
      case "server/chunks/[root-of-the-server]__06bpxlebdtx5p._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__06bpxlebdtx5p._.js");
      case "server/chunks/_0dw0bhyalqhi_._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/_0dw0bhyalqhi_._.js");
      case "server/chunks/_0rewvi7lhy0dd._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/_0rewvi7lhy0dd._.js");
      case "server/chunks/_next-internal_server_app_rss_firma_[eik]_route_actions_1k7y_yuqci-cq.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_rss_firma_[eik]_route_actions_1k7y_yuqci-cq.js");
      case "server/chunks/node_modules_@opennextjs_cloudflare_dist_api_index_0ttjp4q_elrr5.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/node_modules_@opennextjs_cloudflare_dist_api_index_0ttjp4q_elrr5.js");
      case "server/chunks/[root-of-the-server]__1s0i9--3for4y._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1s0i9--3for4y._.js");
      case "server/chunks/_06q6x3b7-s-gg._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/_06q6x3b7-s-gg._.js");
      case "server/chunks/_14ae5g8j71ym9._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/_14ae5g8j71ym9._.js");
      case "server/chunks/_next-internal_server_app_rss_obshtina_[code]_route_actions_1l5303-gw15xq.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_rss_obshtina_[code]_route_actions_1l5303-gw15xq.js");
      case "server/chunks/ssr/_0xcw4sim0big3._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_0xcw4sim0big3._.js");
      case "server/chunks/ssr/_next-internal_server_app_sastoyanie_page_actions_1vwgk1qfslvz1.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_sastoyanie_page_actions_1vwgk1qfslvz1.js");
      case "server/chunks/ssr/app_sastoyanie_Status_tsx_1o_svz81_w3g4._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_sastoyanie_Status_tsx_1o_svz81_w3g4._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0int8cu9dcu7t.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0int8cu9dcu7t.js");
      case "server/chunks/[root-of-the-server]__00yk_5i8o8uyt._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__00yk_5i8o8uyt._.js");
      case "server/chunks/_0yeommjzehhrw._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/_0yeommjzehhrw._.js");
      case "server/chunks/_1bawp62xgp1ef._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/_1bawp62xgp1ef._.js");
      case "server/chunks/_next-internal_server_app_sitemap_xml_route_actions_05l5km9x9dlo2.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_sitemap_xml_route_actions_05l5km9x9dlo2.js");
      case "server/chunks/ssr/_11o44x7qsiku0._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_11o44x7qsiku0._.js");
      case "server/chunks/ssr/_next-internal_server_app_statistiki_[id]_page_actions_1iyj6800gdt01.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_statistiki_[id]_page_actions_1iyj6800gdt01.js");
      case "server/chunks/ssr/app_statistiki_[id]_page_tsx_1q2-d8-cl2n39._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_statistiki_[id]_page_tsx_1q2-d8-cl2n39._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_14da3bxe54apf.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_14da3bxe54apf.js");
      case "server/chunks/ssr/_next-internal_server_app_statistiki_analiz_page_actions_13_wmw7gkgu_t.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_statistiki_analiz_page_actions_13_wmw7gkgu_t.js");
      case "server/chunks/ssr/app_statistiki_analiz_page_tsx_19vp_zmnd8gsf._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_statistiki_analiz_page_tsx_19vp_zmnd8gsf._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_16enjsd3111vr.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_16enjsd3111vr.js");
      case "server/chunks/ssr/_0yi5mhx52guru._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_0yi5mhx52guru._.js");
      case "server/chunks/ssr/_next-internal_server_app_statistiki_page_actions_20vjro8_p-go3.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_statistiki_page_actions_20vjro8_p-go3.js");
      case "server/chunks/ssr/app_statistiki_StatLibrary_tsx_1cxp5n5tb3as3._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_statistiki_StatLibrary_tsx_1cxp5n5tb3as3._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0hq1mvmawjke_.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0hq1mvmawjke_.js");
      case "server/chunks/ssr/[root-of-the-server]__20-s7cw34bbof._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__20-s7cw34bbof._.js");
      case "server/chunks/ssr/_next-internal_server_app_tarsene_page_actions_0qb7i22scvybl.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_tarsene_page_actions_0qb7i22scvybl.js");
      case "server/chunks/ssr/app_tarsene_page_tsx_07uyr_f74n7ef._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_tarsene_page_tsx_07uyr_f74n7ef._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0hc5q88m4ynoy.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0hc5q88m4ynoy.js");
      case "server/chunks/ssr/[root-of-the-server]__0uifiy3ayh2es._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0uifiy3ayh2es._.js");
      case "server/chunks/ssr/_next-internal_server_app_vhod_page_actions_0i3huacqnlnyl.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_vhod_page_actions_0i3huacqnlnyl.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1nxcityug4095.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1nxcityug4095.js");
      case "server/chunks/ssr/[root-of-the-server]__0g81-dq0ztegx._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0g81-dq0ztegx._.js");
      case "server/chunks/ssr/_next-internal_server_app_vlast_deklaracii_page_actions_1-3x2aisb5vik.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_vlast_deklaracii_page_actions_1-3x2aisb5vik.js");
      case "server/chunks/ssr/app_vlast_deklaracii_page_tsx_0lmyzhcmb6zs-._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_vlast_deklaracii_page_tsx_0lmyzhcmb6zs-._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_11g5c_kecalxt.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_11g5c_kecalxt.js");
      case "server/chunks/ssr/[root-of-the-server]__0ykti3avfbpim._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0ykti3avfbpim._.js");
      case "server/chunks/ssr/[root-of-the-server]__1ygx3laxm5anc._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1ygx3laxm5anc._.js");
      case "server/chunks/ssr/_next-internal_server_app_vlast_ministerstva_[id]_page_actions_1x1fsavlxkds9.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_vlast_ministerstva_[id]_page_actions_1x1fsavlxkds9.js");
      case "server/chunks/ssr/app_vlast_ministerstva_[id]_page_tsx_14i4_edxf31h0._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_vlast_ministerstva_[id]_page_tsx_14i4_edxf31h0._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0dmc1p1kv4tj5.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0dmc1p1kv4tj5.js");
      case "server/chunks/ssr/[root-of-the-server]__0jl64_44z3srp._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0jl64_44z3srp._.js");
      case "server/chunks/ssr/[root-of-the-server]__1y8p3uud7xad0._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1y8p3uud7xad0._.js");
      case "server/chunks/ssr/_next-internal_server_app_vlast_ministerstva_page_actions_1ihitq7uurfby.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_vlast_ministerstva_page_actions_1ihitq7uurfby.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1kka340y1qpy6.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1kka340y1qpy6.js");
      case "server/chunks/ssr/[root-of-the-server]__1xnowatn59j5a._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1xnowatn59j5a._.js");
      case "server/chunks/ssr/_0ruo96uszjwq6._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_0ruo96uszjwq6._.js");
      case "server/chunks/ssr/_16idzjboq50iv._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_16idzjboq50iv._.js");
      case "server/chunks/ssr/_next-internal_server_app_vlast_page_actions_04i56wi5cmv7c.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_vlast_page_actions_04i56wi5cmv7c.js");
      case "server/chunks/ssr/app_vlast_page_tsx_1icdyh1fa9qnq._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_vlast_page_tsx_1icdyh1fa9qnq._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_10bvmcm28vyjv.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_10bvmcm28vyjv.js");
      case "server/chunks/ssr/_next-internal_server_app_vlast_sadebna-vlast_page_actions_1ufv9vyigpns6.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_vlast_sadebna-vlast_page_actions_1ufv9vyigpns6.js");
      case "server/chunks/ssr/app_vlast_sadebna-vlast_page_tsx_0zif_dp7xjr9s._.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/app_vlast_sadebna-vlast_page_tsx_0zif_dp7xjr9s._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1c79lfq2m8c3k.js": return require("/home/claude/web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1c79lfq2m8c3k.js");
      default:
        throw new Error(`Not found ${chunkPath}`);
    }
  }


  async function loadWasmChunk(chunkPath) {
    switch (chunkPath) {

      default:
        throw new Error(`Unknown wasm chunk: ${chunkPath}`);
    }
  }
