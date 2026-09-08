import { BACKEND_URL } from '../constants/api';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Alert,
  Animated,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
} from 'react-native-maps';

import { SafeAreaView } from 'react-native-safe-area-context';

import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

import { ScreenHeader } from '@/components/screen-header';
import { AppColors, Spacing } from '@/constants/theme';

// ========================================
// CONFIGURATION
// ========================================

const DEMO_USER_ID =
  'cbab8131-96e5-4ea4-a580-c8db339ffc5f';

const HOLD_DURATION = 1500;
const TRACKING_INTERVAL = 3000;

// ========================================
// TYPES
// ========================================

type Coordinate = {
  latitude: number;
  longitude: number;
};

type AmbulanceInfo = {
  id: string;
  vehicleNumber: string;
  type: string;
  currentLat: number;
  currentLng: number;
  status?: string;
};

type DriverInfo = {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  rating: number;
};

type HospitalInfo = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
};

type DispatchInfo = {
  ambulance: AmbulanceInfo | null;
  driver: DriverInfo | null;
  hospital: HospitalInfo | null;
  etaSeconds: number;
  etaDisplay: string;
  distanceToHospitalMeters: number;
};

type TrackingInfo = {
  status: 'enroute' | 'arrived';

  ambulance?: {
    id: string;
    vehicleNumber: string;
    type: string;
    currentLat: number;
    currentLng: number;
    status: string;
  } | null;

  user?: {
    lat: number;
    lng: number;
  } | null;

  distanceRemainingMeters?: number;
  etaSeconds?: number;
  etaDisplay?: string;
};

// ========================================
// HELPERS
// ========================================

