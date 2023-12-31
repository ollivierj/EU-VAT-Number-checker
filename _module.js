function noop() { }
const identity = x => x;
function assign(tar, src) {
    // @ts-ignore
    for (const k in src)
        tar[k] = src[k];
    return tar;
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
let src_url_equal_anchor;
function src_url_equal(element_src, url) {
    if (!src_url_equal_anchor) {
        src_url_equal_anchor = document.createElement('a');
    }
    src_url_equal_anchor.href = url;
    return element_src === src_url_equal_anchor.href;
}
function is_empty(obj) {
    return Object.keys(obj).length === 0;
}
function exclude_internal_props(props) {
    const result = {};
    for (const k in props)
        if (k[0] !== '$')
            result[k] = props[k];
    return result;
}

const is_client = typeof window !== 'undefined';
let now = is_client
    ? () => window.performance.now()
    : () => Date.now();
let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

const tasks = new Set();
function run_tasks(now) {
    tasks.forEach(task => {
        if (!task.c(now)) {
            tasks.delete(task);
            task.f();
        }
    });
    if (tasks.size !== 0)
        raf(run_tasks);
}
/**
 * Creates a new task that runs on each raf frame
 * until it returns a falsy value or is aborted
 */
function loop(callback) {
    let task;
    if (tasks.size === 0)
        raf(run_tasks);
    return {
        promise: new Promise(fulfill => {
            tasks.add(task = { c: callback, f: fulfill });
        }),
        abort() {
            tasks.delete(task);
        }
    };
}
function append(target, node) {
    target.appendChild(node);
}
function append_styles(target, style_sheet_id, styles) {
    const append_styles_to = get_root_for_style(target);
    if (!append_styles_to.getElementById(style_sheet_id)) {
        const style = element('style');
        style.id = style_sheet_id;
        style.textContent = styles;
        append_stylesheet(append_styles_to, style);
    }
}
function get_root_for_style(node) {
    if (!node)
        return document;
    const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
    if (root && root.host) {
        return root;
    }
    return node.ownerDocument;
}
function append_empty_stylesheet(node) {
    const style_element = element('style');
    append_stylesheet(get_root_for_style(node), style_element);
    return style_element.sheet;
}
function append_stylesheet(node, style) {
    append(node.head || node, style);
    return style.sheet;
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    if (node.parentNode) {
        node.parentNode.removeChild(node);
    }
}
function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
        if (iterations[i])
            iterations[i].d(detaching);
    }
}
function element(name) {
    return document.createElement(name);
}
function svg_element(name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function empty() {
    return text('');
}
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function prevent_default(fn) {
    return function (event) {
        event.preventDefault();
        // @ts-ignore
        return fn.call(this, event);
    };
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
/**
 * List of attributes that should always be set through the attr method,
 * because updating them through the property setter doesn't work reliably.
 * In the example of `width`/`height`, the problem is that the setter only
 * accepts numeric values, but the attribute can also be set to a string like `50%`.
 * If this list becomes too big, rethink this approach.
 */
const always_set_through_set_attribute = ['width', 'height'];
function set_attributes(node, attributes) {
    // @ts-ignore
    const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
    for (const key in attributes) {
        if (attributes[key] == null) {
            node.removeAttribute(key);
        }
        else if (key === 'style') {
            node.style.cssText = attributes[key];
        }
        else if (key === '__value') {
            node.value = node[key] = attributes[key];
        }
        else if (descriptors[key] && descriptors[key].set && always_set_through_set_attribute.indexOf(key) === -1) {
            node[key] = attributes[key];
        }
        else {
            attr(node, key, attributes[key]);
        }
    }
}
function set_svg_attributes(node, attributes) {
    for (const key in attributes) {
        attr(node, key, attributes[key]);
    }
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_data(text, data) {
    data = '' + data;
    if (text.data === data)
        return;
    text.data = data;
}
function set_style(node, key, value, important) {
    if (value == null) {
        node.style.removeProperty(key);
    }
    else {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
}
function toggle_class(element, name, toggle) {
    element.classList[toggle ? 'add' : 'remove'](name);
}
function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, bubbles, cancelable, detail);
    return e;
}

// we need to store the information for multiple documents because a Svelte application could also contain iframes
// https://github.com/sveltejs/svelte/issues/3624
const managed_styles = new Map();
let active = 0;
// https://github.com/darkskyapp/string-hash/blob/master/index.js
function hash(str) {
    let hash = 5381;
    let i = str.length;
    while (i--)
        hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
    return hash >>> 0;
}
function create_style_information(doc, node) {
    const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
    managed_styles.set(doc, info);
    return info;
}
function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
    const step = 16.666 / duration;
    let keyframes = '{\n';
    for (let p = 0; p <= 1; p += step) {
        const t = a + (b - a) * ease(p);
        keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
    }
    const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
    const name = `__svelte_${hash(rule)}_${uid}`;
    const doc = get_root_for_style(node);
    const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
    if (!rules[name]) {
        rules[name] = true;
        stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
    }
    const animation = node.style.animation || '';
    node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
    active += 1;
    return name;
}
function delete_rule(node, name) {
    const previous = (node.style.animation || '').split(', ');
    const next = previous.filter(name
        ? anim => anim.indexOf(name) < 0 // remove specific animation
        : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
    );
    const deleted = previous.length - next.length;
    if (deleted) {
        node.style.animation = next.join(', ');
        active -= deleted;
        if (!active)
            clear_rules();
    }
}
function clear_rules() {
    raf(() => {
        if (active)
            return;
        managed_styles.forEach(info => {
            const { ownerNode } = info.stylesheet;
            // there is no ownerNode if it runs on jsdom.
            if (ownerNode)
                detach(ownerNode);
        });
        managed_styles.clear();
    });
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error('Function called outside component initialization');
    return current_component;
}
/**
 * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
 * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
 * it can be called from an external module).
 *
 * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
 *
 * https://svelte.dev/docs#run-time-svelte-onmount
 */
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}
/**
 * Schedules a callback to run immediately before the component is unmounted.
 *
 * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
 * only one that runs inside a server-side component.
 *
 * https://svelte.dev/docs#run-time-svelte-ondestroy
 */
function onDestroy(fn) {
    get_current_component().$$.on_destroy.push(fn);
}
/**
 * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
 * Event dispatchers are functions that can take two arguments: `name` and `detail`.
 *
 * Component events created with `createEventDispatcher` create a
 * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
 * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
 * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
 * property and can contain any type of data.
 *
 * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
 */
function createEventDispatcher() {
    const component = get_current_component();
    return (type, detail, { cancelable = false } = {}) => {
        const callbacks = component.$$.callbacks[type];
        if (callbacks) {
            // TODO are there situations where events could be dispatched
            // in a server (non-DOM) environment?
            const event = custom_event(type, detail, { cancelable });
            callbacks.slice().forEach(fn => {
                fn.call(component, event);
            });
            return !event.defaultPrevented;
        }
        return true;
    };
}

