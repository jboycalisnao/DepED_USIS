import type { PropsWithChildren } from 'react';

export function PageFrame({ children }: PropsWithChildren) {
  return (
    <main className="page-frame pb-18">
      <div className="content-width">{children}</div>
    </main>
  );
}
