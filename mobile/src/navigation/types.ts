import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type RootStackParamList = {
  // Stack de invitado (usuario no autenticado)
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;

  // Stack autenticado
  Profile: undefined;
  Videos: undefined;
  PoseAnalysis: { videoId: string };
  Biomechanics: { videoId: string };
  Movement: { videoId: string };
  Errors: { videoId: string };
  Compare: { videoId: string };
  Dashboard: undefined;
  CoachPlan: { videoId: string };
  Report: { videoId: string };
  Groups: undefined;
  GroupDetail: { groupId: string; groupName: string };
  Subscription: undefined;
};

export type RootStackScreenProps<Screen extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, Screen>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