const dirty_components = [];
const binding_callbacks = [];
let render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = /* @__PURE__ */ Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
// flush() calls callbacks in this order:
// 1. All beforeUpdate callbacks, in order: parents before children
// 2. All bind:this callbacks, in reverse order: children before parents.
// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
//    for afterUpdates called during the initial onMount, which are called in
//    reverse order: children before parents.
// Since callbacks might update component values, which could trigger another
// call to flush(), the following steps guard against this:
// 1. During beforeUpdate, any updated components will be added to the
//    dirty_components array and will cause a reentrant call to flush(). Because
//    the flush index is kept outside the function, the reentrant call will pick
//    up where the earlier call left off and go through all dirty components. The
//    current_component value is saved and restored so that the reentrant call will
//    not interfere with the "parent" flush() call.
// 2. bind:this callbacks cannot trigger new flush() calls.
// 3. During afterUpdate, any updated components will NOT have their afterUpdate
//    callback called a second time; the seen_callbacks set, outside the flush()
//    function, guarantees this behavior.
const seen_callbacks = new Set();
let flushidx = 0; // Do *not* move this inside the flush() function
function flush() {
    // Do not reenter flush while dirty components are updated, as this can
    // result in an infinite loop. Instead, let the inner flush handle it.
    // Reentrancy is ok afterwards for bindings etc.
    if (flushidx !== 0) {
        return;
    }
    const saved_component = current_component;
    do {
        // first, call beforeUpdate functions
        // and update components
        try {
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
        }
        catch (e) {
            // reset dirty state to not end up in a deadlocked state and then rethrow
            dirty_components.length = 0;
            flushidx = 0;
            throw e;
        }
        set_current_component(null);
        dirty_components.length = 0;
        flushidx = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    seen_callbacks.clear();
    set_current_component(saved_component);
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
/**
 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
 */
function flush_render_callbacks(fns) {
    const filtered = [];
    const targets = [];
    render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
    targets.forEach((c) => c());
    render_callbacks = filtered;
}

let promise;
function wait() {
    if (!promise) {
        promise = Promise.resolve();
        promise.then(() => {
            promise = null;
        });
    }
    return promise;
}
function dispatch(node, direction, kind) {
    node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
}
const outroing = new Set();
let outros;
function group_outros() {
    outros = {
        r: 0,
        c: [],
        p: outros // parent group
    };
}
function check_outros() {
    if (!outros.r) {
        run_all(outros.c);
    }
    outros = outros.p;
}
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
    else if (callback) {
        callback();
    }
}
const null_transition = { duration: 0 };
function create_bidirectional_transition(node, fn, params, intro) {
    const options = { direction: 'both' };
    let config = fn(node, params, options);
    let t = intro ? 0 : 1;
    let running_program = null;
    let pending_program = null;
    let animation_name = null;
    function clear_animation() {
        if (animation_name)
            delete_rule(node, animation_name);
    }
    function init(program, duration) {
        const d = (program.b - t);
        duration *= Math.abs(d);
        return {
            a: t,
            b: program.b,
            d,
            duration,
            start: program.start,
            end: program.start + duration,
            group: program.group
        };
    }
    function go(b) {
        const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
        const program = {
            start: now() + delay,
            b
        };
        if (!b) {
            // @ts-ignore todo: improve typings
            program.group = outros;
            outros.r += 1;
        }
        if (running_program || pending_program) {
            pending_program = program;
        }
        else {
            // if this is an intro, and there's a delay, we need to do
            // an initial tick and/or apply CSS animation immediately
            if (css) {
                clear_animation();
                animation_name = create_rule(node, t, b, duration, delay, easing, css);
            }
            if (b)
                tick(0, 1);
            running_program = init(program, duration);
            add_render_callback(() => dispatch(node, b, 'start'));
            loop(now => {
                if (pending_program && now > pending_program.start) {
                    running_program = init(pending_program, duration);
                    pending_program = null;
                    dispatch(node, running_program.b, 'start');
                    if (css) {
                        clear_animation();
                        animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                    }
                }
                if (running_program) {
                    if (now >= running_program.end) {
                        tick(t = running_program.b, 1 - t);
                        dispatch(node, running_program.b, 'end');
                        if (!pending_program) {
                            // we're done
                            if (running_program.b) {
                                // intro — we can tidy up immediately
                                clear_animation();
                            }
                            else {
                                // outro — needs to be coordinated
                                if (!--running_program.group.r)
                                    run_all(running_program.group.c);
                            }
                        }
                        running_program = null;
                    }
                    else if (now >= running_program.start) {
                        const p = now - running_program.start;
                        t = running_program.a + running_program.d * easing(p / running_program.duration);
                        tick(t, 1 - t);
                    }
                }
                return !!(running_program || pending_program);
            });
        }
    }
    return {
        run(b) {
            if (is_function(config)) {
                wait().then(() => {
                    // @ts-ignore
                    config = config(options);
                    go(b);
                });
            }
            else {
                go(b);
            }
        },
        end() {
            clear_animation();
            running_program = pending_program = null;
        }
    };
}

function get_spread_update(levels, updates) {
    const update = {};
    const to_null_out = {};
    const accounted_for = { $$scope: 1 };
    let i = levels.length;
    while (i--) {
        const o = levels[i];
        const n = updates[i];
        if (n) {
            for (const key in o) {
                if (!(key in n))
                    to_null_out[key] = 1;
            }
            for (const key in n) {
                if (!accounted_for[key]) {
                    update[key] = n[key];
                    accounted_for[key] = 1;
                }
            }
            levels[i] = n;
        }
        else {
            for (const key in o) {
                accounted_for[key] = 1;
            }
        }
    }
    for (const key in to_null_out) {
        if (!(key in update))
            update[key] = undefined;
    }
    return update;
}
function create_component(block) {
    block && block.c();
}
function mount_component(component, target, anchor, customElement) {
    const { fragment, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    if (!customElement) {
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
            // if the component was destroyed immediately
            // it will update the `$$.on_destroy` reference to `null`.
            // the destructured on_destroy may still reference to the old array
            if (component.$$.on_destroy) {
                component.$$.on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
    }
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        flush_render_callbacks($$.after_update);
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const $$ = component.$$ = {
        fragment: null,
        ctx: [],
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        on_disconnect: [],
        before_update: [],
        after_update: [],
        context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
        // everything else
        callbacks: blank_object(),
        dirty,
        skip_bound: false,
        root: options.target || parent_component.$$.root
    };
    append_styles && append_styles($$.root);
    let ready = false;
    $$.ctx = instance
        ? instance(component, options.props || {}, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if (!$$.skip_bound && $$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor, options.customElement);
        flush();
    }
    set_current_component(parent_component);
}
/**
 * Base class for Svelte components. Used when dev=false.
 */
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        if (!is_function(callback)) {
            return noop;
        }
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set($$props) {
        if (this.$$set && !is_empty($$props)) {
            this.$$.skip_bound = true;
            this.$$set($$props);
            this.$$.skip_bound = false;
        }
    }
}

/* generated by Svelte v3.58.0 */

function create_fragment(ctx) {
	let meta0;
	let meta1;
	let link0;
	let link1;
	let link2;
	let link3;
	let link3_href_value;
	let style;

	return {
		c() {
			meta0 = element("meta");
			meta1 = element("meta");
			link0 = element("link");
			link1 = element("link");
			link2 = element("link");
			link3 = element("link");
			style = element("style");
			style.textContent = "/* Reset & standardize default styles */\n@import url(\"https://unpkg.com/@primo-app/primo@1.3.64/reset.css\") layer;\n\n/* Design tokens (apply to components) */\n:root {\n  --color-tint: #f8fbff;\n\n  --font-heading: \"Space Grotesk\", sans-serif;\n  --font-body: \"Open Sans\", sans-serif;\n\n  /* Colors */\n  --color-base: #183b56;\n  --color-brand: #1565d8;\n  --color-accent: #36b37e;\n  --color-accent-2: #0d2436;\n  --color-light: #fcfcfd;\n  --color-shade: #cbcace;\n  --color-inverted: white;\n  --color-tint: #e5eaf4;\n\n  /* Base values */\n  --color: var(--color-base);\n  --box-shadow: 0px 4px 30px rgba(0, 0, 0, 0.2);\n  --border-radius: 8px;\n  --border-color: #eee;\n  --background: white;\n}\n\n/* Root element (use instead of `body`) */\n#page {\n  font-family: var(--font-body);\n  color: var(--color-base);\n  line-height: 1.2;\n  font-size: 1.125rem;\n  background: var(--background);\n}\n\n.section.has-content {\n  display: flex;\n  justify-content: center;\n  padding: 5rem 2rem;\n}\n\n.section.has-content .content {\n    max-width: 800px;\n    width: 100%;\n  }\n\n.section-container {\n  max-width: 1250px;\n  margin: 0 auto;\n  padding: 5rem 2rem;\n}\n\n.heading-group {\n  display: grid;\n  gap: 1rem;\n  place-content: center;\n  text-align: center;\n}\n\n.heading-group .superhead {\n    font-family: var(--font-body);\n    color: var(--color-accent);\n    font-size: 0.875rem;\n    font-weight: 500;\n    letter-spacing: 1.5px;\n    text-transform: uppercase;\n  }\n\n.heading-group .subheading {\n    color: #4f6373;\n    line-height: 1.4;\n    max-width: 600px;\n    font-weight: 400;\n    max-width: 600px;\n    margin: 0 auto;\n  }\n\n.heading {\n  font-family: var(--font-heading);\n  font-size: 2rem;\n  line-height: 1.1;\n  font-weight: 500;\n  max-width: 600px;\n}\n\n.button {\n  color: var(--color-brand, white);\n  background: var(--color-inverted);\n  border: 2px solid var(--color-brand);\n  border-radius: 6px;\n  padding: 8px 20px;\n  transition: 0.1s background, 0.1s color;\n}\n\n.button:hover {\n    color: var(--color-inverted);\n    background: var(--color-brand);\n    border-color: var(--color-inverted);\n  }\n\n.button.inverted {\n    background: var(--color-white);\n    color: var(--color-brand);\n    border-color: #0d2436;\n  }\n\n.link {\n  font-size: 1.125rem;\n  font-weight: 400;\n  color: var(--color-brand);\n}\n\n.link .arrow {\n    transition: transform 0.1s;\n  }\n\n.link:hover .arrow {\n    transform: translateX(4px);\n  }";
			attr(meta0, "name", "viewport");
			attr(meta0, "content", "width=device-width, initial-scale=1.0");
			attr(meta1, "charset", "UTF-8");
			attr(link0, "rel", "preconnect");
			attr(link0, "href", "https://fonts.bunny.net");
			attr(link1, "href", "https://fonts.bunny.net/css?family=fredoka:300,400,500,600,700|space-grotesk:300,400,500,600,700");
			attr(link1, "rel", "stylesheet");
			attr(link2, "href", "https://fonts.bunny.net/css?family=fredoka:300,400,500,600,700|open-sans:300,300i,400,400i,500,500i,600,600i,700,700i,800,800i|space-grotesk:300,400,500,600,700");
			attr(link2, "rel", "stylesheet");
			attr(link3, "rel", "icon");
			attr(link3, "type", "image/png");
			attr(link3, "sizes", "32x32");
			attr(link3, "href", link3_href_value = /*favicon*/ ctx[0].url);
		},
		m(target, anchor) {
			append(document.head, meta0);
			append(document.head, meta1);
			append(document.head, link0);
			append(document.head, link1);
			append(document.head, link2);
			append(document.head, link3);
			append(document.head, style);
		},
		p(ctx, [dirty]) {
			if (dirty & /*favicon*/ 1 && link3_href_value !== (link3_href_value = /*favicon*/ ctx[0].url)) {
				attr(link3, "href", link3_href_value);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			detach(meta0);
			detach(meta1);
			detach(link0);
			detach(link1);
			detach(link2);
			detach(link3);
			detach(style);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { favicon } = $$props;

	$$self.$$set = $$props => {
		if ('favicon' in $$props) $$invalidate(0, favicon = $$props.favicon);
	};

	return [favicon];
}

class Component extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, { favicon: 0 });
	}
}

function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
    const o = +getComputedStyle(node).opacity;
    return {
        delay,
        duration,
        easing,
        css: t => `opacity: ${t * o}`
    };
}

const matchIconName = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const stringToIcon = (value, validate, allowSimpleName, provider = "") => {
  const colonSeparated = value.split(":");
  if (value.slice(0, 1) === "@") {
    if (colonSeparated.length < 2 || colonSeparated.length > 3) {
      return null;
    }
    provider = colonSeparated.shift().slice(1);
  }
  if (colonSeparated.length > 3 || !colonSeparated.length) {
    return null;
  }
  if (colonSeparated.length > 1) {
    const name2 = colonSeparated.pop();
    const prefix = colonSeparated.pop();
    const result = {
      provider: colonSeparated.length > 0 ? colonSeparated[0] : provider,
      prefix,
      name: name2
    };
    return validate && !validateIconName(result) ? null : result;
  }
  const name = colonSeparated[0];
  const dashSeparated = name.split("-");
  if (dashSeparated.length > 1) {
    const result = {
      provider,
      prefix: dashSeparated.shift(),
      name: dashSeparated.join("-")
    };
    return validate && !validateIconName(result) ? null : result;
  }
  if (allowSimpleName && provider === "") {
    const result = {
      provider,
      prefix: "",
      name
    };
    return validate && !validateIconName(result, allowSimpleName) ? null : result;
  }
  return null;
};
const validateIconName = (icon, allowSimpleName) => {
  if (!icon) {
    return false;
  }
  return !!((icon.provider === "" || icon.provider.match(matchIconName)) && (allowSimpleName && icon.prefix === "" || icon.prefix.match(matchIconName)) && icon.name.match(matchIconName));
};
const defaultIconDimensions = Object.freeze({
  left: 0,
  top: 0,
  width: 16,
  height: 16
});
const defaultIconTransformations = Object.freeze({
  rotate: 0,
  vFlip: false,
  hFlip: false
});
const defaultIconProps = Object.freeze({
  ...defaultIconDimensions,
  ...defaultIconTransformations
});
const defaultExtendedIconProps = Object.freeze({
  ...defaultIconProps,
  body: "",
  hidden: false
});
function mergeIconTransformations(obj1, obj2) {
  const result = {};
  if (!obj1.hFlip !== !obj2.hFlip) {
    result.hFlip = true;
  }
  if (!obj1.vFlip !== !obj2.vFlip) {
    result.vFlip = true;
  }
  const rotate = ((obj1.rotate || 0) + (obj2.rotate || 0)) % 4;
  if (rotate) {
    result.rotate = rotate;
  }
  return result;
}
function mergeIconData(parent, child) {
  const result = mergeIconTransformations(parent, child);
  for (const key in defaultExtendedIconProps) {
    if (key in defaultIconTransformations) {
      if (key in parent && !(key in result)) {
        result[key] = defaultIconTransformations[key];
      }
    } else if (key in child) {
      result[key] = child[key];
    } else if (key in parent) {
      result[key] = parent[key];
    }
  }
  return result;
}
function getIconsTree(data, names) {
  const icons = data.icons;
  const aliases = data.aliases || /* @__PURE__ */ Object.create(null);
  const resolved = /* @__PURE__ */ Object.create(null);
  function resolve(name) {
    if (icons[name]) {
      return resolved[name] = [];
    }
    if (!(name in resolved)) {
      resolved[name] = null;
      const parent = aliases[name] && aliases[name].parent;
      const value = parent && resolve(parent);
      if (value) {
        resolved[name] = [parent].concat(value);
      }
    }
    return resolved[name];
  }
  (names || Object.keys(icons).concat(Object.keys(aliases))).forEach(resolve);
  return resolved;
}
function internalGetIconData(data, name, tree) {
  const icons = data.icons;
  const aliases = data.aliases || /* @__PURE__ */ Object.create(null);
  let currentProps = {};
  function parse(name2) {
    currentProps = mergeIconData(icons[name2] || aliases[name2], currentProps);
  }
  parse(name);
  tree.forEach(parse);
  return mergeIconData(data, currentProps);
}
function parseIconSet(data, callback) {
  const names = [];
  if (typeof data !== "object" || typeof data.icons !== "object") {
    return names;
  }
  if (data.not_found instanceof Array) {
    data.not_found.forEach((name) => {
      callback(name, null);
      names.push(name);
    });
  }
  const tree = getIconsTree(data);
  for (const name in tree) {
    const item = tree[name];
    if (item) {
      callback(name, internalGetIconData(data, name, item));
      names.push(name);
    }
  }
  return names;
}
const optionalPropertyDefaults = {
  provider: "",
  aliases: {},
  not_found: {},
  ...defaultIconDimensions
};
function checkOptionalProps(item, defaults) {
  for (const prop in defaults) {
    if (prop in item && typeof item[prop] !== typeof defaults[prop]) {
      return false;
    }
  }
  return true;
}
function quicklyValidateIconSet(obj) {
  if (typeof obj !== "object" || obj === null) {
    return null;
  }
  const data = obj;
  if (typeof data.prefix !== "string" || !obj.icons || typeof obj.icons !== "object") {
    return null;
  }
  if (!checkOptionalProps(obj, optionalPropertyDefaults)) {
    return null;
  }
  const icons = data.icons;
  for (const name in icons) {
    const icon = icons[name];
    if (!name.match(matchIconName) || typeof icon.body !== "string" || !checkOptionalProps(icon, defaultExtendedIconProps)) {
      return null;
    }
  }
  const aliases = data.aliases || /* @__PURE__ */ Object.create(null);
  for (const name in aliases) {
    const icon = aliases[name];
    const parent = icon.parent;
    if (!name.match(matchIconName) || typeof parent !== "string" || !icons[parent] && !aliases[parent] || !checkOptionalProps(icon, defaultExtendedIconProps)) {
      return null;
    }
  }
  return data;
}
const dataStorage = /* @__PURE__ */ Object.create(null);
function newStorage(provider, prefix) {
  return {
    provider,
    prefix,
    icons: /* @__PURE__ */ Object.create(null),
    missing: /* @__PURE__ */ new Set()
  };
}
function getStorage(provider, prefix) {
  const providerStorage = dataStorage[provider] || (dataStorage[provider] = /* @__PURE__ */ Object.create(null));
  return providerStorage[prefix] || (providerStorage[prefix] = newStorage(provider, prefix));
}
function addIconSet(storage2, data) {
  if (!quicklyValidateIconSet(data)) {
    return [];
  }
  return parseIconSet(data, (name, icon) => {
    if (icon) {
      storage2.icons[name] = icon;
    } else {
      storage2.missing.add(name);
    }
  });
}
function addIconToStorage(storage2, name, icon) {
  try {
    if (typeof icon.body === "string") {
      storage2.icons[name] = {...icon};
      return true;
    }
  } catch (err) {
  }
  return false;
}
let simpleNames = false;
function allowSimpleNames(allow) {
  if (typeof allow === "boolean") {
    simpleNames = allow;
  }
  return simpleNames;
}
function getIconData(name) {
  const icon = typeof name === "string" ? stringToIcon(name, true, simpleNames) : name;
  if (icon) {
    const storage2 = getStorage(icon.provider, icon.prefix);
    const iconName = icon.name;
    return storage2.icons[iconName] || (storage2.missing.has(iconName) ? null : void 0);
  }
}
function addIcon(name, data) {
  const icon = stringToIcon(name, true, simpleNames);
  if (!icon) {
    return false;
  }
  const storage2 = getStorage(icon.provider, icon.prefix);
  return addIconToStorage(storage2, icon.name, data);
}
function addCollection(data, provider) {
  if (typeof data !== "object") {
    return false;
  }
  if (typeof provider !== "string") {
    provider = data.provider || "";
  }
  if (simpleNames && !provider && !data.prefix) {
    let added = false;
    if (quicklyValidateIconSet(data)) {
      data.prefix = "";
      parseIconSet(data, (name, icon) => {
        if (icon && addIcon(name, icon)) {
          added = true;
        }
      });
    }
    return added;
  }
  const prefix = data.prefix;
  if (!validateIconName({
    provider,
    prefix,
    name: "a"
  })) {
    return false;
  }
  const storage2 = getStorage(provider, prefix);
  return !!addIconSet(storage2, data);
}
const defaultIconSizeCustomisations = Object.freeze({
  width: null,
  height: null
});
const defaultIconCustomisations = Object.freeze({
  ...defaultIconSizeCustomisations,
  ...defaultIconTransformations
});
const unitsSplit = /(-?[0-9.]*[0-9]+[0-9.]*)/g;
const unitsTest = /^-?[0-9.]*[0-9]+[0-9.]*$/g;
function calculateSize(size, ratio, precision) {
  if (ratio === 1) {
    return size;
  }
  precision = precision || 100;
  if (typeof size === "number") {
    return Math.ceil(size * ratio * precision) / precision;
  }
  if (typeof size !== "string") {
    return size;
  }
  const oldParts = size.split(unitsSplit);
  if (oldParts === null || !oldParts.length) {
    return size;
  }
  const newParts = [];
  let code = oldParts.shift();
  let isNumber = unitsTest.test(code);
  while (true) {
    if (isNumber) {
      const num = parseFloat(code);
      if (isNaN(num)) {
        newParts.push(code);
      } else {
        newParts.push(Math.ceil(num * ratio * precision) / precision);
      }
    } else {
      newParts.push(code);
    }
    code = oldParts.shift();
    if (code === void 0) {
      return newParts.join("");
    }
    isNumber = !isNumber;
  }
}
const isUnsetKeyword = (value) => value === "unset" || value === "undefined" || value === "none";
function iconToSVG(icon, customisations) {
  const fullIcon = {
    ...defaultIconProps,
    ...icon
  };
  const fullCustomisations = {
    ...defaultIconCustomisations,
    ...customisations
  };
  const box = {
    left: fullIcon.left,
    top: fullIcon.top,
    width: fullIcon.width,
    height: fullIcon.height
  };
  let body = fullIcon.body;
  [fullIcon, fullCustomisations].forEach((props) => {
    const transformations = [];
    const hFlip = props.hFlip;
    const vFlip = props.vFlip;
    let rotation = props.rotate;
    if (hFlip) {
      if (vFlip) {
        rotation += 2;
      } else {
        transformations.push("translate(" + (box.width + box.left).toString() + " " + (0 - box.top).toString() + ")");
        transformations.push("scale(-1 1)");
        box.top = box.left = 0;
      }
    } else if (vFlip) {
      transformations.push("translate(" + (0 - box.left).toString() + " " + (box.height + box.top).toString() + ")");
      transformations.push("scale(1 -1)");
      box.top = box.left = 0;
    }
    let tempValue;
    if (rotation < 0) {
      rotation -= Math.floor(rotation / 4) * 4;
    }
    rotation = rotation % 4;
    switch (rotation) {
      case 1:
        tempValue = box.height / 2 + box.top;
        transformations.unshift("rotate(90 " + tempValue.toString() + " " + tempValue.toString() + ")");
        break;
      case 2:
        transformations.unshift("rotate(180 " + (box.width / 2 + box.left).toString() + " " + (box.height / 2 + box.top).toString() + ")");
        break;
      case 3:
        tempValue = box.width / 2 + box.left;
        transformations.unshift("rotate(-90 " + tempValue.toString() + " " + tempValue.toString() + ")");
        break;
    }
    if (rotation % 2 === 1) {
      if (box.left !== box.top) {
        tempValue = box.left;
        box.left = box.top;
        box.top = tempValue;
      }
      if (box.width !== box.height) {
        tempValue = box.width;
        box.width = box.height;
        box.height = tempValue;
      }
    }
    if (transformations.length) {
      body = '<g transform="' + transformations.join(" ") + '">' + body + "</g>";
    }
  });
  const customisationsWidth = fullCustomisations.width;
  const customisationsHeight = fullCustomisations.height;
  const boxWidth = box.width;
  const boxHeight = box.height;
  let width;
  let height;
  if (customisationsWidth === null) {
    height = customisationsHeight === null ? "1em" : customisationsHeight === "auto" ? boxHeight : customisationsHeight;
    width = calculateSize(height, boxWidth / boxHeight);
  } else {
    width = customisationsWidth === "auto" ? boxWidth : customisationsWidth;
    height = customisationsHeight === null ? calculateSize(width, boxHeight / boxWidth) : customisationsHeight === "auto" ? boxHeight : customisationsHeight;
  }
  const attributes = {};
  const setAttr = (prop, value) => {
    if (!isUnsetKeyword(value)) {
      attributes[prop] = value.toString();
    }
  };
  setAttr("width", width);
  setAttr("height", height);
  attributes.viewBox = box.left.toString() + " " + box.top.toString() + " " + boxWidth.toString() + " " + boxHeight.toString();
  return {
    attributes,
    body
  };
}
const regex = /\sid="(\S+)"/g;
const randomPrefix = "IconifyId" + Date.now().toString(16) + (Math.random() * 16777216 | 0).toString(16);
let counter = 0;
function replaceIDs(body, prefix = randomPrefix) {
  const ids = [];
  let match;
  while (match = regex.exec(body)) {
    ids.push(match[1]);
  }
  if (!ids.length) {
    return body;
  }
  const suffix = "suffix" + (Math.random() * 16777216 | Date.now()).toString(16);
  ids.forEach((id) => {
    const newID = typeof prefix === "function" ? prefix(id) : prefix + (counter++).toString();
    const escapedID = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    body = body.replace(new RegExp('([#;"])(' + escapedID + ')([")]|\\.[a-z])', "g"), "$1" + newID + suffix + "$3");
  });
  body = body.replace(new RegExp(suffix, "g"), "");
  return body;
}
const storage = /* @__PURE__ */ Object.create(null);
function setAPIModule(provider, item) {
  storage[provider] = item;
}
function getAPIModule(provider) {
  return storage[provider] || storage[""];
}
function createAPIConfig(source) {
  let resources;
  if (typeof source.resources === "string") {
    resources = [source.resources];
  } else {
    resources = source.resources;
    if (!(resources instanceof Array) || !resources.length) {
      return null;
    }
  }
  const result = {
    resources,
    path: source.path || "/",
    maxURL: source.maxURL || 500,
    rotate: source.rotate || 750,
    timeout: source.timeout || 5e3,
    random: source.random === true,
    index: source.index || 0,
    dataAfterTimeout: source.dataAfterTimeout !== false
  };
  return result;
}
const configStorage = /* @__PURE__ */ Object.create(null);
const fallBackAPISources = [
  "https://api.simplesvg.com",
  "https://api.unisvg.com"
];
const fallBackAPI = [];
while (fallBackAPISources.length > 0) {
  if (fallBackAPISources.length === 1) {
    fallBackAPI.push(fallBackAPISources.shift());
  } else {
    if (Math.random() > 0.5) {
      fallBackAPI.push(fallBackAPISources.shift());
    } else {
      fallBackAPI.push(fallBackAPISources.pop());
    }
  }
}
configStorage[""] = createAPIConfig({
  resources: ["https://api.iconify.design"].concat(fallBackAPI)
});
function addAPIProvider(provider, customConfig) {
  const config = createAPIConfig(customConfig);
  if (config === null) {
    return false;
  }
  configStorage[provider] = config;
  return true;
}
function getAPIConfig(provider) {
  return configStorage[provider];
}
const detectFetch = () => {
  let callback;
  try {
    callback = fetch;
    if (typeof callback === "function") {
      return callback;
    }
  } catch (err) {
  }
};
let fetchModule = detectFetch();
function calculateMaxLength(provider, prefix) {
  const config = getAPIConfig(provider);
  if (!config) {
    return 0;
  }
  let result;
  if (!config.maxURL) {
    result = 0;
  } else {
    let maxHostLength = 0;
    config.resources.forEach((item) => {
      const host = item;
      maxHostLength = Math.max(maxHostLength, host.length);
    });
    const url = prefix + ".json?icons=";
    result = config.maxURL - maxHostLength - config.path.length - url.length;
  }
  return result;
}
function shouldAbort(status) {
  return status === 404;
}
const prepare = (provider, prefix, icons) => {
  const results = [];
  const maxLength = calculateMaxLength(provider, prefix);
  const type = "icons";
  let item = {
    type,
    provider,
    prefix,
    icons: []
  };
  let length = 0;
  icons.forEach((name, index) => {
    length += name.length + 1;
    if (length >= maxLength && index > 0) {
      results.push(item);
      item = {
        type,
        provider,
        prefix,
        icons: []
      };
      length = name.length;
    }
    item.icons.push(name);
  });
  results.push(item);
  return results;
};
function getPath(provider) {
  if (typeof provider === "string") {
    const config = getAPIConfig(provider);
    if (config) {
      return config.path;
    }
  }
  return "/";
}
const send = (host, params, callback) => {
  if (!fetchModule) {
    callback("abort", 424);
    return;
  }
  let path = getPath(params.provider);
  switch (params.type) {
    case "icons": {
      const prefix = params.prefix;
      const icons = params.icons;
      const iconsList = icons.join(",");
      const urlParams = new URLSearchParams({
        icons: iconsList
      });
      path += prefix + ".json?" + urlParams.toString();
      break;
    }
    case "custom": {
      const uri = params.uri;
      path += uri.slice(0, 1) === "/" ? uri.slice(1) : uri;
      break;
    }
    default:
      callback("abort", 400);
      return;
  }
  let defaultError = 503;
  fetchModule(host + path).then((response) => {
    const status = response.status;
    if (status !== 200) {
      setTimeout(() => {
        callback(shouldAbort(status) ? "abort" : "next", status);
      });
      return;
    }
    defaultError = 501;
    return response.json();
  }).then((data) => {
    if (typeof data !== "object" || data === null) {
      setTimeout(() => {
        if (data === 404) {
          callback("abort", data);
        } else {
          callback("next", defaultError);
        }
      });
      return;
    }
    setTimeout(() => {
      callback("success", data);
    });
  }).catch(() => {
    callback("next", defaultError);
  });
};
const fetchAPIModule = {
  prepare,
  send
};
function sortIcons(icons) {
  const result = {
    loaded: [],
    missing: [],
    pending: []
  };
  const storage2 = /* @__PURE__ */ Object.create(null);
  icons.sort((a, b) => {
    if (a.provider !== b.provider) {
      return a.provider.localeCompare(b.provider);
    }
    if (a.prefix !== b.prefix) {
      return a.prefix.localeCompare(b.prefix);
    }
    return a.name.localeCompare(b.name);
  });
  let lastIcon = {
    provider: "",
    prefix: "",
    name: ""
  };
  icons.forEach((icon) => {
    if (lastIcon.name === icon.name && lastIcon.prefix === icon.prefix && lastIcon.provider === icon.provider) {
      return;
    }
    lastIcon = icon;
    const provider = icon.provider;
    const prefix = icon.prefix;
    const name = icon.name;
    const providerStorage = storage2[provider] || (storage2[provider] = /* @__PURE__ */ Object.create(null));
    const localStorage = providerStorage[prefix] || (providerStorage[prefix] = getStorage(provider, prefix));
    let list;
    if (name in localStorage.icons) {
      list = result.loaded;
    } else if (prefix === "" || localStorage.missing.has(name)) {
      list = result.missing;
    } else {
      list = result.pending;
    }
    const item = {
      provider,
      prefix,
      name
    };
    list.push(item);
  });
  return result;
}
function removeCallback(storages, id) {
  storages.forEach((storage2) => {
    const items = storage2.loaderCallbacks;
    if (items) {
      storage2.loaderCallbacks = items.filter((row) => row.id !== id);
    }
  });
}
function updateCallbacks(storage2) {
  if (!storage2.pendingCallbacksFlag) {
    storage2.pendingCallbacksFlag = true;
    setTimeout(() => {
      storage2.pendingCallbacksFlag = false;
      const items = storage2.loaderCallbacks ? storage2.loaderCallbacks.slice(0) : [];
      if (!items.length) {
        return;
      }
      let hasPending = false;
      const provider = storage2.provider;
      const prefix = storage2.prefix;
      items.forEach((item) => {
        const icons = item.icons;
        const oldLength = icons.pending.length;
        icons.pending = icons.pending.filter((icon) => {
          if (icon.prefix !== prefix) {
            return true;
          }
          const name = icon.name;
          if (storage2.icons[name]) {
            icons.loaded.push({
              provider,
              prefix,
              name
            });
          } else if (storage2.missing.has(name)) {
            icons.missing.push({
              provider,
              prefix,
              name
            });
          } else {
            hasPending = true;
            return true;
          }
          return false;
        });
        if (icons.pending.length !== oldLength) {
          if (!hasPending) {
            removeCallback([storage2], item.id);
          }
          item.callback(icons.loaded.slice(0), icons.missing.slice(0), icons.pending.slice(0), item.abort);
        }
      });
    });
  }
}
let idCounter = 0;
function storeCallback(callback, icons, pendingSources) {
  const id = idCounter++;
  const abort = removeCallback.bind(null, pendingSources, id);
  if (!icons.pending.length) {
    return abort;
  }
  const item = {
    id,
    icons,
    callback,
    abort
  };
  pendingSources.forEach((storage2) => {
    (storage2.loaderCallbacks || (storage2.loaderCallbacks = [])).push(item);
  });
  return abort;
}
function listToIcons(list, validate = true, simpleNames2 = false) {
  const result = [];
  list.forEach((item) => {
    const icon = typeof item === "string" ? stringToIcon(item, validate, simpleNames2) : item;
    if (icon) {
      result.push(icon);
    }
  });
  return result;
}
var defaultConfig = {
  resources: [],
  index: 0,
  timeout: 2e3,
  rotate: 750,
  random: false,
  dataAfterTimeout: false
};
function sendQuery(config, payload, query, done) {
  const resourcesCount = config.resources.length;
  const startIndex = config.random ? Math.floor(Math.random() * resourcesCount) : config.index;
  let resources;
  if (config.random) {
    let list = config.resources.slice(0);
    resources = [];
    while (list.length > 1) {
      const nextIndex = Math.floor(Math.random() * list.length);
      resources.push(list[nextIndex]);
      list = list.slice(0, nextIndex).concat(list.slice(nextIndex + 1));
    }
    resources = resources.concat(list);
  } else {
    resources = config.resources.slice(startIndex).concat(config.resources.slice(0, startIndex));
  }
  const startTime = Date.now();
  let status = "pending";
  let queriesSent = 0;
  let lastError;
  let timer = null;
  let queue = [];
  let doneCallbacks = [];
  if (typeof done === "function") {
    doneCallbacks.push(done);
  }
  function resetTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }
  function abort() {
    if (status === "pending") {
      status = "aborted";
    }
    resetTimer();
    queue.forEach((item) => {
      if (item.status === "pending") {
        item.status = "aborted";
      }
    });
    queue = [];
  }
  function subscribe(callback, overwrite) {
    if (overwrite) {
      doneCallbacks = [];
    }
    if (typeof callback === "function") {
      doneCallbacks.push(callback);
    }
  }
  function getQueryStatus() {
    return {
      startTime,
      payload,
      status,
      queriesSent,
      queriesPending: queue.length,
      subscribe,
      abort
    };
  }
  function failQuery() {
    status = "failed";
    doneCallbacks.forEach((callback) => {
      callback(void 0, lastError);
    });
  }
  function clearQueue() {
    queue.forEach((item) => {
      if (item.status === "pending") {
        item.status = "aborted";
      }
    });
    queue = [];
  }
  function moduleResponse(item, response, data) {
    const isError = response !== "success";
    queue = queue.filter((queued) => queued !== item);
    switch (status) {
      case "pending":
        break;
      case "failed":
        if (isError || !config.dataAfterTimeout) {
          return;
        }
        break;
      default:
        return;
    }
    if (response === "abort") {
      lastError = data;
      failQuery();
      return;
    }
    if (isError) {
      lastError = data;
      if (!queue.length) {
        if (!resources.length) {
          failQuery();
        } else {
          execNext();
        }
      }
      return;
    }
    resetTimer();
    clearQueue();
    if (!config.random) {
      const index = config.resources.indexOf(item.resource);
      if (index !== -1 && index !== config.index) {
        config.index = index;
      }
    }
    status = "completed";
    doneCallbacks.forEach((callback) => {
      callback(data);
    });
  }
  function execNext() {
    if (status !== "pending") {
      return;
    }
    resetTimer();
    const resource = resources.shift();
    if (resource === void 0) {
      if (queue.length) {
        timer = setTimeout(() => {
          resetTimer();
          if (status === "pending") {
            clearQueue();
            failQuery();
          }
        }, config.timeout);
        return;
      }
      failQuery();
      return;
    }
    const item = {
      status: "pending",
      resource,
      callback: (status2, data) => {
        moduleResponse(item, status2, data);
      }
    };
    queue.push(item);
    queriesSent++;
    timer = setTimeout(execNext, config.rotate);
    query(resource, payload, item.callback);
  }
  setTimeout(execNext);
  return getQueryStatus;
}
function initRedundancy(cfg) {
  const config = {
    ...defaultConfig,
    ...cfg
  };
  let queries = [];
  function cleanup() {
    queries = queries.filter((item) => item().status === "pending");
  }
  function query(payload, queryCallback, doneCallback) {
    const query2 = sendQuery(config, payload, queryCallback, (data, error) => {
      cleanup();
      if (doneCallback) {
        doneCallback(data, error);
      }
    });
    queries.push(query2);
    return query2;
  }
  function find(callback) {
    return queries.find((value) => {
      return callback(value);
    }) || null;
  }
  const instance = {
    query,
    find,
    setIndex: (index) => {
      config.index = index;
    },
    getIndex: () => config.index,
    cleanup
  };
  return instance;
}
function emptyCallback$1() {
}
const redundancyCache = /* @__PURE__ */ Object.create(null);
function getRedundancyCache(provider) {
  if (!redundancyCache[provider]) {
    const config = getAPIConfig(provider);
    if (!config) {
      return;
    }
    const redundancy = initRedundancy(config);
    const cachedReundancy = {
      config,
      redundancy
    };
    redundancyCache[provider] = cachedReundancy;
  }
  return redundancyCache[provider];
}
function sendAPIQuery(target, query, callback) {
  let redundancy;
  let send2;
  if (typeof target === "string") {
    const api = getAPIModule(target);
    if (!api) {
      callback(void 0, 424);
      return emptyCallback$1;
    }
    send2 = api.send;
    const cached = getRedundancyCache(target);
    if (cached) {
      redundancy = cached.redundancy;
    }
  } else {
    const config = createAPIConfig(target);
    if (config) {
      redundancy = initRedundancy(config);
      const moduleKey = target.resources ? target.resources[0] : "";
      const api = getAPIModule(moduleKey);
      if (api) {
        send2 = api.send;
      }
    }
  }
  if (!redundancy || !send2) {
    callback(void 0, 424);
    return emptyCallback$1;
  }
  return redundancy.query(query, send2, callback)().abort;
}
const browserCacheVersion = "iconify2";
const browserCachePrefix = "iconify";
const browserCacheCountKey = browserCachePrefix + "-count";
const browserCacheVersionKey = browserCachePrefix + "-version";
const browserStorageHour = 36e5;
const browserStorageCacheExpiration = 168;
function getStoredItem(func, key) {
  try {
    return func.getItem(key);
  } catch (err) {
  }
}
function setStoredItem(func, key, value) {
  try {
    func.setItem(key, value);
    return true;
  } catch (err) {
  }
}
function removeStoredItem(func, key) {
  try {
    func.removeItem(key);
  } catch (err) {
  }
}
function setBrowserStorageItemsCount(storage2, value) {
  return setStoredItem(storage2, browserCacheCountKey, value.toString());
}
function getBrowserStorageItemsCount(storage2) {
  return parseInt(getStoredItem(storage2, browserCacheCountKey)) || 0;
}
const browserStorageConfig = {
  local: true,
  session: true
};
const browserStorageEmptyItems = {
  local: /* @__PURE__ */ new Set(),
  session: /* @__PURE__ */ new Set()
};
let browserStorageStatus = false;
function setBrowserStorageStatus(status) {
  browserStorageStatus = status;
}
let _window = typeof window === "undefined" ? {} : window;
function getBrowserStorage(key) {
  const attr = key + "Storage";
  try {
    if (_window && _window[attr] && typeof _window[attr].length === "number") {
      return _window[attr];
    }
  } catch (err) {
  }
  browserStorageConfig[key] = false;
}
function iterateBrowserStorage(key, callback) {
  const func = getBrowserStorage(key);
  if (!func) {
    return;
  }
  const version = getStoredItem(func, browserCacheVersionKey);
  if (version !== browserCacheVersion) {
    if (version) {
      const total2 = getBrowserStorageItemsCount(func);
      for (let i = 0; i < total2; i++) {
        removeStoredItem(func, browserCachePrefix + i.toString());
      }
    }
    setStoredItem(func, browserCacheVersionKey, browserCacheVersion);
    setBrowserStorageItemsCount(func, 0);
    return;
  }
  const minTime = Math.floor(Date.now() / browserStorageHour) - browserStorageCacheExpiration;
  const parseItem = (index) => {
    const name = browserCachePrefix + index.toString();
    const item = getStoredItem(func, name);
    if (typeof item !== "string") {
      return;
    }
    try {
      const data = JSON.parse(item);
      if (typeof data === "object" && typeof data.cached === "number" && data.cached > minTime && typeof data.provider === "string" && typeof data.data === "object" && typeof data.data.prefix === "string" && callback(data, index)) {
        return true;
      }
    } catch (err) {
    }
    removeStoredItem(func, name);
  };
  let total = getBrowserStorageItemsCount(func);
  for (let i = total - 1; i >= 0; i--) {
    if (!parseItem(i)) {
      if (i === total - 1) {
        total--;
        setBrowserStorageItemsCount(func, total);
      } else {
        browserStorageEmptyItems[key].add(i);
      }
    }
  }
}
function initBrowserStorage() {
  if (browserStorageStatus) {
    return;
  }
  setBrowserStorageStatus(true);
  for (const key in browserStorageConfig) {
    iterateBrowserStorage(key, (item) => {
      const iconSet = item.data;
      const provider = item.provider;
      const prefix = iconSet.prefix;
      const storage2 = getStorage(provider, prefix);
      if (!addIconSet(storage2, iconSet).length) {
        return false;
      }
      const lastModified = iconSet.lastModified || -1;
      storage2.lastModifiedCached = storage2.lastModifiedCached ? Math.min(storage2.lastModifiedCached, lastModified) : lastModified;
      return true;
    });
  }
}
function updateLastModified(storage2, lastModified) {
  const lastValue = storage2.lastModifiedCached;
  if (lastValue && lastValue >= lastModified) {
    return lastValue === lastModified;
  }
  storage2.lastModifiedCached = lastModified;
  if (lastValue) {
    for (const key in browserStorageConfig) {
      iterateBrowserStorage(key, (item) => {
        const iconSet = item.data;
        return item.provider !== storage2.provider || iconSet.prefix !== storage2.prefix || iconSet.lastModified === lastModified;
      });
    }
  }
  return true;
}
function storeInBrowserStorage(storage2, data) {
  if (!browserStorageStatus) {
    initBrowserStorage();
  }
  function store(key) {
    let func;
    if (!browserStorageConfig[key] || !(func = getBrowserStorage(key))) {
      return;
    }
    const set = browserStorageEmptyItems[key];
    let index;
    if (set.size) {
      set.delete(index = Array.from(set).shift());
    } else {
      index = getBrowserStorageItemsCount(func);
      if (!setBrowserStorageItemsCount(func, index + 1)) {
        return;
      }
    }
    const item = {
      cached: Math.floor(Date.now() / browserStorageHour),
      provider: storage2.provider,
      data
    };
    return setStoredItem(func, browserCachePrefix + index.toString(), JSON.stringify(item));
  }
  if (data.lastModified && !updateLastModified(storage2, data.lastModified)) {
    return;
  }
  if (!Object.keys(data.icons).length) {
    return;
  }
  if (data.not_found) {
    data = Object.assign({}, data);
    delete data.not_found;
  }
  if (!store("local")) {
    store("session");
  }
}
function emptyCallback() {
}
function loadedNewIcons(storage2) {
  if (!storage2.iconsLoaderFlag) {
    storage2.iconsLoaderFlag = true;
    setTimeout(() => {
      storage2.iconsLoaderFlag = false;
      updateCallbacks(storage2);
    });
  }
}
function loadNewIcons(storage2, icons) {
  if (!storage2.iconsToLoad) {
    storage2.iconsToLoad = icons;
  } else {
    storage2.iconsToLoad = storage2.iconsToLoad.concat(icons).sort();
  }
  if (!storage2.iconsQueueFlag) {
    storage2.iconsQueueFlag = true;
    setTimeout(() => {
      storage2.iconsQueueFlag = false;
      const {provider, prefix} = storage2;
      const icons2 = storage2.iconsToLoad;
      delete storage2.iconsToLoad;
      let api;
      if (!icons2 || !(api = getAPIModule(provider))) {
        return;
      }
      const params = api.prepare(provider, prefix, icons2);
      params.forEach((item) => {
        sendAPIQuery(provider, item, (data) => {
          if (typeof data !== "object") {
            item.icons.forEach((name) => {
              storage2.missing.add(name);
            });
          } else {
            try {
              const parsed = addIconSet(storage2, data);
              if (!parsed.length) {
                return;
              }
              const pending = storage2.pendingIcons;
              if (pending) {
                parsed.forEach((name) => {
                  pending.delete(name);
                });
              }
              storeInBrowserStorage(storage2, data);
            } catch (err) {
              console.error(err);
            }
          }
          loadedNewIcons(storage2);
        });
      });
    });
  }
}
const loadIcons = (icons, callback) => {
  const cleanedIcons = listToIcons(icons, true, allowSimpleNames());
  const sortedIcons = sortIcons(cleanedIcons);
  if (!sortedIcons.pending.length) {
    let callCallback = true;
    if (callback) {
      setTimeout(() => {
        if (callCallback) {
          callback(sortedIcons.loaded, sortedIcons.missing, sortedIcons.pending, emptyCallback);
        }
      });
    }
    return () => {
      callCallback = false;
    };
  }
  const newIcons = /* @__PURE__ */ Object.create(null);
  const sources = [];
  let lastProvider, lastPrefix;
  sortedIcons.pending.forEach((icon) => {
    const {provider, prefix} = icon;
    if (prefix === lastPrefix && provider === lastProvider) {
      return;
    }
    lastProvider = provider;
    lastPrefix = prefix;
    sources.push(getStorage(provider, prefix));
    const providerNewIcons = newIcons[provider] || (newIcons[provider] = /* @__PURE__ */ Object.create(null));
    if (!providerNewIcons[prefix]) {
      providerNewIcons[prefix] = [];
    }
  });
  sortedIcons.pending.forEach((icon) => {
    const {provider, prefix, name} = icon;
    const storage2 = getStorage(provider, prefix);
    const pendingQueue = storage2.pendingIcons || (storage2.pendingIcons = /* @__PURE__ */ new Set());
    if (!pendingQueue.has(name)) {
      pendingQueue.add(name);
      newIcons[provider][prefix].push(name);
    }
  });
  sources.forEach((storage2) => {
    const {provider, prefix} = storage2;
    if (newIcons[provider][prefix].length) {
      loadNewIcons(storage2, newIcons[provider][prefix]);
    }
  });
  return callback ? storeCallback(callback, sortedIcons, sources) : emptyCallback;
};
function mergeCustomisations(defaults, item) {
  const result = {
    ...defaults
  };
  for (const key in item) {
    const value = item[key];
    const valueType = typeof value;
    if (key in defaultIconSizeCustomisations) {
      if (value === null || value && (valueType === "string" || valueType === "number")) {
        result[key] = value;
      }
    } else if (valueType === typeof result[key]) {
      result[key] = key === "rotate" ? value % 4 : value;
    }
  }
  return result;
}
const separator = /[\s,]+/;
function flipFromString(custom, flip) {
  flip.split(separator).forEach((str) => {
    const value = str.trim();
    switch (value) {
      case "horizontal":
        custom.hFlip = true;
        break;
      case "vertical":
        custom.vFlip = true;
        break;
    }
  });
}
function rotateFromString(value, defaultValue = 0) {
  const units = value.replace(/^-?[0-9.]*/, "");
  function cleanup(value2) {
    while (value2 < 0) {
      value2 += 4;
    }
    return value2 % 4;
  }
  if (units === "") {
    const num = parseInt(value);
    return isNaN(num) ? 0 : cleanup(num);
  } else if (units !== value) {
    let split = 0;
    switch (units) {
      case "%":
        split = 25;
        break;
      case "deg":
        split = 90;
    }
    if (split) {
      let num = parseFloat(value.slice(0, value.length - units.length));
      if (isNaN(num)) {
        return 0;
      }
      num = num / split;
      return num % 1 === 0 ? cleanup(num) : 0;
    }
  }
  return defaultValue;
}
function iconToHTML(body, attributes) {
  let renderAttribsHTML = body.indexOf("xlink:") === -1 ? "" : ' xmlns:xlink="http://www.w3.org/1999/xlink"';
  for (const attr in attributes) {
    renderAttribsHTML += " " + attr + '="' + attributes[attr] + '"';
  }
  return '<svg xmlns="http://www.w3.org/2000/svg"' + renderAttribsHTML + ">" + body + "</svg>";
}
function encodeSVGforURL(svg) {
  return svg.replace(/"/g, "'").replace(/%/g, "%25").replace(/#/g, "%23").replace(/</g, "%3C").replace(/>/g, "%3E").replace(/\s+/g, " ");
}
function svgToData(svg) {
  return "data:image/svg+xml," + encodeSVGforURL(svg);
}
function svgToURL(svg) {
  return 'url("' + svgToData(svg) + '")';
}
const defaultExtendedIconCustomisations = {
  ...defaultIconCustomisations,
  inline: false
};
const svgDefaults = {
  xmlns: "http://www.w3.org/2000/svg",
  "xmlns:xlink": "http://www.w3.org/1999/xlink",
  "aria-hidden": true,
  role: "img"
};
const commonProps = {
  display: "inline-block"
};
const monotoneProps = {
  "background-color": "currentColor"
};
const coloredProps = {
  "background-color": "transparent"
};
const propsToAdd = {
  image: "var(--svg)",
  repeat: "no-repeat",
  size: "100% 100%"
};
const propsToAddTo = {
  "-webkit-mask": monotoneProps,
  mask: monotoneProps,
  background: coloredProps
};
for (const prefix in propsToAddTo) {
  const list = propsToAddTo[prefix];
  for (const prop in propsToAdd) {
    list[prefix + "-" + prop] = propsToAdd[prop];
  }
}
function fixSize(value) {
  return value + (value.match(/^[-0-9.]+$/) ? "px" : "");
}
function render(icon, props) {
  const customisations = mergeCustomisations(defaultExtendedIconCustomisations, props);
  const mode = props.mode || "svg";
  const componentProps = mode === "svg" ? {...svgDefaults} : {};
  if (icon.body.indexOf("xlink:") === -1) {
    delete componentProps["xmlns:xlink"];
  }
  let style = typeof props.style === "string" ? props.style : "";
  for (let key in props) {
    const value = props[key];
    if (value === void 0) {
      continue;
    }
    switch (key) {
      case "icon":
      case "style":
      case "onLoad":
      case "mode":
        break;
      case "inline":
      case "hFlip":
      case "vFlip":
        customisations[key] = value === true || value === "true" || value === 1;
        break;
      case "flip":
        if (typeof value === "string") {
          flipFromString(customisations, value);
        }
        break;
      case "color":
        style = style + (style.length > 0 && style.trim().slice(-1) !== ";" ? ";" : "") + "color: " + value + "; ";
        break;
      case "rotate":
        if (typeof value === "string") {
          customisations[key] = rotateFromString(value);
        } else if (typeof value === "number") {
          customisations[key] = value;
        }
        break;
      case "ariaHidden":
      case "aria-hidden":
        if (value !== true && value !== "true") {
          delete componentProps["aria-hidden"];
        }
        break;
      default:
        if (key.slice(0, 3) === "on:") {
          break;
        }
        if (defaultExtendedIconCustomisations[key] === void 0) {
          componentProps[key] = value;
        }
    }
  }
  const item = iconToSVG(icon, customisations);
  const renderAttribs = item.attributes;
  if (customisations.inline) {
    style = "vertical-align: -0.125em; " + style;
  }
  if (mode === "svg") {
    Object.assign(componentProps, renderAttribs);
    if (style !== "") {
      componentProps.style = style;
    }
    let localCounter = 0;
    let id = props.id;
    if (typeof id === "string") {
      id = id.replace(/-/g, "_");
    }
    return {
      svg: true,
      attributes: componentProps,
      body: replaceIDs(item.body, id ? () => id + "ID" + localCounter++ : "iconifySvelte")
    };
  }
  const {body, width, height} = icon;
  const useMask = mode === "mask" || (mode === "bg" ? false : body.indexOf("currentColor") !== -1);
  const html = iconToHTML(body, {
    ...renderAttribs,
    width: width + "",
    height: height + ""
  });
  const url = svgToURL(html);
  const styles = {
    "--svg": url
  };
  const size = (prop) => {
    const value = renderAttribs[prop];
    if (value) {
      styles[prop] = fixSize(value);
    }
  };
  size("width");
  size("height");
  Object.assign(styles, commonProps, useMask ? monotoneProps : coloredProps);
  let customStyle = "";
  for (const key in styles) {
    customStyle += key + ": " + styles[key] + ";";
  }
  componentProps.style = customStyle + style;
  return {
    svg: false,
    attributes: componentProps
  };
}
allowSimpleNames(true);
setAPIModule("", fetchAPIModule);
if (typeof document !== "undefined" && typeof window !== "undefined") {
  initBrowserStorage();
  const _window2 = window;
  if (_window2.IconifyPreload !== void 0) {
    const preload = _window2.IconifyPreload;
    const err = "Invalid IconifyPreload syntax.";
    if (typeof preload === "object" && preload !== null) {
      (preload instanceof Array ? preload : [preload]).forEach((item) => {
        try {
          if (typeof item !== "object" || item === null || item instanceof Array || typeof item.icons !== "object" || typeof item.prefix !== "string" || !addCollection(item)) {
            console.error(err);
          }
        } catch (e) {
          console.error(err);
        }
      });
    }
  }
  if (_window2.IconifyProviders !== void 0) {
    const providers = _window2.IconifyProviders;
    if (typeof providers === "object" && providers !== null) {
      for (let key in providers) {
        const err = "IconifyProviders[" + key + "] is invalid.";
        try {
          const value = providers[key];
          if (typeof value !== "object" || !value || value.resources === void 0) {
            continue;
          }
          if (!addAPIProvider(key, value)) {
            console.error(err);
          }
        } catch (e) {
          console.error(err);
        }
      }
    }
  }
}
function checkIconState(icon, state, mounted, callback, onload) {
  function abortLoading() {
    if (state.loading) {
      state.loading.abort();
      state.loading = null;
    }
  }
  if (typeof icon === "object" && icon !== null && typeof icon.body === "string") {
    state.name = "";
    abortLoading();
    return {data: {...defaultIconProps, ...icon}};
  }
  let iconName;
  if (typeof icon !== "string" || (iconName = stringToIcon(icon, false, true)) === null) {
    abortLoading();
    return null;
  }
  const data = getIconData(iconName);
  if (!data) {
    if (mounted && (!state.loading || state.loading.name !== icon)) {
      abortLoading();
      state.name = "";
      state.loading = {
        name: icon,
        abort: loadIcons([iconName], callback)
      };
    }
    return null;
  }
  abortLoading();
  if (state.name !== icon) {
    state.name = icon;
    if (onload && !state.destroyed) {
      onload(icon);
    }
  }
  const classes = ["iconify"];
  if (iconName.prefix !== "") {
    classes.push("iconify--" + iconName.prefix);
  }
  if (iconName.provider !== "") {
    classes.push("iconify--" + iconName.provider);
  }
  return {data, classes};
}
function generateIcon(icon, props) {
  return icon ? render({
    ...defaultIconProps,
    ...icon
  }, props) : null;
}
var checkIconState_1 = checkIconState;
var generateIcon_1 = generateIcon;

/* generated by Svelte v3.58.0 */

function create_if_block(ctx) {
	let if_block_anchor;

	function select_block_type(ctx, dirty) {
		if (/*data*/ ctx[0].svg) return create_if_block_1;
		return create_else_block;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type(ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, dirty) {
			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
				if_block.p(ctx, dirty);
			} else {
				if_block.d(1);
				if_block = current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			}
		},
		d(detaching) {
			if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

// (113:1) {:else}
function create_else_block(ctx) {
	let span;
	let span_levels = [/*data*/ ctx[0].attributes];
	let span_data = {};

	for (let i = 0; i < span_levels.length; i += 1) {
		span_data = assign(span_data, span_levels[i]);
	}

	return {
		c() {
			span = element("span");
			set_attributes(span, span_data);
		},
		m(target, anchor) {
			insert(target, span, anchor);
		},
		p(ctx, dirty) {
			set_attributes(span, span_data = get_spread_update(span_levels, [dirty & /*data*/ 1 && /*data*/ ctx[0].attributes]));
		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (109:1) {#if data.svg}
function create_if_block_1(ctx) {
	let svg;
	let raw_value = /*data*/ ctx[0].body + "";
	let svg_levels = [/*data*/ ctx[0].attributes];
	let svg_data = {};

	for (let i = 0; i < svg_levels.length; i += 1) {
		svg_data = assign(svg_data, svg_levels[i]);
	}

	return {
		c() {
			svg = svg_element("svg");
			set_svg_attributes(svg, svg_data);
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			svg.innerHTML = raw_value;
		},
		p(ctx, dirty) {
			if (dirty & /*data*/ 1 && raw_value !== (raw_value = /*data*/ ctx[0].body + "")) svg.innerHTML = raw_value;			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [dirty & /*data*/ 1 && /*data*/ ctx[0].attributes]));
		},
		d(detaching) {
			if (detaching) detach(svg);
		}
	};
}

function create_fragment$1(ctx) {
	let if_block_anchor;
	let if_block = /*data*/ ctx[0] && create_if_block(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, [dirty]) {
			if (/*data*/ ctx[0]) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	const state = {
		// Last icon name
		name: '',
		// Loading status
		loading: null,
		// Destroyed status
		destroyed: false
	};

	// Mounted status
	let mounted = false;

	// Callback counter
	let counter = 0;

	// Generated data
	let data;

	const onLoad = icon => {
		// Legacy onLoad property
		if (typeof $$props.onLoad === 'function') {
			$$props.onLoad(icon);
		}

		// on:load event
		const dispatch = createEventDispatcher();

		dispatch('load', { icon });
	};

	// Increase counter when loaded to force re-calculation of data
	function loaded() {
		$$invalidate(3, counter++, counter);
	}

	// Force re-render
	onMount(() => {
		$$invalidate(2, mounted = true);
	});

	// Abort loading when component is destroyed
	onDestroy(() => {
		$$invalidate(1, state.destroyed = true, state);

		if (state.loading) {
			state.loading.abort();
			$$invalidate(1, state.loading = null, state);
		}
	});

	$$self.$$set = $$new_props => {
		$$invalidate(6, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
	};

	$$self.$$.update = () => {
		 {
			const iconData = checkIconState_1($$props.icon, state, mounted, loaded, onLoad);
			$$invalidate(0, data = iconData ? generateIcon_1(iconData.data, $$props) : null);

			if (data && iconData.classes) {
				// Add classes
				$$invalidate(
					0,
					data.attributes['class'] = (typeof $$props['class'] === 'string'
					? $$props['class'] + ' '
					: '') + iconData.classes.join(' '),
					data
				);
			}
		}
	};

	$$props = exclude_internal_props($$props);
	return [data, state, mounted, counter];
}

class Component$1 extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});
	}
}

/* generated by Svelte v3.58.0 */

function add_css(target) {
	append_styles(target, "svelte-6vjs4t", "@import url(\"https://unpkg.com/modern-normalize@1.1.0/modern-normalize.css\");header.svelte-6vjs4t.svelte-6vjs4t.svelte-6vjs4t{border-bottom:1px solid var(--border-color)}.section-container.svelte-6vjs4t.svelte-6vjs4t.svelte-6vjs4t{display:flex;justify-content:space-between;align-items:center;padding-top:0.75rem;padding-bottom:0.75rem}.desktop-nav.svelte-6vjs4t.svelte-6vjs4t.svelte-6vjs4t{display:flex;align-items:center;justify-content:space-between;gap:1.5rem;width:100%}.desktop-nav.svelte-6vjs4t .logo.svelte-6vjs4t.svelte-6vjs4t{font-size:1.5rem;font-weight:600;line-height:1.4;margin-right:1.5rem;width:var(--size)}.desktop-nav.svelte-6vjs4t nav.svelte-6vjs4t.svelte-6vjs4t{display:flex;align-items:center;gap:1.5rem}.desktop-nav.svelte-6vjs4t nav.svelte-6vjs4t a.svelte-6vjs4t{font-size:1rem;font-weight:400;display:none}.desktop-nav.svelte-6vjs4t nav a.nav-item.svelte-6vjs4t.svelte-6vjs4t{border-bottom:2px solid transparent;transition:border-color 0.1s}.desktop-nav.svelte-6vjs4t nav a.nav-item.svelte-6vjs4t.svelte-6vjs4t:hover{border-color:var(--color-brand)}.desktop-nav.svelte-6vjs4t button#open.svelte-6vjs4t.svelte-6vjs4t{font-size:1.5rem;margin-left:auto}nav#mobile-nav.svelte-6vjs4t.svelte-6vjs4t.svelte-6vjs4t{position:absolute;flex-direction:column;text-align:center;background-color:var(--background-color, white);box-shadow:var(--box-shadow);border-radius:var(--border-radius);left:0.5rem;top:0.5rem;right:0.5rem;padding:2rem;z-index:2}nav#mobile-nav.svelte-6vjs4t a.svelte-6vjs4t.svelte-6vjs4t{display:block}nav#mobile-nav.svelte-6vjs4t hr.svelte-6vjs4t.svelte-6vjs4t{width:100%}nav#mobile-nav.svelte-6vjs4t .button.svelte-6vjs4t.svelte-6vjs4t{width:100%;justify-content:center}nav#mobile-nav.svelte-6vjs4t button#close.svelte-6vjs4t.svelte-6vjs4t{display:block;position:absolute;right:1rem;top:1rem;font-size:1.5rem}@media(min-width: 600px){#open.svelte-6vjs4t.svelte-6vjs4t.svelte-6vjs4t,#mobile-nav.svelte-6vjs4t.svelte-6vjs4t.svelte-6vjs4t{display:none}.desktop-nav.svelte-6vjs4t nav.svelte-6vjs4t a.svelte-6vjs4t{display:inline-block}}");
}

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[8] = list[i].link;
	child_ctx[10] = i;
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[8] = list[i].link;
	return child_ctx;
}

function get_each_context_2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[8] = list[i].link;
	child_ctx[10] = i;
	return child_ctx;
}

function get_each_context_3(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[8] = list[i].link;
	return child_ctx;
}

// (131:8) {:else}
function create_else_block_1(ctx) {
	let span;
	let t_value = /*logo*/ ctx[0].title + "";
	let t;

	return {
		c() {
			span = element("span");
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t);
		},
		p(ctx, dirty) {
			if (dirty & /*logo*/ 1 && t_value !== (t_value = /*logo*/ ctx[0].title + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (129:8) {#if logo.image.url}
function create_if_block_2(ctx) {
	let img;
	let img_src_value;
	let img_alt_value;

	return {
		c() {
			img = element("img");
			if (!src_url_equal(img.src, img_src_value = /*logo*/ ctx[0].image.url)) attr(img, "src", img_src_value);
			attr(img, "alt", img_alt_value = /*logo*/ ctx[0].image.alt);
		},
		m(target, anchor) {
			insert(target, img, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*logo*/ 1 && !src_url_equal(img.src, img_src_value = /*logo*/ ctx[0].image.url)) {
				attr(img, "src", img_src_value);
			}

			if (dirty & /*logo*/ 1 && img_alt_value !== (img_alt_value = /*logo*/ ctx[0].image.alt)) {
				attr(img, "alt", img_alt_value);
			}
		},
		d(detaching) {
			if (detaching) detach(img);
		}
	};
}

// (136:8) {#each site_nav as { link }}
function create_each_block_3(ctx) {
	let a;
	let t_value = /*link*/ ctx[8].label + "";
	let t;
	let a_href_value;

	return {
		c() {
			a = element("a");
			t = text(t_value);
			attr(a, "class", "nav-item svelte-6vjs4t");
			attr(a, "href", a_href_value = /*link*/ ctx[8].url);
		},
		m(target, anchor) {
			insert(target, a, anchor);
			append(a, t);
		},
		p(ctx, dirty) {
			if (dirty & /*site_nav*/ 2 && t_value !== (t_value = /*link*/ ctx[8].label + "")) set_data(t, t_value);

			if (dirty & /*site_nav*/ 2 && a_href_value !== (a_href_value = /*link*/ ctx[8].url)) {
				attr(a, "href", a_href_value);
			}
		},
		d(detaching) {
			if (detaching) detach(a);
		}
	};
}

// (139:8) {#each cta as { link }
function create_each_block_2(ctx) {
	let a;
	let t_value = /*link*/ ctx[8].label + "";
	let t;
	let a_href_value;

	return {
		c() {
			a = element("a");
			t = text(t_value);
			attr(a, "class", "button svelte-6vjs4t");
			attr(a, "href", a_href_value = /*link*/ ctx[8].url);
		},
		m(target, anchor) {
			insert(target, a, anchor);
			append(a, t);
		},
		p(ctx, dirty) {
			if (dirty & /*cta*/ 4 && t_value !== (t_value = /*link*/ ctx[8].label + "")) set_data(t, t_value);

			if (dirty & /*cta*/ 4 && a_href_value !== (a_href_value = /*link*/ ctx[8].url)) {
				attr(a, "href", a_href_value);
			}
		},
		d(detaching) {
			if (detaching) detach(a);
		}
	};
}

// (150:4) {#if mobileNavOpen}
function create_if_block$1(ctx) {
	let nav;
	let t0;
	let t1;
	let hr;
	let t2;
	let t3;
	let button;
	let icon;
	let nav_transition;
	let current;
	let mounted;
	let dispose;

	function select_block_type_1(ctx, dirty) {
		if (/*logo*/ ctx[0].image.url) return create_if_block_1$1;
		return create_else_block$1;
	}

	let current_block_type = select_block_type_1(ctx);
	let if_block = current_block_type(ctx);
	let each_value_1 = /*site_nav*/ ctx[1];
	let each_blocks_1 = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	let each_value = /*cta*/ ctx[2];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	icon = new Component$1({ props: { icon: "ph:x-duotone" } });

	return {
		c() {
			nav = element("nav");
			if_block.c();
			t0 = space();

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			t1 = space();
			hr = element("hr");
			t2 = space();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t3 = space();
			button = element("button");
			create_component(icon.$$.fragment);
			attr(hr, "class", "svelte-6vjs4t");
			attr(button, "id", "close");
			attr(button, "aria-label", "Close Navigation");
			attr(button, "class", "svelte-6vjs4t");
			attr(nav, "id", "mobile-nav");
			attr(nav, "class", "svelte-6vjs4t");
		},
		m(target, anchor) {
			insert(target, nav, anchor);
			if_block.m(nav, null);
			append(nav, t0);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				if (each_blocks_1[i]) {
					each_blocks_1[i].m(nav, null);
				}
			}

			append(nav, t1);
			append(nav, hr);
			append(nav, t2);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(nav, null);
				}
			}

			append(nav, t3);
			append(nav, button);
			mount_component(icon, button, null);
			current = true;

			if (!mounted) {
				dispose = listen(button, "click", /*click_handler_1*/ ctx[6]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
				if_block.p(ctx, dirty);
			} else {
				if_block.d(1);
				if_block = current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(nav, t0);
				}
			}

			if (dirty & /*site_nav*/ 2) {
				each_value_1 = /*site_nav*/ ctx[1];
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1(ctx, each_value_1, i);

					if (each_blocks_1[i]) {
						each_blocks_1[i].p(child_ctx, dirty);
					} else {
						each_blocks_1[i] = create_each_block_1(child_ctx);
						each_blocks_1[i].c();
						each_blocks_1[i].m(nav, t1);
					}
				}

				for (; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].d(1);
				}

				each_blocks_1.length = each_value_1.length;
			}

			if (dirty & /*cta*/ 4) {
				each_value = /*cta*/ ctx[2];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(nav, t3);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		i(local) {
			if (current) return;
			transition_in(icon.$$.fragment, local);

			add_render_callback(() => {
				if (!current) return;
				if (!nav_transition) nav_transition = create_bidirectional_transition(nav, fade, { duration: 200 }, true);
				nav_transition.run(1);
			});

			current = true;
		},
		o(local) {
			transition_out(icon.$$.fragment, local);
			if (!nav_transition) nav_transition = create_bidirectional_transition(nav, fade, { duration: 200 }, false);
			nav_transition.run(0);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(nav);
			if_block.d();
			destroy_each(each_blocks_1, detaching);
			destroy_each(each_blocks, detaching);
			destroy_component(icon);
			if (detaching && nav_transition) nav_transition.end();
			mounted = false;
			dispose();
		}
	};
}

// (154:8) {:else}
function create_else_block$1(ctx) {
	let span;
	let t_value = /*logo*/ ctx[0].title + "";
	let t;

	return {
		c() {
			span = element("span");
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t);
		},
		p(ctx, dirty) {
			if (dirty & /*logo*/ 1 && t_value !== (t_value = /*logo*/ ctx[0].title + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (152:8) {#if logo.image.url}
function create_if_block_1$1(ctx) {
	let img;
	let img_src_value;
	let img_alt_value;

	return {
		c() {
			img = element("img");
			if (!src_url_equal(img.src, img_src_value = /*logo*/ ctx[0].image.url)) attr(img, "src", img_src_value);
			attr(img, "alt", img_alt_value = /*logo*/ ctx[0].image.alt);
		},
		m(target, anchor) {
			insert(target, img, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*logo*/ 1 && !src_url_equal(img.src, img_src_value = /*logo*/ ctx[0].image.url)) {
				attr(img, "src", img_src_value);
			}

			if (dirty & /*logo*/ 1 && img_alt_value !== (img_alt_value = /*logo*/ ctx[0].image.alt)) {
				attr(img, "alt", img_alt_value);
			}
		},
		d(detaching) {
			if (detaching) detach(img);
		}
	};
}

// (157:8) {#each site_nav as { link }}
function create_each_block_1(ctx) {
	let a;
	let t_value = /*link*/ ctx[8].label + "";
	let t;
	let a_href_value;

	return {
		c() {
			a = element("a");
			t = text(t_value);
			attr(a, "href", a_href_value = /*link*/ ctx[8].url);
			attr(a, "class", "svelte-6vjs4t");
		},
		m(target, anchor) {
			insert(target, a, anchor);
			append(a, t);
		},
		p(ctx, dirty) {
			if (dirty & /*site_nav*/ 2 && t_value !== (t_value = /*link*/ ctx[8].label + "")) set_data(t, t_value);

			if (dirty & /*site_nav*/ 2 && a_href_value !== (a_href_value = /*link*/ ctx[8].url)) {
				attr(a, "href", a_href_value);
			}
		},
		d(detaching) {
			if (detaching) detach(a);
		}
	};
}

// (161:8) {#each cta as { link }
function create_each_block(ctx) {
	let a;
	let t_value = /*link*/ ctx[8].label + "";
	let t;
	let a_href_value;

	return {
		c() {
			a = element("a");
			t = text(t_value);
			attr(a, "href", a_href_value = /*link*/ ctx[8].url);
			attr(a, "class", "button svelte-6vjs4t");
		},
		m(target, anchor) {
			insert(target, a, anchor);
			append(a, t);
		},
		p(ctx, dirty) {
			if (dirty & /*cta*/ 4 && t_value !== (t_value = /*link*/ ctx[8].label + "")) set_data(t, t_value);

			if (dirty & /*cta*/ 4 && a_href_value !== (a_href_value = /*link*/ ctx[8].url)) {
				attr(a, "href", a_href_value);
			}
		},
		d(detaching) {
			if (detaching) detach(a);
		}
	};
}

function create_fragment$2(ctx) {
	let div2;
	let header;
	let div1;
	let div0;
	let a;
	let style___size = `${/*logo*/ ctx[0].size * 3}rem`;
	let t0;
	let nav;
	let t1;
	let t2;
	let button;
	let icon;
	let t3;
	let current;
	let mounted;
	let dispose;

	function select_block_type(ctx, dirty) {
		if (/*logo*/ ctx[0].image.url) return create_if_block_2;
		return create_else_block_1;
	}

	let current_block_type = select_block_type(ctx);
	let if_block0 = current_block_type(ctx);
	let each_value_3 = /*site_nav*/ ctx[1];
	let each_blocks_1 = [];

	for (let i = 0; i < each_value_3.length; i += 1) {
		each_blocks_1[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
	}

	let each_value_2 = /*cta*/ ctx[2];
	let each_blocks = [];

	for (let i = 0; i < each_value_2.length; i += 1) {
		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
	}

	icon = new Component$1({ props: { icon: "ic:round-menu" } });
	let if_block1 = /*mobileNavOpen*/ ctx[3] && create_if_block$1(ctx);

	return {
		c() {
			div2 = element("div");
			header = element("header");
			div1 = element("div");
			div0 = element("div");
			a = element("a");
			if_block0.c();
			t0 = space();
			nav = element("nav");

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			t1 = space();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t2 = space();
			button = element("button");
			create_component(icon.$$.fragment);
			t3 = space();
			if (if_block1) if_block1.c();
			attr(a, "href", "/");
			attr(a, "class", "logo svelte-6vjs4t");
			set_style(a, "--size", style___size);
			attr(button, "id", "open");
			attr(button, "aria-label", "Open mobile navigation");
			attr(button, "class", "svelte-6vjs4t");
			attr(nav, "class", "svelte-6vjs4t");
			attr(div0, "class", "desktop-nav svelte-6vjs4t");
			attr(div1, "class", "section-container svelte-6vjs4t");
			attr(header, "class", "svelte-6vjs4t");
			attr(div2, "class", "section");
			attr(div2, "id", "section-085e8b4a");
		},
		m(target, anchor) {
			insert(target, div2, anchor);
			append(div2, header);
			append(header, div1);
			append(div1, div0);
			append(div0, a);
			if_block0.m(a, null);
			append(div0, t0);
			append(div0, nav);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				if (each_blocks_1[i]) {
					each_blocks_1[i].m(nav, null);
				}
			}

			append(nav, t1);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(nav, null);
				}
			}

			append(nav, t2);
			append(nav, button);
			mount_component(icon, button, null);
			append(div1, t3);
			if (if_block1) if_block1.m(div1, null);
			current = true;

			if (!mounted) {
				dispose = listen(button, "click", /*click_handler*/ ctx[5]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
				if_block0.p(ctx, dirty);
			} else {
				if_block0.d(1);
				if_block0 = current_block_type(ctx);

				if (if_block0) {
					if_block0.c();
					if_block0.m(a, null);
				}
			}

			if (dirty & /*logo*/ 1 && style___size !== (style___size = `${/*logo*/ ctx[0].size * 3}rem`)) {
				set_style(a, "--size", style___size);
			}

			if (dirty & /*site_nav*/ 2) {
				each_value_3 = /*site_nav*/ ctx[1];
				let i;

				for (i = 0; i < each_value_3.length; i += 1) {
					const child_ctx = get_each_context_3(ctx, each_value_3, i);

					if (each_blocks_1[i]) {
						each_blocks_1[i].p(child_ctx, dirty);
					} else {
						each_blocks_1[i] = create_each_block_3(child_ctx);
						each_blocks_1[i].c();
						each_blocks_1[i].m(nav, t1);
					}
				}

				for (; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].d(1);
				}

				each_blocks_1.length = each_value_3.length;
			}

			if (dirty & /*cta*/ 4) {
				each_value_2 = /*cta*/ ctx[2];
				let i;

				for (i = 0; i < each_value_2.length; i += 1) {
					const child_ctx = get_each_context_2(ctx, each_value_2, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block_2(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(nav, t2);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value_2.length;
			}

			if (/*mobileNavOpen*/ ctx[3]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);

					if (dirty & /*mobileNavOpen*/ 8) {
						transition_in(if_block1, 1);
					}
				} else {
					if_block1 = create_if_block$1(ctx);
					if_block1.c();
					transition_in(if_block1, 1);
					if_block1.m(div1, null);
				}
			} else if (if_block1) {
				group_outros();

				transition_out(if_block1, 1, 1, () => {
					if_block1 = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(icon.$$.fragment, local);
			transition_in(if_block1);
			current = true;
		},
		o(local) {
			transition_out(icon.$$.fragment, local);
			transition_out(if_block1);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div2);
			if_block0.d();
			destroy_each(each_blocks_1, detaching);
			destroy_each(each_blocks, detaching);
			destroy_component(icon);
			if (if_block1) if_block1.d();
			mounted = false;
			dispose();
		}
	};
}

function instance$2($$self, $$props, $$invalidate) {
	let { favicon } = $$props;
	let { logo } = $$props;
	let { site_nav } = $$props;
	let { cta } = $$props;
	let mobileNavOpen = false;

	const click_handler = () => $$invalidate(3, mobileNavOpen = true);
	const click_handler_1 = () => $$invalidate(3, mobileNavOpen = false);

	$$self.$$set = $$props => {
		if ('favicon' in $$props) $$invalidate(4, favicon = $$props.favicon);
		if ('logo' in $$props) $$invalidate(0, logo = $$props.logo);
		if ('site_nav' in $$props) $$invalidate(1, site_nav = $$props.site_nav);
		if ('cta' in $$props) $$invalidate(2, cta = $$props.cta);
	};

	return [logo, site_nav, cta, mobileNavOpen, favicon, click_handler, click_handler_1];
}

class Component$2 extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$2, create_fragment$2, safe_not_equal, { favicon: 4, logo: 0, site_nav: 1, cta: 2 }, add_css);
	}
}

/* generated by Svelte v3.58.0 */

function add_css$1(target) {
	append_styles(target, "svelte-1en0fta", "section.svelte-1en0fta.svelte-1en0fta{background:#3c8dbc;overflow:hidden}section.image-left.svelte-1en0fta figure.svelte-1en0fta{grid-column:1;grid-row:1}section.image-left.svelte-1en0fta .body.svelte-1en0fta{grid-column:2}.section-container.svelte-1en0fta.svelte-1en0fta{display:flex;flex-direction:column-reverse;gap:2rem}@media(min-width: 800px){.section-container.svelte-1en0fta.svelte-1en0fta{display:grid;grid-template-columns:1fr 1fr;place-items:center;gap:6rem;padding-block:6rem\n}}.body.svelte-1en0fta.svelte-1en0fta{color:var(--color-inverted);display:grid;place-items:start;padding-top:2rem}.body.svelte-1en0fta .headline.svelte-1en0fta{font-family:var(--font-heading);font-weight:700;font-size:clamp(2.75rem, 10vw, 3rem);line-height:1.1;margin-bottom:1.5rem}.body.svelte-1en0fta .subheading.svelte-1en0fta{font-weight:400;font-size:1.125rem;line-height:1.5;margin-bottom:2rem}.body.svelte-1en0fta .button.svelte-1en0fta{padding:0.875rem 1.5rem;font-weight:500}figure.svelte-1en0fta.svelte-1en0fta{position:relative}figure.svelte-1en0fta img.svelte-1en0fta{border-radius:var(--border-radius);z-index:1;position:relative}figure.svelte-1en0fta svg.svelte-1en0fta{position:absolute;inset:0;width:100%;height:100%;scale:1.5;pointer-events:none}");
}

// (95:6) {#if link.label}
function create_if_block$2(ctx) {
	let a;
	let t_value = /*link*/ ctx[2].label + "";
	let t;
	let a_href_value;

	return {
		c() {
			a = element("a");
			t = text(t_value);
			attr(a, "href", a_href_value = /*link*/ ctx[2].url);
			attr(a, "class", "button svelte-1en0fta");
		},
		m(target, anchor) {
			insert(target, a, anchor);
			append(a, t);
		},
		p(ctx, dirty) {
			if (dirty & /*link*/ 4 && t_value !== (t_value = /*link*/ ctx[2].label + "")) set_data(t, t_value);

			if (dirty & /*link*/ 4 && a_href_value !== (a_href_value = /*link*/ ctx[2].url)) {
				attr(a, "href", a_href_value);
			}
		},
		d(detaching) {
			if (detaching) detach(a);
		}
	};
}

function create_fragment$3(ctx) {
	let div3;
	let section;
	let div2;
	let div1;
	let h1;
	let t0;
	let t1;
	let div0;
	let t2;
	let t3;
	let t4;
	let figure;
	let img;
	let img_src_value;
	let img_alt_value;
	let t5;
	let svg;
	let path0;
	let path1;
	let path2;
	let if_block = /*link*/ ctx[2].label && create_if_block$2(ctx);

	return {
		c() {
			div3 = element("div");
			section = element("section");
			div2 = element("div");
			div1 = element("div");
			h1 = element("h1");
			t0 = text(/*heading*/ ctx[0]);
			t1 = space();
			div0 = element("div");
			t2 = text(/*subheading*/ ctx[1]);
			t3 = space();
			if (if_block) if_block.c();
			t4 = space();
			figure = element("figure");
			img = element("img");
			t5 = space();
			svg = svg_element("svg");
			path0 = svg_element("path");
			path1 = svg_element("path");
			path2 = svg_element("path");
			attr(h1, "class", "headline svelte-1en0fta");
			attr(div0, "class", "subheading svelte-1en0fta");
			attr(div1, "class", "body svelte-1en0fta");
			if (!src_url_equal(img.src, img_src_value = /*image*/ ctx[3].url)) attr(img, "src", img_src_value);
			attr(img, "alt", img_alt_value = /*image*/ ctx[3].alt);
			attr(img, "class", "svelte-1en0fta");
			attr(path0, "opacity", "0.05");
			attr(path0, "fill-rule", "evenodd");
			attr(path0, "clip-rule", "evenodd");
			attr(path0, "d", "M250.362 34.7756C139.816 89.1131 67.3668 143.319 26.8947 207.101C4.61533 242.212 -2.94332 266.681 0.997026 292.673C4.60124 316.447 16.5768 340.207 47.4378 388.613C60.4002 408.945 60.0371 441.564 49.6915 487.99C47.2186 499.088 44.2927 510.565 40.3577 524.955C41.2971 521.519 31.5889 556.493 29.4742 564.688C26.0093 578.117 24.0811 587.645 23.5326 594.881C20.1621 639.352 54.9001 672.353 110.767 684.383C164.801 696.018 227.511 685.427 270.671 655.274C276.453 651.234 291.181 640.89 299.95 634.731C303.38 632.322 305.898 630.554 306.613 630.053C319.856 620.775 329.589 614.052 338.766 607.882C361.325 592.713 379.332 581.766 396.694 572.934C446.494 547.603 494.541 538.614 565.78 542.901C598.07 544.844 628.45 533.685 653.596 512.012C676.988 491.852 694.617 463.505 703.223 432.744C712.019 401.304 710.848 369.433 699.177 342.706C686.32 313.263 661.427 291.233 625.376 279.556C586.268 266.888 569.43 251.107 569.005 230.46C568.824 221.657 571.541 211.918 577.065 200.127C581.082 191.553 581.928 190.056 595.678 166.497C610.379 141.308 617.427 126.392 620.883 109.77C625.398 88.0522 621.377 68.3247 606.92 49.4498C584.428 20.0847 524.241 2.47769 448.511 0.238031C375.056 -1.93434 299.024 10.8562 250.362 34.7756ZM3.58288 292.383C-0.275778 266.93 7.14569 242.905 29.1841 208.174C69.3833 144.822 141.492 90.8709 251.657 36.7206C299.855 13.0296 375.416 0.318108 448.422 2.4772C523.388 4.69424 582.842 22.087 604.745 50.6819C618.819 69.0565 622.721 88.2016 618.318 109.375C614.92 125.722 607.943 140.487 593.35 165.493C579.553 189.133 578.705 190.631 574.649 199.29C569.005 211.335 566.212 221.348 566.4 230.5C566.847 252.198 584.446 268.691 624.459 281.652C659.794 293.098 684.141 314.644 696.738 343.493C708.216 369.777 709.371 401.195 700.69 432.22C692.193 462.594 674.793 490.572 651.753 510.429C627.112 531.665 597.453 542.56 565.964 540.666C494.212 536.348 445.638 545.435 395.368 571.006C377.895 579.894 359.802 590.894 337.162 606.117C327.969 612.298 318.223 619.03 304.968 628.316C304.254 628.816 301.742 630.58 298.321 632.983C289.554 639.14 274.812 649.494 269.029 653.535C226.525 683.229 164.661 693.678 111.402 682.209C56.6608 670.422 22.8546 638.306 26.1348 595.026C26.6724 587.934 28.5821 578.498 32.0201 565.173C34.1294 556.999 43.8307 522.05 42.8962 525.467C46.8388 511.05 49.7718 499.545 52.2527 488.412C62.7082 441.493 63.0757 408.477 49.7247 387.536C19.0189 339.374 7.13099 315.787 3.58288 292.383Z");
			attr(path0, "fill", "white");
			attr(path1, "opacity", "0.15");
			attr(path1, "fill-rule", "evenodd");
			attr(path1, "clip-rule", "evenodd");
			attr(path1, "d", "M397.33 27.2727C343.179 32.0545 282.134 51.1101 228.45 78.1813C225.981 79.4262 219.504 82.6078 211.35 86.6135C192.691 95.7792 165.248 109.259 156.946 113.724C131.078 127.633 113.909 140.497 97.0005 159.654C80.3265 178.545 63.6534 204.133 42.8539 242.71C34.4888 263.275 33.3473 281.11 38.2328 298.299C41.9884 311.513 47.7933 321.819 60.868 340.936C61.2972 341.563 61.7281 342.193 62.5888 343.449C77.6086 365.384 83.6274 376.237 87.2636 391.215C92.0442 410.908 89.2721 431.928 77.2375 456.81C51.1289 514.119 42.7176 560.754 50.4159 596.281C57.2991 628.047 77.0019 650.185 106.511 661.927C160.111 683.254 241.068 666.921 291.203 626.602C297.109 621.853 314.582 607.723 318.819 604.297L319.749 603.545C330.387 594.96 338.104 588.805 345.421 583.099C363.536 568.974 377.991 558.618 391.925 550.002C436.098 522.686 478.642 511.444 544.34 511.444C600.73 511.444 646.661 465.922 658.264 406.507C663.796 378.183 660.462 350.008 648.191 326.946C634.67 301.535 611.009 283.335 578.204 274.908C542.857 265.827 526.843 252.858 524.881 234.783C524.042 227.061 525.69 218.356 529.658 207.72C532.571 199.914 533.825 197.231 543.585 177.15C556.994 149.564 562.475 134.02 562.697 116.633C562.902 100.517 557.486 85.8734 545.376 72.243C512.97 35.769 461.447 21.6109 397.33 27.2727ZM212.567 88.5959C220.759 84.5714 227.277 81.3696 229.768 80.1136C283.151 53.1947 343.848 34.2475 397.596 29.5013C460.886 23.9125 511.517 37.8251 543.304 73.6028C555.054 86.8275 560.289 100.983 560.09 116.608C559.873 133.615 554.463 148.958 541.18 176.286C531.38 196.447 530.122 199.14 527.176 207.035C523.109 217.934 521.409 226.92 522.285 234.991C524.36 254.109 541.189 267.737 577.457 277.054C609.53 285.293 632.606 303.044 645.82 327.878C657.862 350.509 661.143 378.233 655.693 406.136C644.279 464.582 599.258 509.204 544.34 509.204C478.107 509.204 435.029 520.586 390.402 548.183C376.377 556.856 361.851 567.263 343.669 581.44C336.34 587.155 328.612 593.319 317.964 601.912L317.073 602.632C312.904 606.003 295.343 620.204 289.422 624.966C240.015 664.699 160.169 680.808 107.605 659.893C78.8689 648.459 59.7074 626.929 52.9774 595.871C45.3799 560.809 53.7184 514.577 79.6535 457.649C91.8734 432.384 94.7058 410.907 89.8143 390.757C86.102 375.465 79.9933 364.451 64.8342 342.313C63.9734 341.056 63.5429 340.427 63.114 339.8C50.1623 320.863 44.4414 310.706 40.7639 297.767C35.9995 281.003 37.1128 263.61 45.2658 243.551C65.9455 205.208 82.5351 179.749 99.0761 161.008C115.78 142.084 132.712 129.396 158.327 115.623C166.577 111.187 193.913 97.7591 212.567 88.5959Z");
			attr(path1, "fill", "white");
			attr(path2, "opacity", "0.2");
			attr(path2, "fill-rule", "evenodd");
			attr(path2, "clip-rule", "evenodd");
			attr(path2, "d", "M393.65 53.3234C356.923 60.458 317.486 75.5292 246.32 107.518C200.301 128.204 185.067 135.564 170.938 144.573C157.451 153.174 148.276 161.866 139.021 174.653C133.336 182.507 127.789 191.512 118.361 207.865C117.548 209.275 115.274 213.239 112.783 217.58C109.803 222.774 106.513 228.509 105.045 231.056C99.153 241.276 93.8182 250.4 88.1163 259.962C74.6004 282.628 69.9213 297.456 72.5119 307.421C74.6266 315.557 80.2875 319.73 93.5713 325.271C94.1179 325.499 95.5342 326.084 96.6564 326.547C97.3304 326.825 97.8983 327.06 98.1079 327.147C99.9117 327.896 101.335 328.502 102.708 329.114C117.63 335.754 125.95 343.298 129.949 357.07C135.142 374.951 131.492 401.884 117.069 440.958C115.82 444.341 114.547 447.769 112.872 452.264C113.073 451.724 109.685 460.813 108.769 463.276C105.503 472.056 103.194 478.347 101.032 484.399C95.529 499.805 91.6296 511.939 88.78 522.912C81.9545 549.193 81.3792 568.6 88.0542 584.062C104.844 622.952 140.549 638.02 187.399 632.019C225.701 627.113 269.161 607.709 298.006 584.49C299.122 583.592 301.968 581.287 305.333 578.561C311.157 573.844 318.535 567.868 321.192 565.745C329.222 559.328 335.462 554.56 341.49 550.301C362.227 535.651 381.62 526.536 410.239 518.761C418.131 516.616 425.218 514.298 431.856 511.743C437.879 509.426 443.267 507.032 449.426 504.029C449.733 503.879 450.715 503.391 452.037 502.734C455.555 500.986 461.485 498.038 463.555 497.064C478.371 490.093 490.675 487.259 511.496 487.259C559.201 487.259 598.033 448.734 607.84 398.469C612.515 374.51 609.697 350.675 599.324 331.161C587.889 309.65 567.875 294.241 540.133 287.107C510.429 279.469 495.587 264.944 491.837 243.158C488.939 226.326 491.787 209.512 501.245 174.95C501.445 174.221 501.634 173.53 501.944 172.4C509.564 144.612 512.193 132.893 512.954 119.095C513.967 100.722 509.759 86.6352 498.848 76.0643C473.083 51.1011 439.07 44.5001 393.65 53.3234ZM172.489 146.372C186.462 137.462 201.649 130.125 247.526 109.504C318.49 77.6051 357.792 62.5856 394.223 55.5085C438.788 46.8512 471.83 53.2638 496.897 77.551C507.292 87.6221 511.333 101.148 510.349 118.988C509.598 132.598 506.987 144.24 499.406 171.886C499.096 173.016 498.906 173.707 498.707 174.437C489.169 209.286 486.293 226.269 489.256 243.486C493.156 266.139 508.718 281.368 539.384 289.253C566.394 296.198 585.823 311.158 596.951 332.092C607.096 351.176 609.861 374.56 605.268 398.098C595.65 447.395 557.726 485.018 511.494 485.018C490.225 485.018 477.493 487.951 462.302 495.098C460.197 496.089 454.202 499.068 450.692 500.813C449.394 501.459 448.435 501.935 448.139 502.08C442.046 505.05 436.729 507.412 430.789 509.698C424.243 512.217 417.249 514.505 409.452 516.624C380.512 524.486 360.825 533.739 339.833 548.57C333.758 552.862 327.481 557.658 319.415 564.104C316.751 566.233 309.36 572.22 303.533 576.938C300.174 579.659 297.335 581.959 296.223 582.854C267.747 605.776 224.763 624.967 187.013 629.803C141.308 635.657 106.825 621.105 90.4958 583.282C84.0323 568.31 84.596 549.297 91.3217 523.399C94.1541 512.494 98.0368 500.412 103.522 485.057C105.68 479.015 107.986 472.731 111.249 463.958C112.165 461.496 115.553 452.408 115.353 452.947C117.028 448.45 118.301 445.021 119.551 441.635C134.107 402.202 137.809 374.889 132.476 356.527C128.271 342.047 119.434 334.034 103.905 327.123C102.506 326.501 101.063 325.886 99.2396 325.129C99.0265 325.04 98.4513 324.803 97.7711 324.522C96.6513 324.06 95.2472 323.48 94.7071 323.255C82.083 317.989 76.9426 314.199 75.0535 306.932C72.6313 297.614 77.1733 283.221 90.4337 260.984C96.1415 251.412 101.482 242.279 107.378 232.05C108.848 229.5 112.142 223.759 115.123 218.562C117.612 214.225 119.883 210.267 120.694 208.86C130.087 192.569 135.604 183.611 141.232 175.836C150.318 163.284 159.27 154.801 172.489 146.372Z");
			attr(path2, "fill", "white");
			attr(svg, "width", "709");
			attr(svg, "height", "689");
			attr(svg, "viewBox", "0 0 709 689");
			attr(svg, "fill", "none");
			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
			attr(svg, "class", "svelte-1en0fta");
			attr(figure, "class", "svelte-1en0fta");
			attr(div2, "class", "section-container svelte-1en0fta");
			attr(section, "class", "svelte-1en0fta");
			toggle_class(section, "image-left", /*variation*/ ctx[4] === "image_left");
			attr(div3, "class", "section");
			attr(div3, "id", "section-0260f184");
		},
		m(target, anchor) {
			insert(target, div3, anchor);
			append(div3, section);
			append(section, div2);
			append(div2, div1);
			append(div1, h1);
			append(h1, t0);
			append(div1, t1);
			append(div1, div0);
			append(div0, t2);
			append(div1, t3);
			if (if_block) if_block.m(div1, null);
			append(div2, t4);
			append(div2, figure);
			append(figure, img);
			append(figure, t5);
			append(figure, svg);
			append(svg, path0);
			append(svg, path1);
			append(svg, path2);
		},
		p(ctx, [dirty]) {
			if (dirty & /*heading*/ 1) set_data(t0, /*heading*/ ctx[0]);
			if (dirty & /*subheading*/ 2) set_data(t2, /*subheading*/ ctx[1]);

			if (/*link*/ ctx[2].label) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block$2(ctx);
					if_block.c();
					if_block.m(div1, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (dirty & /*image*/ 8 && !src_url_equal(img.src, img_src_value = /*image*/ ctx[3].url)) {
				attr(img, "src", img_src_value);
			}

			if (dirty & /*image*/ 8 && img_alt_value !== (img_alt_value = /*image*/ ctx[3].alt)) {
				attr(img, "alt", img_alt_value);
			}

			if (dirty & /*variation*/ 16) {
				toggle_class(section, "image-left", /*variation*/ ctx[4] === "image_left");
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div3);
			if (if_block) if_block.d();
		}
	};
}

function instance$3($$self, $$props, $$invalidate) {
	let { favicon } = $$props;
	let { heading } = $$props;
	let { subheading } = $$props;
	let { link } = $$props;
	let { image } = $$props;
	let { variation } = $$props;

	$$self.$$set = $$props => {
		if ('favicon' in $$props) $$invalidate(5, favicon = $$props.favicon);
		if ('heading' in $$props) $$invalidate(0, heading = $$props.heading);
		if ('subheading' in $$props) $$invalidate(1, subheading = $$props.subheading);
		if ('link' in $$props) $$invalidate(2, link = $$props.link);
		if ('image' in $$props) $$invalidate(3, image = $$props.image);
		if ('variation' in $$props) $$invalidate(4, variation = $$props.variation);
	};

	return [heading, subheading, link, image, variation, favicon];
}

class Component$3 extends SvelteComponent {
	constructor(options) {
		super();

		init(
			this,
			options,
			instance$3,
			create_fragment$3,
			safe_not_equal,
			{
				favicon: 5,
				heading: 0,
				subheading: 1,
				link: 2,
				image: 3,
				variation: 4
			},
			add_css$1
		);
	}
}

/* generated by Svelte v3.58.0 */

function add_css$2(target) {
	append_styles(target, "svelte-prx89c", ".section-container.svelte-prx89c.svelte-prx89c{max-width:700px;width:100%;margin:0 auto;gap:1rem}.box.svelte-prx89c.svelte-prx89c{padding:3rem 3.25rem;border:1px solid var(--border-color);border-radius:var(--border-radius, 4px)}.heading-group.svelte-prx89c.svelte-prx89c{display:grid;gap:1rem;margin-bottom:2rem}form.svelte-prx89c.svelte-prx89c{display:grid;gap:2rem}form.svelte-prx89c label.svelte-prx89c{display:grid;gap:0.25rem;font-weight:500}form.svelte-prx89c input.svelte-prx89c,form.svelte-prx89c textarea.svelte-prx89c{width:100%;padding:0.75rem 0.75rem;border:1.5px solid var(--border-color);border-radius:4px}form.svelte-prx89c .label.svelte-prx89c{font-size:0.85rem;margin-bottom:0.25rem}form.svelte-prx89c .placeholder.svelte-prx89c{font-size:1rem;font-weight:300}form.svelte-prx89c .button.svelte-prx89c{place-self:start}");
}

function get_each_context$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[5] = list[i].label;
	child_ctx[6] = list[i].type;
	child_ctx[7] = list[i].placeholder;
	return child_ctx;
}

// (81:6) {:else}
function create_else_block$2(ctx) {
	let label;
	let span;
	let t0_value = /*label*/ ctx[5] + "";
	let t0;
	let t1;
	let input;
	let input_type_value;
	let input_placeholder_value;

	return {
		c() {
			label = element("label");
			span = element("span");
			t0 = text(t0_value);
			t1 = space();
			input = element("input");
			attr(span, "class", "label svelte-prx89c");
			attr(input, "class", "placeholder svelte-prx89c");
			attr(input, "type", input_type_value = /*type*/ ctx[6]);
			attr(input, "placeholder", input_placeholder_value = /*placeholder*/ ctx[7]);
			attr(label, "class", "svelte-prx89c");
		},
		m(target, anchor) {
			insert(target, label, anchor);
			append(label, span);
			append(span, t0);
			append(label, t1);
			append(label, input);
		},
		p(ctx, dirty) {
			if (dirty & /*inputs*/ 4 && t0_value !== (t0_value = /*label*/ ctx[5] + "")) set_data(t0, t0_value);

			if (dirty & /*inputs*/ 4 && input_type_value !== (input_type_value = /*type*/ ctx[6])) {
				attr(input, "type", input_type_value);
			}

			if (dirty & /*inputs*/ 4 && input_placeholder_value !== (input_placeholder_value = /*placeholder*/ ctx[7])) {
				attr(input, "placeholder", input_placeholder_value);
			}
		},
		d(detaching) {
			if (detaching) detach(label);
		}
	};
}

// (76:6) {#if type === "textarea"}
function create_if_block$3(ctx) {
	let label;
	let span;
	let t0_value = /*label*/ ctx[5] + "";
	let t0;
	let t1;
	let textarea;
	let textarea_type_value;
	let textarea_placeholder_value;

	return {
		c() {
			label = element("label");
			span = element("span");
			t0 = text(t0_value);
			t1 = space();
			textarea = element("textarea");
			attr(span, "class", "label svelte-prx89c");
			attr(textarea, "class", "placeholder svelte-prx89c");
			attr(textarea, "type", textarea_type_value = /*type*/ ctx[6]);
			attr(textarea, "placeholder", textarea_placeholder_value = /*placeholder*/ ctx[7]);
			attr(label, "class", "svelte-prx89c");
		},
		m(target, anchor) {
			insert(target, label, anchor);
			append(label, span);
			append(span, t0);
			append(label, t1);
			append(label, textarea);
		},
		p(ctx, dirty) {
			if (dirty & /*inputs*/ 4 && t0_value !== (t0_value = /*label*/ ctx[5] + "")) set_data(t0, t0_value);

			if (dirty & /*inputs*/ 4 && textarea_type_value !== (textarea_type_value = /*type*/ ctx[6])) {
				attr(textarea, "type", textarea_type_value);
			}

			if (dirty & /*inputs*/ 4 && textarea_placeholder_value !== (textarea_placeholder_value = /*placeholder*/ ctx[7])) {
				attr(textarea, "placeholder", textarea_placeholder_value);
			}
		},
		d(detaching) {
			if (detaching) detach(label);
		}
	};
}

// (75:4) {#each inputs as { label, type, placeholder }}
function create_each_block$1(ctx) {
	let if_block_anchor;

	function select_block_type(ctx, dirty) {
		if (/*type*/ ctx[6] === "textarea") return create_if_block$3;
		return create_else_block$2;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type(ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, dirty) {
			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
				if_block.p(ctx, dirty);
			} else {
				if_block.d(1);
				if_block = current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			}
		},
		d(detaching) {
			if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function create_fragment$4(ctx) {
	let div2;
	let section;
	let div1;
	let div0;
	let h2;
	let t0;
	let t1;
	let p;
	let t2;
	let t3;
	let form;
	let t4;
	let button;
	let mounted;
	let dispose;
	let each_value = /*inputs*/ ctx[2];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
	}

	return {
		c() {
			div2 = element("div");
			section = element("section");
			div1 = element("div");
			div0 = element("div");
			h2 = element("h2");
			t0 = text(/*heading*/ ctx[0]);
			t1 = space();
			p = element("p");
			t2 = text(/*subheading*/ ctx[1]);
			t3 = space();
			form = element("form");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t4 = space();
			button = element("button");
			button.textContent = "Submit";
			attr(h2, "class", "heading");
			attr(p, "class", "subheaging");
			attr(div0, "class", "heading-group svelte-prx89c");
			attr(button, "type", "submit");
			attr(button, "class", "button svelte-prx89c");
			attr(form, "class", "svelte-prx89c");
			attr(div1, "class", "box svelte-prx89c");
			attr(section, "class", "section-container svelte-prx89c");
			attr(div2, "class", "section");
			attr(div2, "id", "section-33533c35");
		},
		m(target, anchor) {
			insert(target, div2, anchor);
			append(div2, section);
			append(section, div1);
			append(div1, div0);
			append(div0, h2);
			append(h2, t0);
			append(div0, t1);
			append(div0, p);
			append(p, t2);
			append(div1, t3);
			append(div1, form);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(form, null);
				}
			}

			append(form, t4);
			append(form, button);

			if (!mounted) {
				dispose = listen(form, "submit", prevent_default(/*submit_handler*/ ctx[4]));
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*heading*/ 1) set_data(t0, /*heading*/ ctx[0]);
			if (dirty & /*subheading*/ 2) set_data(t2, /*subheading*/ ctx[1]);

			if (dirty & /*inputs*/ 4) {
				each_value = /*inputs*/ ctx[2];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$1(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$1(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(form, t4);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div2);
			destroy_each(each_blocks, detaching);
			mounted = false;
			dispose();
		}
	};
}

function instance$4($$self, $$props, $$invalidate) {
	let { favicon } = $$props;
	let { heading } = $$props;
	let { subheading } = $$props;
	let { inputs } = $$props;

	const submit_handler = ({ target }) => {
		const data = new FormData(target); // send `data` to email service
	};

	$$self.$$set = $$props => {
		if ('favicon' in $$props) $$invalidate(3, favicon = $$props.favicon);
		if ('heading' in $$props) $$invalidate(0, heading = $$props.heading);
		if ('subheading' in $$props) $$invalidate(1, subheading = $$props.subheading);
		if ('inputs' in $$props) $$invalidate(2, inputs = $$props.inputs);
	};

	return [heading, subheading, inputs, favicon, submit_handler];
}

class Component$4 extends SvelteComponent {
	constructor(options) {
		super();

		init(
			this,
			options,
			instance$4,
			create_fragment$4,
			safe_not_equal,
			{
				favicon: 3,
				heading: 0,
				subheading: 1,
				inputs: 2
			},
			add_css$2
		);
	}
}

/* generated by Svelte v3.58.0 */

function add_css$3(target) {
	append_styles(target, "svelte-udcuzo", "section.svelte-udcuzo.svelte-udcuzo.svelte-udcuzo{--icon-size:30px}header.svelte-udcuzo.svelte-udcuzo.svelte-udcuzo{margin-bottom:3rem}.heading.svelte-udcuzo.svelte-udcuzo.svelte-udcuzo{text-align:center}ul.icon-list.svelte-udcuzo.svelte-udcuzo.svelte-udcuzo{display:flex;flex-wrap:wrap;justify-content:center;-moz-column-gap:3.5rem;column-gap:3.5rem;row-gap:2rem;margin-bottom:3rem}ul.icon-list.svelte-udcuzo li.svelte-udcuzo.svelte-udcuzo{display:flex;gap:12px;align-items:center}ul.icon-list.svelte-udcuzo li.svelte-udcuzo .icon.svelte-udcuzo{color:var(--color-accent);font-size:1.125rem}ul.cards.svelte-udcuzo.svelte-udcuzo.svelte-udcuzo{display:grid;grid-template-columns:repeat(auto-fit, minmax(15rem, 1fr));gap:2rem}ul.cards.svelte-udcuzo li.svelte-udcuzo.svelte-udcuzo{display:grid;place-items:start;gap:1.5rem;border:1px solid var(--border-color);padding:2.5rem;border-radius:var(--border-radius)}ul.cards.svelte-udcuzo li.svelte-udcuzo .icon.svelte-udcuzo{border:1px solid var(--border-color);border-radius:var(--border-radius);padding:0.75rem;color:var(--color-brand, #154bf4);font-size:var(--icon-size)}ul.cards.svelte-udcuzo li .body.svelte-udcuzo.svelte-udcuzo{display:grid;gap:1rem}ul.cards.svelte-udcuzo li .body .title.svelte-udcuzo.svelte-udcuzo{display:grid;align-items:center;gap:1.5rem;font-size:1.25rem;line-height:1.4;font-weight:600}ul.cards.svelte-udcuzo li .body .content.svelte-udcuzo.svelte-udcuzo{font-weight:400;line-height:1.6}ul.cards.svelte-udcuzo li .body .link.svelte-udcuzo.svelte-udcuzo{display:flex;align-items:center;gap:0.5rem}");
}

function get_each_context$2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[6] = list[i];
	return child_ctx;
}

function get_each_context_1$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[9] = list[i].icon;
	child_ctx[10] = list[i].label;
	return child_ctx;
}

// (101:4) {#each icon_list as { icon, label }}
function create_each_block_1$1(ctx) {
	let li;
	let span0;
	let icon;
	let t0;
	let span1;
	let t1_value = /*label*/ ctx[10] + "";
	let t1;
	let t2;
	let current;
	icon = new Component$1({ props: { icon: /*icon*/ ctx[9] } });

	return {
		c() {
			li = element("li");
			span0 = element("span");
			create_component(icon.$$.fragment);
			t0 = space();
			span1 = element("span");
			t1 = text(t1_value);
			t2 = space();
			attr(span0, "class", "icon svelte-udcuzo");
			attr(li, "class", "svelte-udcuzo");
		},
		m(target, anchor) {
			insert(target, li, anchor);
			append(li, span0);
			mount_component(icon, span0, null);
			append(li, t0);
			append(li, span1);
			append(span1, t1);
			append(li, t2);
			current = true;
		},
		p(ctx, dirty) {
			const icon_changes = {};
			if (dirty & /*icon_list*/ 8) icon_changes.icon = /*icon*/ ctx[9];
			icon.$set(icon_changes);
			if ((!current || dirty & /*icon_list*/ 8) && t1_value !== (t1_value = /*label*/ ctx[10] + "")) set_data(t1, t1_value);
		},
		i(local) {
			if (current) return;
			transition_in(icon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(icon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(li);
			destroy_component(icon);
		}
	};
}

// (111:4) {#each cards as card}
function create_each_block$2(ctx) {
	let li;
	let div0;
	let icon0;
	let t0;
	let div3;
	let h3;
	let t1_value = /*card*/ ctx[6].title + "";
	let t1;
	let t2;
	let div1;
	let raw_value = /*card*/ ctx[6].content.html + "";
	let t3;
	let a;
	let span;
	let t4_value = /*card*/ ctx[6].link.label + "";
	let t4;
	let t5;
	let div2;
	let icon1;
	let a_href_value;
	let t6;
	let current;
	icon0 = new Component$1({ props: { icon: /*card*/ ctx[6].icon } });

	icon1 = new Component$1({
			props: { icon: "akar-icons:arrow-right" }
		});

	return {
		c() {
			li = element("li");
			div0 = element("div");
			create_component(icon0.$$.fragment);
			t0 = space();
			div3 = element("div");
			h3 = element("h3");
			t1 = text(t1_value);
			t2 = space();
			div1 = element("div");
			t3 = space();
			a = element("a");
			span = element("span");
			t4 = text(t4_value);
			t5 = space();
			div2 = element("div");
			create_component(icon1.$$.fragment);
			t6 = space();
			attr(div0, "class", "icon svelte-udcuzo");
			attr(h3, "class", "title svelte-udcuzo");
			attr(div1, "class", "content svelte-udcuzo");
			attr(div2, "class", "arrow");
			attr(a, "href", a_href_value = /*card*/ ctx[6].link.url);
			attr(a, "class", "link svelte-udcuzo");
			attr(div3, "class", "body svelte-udcuzo");
			attr(li, "class", "svelte-udcuzo");
		},
		m(target, anchor) {
			insert(target, li, anchor);
			append(li, div0);
			mount_component(icon0, div0, null);
			append(li, t0);
			append(li, div3);
			append(div3, h3);
			append(h3, t1);
			append(div3, t2);
			append(div3, div1);
			div1.innerHTML = raw_value;
			append(div3, t3);
			append(div3, a);
			append(a, span);
			append(span, t4);
			append(a, t5);
			append(a, div2);
			mount_component(icon1, div2, null);
			append(li, t6);
			current = true;
		},
		p(ctx, dirty) {
			const icon0_changes = {};
			if (dirty & /*cards*/ 16) icon0_changes.icon = /*card*/ ctx[6].icon;
			icon0.$set(icon0_changes);
			if ((!current || dirty & /*cards*/ 16) && t1_value !== (t1_value = /*card*/ ctx[6].title + "")) set_data(t1, t1_value);
			if ((!current || dirty & /*cards*/ 16) && raw_value !== (raw_value = /*card*/ ctx[6].content.html + "")) div1.innerHTML = raw_value;			if ((!current || dirty & /*cards*/ 16) && t4_value !== (t4_value = /*card*/ ctx[6].link.label + "")) set_data(t4, t4_value);

			if (!current || dirty & /*cards*/ 16 && a_href_value !== (a_href_value = /*card*/ ctx[6].link.url)) {
				attr(a, "href", a_href_value);
			}
		},
		i(local) {
			if (current) return;
			transition_in(icon0.$$.fragment, local);
			transition_in(icon1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(icon0.$$.fragment, local);
			transition_out(icon1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(li);
			destroy_component(icon0);
			destroy_component(icon1);
		}
	};
}

function create_fragment$5(ctx) {
	let div2;
	let section;
	let header;
	let div0;
	let t0;
	let t1;
	let h2;
	let t2;
	let div1;
	let t3;
	let t4;
	let ul0;
	let t5;
	let ul1;
	let current;
	let each_value_1 = /*icon_list*/ ctx[3];
	let each_blocks_1 = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks_1[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
	}

	const out = i => transition_out(each_blocks_1[i], 1, 1, () => {
		each_blocks_1[i] = null;
	});

	let each_value = /*cards*/ ctx[4];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
	}

	const out_1 = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			div2 = element("div");
			section = element("section");
			header = element("header");
			div0 = element("div");
			t0 = text(/*superhead*/ ctx[0]);
			t1 = space();
			h2 = element("h2");
			t2 = space();
			div1 = element("div");
			t3 = text(/*subhead*/ ctx[2]);
			t4 = space();
			ul0 = element("ul");

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			t5 = space();
			ul1 = element("ul");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(div0, "class", "superhead");
			attr(h2, "class", "heading svelte-udcuzo");
			attr(div1, "class", "subheading");
			attr(header, "class", "heading-group svelte-udcuzo");
			attr(ul0, "class", "icon-list svelte-udcuzo");
			attr(ul1, "class", "cards svelte-udcuzo");
			attr(section, "class", "section-container svelte-udcuzo");
			attr(div2, "class", "section");
			attr(div2, "id", "section-38228327");
		},
		m(target, anchor) {
			insert(target, div2, anchor);
			append(div2, section);
			append(section, header);
			append(header, div0);
			append(div0, t0);
			append(header, t1);
			append(header, h2);
			h2.innerHTML = /*heading*/ ctx[1];
			append(header, t2);
			append(header, div1);
			append(div1, t3);
			append(section, t4);
			append(section, ul0);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				if (each_blocks_1[i]) {
					each_blocks_1[i].m(ul0, null);
				}
			}

			append(section, t5);
			append(section, ul1);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(ul1, null);
				}
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (!current || dirty & /*superhead*/ 1) set_data(t0, /*superhead*/ ctx[0]);
			if (!current || dirty & /*heading*/ 2) h2.innerHTML = /*heading*/ ctx[1];			if (!current || dirty & /*subhead*/ 4) set_data(t3, /*subhead*/ ctx[2]);

			if (dirty & /*icon_list*/ 8) {
				each_value_1 = /*icon_list*/ ctx[3];
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

					if (each_blocks_1[i]) {
						each_blocks_1[i].p(child_ctx, dirty);
						transition_in(each_blocks_1[i], 1);
					} else {
						each_blocks_1[i] = create_each_block_1$1(child_ctx);
						each_blocks_1[i].c();
						transition_in(each_blocks_1[i], 1);
						each_blocks_1[i].m(ul0, null);
					}
				}

				group_outros();

				for (i = each_value_1.length; i < each_blocks_1.length; i += 1) {
					out(i);
				}

				check_outros();
			}

			if (dirty & /*cards*/ 16) {
				each_value = /*cards*/ ctx[4];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$2(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block$2(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(ul1, null);
					}
				}

				group_outros();

				for (i = each_value.length; i < each_blocks.length; i += 1) {
					out_1(i);
				}

				check_outros();
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value_1.length; i += 1) {
				transition_in(each_blocks_1[i]);
			}

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			each_blocks_1 = each_blocks_1.filter(Boolean);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				transition_out(each_blocks_1[i]);
			}

			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			if (detaching) detach(div2);
			destroy_each(each_blocks_1, detaching);
			destroy_each(each_blocks, detaching);
		}
	};
}

function instance$5($$self, $$props, $$invalidate) {
	let { favicon } = $$props;
	let { superhead } = $$props;
	let { heading } = $$props;
	let { subhead } = $$props;
	let { icon_list } = $$props;
	let { cards } = $$props;

	$$self.$$set = $$props => {
		if ('favicon' in $$props) $$invalidate(5, favicon = $$props.favicon);
		if ('superhead' in $$props) $$invalidate(0, superhead = $$props.superhead);
		if ('heading' in $$props) $$invalidate(1, heading = $$props.heading);
		if ('subhead' in $$props) $$invalidate(2, subhead = $$props.subhead);
		if ('icon_list' in $$props) $$invalidate(3, icon_list = $$props.icon_list);
		if ('cards' in $$props) $$invalidate(4, cards = $$props.cards);
	};

	return [superhead, heading, subhead, icon_list, cards, favicon];
}

class Component$5 extends SvelteComponent {
	constructor(options) {
		super();

		init(
			this,
			options,
			instance$5,
			create_fragment$5,
			safe_not_equal,
			{
				favicon: 5,
				superhead: 0,
				heading: 1,
				subhead: 2,
				icon_list: 3,
				cards: 4
			},
			add_css$3
		);
	}
}

/* generated by Svelte v3.58.0 */

function add_css$4(target) {
	append_styles(target, "svelte-1nxn5fd", ".section-container.svelte-1nxn5fd{padding-block:5rem}");
}

function create_fragment$6(ctx) {
	let div1;

	return {
		c() {
			div1 = element("div");
			div1.innerHTML = `<div class="section-container svelte-1nxn5fd"><hr/></div>`;
			attr(div1, "class", "section");
			attr(div1, "id", "section-98a9f799");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div1);
		}
	};
}

function instance$6($$self, $$props, $$invalidate) {
	let { favicon } = $$props;

	$$self.$$set = $$props => {
		if ('favicon' in $$props) $$invalidate(0, favicon = $$props.favicon);
	};

	return [favicon];
}

class Component$6 extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$6, create_fragment$6, safe_not_equal, { favicon: 0 }, add_css$4);
	}
}

