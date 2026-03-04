import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";

import { API_BASE_URL } from "../config/backend";
import { colors, radii, spacing, type } from "../styles/theme";
import { ui } from "../styles/ui";

const TAB_PROFILE = "profile";
const TAB_PERFORMANCE = "performance";

function formatSecondsFromMs(ms) {
  if (ms == null || Number.isNaN(Number(ms))) return "—";
  const seconds = Number(ms) / 1000;
  if (!Number.isFinite(seconds)) return "—";
  return `${seconds.toFixed(1)}s`;
}

function safePct(numerator, denominator) {
  if (!denominator) return 0;
  return (numerator / denominator) * 100;
}

function toDayStringUTC(date) {
  const d = new Date(date);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysUTC(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function buildDailySeries(days, rawSeries) {
  const byDate = new Map((rawSeries || []).map((r) => [r.date, r]));
  const now = new Date();
  const start = addDaysUTC(now, -days + 1);
  start.setUTCHours(0, 0, 0, 0);

  const filled = [];
  for (let i = 0; i < days; i += 1) {
    const day = addDaysUTC(start, i);
    const key = toDayStringUTC(day);
    const existing = byDate.get(key);
    filled.push(
      existing || {
        date: key,
        totalAttempts: 0,
        correctCount: 0,
        incorrectCount: 0,
        avgTimeTakenMs: null,
      }
    );
  }
  return filled;
}

const AccountScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState(TAB_PROFILE);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [metricsDays, setMetricsDays] = useState(14);
  const [dailySeries, setDailySeries] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sessionToken = await AsyncStorage.getItem("sessionToken");
      if (!sessionToken) {
        setIsLoggedIn(false);
        setProfile(null);
        setDailySeries([]);
        return;
      }

      setIsLoggedIn(true);

      const headers = { Authorization: `Bearer ${sessionToken}` };

      const userIdResp = await axios.get(`${API_BASE_URL}/api/auth/get-user-id`, { headers });
      const userId = userIdResp?.data?.userId;

      if (!userId) {
        throw new Error("Missing userId");
      }

      const userResp = await axios.get(`${API_BASE_URL}/api/users/${userId}`);
      setProfile(userResp?.data?.user || null);

      try {
        const metricsResp = await axios.get(`${API_BASE_URL}/api/trivia/metrics/daily`, {
          headers,
          params: { days: metricsDays },
        });
        const raw = metricsResp?.data?.series || [];
        setDailySeries(buildDailySeries(metricsDays, raw));
      } catch (metricsErr) {
        console.error("Account metrics load error:", metricsErr);
        setDailySeries(buildDailySeries(metricsDays, []));
      }
    } catch (err) {
      console.error("Account load error:", err);
      Alert.alert("Error", "Could not load account information. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [metricsDays]);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {};
    }, [load])
  );

  const computed = useMemo(() => {
    const totalAttempts = dailySeries.reduce((acc, d) => acc + (d.totalAttempts || 0), 0);
    const correctCount = dailySeries.reduce((acc, d) => acc + (d.correctCount || 0), 0);
    const incorrectCount = dailySeries.reduce((acc, d) => acc + (d.incorrectCount || 0), 0);

    const timeWeightedSum = dailySeries.reduce((acc, d) => {
      if (!d.totalAttempts || d.avgTimeTakenMs == null) return acc;
      return acc + d.avgTimeTakenMs * d.totalAttempts;
    }, 0);

    const overallAvgTimeMs = totalAttempts ? Math.round(timeWeightedSum / totalAttempts) : null;
    const overallAccuracyPct = safePct(correctCount, totalAttempts);

    const last7 = dailySeries.slice(-7);
    const prev7 = dailySeries.slice(-14, -7);

    const last7Attempts = last7.reduce((acc, d) => acc + (d.totalAttempts || 0), 0);
    const last7Correct = last7.reduce((acc, d) => acc + (d.correctCount || 0), 0);
    const prev7Attempts = prev7.reduce((acc, d) => acc + (d.totalAttempts || 0), 0);
    const prev7Correct = prev7.reduce((acc, d) => acc + (d.correctCount || 0), 0);

    const last7Accuracy = safePct(last7Correct, last7Attempts);
    const prev7Accuracy = safePct(prev7Correct, prev7Attempts);
    const deltaAccuracy = last7Accuracy - prev7Accuracy;

    return {
      totalAttempts,
      correctCount,
      incorrectCount,
      overallAvgTimeMs,
      overallAccuracyPct,
      last7Accuracy,
      prev7Accuracy,
      deltaAccuracy,
    };
  }, [dailySeries]);

  const renderTabButton = (label, value) => {
    const isActive = activeTab === value;
    return (
      <TouchableOpacity
        style={[styles.tabButton, isActive ? styles.tabButtonActive : styles.tabButtonInactive]}
        onPress={() => setActiveTab(value)}
      >
        <Text style={[styles.tabButtonText, isActive ? styles.tabTextActive : styles.tabTextInactive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderProfile = () => {
    if (!isLoggedIn) {
      return (
        <View style={ui.sectionCard}>
          <Text style={styles.sectionTitle}>You’re not logged in</Text>
          <Text style={[ui.textBodySm, { marginTop: spacing.sm }]}
          >
            Log in to view your profile and performance dashboard.
          </Text>
          <TouchableOpacity
            style={[ui.buttonPrimary, { marginTop: spacing.lg }]}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={ui.buttonPrimaryText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={ui.sectionCard}>
        <Text style={styles.sectionTitle}>Profile</Text>

        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Name</Text>
          <Text style={styles.profileValue}>{profile?.name || "—"}</Text>
        </View>

        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Email</Text>
          <Text style={styles.profileValue}>{profile?.email || "—"}</Text>
        </View>

        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Age</Text>
          <Text style={styles.profileValue}>{profile?.age ?? "—"}</Text>
        </View>

        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Gender</Text>
          <Text style={styles.profileValue}>{profile?.gender || "—"}</Text>
        </View>

        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Country</Text>
          <Text style={styles.profileValue}>{profile?.countryOfOrigin || "—"}</Text>
        </View>

        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Years of education</Text>
          <Text style={styles.profileValue}>{profile?.yearsOfEducation ?? "—"}</Text>
        </View>
      </View>
    );
  };

  const renderPerformance = () => {
    if (!isLoggedIn) {
      return renderProfile();
    }

    const maxTotal = Math.max(...dailySeries.map((d) => d.totalAttempts || 0), 0);
    const trendIsUp = computed.deltaAccuracy >= 0;
    const trendColor = trendIsUp ? colors.successDark : colors.dangerDark;
    const trendText = `${trendIsUp ? "+" : ""}${computed.deltaAccuracy.toFixed(1)}%`;

    return (
      <>
        <View style={ui.sectionCard}>
          <Text style={styles.sectionTitle}>Performance (last {metricsDays} days)</Text>

          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Correct rate</Text>
              <Text style={styles.kpiValue}>{computed.overallAccuracyPct.toFixed(1)}%</Text>
              <Text style={[styles.kpiHint, { color: trendColor }]}
              >
                vs previous week: {trendText}
              </Text>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Avg time</Text>
              <Text style={styles.kpiValue}>{formatSecondsFromMs(computed.overallAvgTimeMs)}</Text>
              <Text style={styles.kpiHint}>per question</Text>
            </View>
          </View>

          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Attempts</Text>
              <Text style={styles.kpiValue}>{computed.totalAttempts}</Text>
              <Text style={styles.kpiHint}>total</Text>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Correct / Incorrect</Text>
              <Text style={styles.kpiValue}>
                {computed.correctCount} / {computed.incorrectCount}
              </Text>
              <Text style={styles.kpiHint}>counts</Text>
            </View>
          </View>
        </View>

        <View style={ui.sectionCard}>
          <Text style={styles.sectionTitle}>Correct vs Incorrect over time</Text>
          <Text style={[ui.textCaption, { marginTop: spacing.xs }]}
          >
            Taller bars mean more questions attempted.
          </Text>

          {computed.totalAttempts === 0 ? (
            <View style={{ marginTop: spacing.lg }}>
              <Text style={ui.textBodySm}>No attempts yet in this period.</Text>
            </View>
          ) : (
            <View style={styles.chartWrap}>
              {dailySeries.map((d, idx) => {
                const total = d.totalAttempts || 0;
                const scaledHeight = maxTotal ? Math.max(2, Math.round((total / maxTotal) * 120)) : 2;
                const correctHeight = total ? Math.round((d.correctCount / total) * scaledHeight) : 0;
                const incorrectHeight = Math.max(0, scaledHeight - correctHeight);

                const showTick = idx === 0 || idx === Math.floor(dailySeries.length / 2) || idx === dailySeries.length - 1;
                const tickLabel = showTick ? d.date.slice(5) : "";

                return (
                  <View key={d.date} style={styles.chartCol}>
                    <View style={[styles.bar, { height: scaledHeight }]}
                    >
                      <View style={[styles.barIncorrect, { height: incorrectHeight }]} />
                      <View style={[styles.barCorrect, { height: correctHeight }]} />
                    </View>
                    <Text style={styles.tickLabel}>{tickLabel}</Text>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: colors.success }]} />
              <Text style={styles.legendText}>Correct</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: colors.danger }]} />
              <Text style={styles.legendText}>Incorrect</Text>
            </View>
          </View>
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={ui.screenTint}>
      <View style={[ui.headerRow, styles.header]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={ui.iconButton}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={ui.headerTitleLg}>Account</Text>
        <View style={ui.headerSpacer} />
      </View>

      <View style={styles.tabsWrap}>
        {renderTabButton("Profile", TAB_PROFILE)}
        {renderTabButton("Performance", TAB_PERFORMANCE)}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {activeTab === TAB_PROFILE ? renderProfile() : renderPerformance()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.backgroundTint,
  },
  backIcon: {
    fontSize: 32,
    color: colors.textSecondary,
    marginTop: -2,
  },
  tabsWrap: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
    borderRadius: radii.pill,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  tabButtonActive: {
    backgroundColor: colors.brandSelectedBg,
    borderColor: colors.brandBorder,
  },
  tabButtonInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.slate200,
  },
  tabButtonText: {
    fontSize: type.bodySm,
    fontWeight: "600",
  },
  tabTextActive: {
    color: colors.brandSelectedText,
  },
  tabTextInactive: {
    color: colors.textSecondary,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  profileRow: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  profileLabel: {
    fontSize: type.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  profileValue: {
    fontSize: type.body,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  kpiRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.slate50,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  kpiLabel: {
    fontSize: type.caption,
    color: colors.textMuted,
  },
  kpiValue: {
    marginTop: spacing.sm,
    fontSize: 22,
    fontWeight: "800",
    color: colors.textSecondary,
  },
  kpiHint: {
    marginTop: spacing.xs,
    fontSize: type.caption,
    color: colors.textMuted,
    fontWeight: "600",
  },
  chartWrap: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 6,
  },
  chartCol: {
    alignItems: "center",
    flex: 1,
  },
  bar: {
    width: 10,
    borderRadius: 6,
    backgroundColor: colors.slate200,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barIncorrect: {
    width: "100%",
    backgroundColor: colors.danger,
  },
  barCorrect: {
    width: "100%",
    backgroundColor: colors.success,
  },
  tickLabel: {
    marginTop: spacing.xs,
    fontSize: 10,
    color: colors.textMuted,
  },
  legendRow: {
    marginTop: spacing.lg,
    flexDirection: "row",
    gap: spacing.lg,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: type.caption,
    color: colors.textSecondary,
    fontWeight: "600",
  },
});

export default AccountScreen;
