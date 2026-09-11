import { createBranchHandler } from './src/server.mjs';

export const inject = ['connection', 'workspaceRegistry'];

export function apply(ctx) {
  // handle() registers its disposer on the calling plugin's owner scope.
  ctx.connection.rpc.handle('/show-git-brunch', createBranchHandler(ctx), { authority: 'trusted-host' });
}
