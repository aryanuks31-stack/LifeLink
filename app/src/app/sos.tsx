import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
} from 'react-native-maps';
import * as Location from 'expo-location';
import { router } from 'expo-router';

const BACKEND_URL = 'https://lifelink-nils.onrender.com';

const DEMO_USER_ID = 'cbab8131-96e5-4ea4-a580-c8db339ffc5f';

type Coordinate = {
  latitude: number;
  longitude: number;
};

type Hospital = {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  phone?: string;
};

type AmbulanceLocation = Coordinate & {
  status?: string;
};

type SOSResponse = {
  message?: string;
  sosEventId?: string;
  contactsNotified?: number;
  contactsFailed?: number;
  ambulance?: any;
  driver?: any;
  hospital?: Hospital;
  etaSeconds?: number;
  etaDisplay?: string;
  distanceToHospitalMeters?: number;
};

type SOSStatus = {
  status?: string;
  ambulance?: any;
  ambulanceLocation?: Coordinate;
  etaSeconds?: number;
  etaDisplay?: string;
  distanceRemainingMeters?: number;
  distanceToHospitalMeters?: number;
};

export default function SOSScreen() {
  const mapRef = useRef<MapView | null>(null);
  const trackingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [ambulanceLocation, setAmbulanceLocation] =
    useState<Coordinate | null>(null);

  const [hospitals, setHospitals] = useState<Hospital[]>([]);

  const [sosEventId, setSosEventId] = useState<string | null>(null);

  const [isTriggering, setIsTriggering] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [tracking, setTracking] = useState(false);

  const [etaDisplay, setEtaDisplay] = useState('--');
  const [distanceDisplay, setDistanceDisplay] = useState('--');

  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------
  // GET USER LOCATION
  // ---------------------------------------------------------

  const getUserLocation = useCallback(async () => {
    try {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setError('Location permission is required for SOS.');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords: Coordinate = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setUserLocation(coords);

      return coords;
    } catch (err) {
      console.error('Location error:', err);
      setError('Unable to get your current location.');
      return null;
    }
  }, []);

  // ---------------------------------------------------------
  // LOAD HOSPITALS
  // ---------------------------------------------------------

  const loadHospitals = useCallback(async () => {
    try {
      console.log('Fetching hospitals...');

      const response = await fetch(
        `${BACKEND_URL}/api/hospitals`
      );

      console.log('Hospital API status:', response.status);

      if (!response.ok) {
        throw new Error(`Hospital API failed: ${response.status}`);
      }

      const data = await response.json();

      const hospitalList = Array.isArray(data)
        ? data
        : data.hospitals || data.data || [];

      setHospitals(hospitalList);

      console.log(
        `Successfully loaded ${hospitalList.length} hospitals`
      );
    } catch (err) {
      console.error('Hospital loading error:', err);
    }
  }, []);

  // ---------------------------------------------------------
  // INITIAL LOAD
  // ---------------------------------------------------------

  useEffect(() => {
    getUserLocation();
    loadHospitals();

    return () => {
      if (trackingInterval.current) {
        clearInterval(trackingInterval.current);
      }
    };
  }, [getUserLocation, loadHospitals]);

  // ---------------------------------------------------------
  // FIT MAP TO USER + AMBULANCE
  // ---------------------------------------------------------

  useEffect(() => {
    if (!mapRef.current || !userLocation || !ambulanceLocation) {
      return;
    }

    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        [userLocation, ambulanceLocation],
        {
          edgePadding: {
            top: 80,
            right: 60,
            bottom: 80,
            left: 60,
          },
          animated: true,
        }
      );
    }, 500);

    return () => clearTimeout(timer);
  }, [userLocation, ambulanceLocation]);

  // ---------------------------------------------------------
  // TRACK AMBULANCE
  // ---------------------------------------------------------

  const fetchSOSStatus = useCallback(async () => {
    if (!sosEventId) {
      return;
    }

    try {
      console.log('=================================');
      console.log('SOS TRACKING REQUEST');
      console.log('SOS EVENT ID:', sosEventId);

      const url =
        `${BACKEND_URL}/api/sos/${sosEventId}/status`;

      console.log('TRACKING URL:', url);

      const response = await fetch(url);

      console.log(
        'Tracking HTTP status:',
        response.status
      );

      const text = await response.text();

      console.log('Tracking response:', text);

      if (!response.ok) {
        console.warn(
          'Tracking request failed:',
          response.status,
          text
        );
        return;
      }

      const data: SOSStatus = JSON.parse(text);

      if (data.ambulanceLocation) {
        setAmbulanceLocation({
          latitude: data.ambulanceLocation.latitude,
          longitude: data.ambulanceLocation.longitude,
        });
      }

      if (data.etaDisplay) {
        setEtaDisplay(data.etaDisplay);
      } else if (
        typeof data.etaSeconds === 'number'
      ) {
        const minutes = Math.floor(
          data.etaSeconds / 60
        );
        const seconds = Math.floor(
          data.etaSeconds % 60
        );

        setEtaDisplay(
          `${minutes} min ${seconds}s`
        );
      }

      if (
        typeof data.distanceRemainingMeters ===
        'number'
      ) {
        if (data.distanceRemainingMeters >= 1000) {
          setDistanceDisplay(
            `${(
              data.distanceRemainingMeters / 1000
            ).toFixed(1)} km`
          );
        } else {
          setDistanceDisplay(
            `${Math.round(
              data.distanceRemainingMeters
            )} m`
          );
        }
      }

      if (data.status === 'arrived') {
        setEtaDisplay('Arrived');
        setTracking(false);

        if (trackingInterval.current) {
          clearInterval(trackingInterval.current);
          trackingInterval.current = null;
        }
      }
    } catch (err) {
      console.error(
        'Tracking fetch error:',
        err
      );
    }
  }, [sosEventId]);

  useEffect(() => {
    if (!sosEventId || !sosActive) {
      return;
    }

    setTracking(true);

    fetchSOSStatus();

    trackingInterval.current =
      setInterval(() => {
        fetchSOSStatus();
      }, 3000);

    return () => {
      if (trackingInterval.current) {
        clearInterval(trackingInterval.current);
        trackingInterval.current = null;
      }
    };
  }, [
    sosEventId,
    sosActive,
    fetchSOSStatus,
  ]);

  // ---------------------------------------------------------
  // TRIGGER SOS
  // ---------------------------------------------------------

  const triggerSOS = async () => {
    if (isTriggering || sosActive) {
      return;
    }

    setIsTriggering(true);
    setError(null);

    try {
      const location =
        userLocation || (await getUserLocation());

      if (!location) {
        Alert.alert(
          'Location unavailable',
          'Please allow location access and try again.'
        );
        return;
      }

      console.log('=================================');
      console.log('SOS TRIGGER REQUEST');
      console.log('BACKEND URL:', BACKEND_URL);
      console.log(
        'TRIGGER URL:',
        `${BACKEND_URL}/api/sos/trigger`
      );
      console.log('USER ID:', DEMO_USER_ID);
      console.log('LAT:', location.latitude);
      console.log('LNG:', location.longitude);
      console.log('=================================');

      const response = await fetch(
        `${BACKEND_URL}/api/sos/trigger`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: DEMO_USER_ID,
            lat: location.latitude,
            lng: location.longitude,
          }),
        }
      );

      console.log(
        'SOS HTTP status:',
        response.status
      );

      const text = await response.text();

      console.log('SOS response:', text);

      if (!response.ok) {
        throw new Error(
          `SOS failed: ${response.status} ${text}`
        );
      }

      const data: SOSResponse = JSON.parse(text);

      if (!data.sosEventId) {
        throw new Error(
          'Backend did not return an SOS event ID.'
        );
      }

      setSosEventId(data.sosEventId);
      setSosActive(true);

      if (data.etaDisplay) {
        setEtaDisplay(data.etaDisplay);
      }

      if (
        typeof data.distanceToHospitalMeters ===
        'number'
      ) {
        if (
          data.distanceToHospitalMeters >= 1000
        ) {
          setDistanceDisplay(
            `${(
              data.distanceToHospitalMeters /
              1000
            ).toFixed(1)} km`
          );
        } else {
          setDistanceDisplay(
            `${Math.round(
              data.distanceToHospitalMeters
            )} m`
          );
        }
      }

      // If backend immediately provides ambulance
      // coordinates, show them right away.
      if (
        data.ambulance?.lat != null &&
        data.ambulance?.lng != null
      ) {
        setAmbulanceLocation({
          latitude: Number(data.ambulance.lat),
          longitude: Number(data.ambulance.lng),
        });
      }

      Alert.alert(
        'SOS Activated',
        'Help is on the way.'
      );
    } catch (err: any) {
      console.error('SOS trigger error:', err);

      setError(
        err?.message ||
          'Unable to trigger SOS.'
      );

      Alert.alert(
        'SOS Error',
        err?.message ||
          'Unable to trigger SOS.'
      );
    } finally {
      setIsTriggering(false);
    }
  };

  // ---------------------------------------------------------
  // MAP
  // ---------------------------------------------------------

  const renderMap = () => {
    if (!userLocation) {
      return (
        <View style={styles.mapLoading}>
          <ActivityIndicator size="large" />
          <Text style={styles.mapLoadingText}>
            Getting your location...
          </Text>
        </View>
      );
    }

    /*
     * IMPORTANT:
     * provider={PROVIDER_GOOGLE} is required for the
     * Google Maps provider on Android.
     */
    return (
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        mapType="standard"
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        loadingEnabled={true}
        toolbarEnabled={false}
        initialRegion={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
      >
        {/* USER */}
        <Marker
          coordinate={userLocation}
          title="Your location"
          description="SOS location"
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={styles.userMarker}>
            <View style={styles.userMarkerInner} />
          </View>
        </Marker>

        {/* AMBULANCE */}
        {ambulanceLocation && (
          <Marker
            coordinate={ambulanceLocation}
            title="Ambulance"
            description="Ambulance approaching"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.ambulanceMarker}>
              <Text style={styles.ambulanceEmoji}>
                🚑
              </Text>
            </View>
          </Marker>
        )}

        {/* ROUTE */}
        {ambulanceLocation && (
          <Polyline
            coordinates={[
              ambulanceLocation,
              userLocation,
            ]}
            strokeWidth={4}
            strokeColor="#E53935"
            lineDashPattern={[8, 6]}
          />
        )}
      </MapView>
    );
  };

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>
            ‹
          </Text>
        </Pressable>

        <Text style={styles.headerTitle}>
          Emergency SOS
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      {!sosActive ? (
        <View style={styles.preSOSContainer}>
          <View style={styles.warningCircle}>
            <Text style={styles.warningText}>
              SOS
            </Text>
          </View>

          <Text style={styles.title}>
            Need emergency help?
          </Text>

          <Text style={styles.subtitle}>
            Press the button below to immediately
            send an SOS and request an ambulance.
          </Text>

          <Pressable
            onPress={triggerSOS}
            disabled={isTriggering}
            style={[
              styles.sosButton,
              isTriggering &&
                styles.sosButtonDisabled,
            ]}
          >
            {isTriggering ? (
              <ActivityIndicator
                color="#FFFFFF"
                size="large"
              />
            ) : (
              <>
                <Text style={styles.sosButtonText}>
                  SEND SOS
                </Text>
                <Text
                  style={styles.sosButtonSubtext}
                >
                  Emergency assistance
                </Text>
              </>
            )}
          </Pressable>

          {error && (
            <Text style={styles.errorText}>
              {error}
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.activeContainer}>
          {/* STATUS */}

          <View style={styles.statusCard}>
            <View style={styles.statusDot} />

            <View style={styles.statusTextContainer}>
              <Text style={styles.statusTitle}>
                AMBULANCE EN ROUTE
              </Text>

              <Text style={styles.statusSubtitle}>
                Help is on the way
              </Text>
            </View>
          </View>

          {/* MAP */}

          <View style={styles.mapContainer}>
            {renderMap()}
          </View>

          {/* ETA */}

          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>
                ETA
              </Text>

              <Text style={styles.infoValue}>
                {etaDisplay}
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>
                DISTANCE
              </Text>

              <Text style={styles.infoValue}>
                {distanceDisplay}
              </Text>
            </View>
          </View>

          {/* AMBULANCE CARD */}

          <View style={styles.ambulanceCard}>
            <View style={styles.ambulanceIconBox}>
              <Text style={styles.cardEmoji}>
                🚑
              </Text>
            </View>

            <View style={styles.ambulanceInfo}>
              <Text style={styles.ambulanceTitle}>
                Ambulance
              </Text>

              <Text style={styles.ambulanceSubtitle}>
                {tracking
                  ? 'Tracking live location'
                  : 'Location tracking active'}
              </Text>
            </View>

            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>
                LIVE
              </Text>
            </View>
          </View>

          {error && (
            <Text style={styles.errorText}>
              {error}
            </Text>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------
// STYLES
// ---------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },

  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    fontSize: 38,
    lineHeight: 40,
    color: '#111827',
    fontWeight: '300',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  headerSpacer: {
    width: 42,
  },

  // -------------------------------------------------------
  // PRE SOS
  // -------------------------------------------------------

  preSOSContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  warningCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  warningText: {
    color: '#DC2626',
    fontSize: 22,
    fontWeight: '900',
  },

  title: {
    fontSize: 25,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 340,
    marginBottom: 36,
  },

  sosButton: {
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
  },

  sosButtonDisabled: {
    opacity: 0.7,
  },

  sosButtonText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },

  sosButtonSubtext: {
    color: '#FEE2E2',
    fontSize: 12,
    marginTop: 5,
    fontWeight: '600',
  },

  // -------------------------------------------------------
  // ACTIVE SOS
  // -------------------------------------------------------

  activeContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    marginRight: 12,
  },

  statusTextContainer: {
    flex: 1,
  },

  statusTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#16A34A',
    letterSpacing: 0.5,
  },

  statusSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#6B7280',
  },

  // -------------------------------------------------------
  // MAP
  // -------------------------------------------------------

  mapContainer: {
    width: '100%',
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },

  map: {
    flex: 1,
  },

  mapLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E7EB',
  },

  mapLoadingText: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 13,
  },

  // -------------------------------------------------------
  // USER MARKER
  // -------------------------------------------------------

  userMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  userMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  // -------------------------------------------------------
  // AMBULANCE MARKER
  // -------------------------------------------------------

  ambulanceMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    borderWidth: 2,
    borderColor: '#DC2626',
  },

  ambulanceEmoji: {
    fontSize: 24,
  },

  // -------------------------------------------------------
  // INFO
  // -------------------------------------------------------

  infoRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },

  infoCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  infoLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
  },

  infoValue: {
    marginTop: 4,
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
  },

  // -------------------------------------------------------
  // AMBULANCE CARD
  // -------------------------------------------------------

  ambulanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  ambulanceIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardEmoji: {
    fontSize: 25,
  },

  ambulanceInfo: {
    flex: 1,
    marginLeft: 12,
  },

  ambulanceTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },

  ambulanceSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: '#6B7280',
  },

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 5,
  },

  liveText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#16A34A',
  },

  errorText: {
    color: '#DC2626',
    textAlign: 'center',
    fontSize: 12,
    marginTop: 10,
  },
});