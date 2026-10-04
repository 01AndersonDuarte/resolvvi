import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MovementItem } from './MovementItem';

describe('MovementItem', () => {
  it('expands and collapses only the selected movement using the keyboard', async () => {
    const user = userEvent.setup();
    const content = `${'texto '.repeat(84)}fim`;
    render(<><MovementItem movement={{ id: 1, movementDate: '05/12/2023', movementTitle: 'Evento A', movementContent: content }} /><MovementItem movement={{ id: 2, movementDate: null, movementTitle: null, movementContent: 'outro texto '.repeat(70) }} /><MovementItem movement={{ id: 3, movementDate: null, movementTitle: null, movementContent: null }} /></>);

    await user.tab();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('button', { name: 'Recolher' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('button', { name: 'Ver conteúdo completo' })).toHaveLength(1);
    expect(screen.getByText(content)).toBeInTheDocument();
    expect(screen.getAllByText('Data não informada')).toHaveLength(2);
    expect(screen.getAllByText('Título não informado')).toHaveLength(2);
    expect(screen.getByText('Conteúdo não informado')).toBeInTheDocument();

    await user.keyboard(' ');
    expect(screen.getAllByRole('button', { name: 'Ver conteúdo completo' })).toHaveLength(2);
  });

  it('renders all 15,266 characters when the full content is expanded', async () => {
    const user = userEvent.setup();
    const content = 'ação jurídica\n'.repeat(1090) + 'fim123';
    render(<MovementItem movement={{ id: 4, movementDate: '02/01/2024', movementTitle: 'Histórico extenso', movementContent: content }} />);

    await user.click(screen.getByRole('button', { name: 'Ver conteúdo completo' }));

    const article = screen.getByRole('heading', { name: 'Histórico extenso' }).closest('article');
    expect(article?.querySelectorAll('p')[1]?.textContent).toBe(content);
    expect(screen.getByRole('button', { name: 'Recolher' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders markup and URLs as literal text without creating links', () => {
    const content = '<script>alert(1)</script> https://tribunal.example/';
    render(<MovementItem movement={{ id: 3, movementDate: '01/01/2024', movementTitle: '<b>Movimento</b>', movementContent: content }} />);

    expect(screen.getByText(content)).toBeInTheDocument();
    expect(screen.getByText('<b>Movimento</b>')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
