import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";

import { API_BASE_URL } from "../config/backend";
import { colors, radii, spacing, type } from "../styles/theme";
import { ui } from "../styles/ui";

const TAB_PROFILE = "profile";
const TAB_PERFORMANCE = "performance";

const CHART_HEIGHT = 120;
const TREND_STROKE = 2;
const TREND_DOT = 6;

const GENDER_OPTIONS = [
  { label: "Female", value: "female" },
  { label: "Male", value: "male" },
  { label: "Non-binary", value: "non_binary" },
  { label: "Other", value: "other" },
  { label: "Prefer not to say", value: "prefer_not_to_say" },
];

countries.registerLocale(en);
const COUNTRY_OPTIONS = Object.entries(countries.getNames("en", { select: "official" }))
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

function formatDateOnlyLocal(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateOnlyString(value) {
  const s = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [yyyy, mm, dd] = s.split("-").map((x) => Number(x));
  if (!yyyy || !mm || !dd) return null;
  const d = new Date(yyyy, mm - 1, dd);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isValidDateOnlyString(value) {
  const s = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  // Compare as date-only in UTC
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return d.getTime() <= todayUtc.getTime();
}

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
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [dobPickerVisible, setDobPickerVisible] = useState(false);
  const [dobPickerDate, setDobPickerDate] = useState(new Date());
  const [profileDraft, setProfileDraft] = useState({
    name: "",
    email: "",
    dob: "",
    gender: "",
    countryOfOrigin: "",
    yearsOfEducation: "",
  });
  const [metricsDays, setMetricsDays] = useState(14);
  const [dailySeries, setDailySeries] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [chartWidth, setChartWidth] = useState(0);
  const [trendTooltip, setTrendTooltip] = useState(null);

  const hydrateDraftFromProfile = useCallback((u) => {
    setProfileDraft({
      name: u?.name ? String(u.name) : "",
      email: u?.email ? String(u.email) : "",
      dob: u?.dob ? String(u.dob) : "",
      gender: u?.gender ? String(u.gender) : "",
      countryOfOrigin: u?.countryOfOrigin ? String(u.countryOfOrigin) : "",
      yearsOfEducation: u?.yearsOfEducation != null ? String(u.yearsOfEducation) : "",
    });
  }, []);

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

      const userResp = await axios.get(`${API_BASE_URL}/api/users/me`, { headers });
      const u = userResp?.data?.user || null;
      setProfile(u);
      hydrateDraftFromProfile(u);
      setIsEditingProfile(false);

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

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return COUNTRY_OPTIONS;
    return COUNTRY_OPTIONS.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [countrySearch]);

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

    const dobLocked = Boolean(profile?.locks?.dob || profile?.dob);
    const genderLocked = Boolean(profile?.locks?.gender || profile?.gender);

    const selectedGenderLabel =
      GENDER_OPTIONS.find((g) => g.value === profileDraft.gender)?.label || "";

    const displayGenderValue = isEditingProfile ? profileDraft.gender : profile?.gender;
    const displayGenderLabel =
      GENDER_OPTIONS.find((g) => g.value === displayGenderValue)?.label ||
      (displayGenderValue ? String(displayGenderValue) : "—");

    const selectedCountryCode = profileDraft.countryOfOrigin ? String(profileDraft.countryOfOrigin).toUpperCase() : "";
    const selectedCountryLabel = selectedCountryCode
      ? countries.getName(selectedCountryCode, "en", { select: "official" })
      : "";

    const saveProfile = async () => {
      if (savingProfile) return;

      if (profileDraft.dob && !dobLocked && !isValidDateOnlyString(profileDraft.dob)) {
        Alert.alert("Invalid date", "Please enter DOB as YYYY-MM-DD (not in the future).");
        return;
      }

      setSavingProfile(true);
      try {
        const sessionToken = await AsyncStorage.getItem("sessionToken");
        if (!sessionToken) {
          Alert.alert("Error", "Please log in again.");
          setIsLoggedIn(false);
          return;
        }

        const headers = { Authorization: `Bearer ${sessionToken}` };

        const payload = {};
        const trimOrEmpty = (s) => String(s || "").trim();

        const nextName = trimOrEmpty(profileDraft.name);
        if (nextName && nextName !== (profile?.name || "")) payload.name = nextName;

        const nextEmail = trimOrEmpty(profileDraft.email);
        if (nextEmail && nextEmail.toLowerCase() !== String(profile?.email || "").toLowerCase()) {
          payload.email = nextEmail;
        }

        const nextCountry = trimOrEmpty(profileDraft.countryOfOrigin);
        if (nextCountry && nextCountry.toUpperCase() !== String(profile?.countryOfOrigin || "").toUpperCase()) {
          payload.countryOfOrigin = nextCountry.toUpperCase();
        }

        const nextEdu = trimOrEmpty(profileDraft.yearsOfEducation);
        if (nextEdu) {
          const eduNum = Number(nextEdu);
          if (!Number.isNaN(eduNum) && eduNum !== profile?.yearsOfEducation) {
            payload.yearsOfEducation = eduNum;
          }
        }

        if (!genderLocked) {
          const nextGender = trimOrEmpty(profileDraft.gender);
          if (nextGender && nextGender !== (profile?.gender || "")) payload.gender = nextGender;
        }

        if (!dobLocked) {
          const nextDob = trimOrEmpty(profileDraft.dob);
          if (nextDob && nextDob !== (profile?.dob || "")) payload.dob = nextDob;
        }

        if (Object.keys(payload).length === 0) {
          setIsEditingProfile(false);
          return;
        }

        const resp = await axios.patch(`${API_BASE_URL}/api/users/me`, payload, { headers });
        const updated = resp?.data?.user || null;
        setProfile(updated);
        hydrateDraftFromProfile(updated);
        setIsEditingProfile(false);
        Alert.alert("Saved", "Your profile has been updated.");
      } catch (err) {
        const msg = err?.response?.data?.message || "Could not update your profile. Please try again.";
        Alert.alert("Error", msg);
      } finally {
        setSavingProfile(false);
      }
    };

    return (
      <View style={ui.sectionCard}>
        <View style={styles.profileHeaderRow}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <TouchableOpacity
            onPress={() => {
              if (isEditingProfile) {
                hydrateDraftFromProfile(profile);
                setIsEditingProfile(false);
              } else {
                setIsEditingProfile(true);
              }
            }}
            style={styles.profileEditButton}
          >
            <Text style={styles.profileEditButtonText}>{isEditingProfile ? "Cancel" : "Edit"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Name</Text>
          {isEditingProfile ? (
            <View style={ui.inputWrapper}>
              <TextInput
                style={ui.input}
                value={profileDraft.name}
                onChangeText={(t) => setProfileDraft((p) => ({ ...p, name: t }))}
                placeholder="Your name"
                placeholderTextColor={colors.gray400}
              />
            </View>
          ) : (
            <Text style={styles.profileValue}>{profile?.name || "—"}</Text>
          )}
        </View>

        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Email</Text>
          {isEditingProfile ? (
            <View style={ui.inputWrapper}>
              <TextInput
                style={ui.input}
                value={profileDraft.email}
                onChangeText={(t) => setProfileDraft((p) => ({ ...p, email: t }))}
                placeholder="you@example.com"
                placeholderTextColor={colors.gray400}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </View>
          ) : (
            <Text style={styles.profileValue}>{profile?.email || "—"}</Text>
          )}
        </View>

        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Date of birth</Text>
          {isEditingProfile ? (
            dobLocked ? (
              <Text style={styles.profileValueLocked}>{profileDraft.dob || profile?.dob || "—"}</Text>
            ) : (
              <View style={ui.inputWrapper}>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => {
                    const parsed = parseDateOnlyString(profileDraft.dob);
                    setDobPickerDate(parsed || new Date());
                    setDobPickerVisible(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Select date of birth"
                >
                  <Text style={profileDraft.dob ? styles.selectText : styles.selectPlaceholder} numberOfLines={1}>
                    {profileDraft.dob ? profileDraft.dob : "Select date..."}
                  </Text>
                </TouchableOpacity>
              </View>
            )
          ) : (
            <Text style={styles.profileValue}>{profile?.dob || "—"}</Text>
          )}
        </View>

        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Gender</Text>
          {isEditingProfile ? (
            genderLocked ? (
              <Text style={styles.profileValueLocked}>{displayGenderLabel}</Text>
            ) : (
              <View style={ui.inputWrapper}>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setGenderModalVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Select gender"
                >
                  <Text style={profileDraft.gender ? styles.selectText : styles.selectPlaceholder} numberOfLines={1}>
                    {profileDraft.gender ? selectedGenderLabel : "Select gender..."}
                  </Text>
                </TouchableOpacity>
              </View>
            )
          ) : (
            <Text style={styles.profileValue}>{displayGenderLabel}</Text>
          )}
        </View>

        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Country</Text>
          {isEditingProfile ? (
            <View style={ui.inputWrapper}>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => {
                  setCountrySearch("");
                  setCountryModalVisible(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Select country of origin"
              >
                <Text style={selectedCountryCode ? styles.selectText : styles.selectPlaceholder} numberOfLines={1}>
                  {selectedCountryCode
                    ? `${selectedCountryLabel} (${selectedCountryCode})`
                    : "Select country..."}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.profileValue}>{profile?.countryOfOrigin || "—"}</Text>
          )}
        </View>

        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Years of education</Text>
          {isEditingProfile ? (
            <View style={ui.inputWrapper}>
              <TextInput
                style={ui.input}
                value={profileDraft.yearsOfEducation}
                onChangeText={(t) => setProfileDraft((p) => ({ ...p, yearsOfEducation: t }))}
                placeholder="e.g. 14"
                placeholderTextColor={colors.gray400}
                keyboardType="numeric"
              />
            </View>
          ) : (
            <Text style={styles.profileValue}>{profile?.yearsOfEducation ?? "—"}</Text>
          )}
        </View>

        {isEditingProfile ? (
          <TouchableOpacity
            style={[ui.buttonPrimary, { marginTop: spacing.lg, opacity: savingProfile ? 0.7 : 1 }]}
            onPress={saveProfile}
            disabled={savingProfile}
          >
            {savingProfile ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={ui.buttonPrimaryText}>Save changes</Text>
            )}
          </TouchableOpacity>
        ) : null}

        <Modal visible={genderModalVisible} transparent animationType="fade" onRequestClose={() => setGenderModalVisible(false)}>
          <Pressable style={ui.modalOverlay} onPress={() => setGenderModalVisible(false)}>
            <Pressable style={ui.modalContent} onPress={() => {}}>
              <Text style={styles.modalTitle}>Select gender</Text>
              {GENDER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={styles.modalOption}
                  onPress={() => {
                    setProfileDraft((p) => ({ ...p, gender: opt.value }));
                    setGenderModalVisible(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={countryModalVisible} transparent animationType="fade" onRequestClose={() => setCountryModalVisible(false)}>
          <Pressable style={ui.modalOverlay} onPress={() => setCountryModalVisible(false)}>
            <Pressable style={[ui.modalContent, styles.countryModalContent]} onPress={() => {}}>
              <Text style={styles.modalTitle}>Select country</Text>

              <View style={[ui.inputWrapper, styles.modalSearchWrap]}>
                <TextInput
                  style={ui.input}
                  placeholder="Search country"
                  placeholderTextColor={colors.gray400}
                  value={countrySearch}
                  onChangeText={setCountrySearch}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.modalList}>
                <FlatList
                  data={filteredCountries}
                  keyExtractor={(item) => item.code}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.modalOption}
                      onPress={() => {
                        setProfileDraft((p) => ({ ...p, countryOfOrigin: item.code }));
                        setCountryModalVisible(false);
                      }}
                    >
                      <Text style={styles.modalOptionText} numberOfLines={1}>
                        {item.name} ({item.code})
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>

              <TouchableOpacity style={[styles.profileEditButton, { marginTop: spacing.md }]} onPress={() => setCountryModalVisible(false)}>
                <Text style={styles.profileEditButtonText}>Cancel</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* DOB Picker */}
        {Platform.OS === "ios" ? (
          <Modal visible={dobPickerVisible} transparent animationType="fade" onRequestClose={() => setDobPickerVisible(false)}>
            <Pressable style={ui.modalOverlay} onPress={() => setDobPickerVisible(false)}>
              <Pressable style={[ui.modalContent, styles.dobModalContent]} onPress={() => {}}>
                <Text style={styles.modalTitle}>Select date of birth</Text>
                <DateTimePicker
                  value={dobPickerDate}
                  mode="date"
                  display="inline"
                  maximumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    if (selectedDate) setDobPickerDate(selectedDate);
                  }}
                />
                <TouchableOpacity
                  style={[ui.buttonPrimary, { width: "100%", marginTop: spacing.md }]}
                  onPress={() => {
                    setProfileDraft((p) => ({ ...p, dob: formatDateOnlyLocal(dobPickerDate) }));
                    setDobPickerVisible(false);
                  }}
                >
                  <Text style={ui.buttonPrimaryText}>Done</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.profileEditButton, { marginTop: spacing.sm }]}
                  onPress={() => setDobPickerVisible(false)}
                >
                  <Text style={styles.profileEditButtonText}>Cancel</Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>
        ) : null}

        {Platform.OS === "android" && dobPickerVisible ? (
          <DateTimePicker
            value={dobPickerDate}
            mode="date"
            display="calendar"
            maximumDate={new Date()}
            onChange={(event, selectedDate) => {
              setDobPickerVisible(false);
              if (event?.type === "set" && selectedDate) {
                setProfileDraft((p) => ({ ...p, dob: formatDateOnlyLocal(selectedDate) }));
              }
            }}
          />
        ) : null}
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

    const trendLineColor = colors.brandDark;
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const points = (() => {
      const n = dailySeries.length;
      if (!chartWidth || !n) return [];
      const step = chartWidth / n;
      return dailySeries.map((d, idx) => {
        const total = d.totalAttempts || 0;
        if (!total) return null;
        const rate = Math.min(1, Math.max(0, (d.correctCount || 0) / total));
        const x = step * idx + step / 2;
        const y = CHART_HEIGHT - rate * CHART_HEIGHT;
        return {
          idx,
          date: d.date,
          x,
          y,
          rate,
          totalAttempts: total,
          correctCount: d.correctCount || 0,
          incorrectCount: d.incorrectCount || 0,
        };
      });
    })();

    const trendSegments = [];
    let prev = null;
    let prevIdx = null;
    for (let i = 0; i < points.length; i += 1) {
      const p = points[i];
      if (!p) continue;

      if (prev && prevIdx != null) {
        const gapDays = i - prevIdx;
        const dx = p.x - prev.x;
        const dy = p.y - prev.y;
        const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const angle = Math.atan2(dy, dx);
        const midX = (prev.x + p.x) / 2;
        const midY = (prev.y + p.y) / 2;
        trendSegments.push(
          <View
            key={`seg-${prevIdx}-${i}`}
            style={[
              styles.trendSegment,
              {
                backgroundColor: trendLineColor,
                opacity: gapDays > 1 ? 0.45 : 1,
                width: length,
                height: TREND_STROKE,
                left: midX - length / 2,
                top: midY - TREND_STROKE / 2,
                transform: [{ rotateZ: `${angle}rad` }],
              },
            ]}
          />
        );
      }

      prev = p;
      prevIdx = i;
    }

    const trendDots = points
      .map((p) => {
        if (!p) return null;
        const isSelected = trendTooltip?.date === p.date;
        return (
          <Pressable
            key={`dot-${p.date}`}
            delayLongPress={180}
            onLongPress={() => setTrendTooltip(p)}
            onPressOut={() => setTrendTooltip(null)}
            hitSlop={12}
            style={[
              styles.trendDot,
              {
                backgroundColor: trendLineColor,
                width: TREND_DOT,
                height: TREND_DOT,
                borderRadius: TREND_DOT / 2,
                left: p.x - TREND_DOT / 2,
                top: p.y - TREND_DOT / 2,
                borderColor: isSelected ? colors.slate800 : colors.surface,
                borderWidth: isSelected ? 2 : 1,
              },
            ]}
          />
        );
      })
      .filter(Boolean);

    const tooltip = (() => {
      if (!trendTooltip || !chartWidth) return null;
      const TOOLTIP_W = 170;
      const TOOLTIP_H = 68;
      const left = clamp(trendTooltip.x - TOOLTIP_W / 2, 0, chartWidth - TOOLTIP_W);
      const top = clamp(trendTooltip.y - TOOLTIP_H - 10, 0, CHART_HEIGHT - TOOLTIP_H);
      const ratePct = (trendTooltip.rate * 100).toFixed(1);
      return (
        <View pointerEvents="none" style={[styles.tooltip, { width: TOOLTIP_W, left, top }]}>
          <Text style={styles.tooltipTextStrong}>{ratePct}% correct</Text>
          <Text style={styles.tooltipText}>Correct: {trendTooltip.correctCount}</Text>
          <Text style={styles.tooltipText}>Incorrect: {trendTooltip.incorrectCount}</Text>
        </View>
      );
    })();

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
              <View
                style={styles.chartArea}
                onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
              >
                {dailySeries.map((d, idx) => {
                  const total = d.totalAttempts || 0;
                  const scaledHeight = maxTotal
                    ? Math.max(2, Math.round((total / maxTotal) * CHART_HEIGHT))
                    : 2;
                  const correctHeight = total ? Math.round((d.correctCount / total) * scaledHeight) : 0;
                  const incorrectHeight = Math.max(0, scaledHeight - correctHeight);

                  return (
                    <View key={d.date} style={styles.chartCol}>
                      <View style={[styles.bar, { height: scaledHeight }]}>
                        <View style={[styles.barIncorrect, { height: incorrectHeight }]} />
                        <View style={[styles.barCorrect, { height: correctHeight }]} />
                      </View>
                    </View>
                  );
                })}

                {chartWidth > 0 ? (
                  <View pointerEvents="box-none" style={styles.trendOverlay}>
                    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                      {trendSegments}
                      {tooltip}
                    </View>
                    {trendDots}
                  </View>
                ) : null}
              </View>

              <View style={styles.ticksRow}>
                {dailySeries.map((d, idx) => {
                  const showTick =
                    idx === 0 ||
                    idx === Math.floor(dailySeries.length / 2) ||
                    idx === dailySeries.length - 1;
                  const tickLabel = showTick ? d.date.slice(5) : "";
                  return (
                    <View key={`tick-${d.date}`} style={styles.tickCol}>
                      <Text style={styles.tickLabel}>{tickLabel}</Text>
                    </View>
                  );
                })}
              </View>
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
            <View style={styles.legendItem}>
              <View style={[styles.legendLineSwatch, { backgroundColor: trendLineColor }]} />
              <Text style={styles.legendText}>Correct rate</Text>
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
  profileHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileEditButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    backgroundColor: colors.brandSelectedBg,
  },
  profileEditButtonText: {
    fontSize: type.bodySm,
    fontWeight: "700",
    color: colors.brandSelectedText,
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
  profileValueLocked: {
    fontSize: type.body,
    color: colors.textMuted,
    fontWeight: "600",
  },
  inputLocked: {
    backgroundColor: colors.gray100,
    borderColor: colors.gray200,
  },
  inputTextLocked: {
    color: colors.textMuted,
  },
  selectButton: {
    height: 56,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  selectText: {
    fontSize: type.body,
    color: colors.textSecondary,
  },
  selectPlaceholder: {
    fontSize: type.body,
    color: colors.gray400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  modalOption: {
    width: "100%",
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  modalOptionText: {
    fontSize: type.body,
    color: colors.textSecondary,
    fontWeight: "600",
    textAlign: "center",
  },
  countryModalContent: {
    alignItems: "stretch",
  },
  dobModalContent: {
    alignItems: "stretch",
  },
  modalSearchWrap: {
    marginTop: spacing.sm,
  },
  modalList: {
    marginTop: spacing.md,
    maxHeight: 320,
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
    gap: spacing.sm,
  },
  chartArea: {
    height: CHART_HEIGHT,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 6,
    position: "relative",
  },
  chartCol: {
    alignItems: "center",
    flex: 1,
  },
  trendOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  trendSegment: {
    position: "absolute",
    borderRadius: 999,
  },
  trendDot: {
    position: "absolute",
  },
  tooltip: {
    position: "absolute",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.slate800,
    borderWidth: 1,
    borderColor: colors.slate700,
  },
  tooltipTextStrong: {
    color: colors.white,
    fontSize: type.caption,
    fontWeight: "800",
  },
  tooltipText: {
    marginTop: 2,
    color: colors.white,
    fontSize: type.caption,
    fontWeight: "600",
    opacity: 0.95,
  },
  ticksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  tickCol: {
    flex: 1,
    alignItems: "center",
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
  legendLineSwatch: {
    width: 14,
    height: 3,
    borderRadius: 999,
  },
  legendText: {
    fontSize: type.caption,
    color: colors.textSecondary,
    fontWeight: "600",
  },
});

export default AccountScreen;
