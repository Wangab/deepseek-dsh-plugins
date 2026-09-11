import test from 'node:test';
import assert from 'node:assert/strict';
import { createClientPlugin, displayBranch, validBranch } from '../src/client.mjs';

test('validates branch wire values and formats detached state', () => {
  assert.deepEqual(validBranch({kind:'branch',name:'功能/分支'}), {kind:'branch',name:'功能/分支'});
  for (const value of [null, {}, {kind:'branch',name:''}, {kind:'other',name:'x'}, {kind:'detached',name:1}]) assert.equal(validBranch(value), null);
  assert.equal(displayBranch({kind:'branch',name:'main'}), 'main');
  assert.equal(displayBranch({kind:'detached',name:'abc1234'}), 'detached abc1234');
});

test('registers a noninteractive header label immediately after mode', () => {
  const React = { createElement(){}, useEffect(){}, useState(){}, };
  const plugin = createClientPlugin(React); let entry;
  plugin.apply({ connection:{rpc:{}}, slots:{ inject(name, mount){ assert.equal(name,'conversation.session.header.actions'); mount(); }, register(options, component){ entry={options,component}; return ()=>{}; } } });
  assert.deepEqual(plugin.inject, ['slots','connection']);
  assert.equal(entry.options.id, 'show-git-brunch'); assert.equal(entry.options.order, -9); assert.equal(typeof entry.component, 'function');
});

test('label renders text as a child with truncation and full title, never HTML', () => {
  let state = { identity:'s1\0/repo', value:{kind:'branch',name:'<img src=x onerror=1>'.repeat(8)} };
  const effects=[];
  const React = {
    createElement(type, props, ...children){ return {type,props,children}; },
    useState(){ return [state, next => { state = typeof next === 'function' ? next(state) : next; }]; },
    useEffect(fn){ effects.push(fn); },
  };
  const plugin=createClientPlugin(React); let Component;
  plugin.apply({connection:{rpc:{call:async()=>({ok:true,value:null})}},slots:{inject(_n,m){m();},register(_o,c){Component=c;return()=>{};}}});
  const tree=Component({sessionId:'s1',useSessions:selector=>selector({byId:{s1:{cwd:'/repo'}}})});
  assert.equal(tree.type,'span'); assert.equal(tree.props.title, state.value.name); assert.equal(tree.props.dangerouslySetInnerHTML, undefined);
  const renderedText = tree.children.at(-1).children[0];
  assert.equal(typeof renderedText,'string'); assert.ok(renderedText.endsWith('…'));
});

test('identity mismatch hides a previous session branch synchronously', () => {
  const React={createElement(){throw new Error('must render null');},useState(){return [{identity:'old\0/a',value:{kind:'branch',name:'old'}},()=>{}];},useEffect(){}};
  const plugin=createClientPlugin(React); let Component; plugin.apply({connection:{rpc:{}},slots:{inject(_n,m){m();},register(_o,c){Component=c;return()=>{};}}});
  assert.equal(Component({sessionId:'new',useSessions:selector=>selector({byId:{new:{cwd:'/b'}}})}),null);
});
