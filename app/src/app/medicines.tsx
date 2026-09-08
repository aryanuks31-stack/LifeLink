// app/src/app/medicines.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { AppColors } from "../constants/theme";
import { ScreenHeader } from "../components/screen-header";

// ⚠️ Emulator alias for host machine: 10.0.2.2. Use your LAN IP (hostname -I) on a physical phone.
const BACKEND_URL = "http://10.0.2.2:5000";
const DEMO_USER_ID = "cbab8131-96e5-4ea4-a580-c8db339ffc5f"; // demo user — same as sos.tsx / index.tsx

interface Medicine {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

interface CartItem {
  medicineId: string;
  name: string;
  price: number;
  quantity: number;
}

const CATEGORIES = [
  "All",
  "Pain Relief",
  "Antibiotics",
  "Cardiac",
  "Diabetes",
  "Respiratory",
  "Digestive",
  "Vitamins & Supplements",
  "Skin Care",
  "First Aid",
  "Allergy",
];

export default function MedicinesScreen() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<Record<string, CartItem>>({});

  const fetchMedicines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (category !== "All") params.append("category", category);
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(`${BACKEND_URL}/api/medicines?${params.toString()}`);
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data: Medicine[] = await res.json();
      setMedicines(data);
    } catch (e) {
      console.error(e);
      setError("Couldn't load medicines. Check backend is running and reachable.");
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    const timeout = setTimeout(fetchMedicines, 300); // debounce search typing
    return () => clearTimeout(timeout);
  }, [fetchMedicines]);

  const addToCart = (med: Medicine) => {
    if (med.stock <= 0) return;
    setCart((prev) => {
      const existing = prev[med.id];
      const nextQty = (existing?.quantity ?? 0) + 1;
      if (nextQty > med.stock) return prev; // don't exceed stock
      return {
        ...prev,
        [med.id]: { medicineId: med.id, name: med.name, price: med.price, quantity: nextQty },
      };
    });
  };

  const removeFromCart = (medId: string) => {
    setCart((prev) => {
      const existing = prev[medId];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const { [medId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [medId]: { ...existing, quantity: existing.quantity - 1 } };
    });
  };

  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const placeOrder = async () => {
    if (!cartItems.length) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/medicines/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: DEMO_USER_ID,
          items: cartItems.map((i) => ({ medicineId: i.medicineId, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Order failed");
      Alert.alert("Order placed", `Order ID: ${data.orderId}\nTotal: ₹${data.total}`);
      setCart({});
    } catch (e: any) {
      Alert.alert("Order failed", e.message ?? "Something went wrong");
    }
  };

  const renderItem = ({ item }: { item: Medicine }) => {
    const qtyInCart = cart[item.id]?.quantity ?? 0;
    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.medName}>{item.name}</Text>
          <Text style={styles.medMeta}>{item.category} • ₹{item.price}</Text>
          <Text style={styles.medMeta}>
            {item.stock > 0 ? `${item.stock} in stock` : "Out of stock"}
          </Text>
        </View>
        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => removeFromCart(item.id)}
            disabled={qtyInCart === 0}
          >
            <Text style={styles.qtyBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qtyText}>{qtyInCart}</Text>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => addToCart(item)}
            disabled={item.stock <= qtyInCart}
          >
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Medicines" />

      <TextInput
        style={styles.searchInput}
        placeholder="Search medicines..."
        placeholderTextColor={AppColors.textSecondary}
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(c) => c}
        showsHorizontalScrollIndicator={false}
        style={styles.categoryRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, category === item && styles.chipActive]}
            onPress={() => setCategory(item)}
          >
            <Text style={[styles.chipText, category === item && styles.chipTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={AppColors.emergency} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={medicines}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={<Text style={styles.medMeta}>No medicines found.</Text>}
        />
      )}

      {cartItems.length > 0 && (
        <TouchableOpacity style={styles.checkoutBar} onPress={placeOrder}>
          <Text style={styles.checkoutText}>
            {cartItems.reduce((n, i) => n + i.quantity, 0)} items • ₹{cartTotal}
          </Text>
          <Text style={styles.checkoutText}>Place Order →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background, padding: 16 },
  searchInput: {
    backgroundColor: AppColors.backgroundElement,
    color: AppColors.text,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  categoryRow: { flexGrow: 0, marginBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: AppColors.backgroundElement,
    marginRight: 8,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  chipActive: { backgroundColor: AppColors.emergency, borderColor: AppColors.emergency },
  chipText: { color: AppColors.textSecondary, fontSize: 13 },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: AppColors.backgroundElement,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  medName: { color: AppColors.text, fontSize: 16, fontWeight: "600" },
  medMeta: { color: AppColors.textSecondary, fontSize: 13, marginTop: 2 },
  qtyRow: { flexDirection: "row", alignItems: "center" },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AppColors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: { color: AppColors.text, fontSize: 18 },
  qtyText: { color: AppColors.text, marginHorizontal: 10, fontSize: 15 },
  errorText: { color: "#ff6b6b", marginTop: 20, textAlign: "center" },
  checkoutBar: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: AppColors.emergency,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  checkoutText: { color: "#fff", fontWeight: "700" },
});