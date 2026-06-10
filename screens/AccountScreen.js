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
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";

import { API_BASE_URL } from "../config/backend";
import { colors, radii, spacing, type } from "../styles/theme";
import { ui } from "../styles/ui";
import { getStoredSessionToken } from "../utils/session";

const TAB_INFO = "info";
const TAB_SETTINGS = "settings";

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

const AccountScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState(TAB_INFO);
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
  const [isLoggedIn, setIsLoggedIn] = useState(true);

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
      const sessionToken = await getStoredSessionToken();
      if (!sessionToken) {
        setIsLoggedIn(false);
        setProfile(null);
        return;
      }

      setIsLoggedIn(true);

      const headers = { Authorization: `Bearer ${sessionToken}` };

      const userResp = await axios.get(`${API_BASE_URL}/api/users/me`, { headers });
      const u = userResp?.data?.user || null;
      setProfile(u);
      hydrateDraftFromProfile(u);
      setIsEditingProfile(false);
    } catch (err) {
      console.error("Account load error:", err);
      Alert.alert("Error", "Could not load account information. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [hydrateDraftFromProfile]);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {};
    }, [load])
  );

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

  const renderInfo = () => {
    if (!isLoggedIn) {
      return (
        <View style={ui.sectionCard}>
          <Text style={styles.sectionTitle}>You’re not logged in</Text>
          <Text style={[ui.textBodySm, { marginTop: spacing.sm }]}
          >
            Log in to view your account details and settings.
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
        const sessionToken = await getStoredSessionToken();
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

  const renderSettings = () => {
    if (!isLoggedIn) {
      return renderInfo();
    }

    return (
        <View style={ui.sectionCard}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <Text style={[ui.textBodySm, { marginTop: spacing.sm }]}>
            Keep your account simple here, and open analytics from the dedicated performance area.
          </Text>

          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>Progress dashboard</Text>
            <Text style={styles.settingsBody}>
              Review accuracy, timing, and daily quiz trends in a separate performance screen.
            </Text>
            <TouchableOpacity
              style={[ui.buttonPrimary, { marginTop: spacing.lg }]}
              onPress={() => navigation.navigate("Performance")}
            >
              <Text style={ui.buttonPrimaryText}>Open performance</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>Signed-in status</Text>
            <Text style={styles.settingsBody}>
              You are signed in on this device. Use the menu when you need to log out or manage account actions.
            </Text>
          </View>

          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>Keep things simple</Text>
            <Text style={styles.settingsBody}>
              Edit your account information in the first tab. Use performance for quiz insights and progress.
            </Text>
          </View>
        </View>
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
        {renderTabButton("Info", TAB_INFO)}
        {renderTabButton("Settings", TAB_SETTINGS)}
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
          {activeTab === TAB_INFO ? renderInfo() : renderSettings()}
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
  settingsCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.slate50,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  settingsTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.textSecondary,
  },
  settingsBody: {
    marginTop: spacing.sm,
    fontSize: type.bodySm,
    lineHeight: 24,
    color: colors.textMuted,
  },
});

export default AccountScreen;