/* generated by Svelte v3.58.0 */

function add_css$5(target) {
	append_styles(target, "svelte-585z62", ".section-container.svelte-585z62.svelte-585z62{display:grid;gap:4rem}ul.svelte-585z62.svelte-585z62{display:grid;place-content:center;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:4rem}ul.svelte-585z62 li.svelte-585z62{display:grid;place-content:start;gap:2rem}ul.svelte-585z62 li .quote.svelte-585z62{font-size:1.125rem;line-height:1.75}ul.svelte-585z62 li .person.svelte-585z62{display:flex;gap:1rem}ul.svelte-585z62 li .person img.svelte-585z62{width:40px;height:40px;-o-object-fit:cover;object-fit:cover;border-radius:50%}ul.svelte-585z62 li .person .text.svelte-585z62{display:grid;gap:0.25rem}ul.svelte-585z62 li .person .name.svelte-585z62{font-weight:600}ul.svelte-585z62 li .person .subtitle.svelte-585z62{font-size:0.875rem}");
}

function get_each_context$3(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[4] = list[i].quote;
	child_ctx[5] = list[i].name;
	child_ctx[6] = list[i].subtitle;
	child_ctx[7] = list[i].image;
	child_ctx[9] = i;
	return child_ctx;
}

// (66:4) {#each testimonials as { quote, name, subtitle, image }
function create_each_block$3(ctx) {
	let li;
	let div0;
	let raw_value = /*quote*/ ctx[4].html + "";
	let div0_data_key_value;
	let t0;
	let div2;
	let img;
	let img_src_value;
	let img_alt_value;
	let t1;
	let div1;
	let span0;
	let t2_value = /*name*/ ctx[5] + "";
	let t2;
	let t3;
	let span1;
	let t4_value = /*subtitle*/ ctx[6] + "";
	let t4;
	let t5;

	return {
		c() {
			li = element("li");
			div0 = element("div");
			t0 = space();
			div2 = element("div");
			img = element("img");
			t1 = space();
			div1 = element("div");
			span0 = element("span");
			t2 = text(t2_value);
			t3 = space();
			span1 = element("span");
			t4 = text(t4_value);
			t5 = space();
			attr(div0, "class", "quote svelte-585z62");
			attr(div0, "data-key", div0_data_key_value = "testimonials[" + /*i*/ ctx[9] + "].quote");
			if (!src_url_equal(img.src, img_src_value = /*image*/ ctx[7].url)) attr(img, "src", img_src_value);
			attr(img, "alt", img_alt_value = /*image*/ ctx[7].alt);
			attr(img, "class", "svelte-585z62");
			attr(span0, "class", "name svelte-585z62");
			attr(span1, "class", "subtitle svelte-585z62");
			attr(div1, "class", "text svelte-585z62");
			attr(div2, "class", "person svelte-585z62");
			attr(li, "class", "svelte-585z62");
		},
		m(target, anchor) {
			insert(target, li, anchor);
			append(li, div0);
			div0.innerHTML = raw_value;
			append(li, t0);
			append(li, div2);
			append(div2, img);
			append(div2, t1);
			append(div2, div1);
			append(div1, span0);
			append(span0, t2);
			append(div1, t3);
			append(div1, span1);
			append(span1, t4);
			append(li, t5);
		},
		p(ctx, dirty) {
			if (dirty & /*testimonials*/ 4 && raw_value !== (raw_value = /*quote*/ ctx[4].html + "")) div0.innerHTML = raw_value;
			if (dirty & /*testimonials*/ 4 && !src_url_equal(img.src, img_src_value = /*image*/ ctx[7].url)) {
				attr(img, "src", img_src_value);
			}

			if (dirty & /*testimonials*/ 4 && img_alt_value !== (img_alt_value = /*image*/ ctx[7].alt)) {
				attr(img, "alt", img_alt_value);
			}

			if (dirty & /*testimonials*/ 4 && t2_value !== (t2_value = /*name*/ ctx[5] + "")) set_data(t2, t2_value);
			if (dirty & /*testimonials*/ 4 && t4_value !== (t4_value = /*subtitle*/ ctx[6] + "")) set_data(t4, t4_value);
		},
		d(detaching) {
			if (detaching) detach(li);
		}
	};
}

