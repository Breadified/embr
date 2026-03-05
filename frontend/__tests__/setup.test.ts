describe('Test Setup Verification', () => {
  it('should have Jest configured correctly', () => {
    expect(true).toBe(true);
  });

  it('should have TypeScript support', () => {
    const testString: string = 'TypeScript works';
    expect(testString).toBe('TypeScript works');
  });

  it('should have access to Jest globals', () => {
    expect(jest).toBeDefined();
    expect(expect).toBeDefined();
    expect(describe).toBeDefined();
    expect(it).toBeDefined();
  });
});