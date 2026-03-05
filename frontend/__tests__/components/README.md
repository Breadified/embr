# Component Tests Directory

This directory contains unit tests for React Native components.

## Structure
- `activities/` - Activity card component tests
- `shared/` - Shared component tests  
- `auth/` - Authentication component tests
- `dashboard/` - Dashboard component tests

## Naming Convention
- Test files should end with `.test.tsx`
- Use descriptive test names that explain behavior
- Group related tests using `describe()` blocks

## Example Test Structure
```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ComponentName } from '../../../components/path/ComponentName';

describe('ComponentName', () => {
  it('should render correctly', () => {
    const { getByText } = render(<ComponentName />);
    expect(getByText('Expected Text')).toBeTruthy();
  });
  
  it('should handle user interaction', () => {
    const onPress = jest.fn();
    const { getByText } = render(<ComponentName onPress={onPress} />);
    fireEvent.press(getByText('Button'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

## Required Testing Coverage
- All activity cards must have tests
- Timer functionality must be tested
- Animation states should be validated
- Error states must be covered