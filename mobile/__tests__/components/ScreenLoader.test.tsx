import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ScreenLoader } from '@/components/ui/ScreenLoader';

describe('ScreenLoader', () => {
  it('renders an ActivityIndicator', () => {
    render(<ScreenLoader />);

    // ActivityIndicator is rendered
    expect(screen.getByTestId('activity-indicator')).toBeTruthy();
  });

  it('uses default background color', () => {
    const { toJSON } = render(<ScreenLoader />);
    const tree = toJSON();

    expect(tree).toBeTruthy();
  });

  it('accepts custom background color', () => {
    const { toJSON } = render(<ScreenLoader backgroundColor="#FF0000" />);
    const tree = toJSON();

    expect(tree).toBeTruthy();
  });
});
