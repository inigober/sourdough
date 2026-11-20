import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// Portals need a real document. For markup checks, render the portal content in place.
vi.mock('react-dom', async (importOriginal) => {
  const original = await importOriginal<typeof import('react-dom')>();
  return { ...original, createPortal: (children: unknown) => children };
});

// DialogCard passes document.body as the portal target.
vi.stubGlobal('document', { body: {} });

const { ConfirmDialog } = await import('../../components/ConfirmDialog.tsx');

const noop = () => {};

function renderConfirm(destructive?: boolean): string {
  return renderToStaticMarkup(
    createElement(ConfirmDialog, {
      title: 'Delete this bake?',
      message: 'It cannot be undone.',
      confirmLabel: 'Delete bake',
      destructive,
      onCancel: noop,
      onConfirm: noop,
    }),
  );
}

describe('sheet pattern', () => {
  it('has one close button, Cancel as a secondary button, and a sticky actions area', () => {
    const html = renderConfirm();

    expect(html.match(/aria-label="Close dialog"/g)?.length).toBe(1);
    expect(html).toContain('button button--secondary');
    expect(html).toContain('dialog-card__footer');
  });

  it('shows a destructive confirm in the danger style, and a normal confirm as primary', () => {
    const destructive = renderConfirm(true);
    expect(destructive).toMatch(/class="button button--danger"[^>]*>Delete bake/);
    expect(destructive).not.toContain('button--primary');

    expect(renderConfirm()).toContain('button button--primary');
  });
});
