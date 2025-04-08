import "@testing-library/react";
// import { initialize } from 'next/dist/server/lib/render-server';

// next mock
jest.mock("next/navigation", () => {
  let params = new URLSearchParams();

  return {
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
    }),
    usePathname: () => "/mock-path",
    useSearchParams: jest.fn(() => {
      return {
        get: (key: string) => params.get(key),
        set: (key: string, value: string) => params.set(key, value),
        toString: () => params.toString(),
        reset: () => {
          params = new URLSearchParams();
        },
      };
    }),
  };
});

// firebase mocks
jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
}));

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({
    currentUser: null,
  })),
  setPersistence: jest.fn(() => Promise.resolve()),
  browserLocalPersistence: {},
  onAuthStateChanged: jest.fn(),
}));

jest.mock("firebase/messaging", () => ({
  getMessaging: jest.fn(),
  getToken: jest.fn(() => Promise.resolve("mock-token")),
  onMessage: jest.fn(),
}));