function create_fragment$7(ctx) {
	let div1;
	let section;
	let div0;
	let span;
	let t0;
	let t1;
	let h2;
	let t2;
	let t3;
	let ul;
	let each_value = /*testimonials*/ ctx[2];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
	}

	return {
		c() {
			div1 = element("div");
			section = element("section");
			div0 = element("div");
			span = element("span");
			t0 = text(/*superhead*/ ctx[0]);
			t1 = space();
			h2 = element("h2");
			t2 = text(/*heading*/ ctx[1]);
			t3 = space();
			ul = element("ul");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(span, "class", "superhead");
			attr(h2, "class", "heading");
			attr(div0, "class", "heading-group");
			attr(ul, "class", "svelte-585z62");
			attr(section, "class", "section-container svelte-585z62");
			attr(div1, "class", "section");
			attr(div1, "id", "section-8f8eaeae");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, section);
			append(section, div0);
			append(div0, span);
			append(span, t0);
			append(div0, t1);
			append(div0, h2);
			append(h2, t2);
			append(section, t3);
			append(section, ul);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(ul, null);
				}
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*superhead*/ 1) set_data(t0, /*superhead*/ ctx[0]);
			if (dirty & /*heading*/ 2) set_data(t2, /*heading*/ ctx[1]);

			if (dirty & /*testimonials*/ 4) {
				each_value = /*testimonials*/ ctx[2];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$3(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$3(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(ul, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div1);
			destroy_each(each_blocks, detaching);
		}
	};
}

