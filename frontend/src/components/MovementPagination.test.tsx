import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MovementPagination } from './MovementPagination';

describe('MovementPagination', () => {
  it('derives the visible range and lets keyboard users change pages', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<MovementPagination page={1} pageSize={20} total={21} totalPages={2} pending={false} onPageChange={onPageChange} />);

    expect(screen.getByText('Movimentações 1–20 de 21')).toBeInTheDocument();
    await user.tab();
    await user.keyboard('{Enter}');
    expect(onPageChange).toHaveBeenCalledWith(2);
    rerender(<MovementPagination page={2} pageSize={20} total={21} totalPages={2} pending={false} onPageChange={onPageChange} />);
    await user.tab();
    await user.keyboard(' ');
    expect(onPageChange).toHaveBeenLastCalledWith(1);
  });

  it('hides unnecessary controls and blocks concurrent destinations', () => {
    const onPageChange = vi.fn();
    const { rerender } = render(<MovementPagination page={1} pageSize={20} total={1} totalPages={1} pending={false} onPageChange={onPageChange} />);
    expect(screen.queryByRole('navigation', { name: 'Paginação das movimentações' })).not.toBeInTheDocument();

    rerender(<MovementPagination page={1} pageSize={20} total={21} totalPages={2} pending={true} onPageChange={onPageChange} />);
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('keeps the final page available for a 120 movement history', () => {
    render(<MovementPagination page={6} pageSize={20} total={120} totalPages={6} pending={false} onPageChange={vi.fn()} />);

    expect(screen.getByText('Movimentações 101–120 de 120')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled();
  });
});