const isValidCoordinate = (
  latitude: unknown,
  longitude: unknown
): boolean => {
  const lat = Number(latitude);
  const lng = Number(longitude);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

const toCoordinate = (
  latitude: unknown,
  longitude: unknown
): Coordinate | null => {
  if (!isValidCoordinate(latitude, longitude)) {
    return null;
  }

  return {
    latitude: Number(latitude),
    longitude: Number(longitude),
  };
};

const formatDistance = (
  meters: number | null
): string => {
  if (
    meters == null ||
    !Number.isFinite(meters)
  ) {
    return '--';
  }

  if (meters >= 1000) {
    return `${(
      meters / 1000
    ).toFixed(1)} km`;
  }

  return `${Math.round(meters)} m`;
};

// ========================================
// SOS SCREEN
// ========================================

export default function SOSScreen() {
  // ----------------------------------------
  // SOS state
  // ----------------------------------------

  const [loading, setLoading] =
    useState(false);

  const [holding, setHolding] =
    useState(false);

  const [dispatch, setDispatch] =
    useState<DispatchInfo | null>(null);

  const [sosEventId, setSosEventId] =
    useState<string | null>(null);

  // ----------------------------------------
  // Location
  // ----------------------------------------

  const [userLocation, setUserLocation] =
    useState<Coordinate | null>(null);

  const [ambulanceLocation, setAmbulanceLocation] =
    useState<Coordinate | null>(null);

  // ----------------------------------------
  // Tracking
  // ----------------------------------------

  const [tracking, setTracking] =
    useState(false);

  const [trackingStatus, setTrackingStatus] =
    useState<'enroute' | 'arrived'>(
      'enroute'
    );

  const [distanceRemaining, setDistanceRemaining] =
    useState<number | null>(null);

  const [liveEta, setLiveEta] =
    useState<string | null>(null);

  // ----------------------------------------
  // Animation
  // ----------------------------------------

  const scale =
    useRef(
      new Animated.Value(1)
    ).current;

  const timer =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  // ----------------------------------------
  // Map
  // ----------------------------------------

  const mapRef =
    useRef<MapView | null>(null);

  const hasFittedMap =
    useRef(false);

  // ========================================
  // CLEANUP
  // ========================================

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, []);

  // ========================================
  // TRIGGER SOS
  // ========================================

  const triggerSOS = useCallback(
    async () => {
      if (loading || dispatch) {
        return;
      }

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning
      );

      setLoading(true);

      try {
        // ------------------------------------
        // LOCATION PERMISSION
        // ------------------------------------

        const permission =
          await Location.requestForegroundPermissionsAsync();

        if (
          permission.status !== 'granted'
        ) {
          Alert.alert(
            'Permission needed',
            'Location access is required to send SOS.'
          );

          return;
        }

        // ------------------------------------
        // GET LOCATION
        // ------------------------------------

        const location =
          await Location.getCurrentPositionAsync({
            accuracy:
              Location.Accuracy.High,
          });

        const currentUserLocation: Coordinate = {
          latitude:
            location.coords.latitude,

          longitude:
            location.coords.longitude,
        };

        setUserLocation(
          currentUserLocation
        );

        // ------------------------------------
        // SEND SOS
        // ------------------------------------

        const triggerUrl =
          `${BACKEND_URL}/api/sos/trigger`;

        console.log(
          '================================='
        );

        console.log(
          'SOS TRIGGER REQUEST'
        );

        console.log(
          'BACKEND URL:',
          BACKEND_URL
        );

        console.log(
          'TRIGGER URL:',
          triggerUrl
        );

        console.log(
          'USER ID:',
          DEMO_USER_ID
        );

        console.log(
          'LAT:',
          currentUserLocation.latitude
        );

        console.log(
          'LNG:',
          currentUserLocation.longitude
        );

        console.log(
          '================================='
        );

        const response =
          await fetch(
            triggerUrl,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',

                Accept:
                  'application/json',
              },

              body: JSON.stringify({
                userId:
                  DEMO_USER_ID,

                lat:
                  currentUserLocation.latitude,

                lng:
                  currentUserLocation.longitude,
              }),
            }
          );

        // ------------------------------------
        // READ RESPONSE
        // ------------------------------------

        const responseText =
          await response.text();

        console.log(
          'SOS HTTP status:',
          response.status
        );

        console.log(
          'SOS response:',
          responseText
        );

        let data: any = {};

        try {
          data = responseText
            ? JSON.parse(responseText)
            : {};
        } catch (error) {
          console.error(
            'SOS response was not valid JSON:',
            error
          );
        }

        // ------------------------------------
        // ERROR RESPONSE
        // ------------------------------------

        if (!response.ok) {
          Alert.alert(
            'SOS failed',
            data?.message ||
              `Server returned HTTP ${response.status}.`
          );

          return;
        }

        // ------------------------------------
        // VERIFY SOS EVENT ID
        // ------------------------------------

        if (!data?.sosEventId) {
          console.error(
            'No sosEventId returned:',
            data
          );

          Alert.alert(
            'SOS failed',
            'The server did not return an SOS event ID.'
          );

          return;
        }

        // ------------------------------------
        // SAVE DISPATCH
        // ------------------------------------

        const dispatchData: DispatchInfo = {
          ambulance:
            data.ambulance ?? null,

          driver:
            data.driver ?? null,

          hospital:
            data.hospital ?? null,

          etaSeconds:
            Number(
              data.etaSeconds ?? 0
            ),

          etaDisplay:
            String(
              data.etaDisplay ?? '--'
            ),

          distanceToHospitalMeters:
            Number(
              data.distanceToHospitalMeters ?? 0
            ),
        };

        setDispatch(
          dispatchData
        );

        setSosEventId(
          String(data.sosEventId)
        );

        // ------------------------------------
        // INITIAL AMBULANCE LOCATION
        // ------------------------------------

        const initialAmbulance =
          toCoordinate(
            data.ambulance?.currentLat,
            data.ambulance?.currentLng
          );

        if (initialAmbulance) {
          setAmbulanceLocation(
            initialAmbulance
          );
        }

        // ------------------------------------
        // ETA
        // ------------------------------------

        setLiveEta(
          data.etaDisplay
            ? String(data.etaDisplay)
            : null
        );

        setDistanceRemaining(
          null
        );

        setTrackingStatus(
          'enroute'
        );

        hasFittedMap.current =
          false;

        // ------------------------------------
        // START TRACKING
        // ------------------------------------

        setTracking(true);

        // ------------------------------------
        // SUCCESS
        // ------------------------------------

        Alert.alert(
          'Help is on the way',

          data.etaDisplay
            ? `An ambulance is being dispatched.\n\nETA: ${data.etaDisplay}`
            : 'An ambulance is being dispatched.'
        );

      } catch (error) {
        console.error(
          'SOS trigger error:',
          error
        );

        Alert.alert(
          'SOS failed',
          'Could not reach the LifeLink server.'
        );

      } finally {
        setLoading(false);
      }
    },
    [
      dispatch,
      loading,
    ]
  );

  // ========================================
  // START HOLD
  // ========================================

  const startHold = () => {
    if (
      loading ||
      dispatch ||
      holding
    ) {
      return;
    }

    setHolding(true);

    Animated.timing(
      scale,
      {
        toValue: 0.92,

        duration:
          HOLD_DURATION,

        useNativeDriver: true,
      }
    ).start();

    timer.current =
      setTimeout(
        () => {
          timer.current = null;

          setHolding(false);

          scale.setValue(1);

          triggerSOS();
        },
        HOLD_DURATION
      );
  };

  // ========================================
  // CANCEL HOLD
  // ========================================

  const cancelHold = () => {
    if (timer.current) {
      clearTimeout(
        timer.current
      );

      timer.current = null;
    }

    setHolding(false);

    Animated.spring(
      scale,
      {
        toValue: 1,

        useNativeDriver: true,
      }
    ).start();
  };

  // ========================================
  // LIVE AMBULANCE TRACKING
  // ========================================

  useEffect(() => {
    if (
      !sosEventId ||
      !tracking
    ) {
      return;
    }

    let cancelled = false;

    const fetchAmbulanceStatus =
      async () => {
        try {
          const trackingUrl =
            `${BACKEND_URL}/api/sos/${encodeURIComponent(
              sosEventId
            )}/status`;

          console.log(
            '================================='
          );

          console.log(
            'SOS TRACKING REQUEST'
          );

          console.log(
            'BACKEND URL:',
            BACKEND_URL
          );

          console.log(
            'SOS EVENT ID:',
            sosEventId
          );

          console.log(
            'TRACKING URL:',
            trackingUrl
          );

          console.log(
            '================================='
          );

          const response =
            await fetch(
              trackingUrl,
              {
                method: 'GET',

                headers: {
                  Accept:
                    'application/json',
                },
              }
            );

          const responseText =
            await response.text();

          console.log(
            'Tracking HTTP status:',
            response.status
          );

          console.log(
            'Tracking response:',
            responseText
          );

          if (cancelled) {
            return;
          }

          // ----------------------------------
          // SERVER ERROR
          // ----------------------------------

          if (!response.ok) {
            let message =
              responseText ||
              `HTTP ${response.status}`;

            try {
              const errorData =
                JSON.parse(
                  responseText
                );

              message =
                errorData?.message ||
                errorData?.error ||
                message;
            } catch {
              // Not JSON.
            }

            console.warn(
              'Tracking request failed:',
              response.status,
              message
            );

            return;
          }

          // ----------------------------------
          // PARSE JSON
          // ----------------------------------

          let data: TrackingInfo;

          try {
            data =
              JSON.parse(
                responseText
              ) as TrackingInfo;

          } catch (error) {
            console.error(
              'Invalid tracking JSON:',
              error
            );

            return;
          }

          // ----------------------------------
          // AMBULANCE POSITION
          // ----------------------------------

          const nextAmbulance =
            toCoordinate(
              data.ambulance?.currentLat,
              data.ambulance?.currentLng
            );

          if (nextAmbulance) {
            setAmbulanceLocation(
              nextAmbulance
            );
          }

          // ----------------------------------
          // DISTANCE
          // ----------------------------------

          if (
            data.distanceRemainingMeters != null
          ) {
            const distance =
              Number(
                data.distanceRemainingMeters
              );

            if (
              Number.isFinite(distance)
            ) {
              setDistanceRemaining(
                distance
              );
            }
          }

          // ----------------------------------
          // ETA
          // ----------------------------------

          if (data.etaDisplay) {
            setLiveEta(
              String(
                data.etaDisplay
              )
            );
          }

          // ----------------------------------
          // STATUS
          // ----------------------------------

          if (
            data.status === 'arrived'
          ) {
            setTrackingStatus(
              'arrived'
            );

            setTracking(false);

            await Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            );

          } else {
            setTrackingStatus(
              'enroute'
            );
          }

        } catch (error) {
          if (!cancelled) {
            console.error(
              'Ambulance tracking error:',
              error
            );
          }
        }
      };

    // --------------------------------------
    // FIRST REQUEST IMMEDIATELY
    // --------------------------------------

    fetchAmbulanceStatus();

    // --------------------------------------
    // POLL EVERY 3 SECONDS
    // --------------------------------------

    const interval =
      setInterval(
        fetchAmbulanceStatus,
        TRACKING_INTERVAL
      );

    // --------------------------------------
    // CLEANUP
    // --------------------------------------

    return () => {
      cancelled = true;

      clearInterval(
        interval
      );
    };

  }, [
    sosEventId,
    tracking,
  ]);

  // ========================================
  // FIT MAP
  // ========================================

  useEffect(() => {
    if (
      !mapRef.current ||
      !userLocation ||
      !ambulanceLocation
    ) {
      return;
    }

    if (
      hasFittedMap.current
    ) {
      return;
    }

    hasFittedMap.current =
      true;

    const coordinates = [
      userLocation,
      ambulanceLocation,
    ];

    const timeout =
      setTimeout(
        () => {
          mapRef.current?.fitToCoordinates(
            coordinates,
            {
              edgePadding: {
                top: 70,
                right: 50,
                bottom: 70,
                left: 50,
              },

              animated: true,
            }
          );
        },
        300
      );

    return () => {
      clearTimeout(timeout);
    };

  }, [
    userLocation,
    ambulanceLocation,
  ]);

  // ========================================
  // OPEN GOOGLE MAPS
  // ========================================

  const openMaps = (
    lat: number,
    lng: number,
    label: string
  ) => {
    const url =
      `https://www.google.com/maps?q=${lat},${lng}`;

    Linking.openURL(
      url
    ).catch(() => {
      Alert.alert(
        'Maps not available',
        `Could not open Maps for ${label}.`
      );
    });
  };

  // ========================================
  // RENDER
  // ========================================

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
      <SafeAreaView
        style={styles.safeArea}
      >
        <ScreenHeader
          title="Emergency"
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={
            styles.scrollContent
          }
          showsVerticalScrollIndicator={
            false
          }
        >

          {/* LOCATION BANNER */}

          <View
            style={
              styles.locationBanner
            }
          >
            <Text
              style={styles.pin}
            >
              📍
            </Text>

            <Text
              style={
                styles.locationText
              }
            >
              Location shared automatically on trigger
            </Text>
          </View>

          {/* ==================================
              BEFORE SOS
          ================================== */}

          {!dispatch && (
            <View
              style={
                styles.triggerSection
              }
            >
              <Pressable
                onPressIn={
                  startHold
                }
                onPressOut={
                  cancelHold
                }
                disabled={
                  loading
                }
              >
                <View
                  style={
                    styles.ring
                  }
                >
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
                      style={
                        styles.sosText
                      }
                    >
                      SOS
                    </Text>
                  </Animated.View>
                </View>
              </Pressable>

              <Text
                style={
                  styles.hint
                }
              >
                {loading
                  ? 'Sending alert…'
                  : holding
                  ? 'Keep holding…'
                  : 'Hold for 1.5 seconds to trigger'}
              </Text>
            </View>
          )}

          {/* ==================================
              AFTER SOS
          ================================== */}

          {dispatch && (
            <View
              style={
                styles.dispatchCard
              }
            >

              {/* STATUS */}

              <View
                style={
                  styles.statusPill
                }
              >
                <View
                  style={
                    styles.statusDot
                  }
                />

                <Text
                  style={
                    styles.statusText
                  }
                >
                  {trackingStatus ===
                  'arrived'
                    ? 'AMBULANCE ARRIVED'
                    : 'AMBULANCE EN ROUTE'}
                </Text>
              </View>

              {/* ==================================
                  MAP
              ================================== */}

              <View
                style={
                  styles.mapContainer
                }
              >

                {userLocation &&
                ambulanceLocation ? (

                  <MapView
                    ref={mapRef}

                    // ==================================
                    // GOOGLE MAPS PROVIDER
                    // ==================================
                    provider={
                      PROVIDER_GOOGLE
                    }

                    style={
                      styles.map
                    }

                    mapType="standard"

                    showsUserLocation={
                      false
                    }

                    showsMyLocationButton={
                      false
                    }

                    showsCompass={
                      true
                    }

                    loadingEnabled={
                      true
                    }

                    toolbarEnabled={
                      false
                    }

                    initialRegion={{
                      latitude:
                        userLocation.latitude,

                      longitude:
                        userLocation.longitude,

                      latitudeDelta:
                        0.08,

                      longitudeDelta:
                        0.08,
                    }}
                  >

                    {/* USER MARKER */}

                    <Marker
                      coordinate={
                        userLocation
                      }
                      title="Your location"
                      description="Emergency location"
                    >
                      <View
                        style={
                          styles.userMarker
                        }
                      >
                        <Text
                          style={
                            styles.userMarkerText
                          }
                        >
                          📍
                        </Text>
                      </View>
                    </Marker>

                    {/* AMBULANCE MARKER */}

                    <Marker
                      coordinate={
                        ambulanceLocation
                      }
                      title="Ambulance"
                      description={
                        dispatch
                          .ambulance
                          ?.vehicleNumber ||
                        'Ambulance en route'
                      }
                      anchor={{
                        x: 0.5,
                        y: 0.5,
                      }}
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
                        ambulanceLocation,
                        userLocation,
                      ]}
                      strokeWidth={
                        4
                      }
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
                    <Text
                      style={
                        styles.loadingSpinner
                      }
                    >
                      ◌
                    </Text>

                    <Text
                      style={
                        styles.mapLoadingText
                      }
                    >
                      Locating ambulance...
                    </Text>
                  </View>

                )}

                {/* MAP OVERLAY */}

                <View
                  style={
                    styles.mapOverlay
                  }
                >
                  <View
                    style={
                      styles.mapOverlayDot
                    }
                  />

                  <Text
                    style={
                      styles.mapOverlayText
                    }
                  >
                    {trackingStatus ===
                    'arrived'
                      ? 'AMBULANCE HAS ARRIVED'
                      : 'AMBULANCE EN ROUTE'}
                  </Text>
                </View>

              </View>

              {/* HELP MESSAGE */}

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
                {trackingStatus ===
                'arrived'
                  ? 'The ambulance has reached your location'
                  : 'Ambulance is approaching your location'}
              </Text>

              {/* ETA + DISTANCE */}

              <View
                style={
                  styles.etaRow
                }
              >
                <View
                  style={
                    styles.etaBadge
                  }
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
                    {liveEta ||
                      dispatch.etaDisplay ||
                      '--'}
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
                    {formatDistance(
                      distanceRemaining
                    )}
                  </Text>
                </View>
              </View>

              {/* ==================================
                  AMBULANCE CARD
              ================================== */}

              {dispatch.ambulance && (
                <View
                  style={
                    styles.infoCard
                  }
                >
                  <View
                    style={
                      styles.infoCardHeader
                    }
                  >
                    <Text
                      style={
                        styles.infoCardTitle
                      }
                    >
                      🚑 AMBULANCE
                    </Text>

                    <View
                      style={
                        styles.liveBadge
                      }
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
                        LIVE
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={
                      styles.infoName
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
                    {
                      dispatch
                        .ambulance
                        .type
                    }
                  </Text>
                </View>
              )}

              {/* ==================================
                  DRIVER CARD
              ================================== */}

              {dispatch.driver && (
                <TouchableOpacity
                  style={
                    styles.infoCard
                  }
                  onPress={() => {
                    if (
                      ambulanceLocation
                    ) {
                      openMaps(
                        ambulanceLocation.latitude,
                        ambulanceLocation.longitude,
                        'Ambulance'
                      );
                    }
                  }}
                >
                  <View
                    style={
                      styles.infoCardHeader
                    }
                  >
                    <Text
                      style={
                        styles.infoCardTitle
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
                      {Number(
                        dispatch
                          .driver
                          .rating
                      ).toFixed(1)}
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.infoName
                    }
                  >
                    {
                      dispatch
                        .driver
                        .name
                    }
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

                  <Text
                    style={
                      styles.mapHint
                    }
                  >
                    Tap to view ambulance location
                  </Text>
                </TouchableOpacity>
              )}

              {/* ==================================
                  HOSPITAL CARD
              ================================== */}

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
                      styles.infoCardHeader
                    }
                  >
                    <Text
                      style={
                        styles.infoCardTitle
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
                    Tap to open hospital in Maps
                  </Text>
                </TouchableOpacity>
              )}

              {/* ==================================
                  USER LOCATION
              ================================== */}

              <View
                style={
                  styles.pinCard
                }
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
                  Live location shared with emergency contacts via SMS
                </Text>
              </View>

            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ========================================