function instance$7($$self, $$props, $$invalidate) {
	let { favicon } = $$props;
	let { superhead } = $$props;
	let { heading } = $$props;
	let { testimonials } = $$props;

	$$self.$$set = $$props => {
		if ('favicon' in $$props) $$invalidate(3, favicon = $$props.favicon);
		if ('superhead' in $$props) $$invalidate(0, superhead = $$props.superhead);
		if ('heading' in $$props) $$invalidate(1, heading = $$props.heading);
		if ('testimonials' in $$props) $$invalidate(2, testimonials = $$props.testimonials);
	};

	return [superhead, heading, testimonials, favicon];
}

class Component$7 extends SvelteComponent {
	constructor(options) {
		super();

		init(
			this,
			options,
			instance$7,
			create_fragment$7,
			safe_not_equal,
			{
				favicon: 3,
				superhead: 0,
				heading: 1,
				testimonials: 2
			},
			add_css$5
		);
	}
}

/* generated by Svelte v3.58.0 */

function add_css$6(target) {
	append_styles(target, "svelte-5m5swo", "footer.svelte-5m5swo.svelte-5m5swo{border-top:1px solid var(--border-color, #e5e5e7)}.section-container.svelte-5m5swo.svelte-5m5swo{display:grid;justify-content:space-between;align-items:center;gap:1rem;padding-block:1rem}@media(min-width: 600px){.section-container.svelte-5m5swo.svelte-5m5swo{display:flex;flex-direction:row\n}}nav.svelte-5m5swo.svelte-5m5swo{display:flex;gap:1rem;font-size:1rem}.primo.svelte-5m5swo.svelte-5m5swo{font-weight:600;font-size:.875rem}.primo.svelte-5m5swo a.svelte-5m5swo{text-decoration:underline}ul.svelte-5m5swo.svelte-5m5swo{display:flex;gap:1rem;font-size:1.5rem;list-style:none}ul.svelte-5m5swo a.svelte-5m5swo{color:var(--color-brand);transition:var(--transition)}ul.svelte-5m5swo a.svelte-5m5swo:hover{color:var(--color-accent)}");
}

