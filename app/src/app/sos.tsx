import { BACKEND_URL } from '../constants/api';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Alert,
  Animated,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import * as Location from 'expo-location';

import * as Haptics from 'expo-haptics';

import MapView, {
  Marker,
  Polyline,
  Region,
} from 'react-native-maps';

import { ScreenHeader } from '@/components/screen-header';

import {
  AppColors,
  Spacing,
} from '@/constants/theme';

const DEMO_USER_ID =
  'cbab8131-96e5-4ea4-a580-c8db339ffc5f';

const HOLD_DURATION = 1500;

type Coordinates = {
  latitude: number;
  longitude: number;
};

type DispatchInfo = {
  ambulance: {
    id: string;
    vehicleNumber: string;
    type: string;
    currentLat: number;
    currentLng: number;
  } | null;

  driver: {
    id: string;
    name: string;
    phone: string;
    licenseNumber: string;
    rating: number;
  } | null;

  hospital: {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    phone: string;
  } | null;

  etaSeconds: number;
  etaDisplay: string;
  distanceToHospitalMeters: number;
};

export default function SOSScreen() {
  const [loading, setLoading] =
    useState(false);

  const [holding, setHolding] =
    useState(false);

  const [dispatch, setDispatch] =
    useState<DispatchInfo | null>(null);

  const [userLocation, setUserLocation] =
    useState<Coordinates | null>(null);

  const scale = useRef(
    new Animated.Value(1)
  ).current;

  const timer = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const mapRef =
    useRef<MapView | null>(null);

  // ============================================================
  // GET USER LOCATION
  // ============================================================

  const getUserLocation =
    async (): Promise<Coordinates | null> => {
      try {
        const { status } =
          await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          Alert.alert(
            'Permission needed',
            'Location access is required for SOS.'
          );

          return null;
        }

        const location =
          await Location.getCurrentPositionAsync(
            {
              accuracy:
                Location.Accuracy.High,
            }
          );

        const coords = {
          latitude:
            location.coords.latitude,

          longitude:
            location.coords.longitude,
        };

        setUserLocation(coords);

        return coords;
      } catch (error) {
        console.error(
          'Location error:',
          error
        );

        Alert.alert(
          'Location error',
          'Could not get your current location.'
        );

        return null;
      }
    };

  // ============================================================
  // TRIGGER SOS
  // ============================================================

  const triggerSOS = async () => {
    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Warning
    );

    setLoading(true);

    try {
      const coords =
        await getUserLocation();

      if (!coords) {
        setLoading(false);
        return;
      }

      const response =
        await fetch(
          `${BACKEND_URL}/api/sos/trigger`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              Accept:
                'application/json',
            },

            body: JSON.stringify({
              userId: DEMO_USER_ID,

              lat: coords.latitude,

              lng: coords.longitude,
            }),
          }
        );

      const responseText =
        await response.text();

      let data: any = {};

      try {
        data = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        console.error(
          'Invalid SOS response:',
          responseText
        );
      }

      if (!response.ok) {
        Alert.alert(
          'SOS failed',
          data?.message ||
            `Server returned ${response.status}`
        );

        return;
      }

      // Store dispatch in STATE, not ref.
      // This forces the UI to update.
      setDispatch(
        data as DispatchInfo
      );

      Alert.alert(
        'Help is on the way',
        data.etaDisplay
          ? `An ambulance has been dispatched.\n\nETA: ${data.etaDisplay}`
          : 'An ambulance has been dispatched.'
      );
    } catch (error) {
      console.error(
        'SOS network error:',
        error
      );

      Alert.alert(
        'SOS failed',
        'Could not reach the server. Check your internet connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // HOLD BUTTON
  // ============================================================

  const startHold = () => {
    if (loading || dispatch) {
      return;
    }

    setHolding(true);

    Animated.timing(scale, {
      toValue: 0.92,

      duration: HOLD_DURATION,

      useNativeDriver: true,
    }).start();

    timer.current =
      setTimeout(() => {
        setHolding(false);

        scale.setValue(1);

        triggerSOS();
      }, HOLD_DURATION);
  };

  const cancelHold = () => {
    if (dispatch) {
      return;
    }

    setHolding(false);

    if (timer.current) {
      clearTimeout(timer.current);

      timer.current = null;
    }

    Animated.spring(scale, {
      toValue: 1,

      useNativeDriver: true,
    }).start();
  };

  // ============================================================
  // OPEN GOOGLE MAPS
  // ============================================================

  const openMaps = (
    lat: number,
    lng: number,
    label: string
  ) => {
    const url =
      `https://www.google.com/maps?q=${lat},${lng}`;

    Linking.openURL(url).catch(() => {
      Alert.alert(
        'Maps not available',
        `Could not open Maps for ${label}.`
      );
    });
  };

  // ============================================================
  // FIT MAP TO AMBULANCE + USER
  // ============================================================

  useEffect(() => {
    if (
      !dispatch?.ambulance ||
      !userLocation ||
      !mapRef.current
    ) {
      return;
    }

    const ambulanceLocation = {
      latitude:
        dispatch.ambulance.currentLat,

      longitude:
        dispatch.ambulance.currentLng,
    };

    setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        [
          userLocation,
          ambulanceLocation,
        ],
        {
          edgePadding: {
            top: 55,
            right: 45,
            bottom: 55,
            left: 45,
          },

          animated: true,
        }
      );
    }, 500);
  }, [dispatch, userLocation]);

  // ============================================================
  // MAP REGION
  // ============================================================

  const getInitialRegion =
    (): Region => {
      if (
        userLocation &&
        dispatch?.ambulance
      ) {
        const ambulanceLat =
          dispatch.ambulance.currentLat;

        const ambulanceLng =
          dispatch.ambulance.currentLng;

        return {
          latitude:
            (userLocation.latitude +
              ambulanceLat) /
            2,

          longitude:
            (userLocation.longitude +
              ambulanceLng) /
            2,

          latitudeDelta: 0.05,

          longitudeDelta: 0.05,
        };
      }

      if (userLocation) {
        return {
          latitude:
            userLocation.latitude,

          longitude:
            userLocation.longitude,

          latitudeDelta: 0.03,

          longitudeDelta: 0.03,
        };
      }

      return {
        latitude: 26.9124,

        longitude: 75.7873,

        latitudeDelta: 0.08,

        longitudeDelta: 0.08,
      };
    };

  // ============================================================
  // DISTANCE DISPLAY
  // ============================================================

  const getDistanceText =
    () => {
      if (!dispatch) {
        return '';
      }

      const meters =
        dispatch.distanceToHospitalMeters;

      if (meters >= 1000) {
        return `${(
          meters / 1000
        ).toFixed(1)} km`;
      }

      return `${Math.round(
        meters
      )} m`;
    };

  // ============================================================
  // UI
  // ============================================================

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            AppColors.background,
        },
      ]}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Emergency" />

        {/* LOCATION BANNER */}

        <View style={styles.locationBanner}>
          <Text style={styles.pin}>
            📍
          </Text>

          <Text
            style={styles.locationText}
          >
            Location shared automatically
            on trigger
          </Text>
        </View>

        {/* ================================================== */}
        {/* BEFORE SOS                                         */}
        {/* ================================================== */}

        {!dispatch && (
          <View style={styles.preSOS}>
            <Pressable
              onPressIn={startHold}
              onPressOut={cancelHold}
              disabled={loading}
            >
              <View style={styles.ring}>
                <Animated.View
                  style={[
                    styles.circle,
                    {
                      transform: [
                        {
                          scale,
                        },
                      ],
                    },
                  ]}
                >
                  <Text
                    style={
                      styles.warningIcon
                    }
                  >
                    {loading
                      ? '…'
                      : '⚠️'}
                  </Text>

                  <Text
                    style={styles.sosText}
                  >
                    SOS
                  </Text>
                </Animated.View>
              </View>
            </Pressable>

            <Text style={styles.hint}>
              {loading
                ? 'Sending alert…'
                : holding
                ? 'Keep holding…'
                : 'Hold for 1.5 seconds to trigger'}
            </Text>
          </View>
        )}

        {/* ================================================== */}
        {/* AFTER SOS                                          */}
        {/* ================================================== */}

        {dispatch && (
          <View style={styles.activeContainer}>
            {/* MAP */}

            <View style={styles.mapContainer}>
              {userLocation &&
              dispatch.ambulance ? (
                <MapView
                  ref={(ref) => {
                    mapRef.current =
                      ref;
                  }}
                  style={styles.map}
                  initialRegion={getInitialRegion()}
                  showsUserLocation={false}
                  showsMyLocationButton={
                    false
                  }
                  rotateEnabled={false}
                  pitchEnabled={false}
                  toolbarEnabled={false}
                  mapType="standard"
                >
                  {/* USER MARKER */}

                  <Marker
                    coordinate={
                      userLocation
                    }
                    title="Your location"
                    description="Current location"
                  >
                    <View
                      style={
                        styles.userMarker
                      }
                    >
                      <View
                        style={
                          styles.userMarkerDot
                        }
                      />
                    </View>
                  </Marker>

                  {/* AMBULANCE MARKER */}

                  <Marker
                    coordinate={{
                      latitude:
                        dispatch
                          .ambulance
                          .currentLat,

                      longitude:
                        dispatch
                          .ambulance
                          .currentLng,
                    }}
                    title="Ambulance"
                    description="Ambulance approaching your location"
                  >
                    <View
                      style={
                        styles.ambulanceMarker
                      }
                    >
                      <Text
                        style={
                          styles.ambulanceEmoji
                        }
                      >
                        🚑
                      </Text>
                    </View>
                  </Marker>

                  {/* ROUTE LINE */}

                  <Polyline
                    coordinates={[
                      {
                        latitude:
                          dispatch
                            .ambulance
                            .currentLat,

                        longitude:
                          dispatch
                            .ambulance
                            .currentLng,
                      },

                      userLocation,
                    ]}
                    strokeWidth={4}
                    strokeColor={
                      AppColors.emergency
                    }
                    lineDashPattern={[
                      8,
                      6,
                    ]}
                  />
                </MapView>
              ) : (
                <View
                  style={
                    styles.mapLoading
                  }
                >
                  <ActivityIndicator
                    size="large"
                    color={
                      AppColors.emergency
                    }
                  />

                  <Text
                    style={
                      styles.mapLoadingText
                    }
                  >
                    Locating ambulance…
                  </Text>
                </View>
              )}

              {/* MAP LABEL */}

              <View
                style={styles.mapOverlay}
              >
                <View
                  style={
                    styles.liveDot
                  }
                />

                <Text
                  style={
                    styles.liveText
                  }
                >
                  AMBULANCE EN ROUTE
                </Text>
              </View>
            </View>

            {/* HELP STATUS */}

            <View
              style={
                styles.helpStatus
              }
            >
              <Text
                style={
                  styles.dispatchTitle
                }
              >
                🚑 Help is on the way
              </Text>

              <Text
                style={
                  styles.dispatchSubtitle
                }
              >
                Ambulance is approaching
                your location
              </Text>
            </View>

            {/* ETA */}

            <View style={styles.etaRow}>
              <View
                style={styles.etaBadge}
              >
                <Text
                  style={
                    styles.etaLabel
                  }
                >
                  ESTIMATED ARRIVAL
                </Text>

                <Text
                  style={
                    styles.etaValue
                  }
                >
                  {dispatch.etaDisplay ||
                    'Calculating...'}
                </Text>
              </View>

              <View
                style={
                  styles.etaBadgeSecondary
                }
              >
                <Text
                  style={
                    styles.etaLabel
                  }
                >
                  DISTANCE
                </Text>

                <Text
                  style={
                    styles.etaValue
                  }
                >
                  {getDistanceText()}
                </Text>
              </View>
            </View>

            {/* AMBULANCE / DRIVER */}

            {dispatch.ambulance && (
              <TouchableOpacity
                style={
                  styles.ambulanceInfo
                }
                onPress={() =>
                  openMaps(
                    dispatch
                      .ambulance!
                      .currentLat,

                    dispatch
                      .ambulance!
                      .currentLng,

                    'Ambulance location'
                  )
                }
              >
                <View
                  style={
                    styles.infoHeader
                  }
                >
                  <Text
                    style={
                      styles.infoTitle
                    }
                  >
                    🚑 AMBULANCE
                  </Text>

                  <Text
                    style={
                      styles.mapHint
                    }
                  >
                    View
                  </Text>
                </View>

                <Text
                  style={
                    styles.vehicleNumber
                  }
                >
                  {
                    dispatch
                      .ambulance
                      .vehicleNumber
                  }
                </Text>

                <Text
                  style={
                    styles.infoMeta
                  }
                >
                  Type:{' '}
                  {
                    dispatch
                      .ambulance
                      .type
                  }
                </Text>
              </TouchableOpacity>
            )}

            {/* DRIVER */}

            {dispatch.driver && (
              <View
                style={styles.infoCard}
              >
                <View
                  style={
                    styles.infoHeader
                  }
                >
                  <Text
                    style={
                      styles.infoTitle
                    }
                  >
                    👨‍⚕️ DRIVER
                  </Text>

                  <Text
                    style={
                      styles.rating
                    }
                  >
                    ★{' '}
                    {dispatch.driver.rating?.toFixed(
                      1
                    )}
                  </Text>
                </View>

                <Text
                  style={
                    styles.infoName
                  }
                >
                  {dispatch.driver.name}
                </Text>

                <Text
                  style={
                    styles.infoMeta
                  }
                >
                  License:{' '}
                  {
                    dispatch
                      .driver
                      .licenseNumber
                  }
                </Text>
              </View>
            )}

            {/* HOSPITAL */}

            {dispatch.hospital && (
              <TouchableOpacity
                style={[
                  styles.infoCard,
                  styles.hospitalCard,
                ]}
                onPress={() =>
                  openMaps(
                    dispatch
                      .hospital!
                      .lat,

                    dispatch
                      .hospital!
                      .lng,

                    'Hospital'
                  )
                }
              >
                <View
                  style={
                    styles.infoHeader
                  }
                >
                  <Text
                    style={
                      styles.infoTitle
                    }
                  >
                    🏥 HOSPITAL
                  </Text>
                </View>

                <Text
                  style={
                    styles.infoName
                  }
                >
                  {
                    dispatch
                      .hospital
                      .name
                  }
                </Text>

                <Text
                  style={
                    styles.infoMeta
                  }
                >
                  {
                    dispatch
                      .hospital
                      .address
                  }
                </Text>

                <Text
                  style={
                    styles.infoMeta
                  }
                >
                  📞{' '}
                  {
                    dispatch
                      .hospital
                      .phone
                  }
                </Text>

                <Text
                  style={
                    styles.mapHint
                  }
                >
                  Tap to open hospital in
                  Maps
                </Text>
              </TouchableOpacity>
            )}

            {/* YOUR LOCATION */}

            <View
              style={styles.pinCard}
            >
              <Text
                style={
                  styles.pinLabel
                }
              >
                📍 YOUR LOCATION
              </Text>

              <Text
                style={
                  styles.pinUrl
                }
              >
                Live location shared with
                emergency contacts via SMS
              </Text>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

// ============================================================
// SIZES
// ============================================================

const CIRCLE_SIZE = 200;

const RING_SIZE = 240;

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
    },

    safeArea: {
      flex: 1,
      paddingTop: Spacing.three,
      paddingHorizontal:
        Spacing.three,
    },

    locationBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      backgroundColor:
        AppColors.backgroundElement,
      borderRadius: 16,
      paddingVertical:
        Spacing.two,
      paddingHorizontal:
        Spacing.three,
    },

    pin: {
      fontSize: 14,
    },

    locationText: {
      color:
        AppColors.textSecondary,
      fontSize: 13,
    },

    // ========================================================
    // BEFORE SOS
    // ========================================================

    preSOS: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    ring: {
      width: RING_SIZE,
      height: RING_SIZE,
      borderRadius:
        RING_SIZE / 2,
      backgroundColor:
        'rgba(229, 72, 77, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    circle: {
      width: CIRCLE_SIZE,
      height: CIRCLE_SIZE,
      borderRadius:
        CIRCLE_SIZE / 2,
      backgroundColor:
        AppColors.emergency,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },

    warningIcon: {
      fontSize: 30,
    },

    sosText: {
      color: '#fff',
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: 1,
    },

    hint: {
      color:
        AppColors.textSecondary,
      marginTop: Spacing.three,
      fontSize: 13,
    },

    // ========================================================
    // AFTER SOS
    // ========================================================

    activeContainer: {
      flex: 1,
      marginTop: Spacing.two,
    },

    mapContainer: {
      height: 220,
      width: '100%',
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor:
        AppColors.backgroundElement,
      borderWidth: 1,
      borderColor:
        AppColors.cardBorder,
      position: 'relative',
    },

    map: {
      flex: 1,
    },

    mapLoading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        AppColors.backgroundElement,
    },

    mapLoadingText: {
      marginTop: Spacing.two,
      color:
        AppColors.textSecondary,
      fontSize: 13,
    },

    mapOverlay: {
      position: 'absolute',
      top: 12,
      left: 12,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        'rgba(20,20,22,0.88)',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
    },

    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 8,
      backgroundColor:
        AppColors.success,
      marginRight: 7,
    },

    liveText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
    },

    userMarker: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor:
        'rgba(229, 72, 77, 0.25)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor:
        AppColors.emergency,
    },

    userMarkerDot: {
      width: 12,
      height: 12,
      borderRadius: 12,
      backgroundColor:
        AppColors.emergency,
    },

    ambulanceMarker: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        '#ffffff',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor:
        AppColors.success,
    },

    ambulanceEmoji: {
      fontSize: 23,
    },

    helpStatus: {
      alignItems: 'center',
      marginTop: Spacing.two,
    },

    dispatchTitle: {
      color:
        AppColors.success,
      fontSize: 17,
      fontWeight: '700',
    },

    dispatchSubtitle: {
      color:
        AppColors.textSecondary,
      fontSize: 12,
      marginTop: 3,
    },

    // ========================================================
    // ETA
    // ========================================================

    etaRow: {
      flexDirection: 'row',
      gap: Spacing.two,
      justifyContent: 'center',
      marginTop: Spacing.two,
    },

    etaBadge: {
      flex: 1,
      backgroundColor:
        AppColors.success + '22',
      borderRadius: 12,
      paddingVertical:
        Spacing.one + 2,
      paddingHorizontal:
        Spacing.three,
      alignItems: 'center',
      borderWidth: 1,
      borderColor:
        AppColors.success + '44',
    },

    etaBadgeSecondary: {
      flex: 0.75,
      backgroundColor:
        AppColors.backgroundSelected,
      borderRadius: 12,
      paddingVertical:
        Spacing.one + 2,
      paddingHorizontal:
        Spacing.three,
      alignItems: 'center',
      borderWidth: 1,
      borderColor:
        AppColors.cardBorder,
    },

    etaLabel: {
      color:
        AppColors.textSecondary,
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 0.5,
      marginBottom: 2,
    },

    etaValue: {
      color:
        AppColors.text,
      fontSize: 14,
      fontWeight: '700',
    },

    // ========================================================
    // INFO CARDS
    // ========================================================

    ambulanceInfo: {
      backgroundColor:
        AppColors.backgroundElement,
      borderRadius: 12,
      padding: Spacing.three,
      borderWidth: 1,
      borderColor:
        AppColors.success + '55',
      marginTop: Spacing.two,
    },

    infoCard: {
      backgroundColor:
        AppColors.backgroundElement,
      borderRadius: 12,
      padding: Spacing.three,
      borderWidth: 1,
      borderColor:
        AppColors.cardBorder,
      marginTop: Spacing.two,
    },

    hospitalCard: {
      borderColor:
        AppColors.success + '55',
    },

    infoHeader: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
      marginBottom:
        Spacing.one,
    },

    infoTitle: {
      color:
        AppColors.textSecondary,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
    },

    rating: {
      color:
        AppColors.success,
      fontSize: 11,
      fontWeight: '600',
    },

    vehicleNumber: {
      color: AppColors.text,
      fontSize: 15,
      fontWeight: '700',
    },

    infoName: {
      color: AppColors.text,
      fontSize: 15,
      fontWeight: '700',
      marginBottom:
        Spacing.half,
    },

    infoMeta: {
      color:
        AppColors.textSecondary,
      fontSize: 12,
      marginBottom:
        Spacing.half,
    },

    mapHint: {
      color:
        AppColors.success,
      fontSize: 11,
      fontWeight: '600',
      marginTop:
        Spacing.half,
    },

    // ========================================================
    // LOCATION
    // ========================================================

    pinCard: {
      backgroundColor:
        AppColors.emergency + '15',
      borderRadius: 12,
      padding: Spacing.three,
      borderWidth: 1,
      borderColor:
        AppColors.emergency + '33',
      alignItems: 'center',
      marginTop: Spacing.two,
      marginBottom: Spacing.three,
    },

    pinLabel: {
      color:
        AppColors.emergency,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
      marginBottom:
        Spacing.half,
    },

    pinUrl: {
      color:
        AppColors.textSecondary,
      fontSize: 12,
      textAlign: 'center',
      fontWeight: '500',
    },
  });