// DIMENSIONS
// ========================================

const CIRCLE_SIZE = 200;
const RING_SIZE = 240;

// ========================================
// STYLES
// ========================================

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
    },

    safeArea: {
      flex: 1,
      paddingTop:
        Spacing.three,
      paddingHorizontal:
        Spacing.three,
    },

    scroll: {
      flex: 1,
    },

    scrollContent: {
      paddingBottom:
        Spacing.four,
    },

    // ======================================
    // LOCATION
    // ======================================

    locationBanner: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        Spacing.two,

      backgroundColor:
        AppColors.backgroundElement,

      borderRadius:
        16,

      paddingVertical:
        Spacing.two,

      paddingHorizontal:
        Spacing.three,

      marginBottom:
        Spacing.two,
    },

    pin: {
      fontSize: 14,
    },

    locationText: {
      color:
        AppColors.textSecondary,

      fontSize: 13,

      flex: 1,
    },

    // ======================================
    // SOS BUTTON
    // ======================================

    triggerSection: {
      alignItems:
        'center',

      justifyContent:
        'center',

      minHeight:
        500,
    },

    ring: {
      width:
        RING_SIZE,

      height:
        RING_SIZE,

      borderRadius:
        RING_SIZE / 2,

      backgroundColor:
        'rgba(229, 72, 77, 0.15)',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    circle: {
      width:
        CIRCLE_SIZE,

      height:
        CIRCLE_SIZE,

      borderRadius:
        CIRCLE_SIZE / 2,

      backgroundColor:
        AppColors.emergency,

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 4,
    },

    warningIcon: {
      fontSize: 30,
    },

    sosText: {
      color:
        '#fff',

      fontSize: 24,

      fontWeight:
        '800',

      letterSpacing: 1,
    },

    hint: {
      color:
        AppColors.textSecondary,

      marginTop:
        Spacing.three,

      fontSize: 13,
    },

    // ======================================
    // DISPATCH
    // ======================================

    dispatchCard: {
      width:
        '100%',

      marginTop:
        Spacing.two,

      backgroundColor:
        AppColors.backgroundElement,

      borderRadius:
        16,

      padding:
        Spacing.three,

      gap:
        Spacing.two,
    },

    // ======================================
    // STATUS
    // ======================================

    statusPill: {
      alignSelf:
        'flex-start',

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 8,

      backgroundColor:
        AppColors.background,

      borderRadius:
        20,

      paddingVertical:
        10,

      paddingHorizontal:
        16,
    },

    statusDot: {
      width: 10,

      height: 10,

      borderRadius: 5,

      backgroundColor:
        AppColors.success,
    },

    statusText: {
      color:
        AppColors.text,

      fontSize: 12,

      fontWeight:
        '800',

      letterSpacing:
        0.5,
    },

    // ======================================
    // GOOGLE MAP
    // ======================================

    mapContainer: {
      width:
        '100%',

      height:
        260,

      borderRadius:
        16,

      overflow:
        'hidden',

      backgroundColor:
        AppColors.background,

      borderWidth:
        1,

      borderColor:
        AppColors.cardBorder,
    },

    map: {
      flex: 1,
    },

    mapLoading: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        AppColors.background,
    },

    loadingSpinner: {
      color:
        AppColors.emergency,

      fontSize: 44,

      marginBottom: 8,
    },

    mapLoadingText: {
      color:
        AppColors.textSecondary,

      fontSize: 14,
    },

    // ======================================
    // MAP OVERLAY
    // ======================================

    mapOverlay: {
      position:
        'absolute',

      top: 12,

      left: 12,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 8,

      backgroundColor:
        'rgba(20,20,22,0.90)',

      borderRadius:
        18,

      paddingVertical: 8,

      paddingHorizontal: 12,
    },

    mapOverlayDot: {
      width: 8,

      height: 8,

      borderRadius: 4,

      backgroundColor:
        AppColors.success,
    },

    mapOverlayText: {
      color:
        AppColors.text,

      fontSize: 10,

      fontWeight:
        '800',

      letterSpacing:
        0.4,
    },

    // ======================================
    // MAP MARKERS
    // ======================================

    userMarker: {
      alignItems:
        'center',

      justifyContent:
        'center',

      width: 42,

      height: 42,

      borderRadius: 21,

      backgroundColor:
        AppColors.emergency,

      borderWidth: 3,

      borderColor:
        '#fff',
    },

    userMarkerText: {
      fontSize: 20,
    },

    ambulanceMarker: {
      width: 48,

      height: 48,

      borderRadius: 24,

      backgroundColor:
        AppColors.success,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 3,

      borderColor:
        '#fff',
    },

    ambulanceEmoji: {
      fontSize: 24,
    },

    // ======================================
    // DISPATCH TITLE
    // ======================================

    dispatchTitle: {
      color:
        AppColors.success,

      fontSize: 20,

      fontWeight:
        '800',

      textAlign:
        'center',

      marginTop:
        Spacing.one,
    },

    dispatchSubtitle: {
      color:
        AppColors.textSecondary,

      fontSize: 13,

      textAlign:
        'center',
    },

    // ======================================
    // ETA
    // ======================================

    etaRow: {
      flexDirection:
        'row',

      gap:
        Spacing.two,

      justifyContent:
        'center',
    },

    etaBadge: {
      flex: 1,

      backgroundColor:
        AppColors.success + '22',

      borderRadius:
        12,

      paddingVertical:
        Spacing.one + 2,

      paddingHorizontal:
        Spacing.two,

      alignItems:
        'center',

      borderWidth:
        1,

      borderColor:
        AppColors.success + '44',
    },

    etaBadgeSecondary: {
      flex: 1,

      backgroundColor:
        AppColors.backgroundSelected,

      borderRadius:
        12,

      paddingVertical:
        Spacing.one + 2,

      paddingHorizontal:
        Spacing.two,

      alignItems:
        'center',

      borderWidth:
        1,

      borderColor:
        AppColors.cardBorder,
    },

    etaLabel: {
      color:
        AppColors.textSecondary,

      fontSize: 9,

      fontWeight:
        '600',

      letterSpacing:
        0.5,

      marginBottom: 2,
    },

    etaValue: {
      color:
        AppColors.text,

      fontSize: 14,

      fontWeight:
        '700',
    },

    // ======================================
    // INFO CARDS
    // ======================================

    infoCard: {
      backgroundColor:
        AppColors.background,

      borderRadius:
        12,

      padding:
        Spacing.three,

      borderWidth:
        1,

      borderColor:
        AppColors.cardBorder,
    },

    hospitalCard: {
      borderColor:
        AppColors.success + '44',
    },

    infoCardHeader: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      alignItems:
        'center',

      marginBottom:
        Spacing.one,
    },

    infoCardTitle: {
      color:
        AppColors.textSecondary,

      fontSize: 10,

      fontWeight:
        '700',

      letterSpacing:
        0.5,
    },

    infoName: {
      color:
        AppColors.text,

      fontSize: 15,

      fontWeight:
        '700',

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

    rating: {
      color:
        AppColors.success,

      fontSize: 11,

      fontWeight:
        '600',
    },

    // ======================================
    // LIVE BADGE
    // ======================================

    liveBadge: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 5,
    },

    liveDot: {
      width: 7,

      height: 7,

      borderRadius: 4,

      backgroundColor:
        AppColors.success,
    },

    liveText: {
      color:
        AppColors.success,

      fontSize: 9,

      fontWeight:
        '800',

      letterSpacing:
        0.5,
    },

    // ======================================
    // LOCATION CARD
    // ======================================

    pinCard: {
      backgroundColor:
        AppColors.emergency + '15',

      borderRadius:
        12,

      padding:
        Spacing.three,

      borderWidth:
        1,

      borderColor:
        AppColors.emergency + '33',

      alignItems:
        'center',
    },

    pinLabel: {
      color:
        AppColors.emergency,

      fontSize: 10,

      fontWeight:
        '700',

      letterSpacing:
        0.5,

      marginBottom:
        Spacing.half,
    },

    pinUrl: {
      color:
        AppColors.textSecondary,

      fontSize: 12,

      textAlign:
        'center',

      fontWeight:
        '500',
    },

    mapHint: {
      color:
        AppColors.success,

      fontSize: 11,

      fontWeight:
        '600',

      marginTop:
        Spacing.half,

      opacity: 0.85,
    },
  });