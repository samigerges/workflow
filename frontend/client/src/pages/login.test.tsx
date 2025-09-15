import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Login from './login';

vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }),
  queryClient: { invalidateQueries: vi.fn() }
}));

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

describe('Login page', () => {
  it('submits credentials', async () => {
    const { apiRequest } = await import('@/lib/queryClient');
    render(<Login />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('POST', '/api/login', {
        email: 'test@example.com',
        password: 'secret'
      });
    });
  });
});
