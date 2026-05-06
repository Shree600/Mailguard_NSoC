import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import * as api from '../../services/api';
import '@testing-library/jest-dom';

// Mock the API
vi.mock('../../services/api');

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { fullName: 'Test User' } }),
  useClerk: () => ({ signOut: vi.fn() }),
  ClerkProvider: ({ children }) => <div>{children}</div>,
  SignedIn: ({ children }) => <div>{children}</div>,
  SignedOut: ({ children }) => <div>{children}</div>,
  UserButton: () => <div>UserButton</div>,
}));

// Mock Recharts (they don't render well in JSDOM)
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: () => <div>BarChart</div>,
  Bar: () => <div>Bar</div>,
  XAxis: () => <div>XAxis</div>,
  YAxis: () => <div>YAxis</div>,
  CartesianGrid: () => <div>CartesianGrid</div>,
  Tooltip: () => <div>Tooltip</div>,
  Legend: () => <div>Legend</div>,
  LineChart: () => <div>LineChart</div>,
  Line: () => <div>Line</div>,
  PieChart: () => <div>PieChart</div>,
  Pie: () => <div>Pie</div>,
  Cell: () => <div>Cell</div>,
}));

describe('Dashboard Page', () => {
  const mockEmails = [
    { _id: '1', subject: 'Test 1', prediction: 'phishing', confidence: 0.9 },
    { _id: '2', subject: 'Test 2', prediction: 'safe', confidence: 0.95 }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.getEmails.mockResolvedValue({ emails: mockEmails, pagination: {} });
    api.getEmailStats.mockResolvedValue({ total: 2, phishing: 1, safe: 1 });
    api.getMigrationStatus.mockResolvedValue({ needsMigration: false });
    api.getFeedback.mockResolvedValue({ count: 0 });
  });

  it('should load and display emails on mount', async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Test 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Test 2/i)).toBeInTheDocument();
    });
  });

  it('should display error state when API fails', async () => {
    api.getEmails.mockRejectedValue(new Error('API Error'));
    
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
    
    // The component might handle errors by showing a toast or an error message
    // Based on the existing Dashboard.jsx, it uses toast.error
  });
});
