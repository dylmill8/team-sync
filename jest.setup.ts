// jest.setup.ts
import '@testing-library/jest-dom/extend-expect';

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  signInWithPopup: jest.fn(() =>
    Promise.resolve({ user: { uid: 'mock-user-id' } })
  ),
  signOut: jest.fn(() => Promise.resolve()),
  onAuthStateChanged: jest.fn((auth, callback) =>
    callback({ uid: 'mock-user-id', email: 'mock@example.com' })
  ),
  GoogleAuthProvider: jest.fn(() => ({})),
}));