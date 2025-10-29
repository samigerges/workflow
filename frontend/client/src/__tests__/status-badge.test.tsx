import { cleanup, render, screen } from '@testing-library/react';
import StatusBadge from '@/components/ui/status-badge';
import {
  REQUEST_STATUSES,
  type RequestStatusKey,
} from '@/lib/request-statuses';

describe('StatusBadge', () => {
  afterEach(() => {
    cleanup();
  });

  it.each(Object.entries(REQUEST_STATUSES))(
    'renders the %s status chip with correct label and styles',
    (status, config) => {
      render(<StatusBadge status={status as RequestStatusKey} type="request" />);

      const badge = screen.getByText(config.label);
      expect(badge).toBeInTheDocument();
      const classes = config.color.split(' ');
      expect(badge).toHaveClass(...classes);
    }
  );
});
