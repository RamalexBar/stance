import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, type Auth } from "firebase/auth";
// getReactNativePersistence vive bajo la condición de exports "react-native" de
// @firebase/auth. Metro (el bundler de Expo) SÍ resuelve esa condición en la app
// real; un `tsc` aislado corriendo con resolución de Node normal no la ve y
// marca un falso error de tipo — es un matiz conocido de Firebase + Expo, no un bug.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getReactNativePersistence } = require("firebase/auth");
// @ts-ignore - tipo no exportado por @react-native-async-storage en algunas versiones
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// initializeAuth solo puede llamarse una vez; en hot-reload puede lanzar
// "already-initialized", y ahí sí cae a getAuth (mismo Auth ya inicializado,
// con su persistencia intacta). Cualquier OTRO error (AsyncStorage roto,
// config inválida, etc.) se relanza: si lo tragáramos aquí, getAuth() se
// crearía SIN persistencia y el usuario perdería la sesión en cada reinicio
// de la app sin ningún aviso.
export let firebaseAuthClient: Auth;
try {
  firebaseAuthClient = initializeAuth(firebaseApp, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (err: any) {
  if (err?.code === "auth/already-initialized") {
    firebaseAuthClient = getAuth(firebaseApp);
  } else {
    console.error("Fallo inicializando Firebase Auth con persistencia:", err);
    throw err;
  }
}
