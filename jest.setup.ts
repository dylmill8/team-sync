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
  initializeApp: jest.fn(() => ({
    name: "mock-app",
    options: {},
  })),
}));

jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(),
  doc: jest.fn((db, collection, id) => ({
    id,
    path: `${collection}/${id}`,
    collection,
  })),
  getDoc: jest.fn(() => ({
    exists: jest.fn(() => true),
    data: jest.fn(() => ({
      groups: [],
    })),
  })),
  updateDoc: jest.fn(),
}));

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn((app) => {
    console.log("getAuth called with app", app);
    return {
      currentUser: null,
      getProvider: jest.fn(() => {
        console.log("get provider mock called");
        return { providerId: "mock-provider-id" };
      }),
    };
  }),
  setPersistence: jest.fn(() => Promise.resolve()),
  browserLocalPersistence: {},
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback({ uid: "mock-uid" });
    return jest.fn();
  }),
}));

jest.mock("firebase/messaging", () => ({
  getMessaging: jest.fn(),
  getToken: jest.fn(() => Promise.resolve("mock-token")),
  onMessage: jest.fn(),
}));
