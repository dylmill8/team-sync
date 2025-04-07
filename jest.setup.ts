import "@testing-library/react";
// import { initialize } from 'next/dist/server/lib/render-server';

// next mock
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => "/mock-path",
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

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
