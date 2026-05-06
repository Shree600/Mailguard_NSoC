import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmailCard from '../EmailCard';
import '@testing-library/jest-dom';

describe('EmailCard Component', () => {
  const mockEmail = {
    id: '1',
    from: 'sender@example.com',
    subject: 'Test Subject',
    body: 'Test body content',
    classification: 'phishing',
    confidence: 0.95,
    receivedAt: new Date('2025-01-01')
  };

  it('should render email card with all details', () => {
    render(<EmailCard email={mockEmail} />);
    
    expect(screen.getByText('sender@example.com')).toBeInTheDocument();
    expect(screen.getByText('Test Subject')).toBeInTheDocument();
    expect(screen.getByText('phishing')).toBeInTheDocument();
  });

  it('should display safety badge with correct color', () => {
    const { rerender } = render(<EmailCard email={mockEmail} />);
    
    let badge = screen.getByText('phishing');
    expect(badge).toHaveClass('bg-red-100', 'text-red-800');
    
    const safeEmail = { ...mockEmail, classification: 'safe', confidence: 0.99 };
    rerender(<EmailCard email={safeEmail} />);
    
    badge = screen.getByText('safe');
    expect(badge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('should call onDelete when delete button clicked', async () => {
    const mockOnDelete = vi.fn();
    render(<EmailCard email={mockEmail} onDelete={mockOnDelete} />);
    
    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    await userEvent.click(deleteBtn);
    
    expect(mockOnDelete).toHaveBeenCalledWith('1');
  });

  it('should show loading state', () => {
    render(<EmailCard email={mockEmail} isLoading={true} />);
    
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument(); // Loading spinner
  });

  it('should handle missing data gracefully', () => {
    const incompleteEmail = { id: '1', from: 'test@example.com' };
    render(<EmailCard email={incompleteEmail} />);
    
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0); // Placeholder for missing data
  });
});