function get_each_context$4(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[3] = list[i].link;
	child_ctx[4] = list[i].icon;
	return child_ctx;
}

function get_each_context_1$2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[3] = list[i].link;
	return child_ctx;
}

// (64:6) {#each footer_nav as { link }}
function create_each_block_1$2(ctx) {
	let a;
	let t_value = /*link*/ ctx[3].label + "";
	let t;
	let a_href_value;

	return {
		c() {
			a = element("a");
			t = text(t_value);
			attr(a, "href", a_href_value = /*link*/ ctx[3].url);
		},
		m(target, anchor) {
			insert(target, a, anchor);
			append(a, t);
		},
		p(ctx, dirty) {
			if (dirty & /*footer_nav*/ 1 && t_value !== (t_value = /*link*/ ctx[3].label + "")) set_data(t, t_value);

			if (dirty & /*footer_nav*/ 1 && a_href_value !== (a_href_value = /*link*/ ctx[3].url)) {
				attr(a, "href", a_href_value);
			}
		},
		d(detaching) {
			if (detaching) detach(a);
		}
	};
}

// (70:6) {#each social as { link, icon }}
function create_each_block$4(ctx) {
	let li;
	let a;
	let icon;
	let a_href_value;
	let a_aria_label_value;
	let t;
	let current;
	icon = new Component$1({ props: { icon: /*icon*/ ctx[4] } });

	return {
		c() {
			li = element("li");
			a = element("a");
			create_component(icon.$$.fragment);
			t = space();
			attr(a, "href", a_href_value = /*link*/ ctx[3].url);
			attr(a, "aria-label", a_aria_label_value = /*icon*/ ctx[4]);
			attr(a, "class", "svelte-5m5swo");
		},
		m(target, anchor) {
			insert(target, li, anchor);
			append(li, a);
			mount_component(icon, a, null);
			append(li, t);
			current = true;
		},
		p(ctx, dirty) {
			const icon_changes = {};
			if (dirty & /*social*/ 2) icon_changes.icon = /*icon*/ ctx[4];
			icon.$set(icon_changes);

			if (!current || dirty & /*social*/ 2 && a_href_value !== (a_href_value = /*link*/ ctx[3].url)) {
				attr(a, "href", a_href_value);
			}

			if (!current || dirty & /*social*/ 2 && a_aria_label_value !== (a_aria_label_value = /*icon*/ ctx[4])) {
				attr(a, "aria-label", a_aria_label_value);
			}
		},
		i(local) {
			if (current) return;
			transition_in(icon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(icon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(li);
			destroy_component(icon);
		}
	};
}

function create_fragment$8(ctx) {
	let div1;
	let footer;
	let div0;
	let nav;
	let t0;
	let span;
	let t3;
	let ul;
	let current;
	let each_value_1 = /*footer_nav*/ ctx[0];
	let each_blocks_1 = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks_1[i] = create_each_block_1$2(get_each_context_1$2(ctx, each_value_1, i));
	}

	let each_value = /*social*/ ctx[1];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			div1 = element("div");
			footer = element("footer");
			div0 = element("div");
			nav = element("nav");

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			t0 = space();
			span = element("span");
			span.innerHTML = `<a href="https://primo.so" class="svelte-5m5swo">Primo</a> Powered`;
			t3 = space();
			ul = element("ul");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(nav, "class", "svelte-5m5swo");
			attr(span, "class", "primo svelte-5m5swo");
			attr(ul, "class", "svelte-5m5swo");
			attr(div0, "class", "section-container svelte-5m5swo");
			attr(footer, "class", "svelte-5m5swo");
			attr(div1, "class", "section");
			attr(div1, "id", "section-4a8f5120");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, footer);
			append(footer, div0);
			append(div0, nav);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				if (each_blocks_1[i]) {
					each_blocks_1[i].m(nav, null);
				}
			}

			append(div0, t0);
			append(div0, span);
			append(div0, t3);
			append(div0, ul);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(ul, null);
				}
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (dirty & /*footer_nav*/ 1) {
				each_value_1 = /*footer_nav*/ ctx[0];
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1$2(ctx, each_value_1, i);

					if (each_blocks_1[i]) {
						each_blocks_1[i].p(child_ctx, dirty);
					} else {
						each_blocks_1[i] = create_each_block_1$2(child_ctx);
						each_blocks_1[i].c();
						each_blocks_1[i].m(nav, null);
					}
				}

				for (; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].d(1);
				}

				each_blocks_1.length = each_value_1.length;
			}

			if (dirty & /*social*/ 2) {
				each_value = /*social*/ ctx[1];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$4(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block$4(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(ul, null);
					}
				}

				group_outros();

				for (i = each_value.length; i < each_blocks.length; i += 1) {
					out(i);
				}

				check_outros();
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			if (detaching) detach(div1);
			destroy_each(each_blocks_1, detaching);
			destroy_each(each_blocks, detaching);
		}
	};
}

