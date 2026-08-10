declare module 'expo-location' {
  export function requestForegroundPermissionsAsync(): Promise<{ status: string }>;
  export function getCurrentPositionAsync(options?: any): Promise<{ coords: { latitude: number; longitude: number } }>;
  export const LocationAccuracy: any;
}
