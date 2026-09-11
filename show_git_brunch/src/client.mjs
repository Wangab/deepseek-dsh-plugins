import { createBranchPolling } from './polling.mjs';

const labelStyle = { display:'inline-flex', alignItems:'center', gap:'4px', minWidth:0, maxWidth:'240px', color:'var(--text-tertiary, #6b7280)', fontSize:'12px', lineHeight:1, whiteSpace:'nowrap' };
const textStyle = { overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' };

export function validBranch(value) {
  if (value === null || typeof value !== 'object' || !['branch','detached'].includes(value.kind)
    || typeof value.name !== 'string' || value.name.length === 0 || value.name.length > 4096) return null;
  return { kind: value.kind, name: value.name };
}

export function displayBranch(value) {
  return value.kind === 'detached' ? 'detached ' + value.name : value.name;
}

function truncate(value, limit = 48) {
  const chars = Array.from(value);
  return chars.length <= limit ? value : chars.slice(0, limit - 1).join('') + '…';
}

function BranchIcon(React) {
  return React.createElement('svg', {width:14,height:14,viewBox:'0 0 16 16',fill:'none','aria-hidden':true,style:{flex:'0 0 auto'}},
    React.createElement('circle',{cx:5,cy:3,r:1.5,stroke:'currentColor',strokeWidth:1.25}),
    React.createElement('circle',{cx:5,cy:13,r:1.5,stroke:'currentColor',strokeWidth:1.25}),
    React.createElement('circle',{cx:11,cy:5,r:1.5,stroke:'currentColor',strokeWidth:1.25}),
    React.createElement('path',{d:'M5 4.5v7M6.5 10c3 0 4.5-1.5 4.5-3.5',stroke:'currentColor',strokeWidth:1.25,strokeLinecap:'round'}));
}

export function createClientPlugin(React) {
  function BranchLabel({ sessionId, useSessions }) {
    const cwd = useSessions(state => state.byId[sessionId]?.cwd);
    const identity = String(sessionId) + '\0' + (cwd ?? '');
    const [state, setState] = React.useState({ identity:'', value:null });

    React.useEffect(() => {
      setState({ identity, value:null });
      if (typeof cwd !== 'string' || cwd.length === 0) return undefined;
      return createBranchPolling({
        request: async signal => {
          const result = await this.connection.rpc.call('/show-git-brunch', 'branch', { sessionId }, signal);
          return result?.ok === true ? validBranch(result.value) : null;
        },
        onValue: value => setState({ identity, value: validBranch(value) }),
      });
    }, [identity, sessionId, cwd]);

    const value = state.identity === identity ? state.value : null;
    if (value === null) return null;
    const full = displayBranch(value);
    return React.createElement('span', {style:labelStyle,title:full,'aria-label':'Git branch: ' + full},
      BranchIcon(React), React.createElement('span',{style:textStyle},truncate(full)));
  }

  let connection;
  function BoundLabel(props) { return BranchLabel.call({connection}, props); }
  return {
    inject: ['slots','connection'],
    apply(ctx) {
      connection = ctx.connection;
      ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
        name:'conversation.session.header.actions', id:'show-git-brunch', order:-9, label:'Git branch',
      }, BoundLabel));
    },
  };
}