function instance$8($$self, $$props, $$invalidate) {
	let { favicon } = $$props;
	let { footer_nav } = $$props;
	let { social } = $$props;

	$$self.$$set = $$props => {
		if ('favicon' in $$props) $$invalidate(2, favicon = $$props.favicon);
		if ('footer_nav' in $$props) $$invalidate(0, footer_nav = $$props.footer_nav);
		if ('social' in $$props) $$invalidate(1, social = $$props.social);
	};

	return [footer_nav, social, favicon];
}

class Component$8 extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$8, create_fragment$8, safe_not_equal, { favicon: 2, footer_nav: 0, social: 1 }, add_css$6);
	}
}

/* generated by Svelte v3.58.0 */

function instance$9($$self, $$props, $$invalidate) {
	let { favicon } = $$props;

	$$self.$$set = $$props => {
		if ('favicon' in $$props) $$invalidate(0, favicon = $$props.favicon);
	};

	return [favicon];
}

class Component$9 extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$9, null, safe_not_equal, { favicon: 0 });
	}
}

/* generated by Svelte v3.58.0 */

function create_fragment$9(ctx) {
	let component_0;
	let t0;
	let component_1;
	let t1;
	let component_2;
	let t2;
	let component_3;
	let t3;
	let component_4;
	let t4;
	let component_5;
	let t5;
	let component_6;
	let t6;
	let component_7;
	let t7;
	let component_8;
	let current;

	component_0 = new Component({
			props: {
				favicon: {
					"alt": "EU VAT Number checker",
					"src": "https://res.cloudinary.com/primoaf/image/upload/v1659676914/favicon_roaxv0.png",
					"url": "https://res.cloudinary.com/primoaf/image/upload/v1659676914/favicon_roaxv0.png",
					"size": null
				}
			}
		});

	component_1 = new Component$2({
			props: {
				favicon: {
					"alt": "EU VAT Number checker",
					"src": "https://res.cloudinary.com/primoaf/image/upload/v1659676914/favicon_roaxv0.png",
					"url": "https://res.cloudinary.com/primoaf/image/upload/v1659676914/favicon_roaxv0.png",
					"size": null
				},
				logo: {
					"size": "8",
					"image": {
						"alt": "",
						"src": "https://qcoxcdbvdtyqbtcdsbfx.supabase.co/storage/v1/object/public/images/627f6e72-5f8b-451d-8434-18b46cc75e86/1688064969349europe.svg",
						"url": "https://qcoxcdbvdtyqbtcdsbfx.supabase.co/storage/v1/object/public/images/627f6e72-5f8b-451d-8434-18b46cc75e86/1688064969349europe.svg",
						"size": 13
					},
					"title": "EU VAT Number checker"
				},
				site_nav: [
					{
						"link": { "url": "/product", "label": "Product" }
					},
					{
						"link": { "url": "/pricing", "label": "Pricing" }
					},
					{
						"link": { "url": "/", "label": "Contact" }
					}
				],
				cta: [
					{
						"link": { "url": "/", "label": "Sign up" }
					}
				]
			}
		});

	component_2 = new Component$3({
			props: {
				favicon: {
					"alt": "EU VAT Number checker",
					"src": "https://res.cloudinary.com/primoaf/image/upload/v1659676914/favicon_roaxv0.png",
					"url": "https://res.cloudinary.com/primoaf/image/upload/v1659676914/favicon_roaxv0.png",
					"size": null
				},
				heading: "VAT Number Validation & Lookup",
				subheading: "Check the validity of a VAT number issued by any European Member State of European Union.",
				link: { "url": "/", "label": "Try it !" },
				image: {
					"alt": "",
					"url": "https://qcoxcdbvdtyqbtcdsbfx.supabase.co/storage/v1/object/public/images/627f6e72-5f8b-451d-8434-18b46cc75e86/expert.png1688068238447"
				},
				variation: ""
			}
		});

	component_3 = new Component$4({
			props: {
				favicon: {
					"alt": "EU VAT Number checker",
					"src": "https://res.cloudinary.com/primoaf/image/upload/v1659676914/favicon_roaxv0.png",
					"url": "https://res.cloudinary.com/primoaf/image/upload/v1659676914/favicon_roaxv0.png",
					"size": null
				},
				heading: "Get in touch",
				subheading: "We'd love to hear from you. Drop us a line anytime.",
				inputs: [
					{
						"type": "text",
						"label": "Name",
						"placeholder": "Ad exercitation quis"
					},
					{
						"type": "text",
						"label": "Subject",
						"placeholder": "Mollit nulla veniam"
					},
					{
						"type": "email",
						"label": "Email",
						"placeholder": "Ea ex incididunt"
					},
					{
						"type": "textarea",
						"label": "Message",
						"placeholder": "Dolore lorem adipisicing"
					}
				]
			}
		});

	component_4 = new Component$5({
			props: {
				favicon: {
					"alt": "EU VAT Number checker",
					"src": "https://res.cloudinary.com/primoaf/image/upload/v1659676914/favicon_roaxv0.png",
					"url": "https://res.cloudinary.com/primoaf/image/upload/v1659676914/favicon_roaxv0.png",
					"size": null
				},
				superhead: "Checking VAT numbers is a crucial step of tax compliance when selling B2B",
				heading: "check if a company is VAT registered",
				subhead: "",
				icon_list: [
					{
						"icon": "akar-icons:circle-check-fill",
						"label": "Open source"
					},
					{
						"icon": "akar-icons:circle-check-fill",
						"label": "Free for individuals"
					},
					{
						"icon": "akar-icons:circle-check-fill",
						"label": "\nSafe and secure\n"
					}
				],
				cards: [
					{
						"icon": "akar-icons:gift",
						"link": { "url": "/", "label": "Learn More" },
						"title": "100 Free Requests / Month",
						"content": {
							"html": "<p>Free for hobby projects &amp; enough to get your professional project up and running.</p>",
							"markdown": "Free for hobby projects & enough to get your professional project up and running."
						}
					},
					{
						"icon": "akar-icons:circle-check-fill",
						"link": { "url": "/", "label": "Learn More" },
						"title": "High Data Quality",
						"content": {
							"html": "<p>Our API utilizes a range of leading data sources, updated continuously.</p>",
							"markdown": "Our API utilizes a range of leading data sources, updated continuously."
						}
					},
					{
						"icon": "akar-icons:infinite",
						"link": { "url": "/", "label": "Learn More" },
						"title": "Unlimited Concurrency",
						"content": {
							"html": "<p>All paid plans come along with an unlimited amount of API connections.</p>",
							"markdown": "All paid plans come along with an unlimited amount of API connections."
						}
					},
					{
						"icon": "akar-icons:phone",
						"link": { "url": "/", "label": "Learn More" },
						"title": "Premium Support",
						"content": {
							"html": "<p>We provide dedicated premium support. We are set to meet the highest service expectations.</p>",
							"markdown": "We provide dedicated premium support. We are set to meet the highest service expectations."
						}
					}
				]
			}
		});

	component_5 = new Component$6({
			props: {
				favicon: {
					"alt": "EU VAT Number checker",
					"src": "https://res.cloudinary.com/primoaf/image/upload/v1659676914/favicon_roaxv0.png",
					"url": "https://res.cloudinary.com/primoaf/image/upload/v1659676914/favicon_roaxv0.png",
					"size": null
				}
			}
		});

	component_6 = new Component$7({
			props: {
				favicon: {
					"alt": "EU VAT Number checker",
					"src": "https://res.cloudinary.com/primoaf/image/upload/v1659676914/favicon_roaxv0.png",
					"url": "https://res.cloudinary.com/primoaf/image/upload/v1659676914/favicon_roaxv0.png",
					"size": null
				},
				superhead: "Testiominals",
				heading: "Hear from our recent users",
				testimonials: [
					{
						"name": "Julien OLLIVIER",
						"image": {
							"alt": "",
							"url": "https://qcoxcdbvdtyqbtcdsbfx.supabase.co/storage/v1/object/public/images/627f6e72-5f8b-451d-8434-18b46cc75e86/julien-o.jpg1663788982000"
						},
						"quote": {
							"html": "<p>\"An easy-to-use API to validate VAT numbers\"</p>",
							"markdown": "\"An easy-to-use API to validate VAT numbers\"\n\n"
						},
						"subtitle": "Web Developper"
					},
					{
						"name": "Mélanie L.",
						"image": {
							"alt": "",
							"src": "https://qcoxcdbvdtyqbtcdsbfx.supabase.co/storage/v1/object/public/images/627f6e72-5f8b-451d-8434-18b46cc75e86/1688071051270melanie.png",
							"url": "https://qcoxcdbvdtyqbtcdsbfx.supabase.co/storage/v1/object/public/images/627f6e72-5f8b-451d-8434-18b46cc75e86/1688071051270melanie.png",
							"size": 1592
						},
						"quote": {
							"html": "<p>\"Simple and reliable. I recommend\"</p>",
							"markdown": "\"Simple and reliable. I recommend\"\n\n"
						},
						"subtitle": "Product Owner"
					}
				]
			}
		});

	component_7 = new Component$8({
			props: {
				favicon: {
					"alt": "EU VAT Number checker",
					"src": "https://res.cloudinary.com/primoaf/image/upload/v1659676914/favicon_roaxv0.png",
					"url": "https://res.cloudinary.com/primoaf/image/upload/v1659676914/favicon_roaxv0.png",
					"size": null
				},
				footer_nav: [
					{
						"link": { "url": "/about", "label": "About us" }
					}
				],
				social: [
					{
						"icon": "mdi:github",
						"link": {
							"url": "https://github.com",
							"label": "Github"
						}
					}
				]
			}
		});

	component_8 = new Component$9({
			props: {
				favicon: {
					"alt": "EU VAT Number checker",
					"src": "https://res.cloudinary.com/primoaf/image/upload/v1659676914/favicon_roaxv0.png",
					"url": "https://res.cloudinary.com/primoaf/image/upload/v1659676914/favicon_roaxv0.png",
					"size": null
				}
			}
		});

	return {
		c() {
			create_component(component_0.$$.fragment);
			t0 = space();
			create_component(component_1.$$.fragment);
			t1 = space();
			create_component(component_2.$$.fragment);
			t2 = space();
			create_component(component_3.$$.fragment);
			t3 = space();
			create_component(component_4.$$.fragment);
			t4 = space();
			create_component(component_5.$$.fragment);
			t5 = space();
			create_component(component_6.$$.fragment);
			t6 = space();
			create_component(component_7.$$.fragment);
			t7 = space();
			create_component(component_8.$$.fragment);
		},
		m(target, anchor) {
			mount_component(component_0, target, anchor);
			insert(target, t0, anchor);
			mount_component(component_1, target, anchor);
			insert(target, t1, anchor);
			mount_component(component_2, target, anchor);
			insert(target, t2, anchor);
			mount_component(component_3, target, anchor);
			insert(target, t3, anchor);
			mount_component(component_4, target, anchor);
			insert(target, t4, anchor);
			mount_component(component_5, target, anchor);
			insert(target, t5, anchor);
			mount_component(component_6, target, anchor);
			insert(target, t6, anchor);
			mount_component(component_7, target, anchor);
			insert(target, t7, anchor);
			mount_component(component_8, target, anchor);
			current = true;
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(component_0.$$.fragment, local);
			transition_in(component_1.$$.fragment, local);
			transition_in(component_2.$$.fragment, local);
			transition_in(component_3.$$.fragment, local);
			transition_in(component_4.$$.fragment, local);
			transition_in(component_5.$$.fragment, local);
			transition_in(component_6.$$.fragment, local);
			transition_in(component_7.$$.fragment, local);
			transition_in(component_8.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(component_0.$$.fragment, local);
			transition_out(component_1.$$.fragment, local);
			transition_out(component_2.$$.fragment, local);
			transition_out(component_3.$$.fragment, local);
			transition_out(component_4.$$.fragment, local);
			transition_out(component_5.$$.fragment, local);
			transition_out(component_6.$$.fragment, local);
			transition_out(component_7.$$.fragment, local);
			transition_out(component_8.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(component_0, detaching);
			if (detaching) detach(t0);
			destroy_component(component_1, detaching);
			if (detaching) detach(t1);
			destroy_component(component_2, detaching);
			if (detaching) detach(t2);
			destroy_component(component_3, detaching);
			if (detaching) detach(t3);
			destroy_component(component_4, detaching);
			if (detaching) detach(t4);
			destroy_component(component_5, detaching);
			if (detaching) detach(t5);
			destroy_component(component_6, detaching);
			if (detaching) detach(t6);
			destroy_component(component_7, detaching);
			if (detaching) detach(t7);
			destroy_component(component_8, detaching);
		}
	};
}

class Component$a extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment$9, safe_not_equal, {});
	}
}

export default Component$a;
