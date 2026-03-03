import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused, useNavigation } from '@react-navigation/native';

import { colors, radii, spacing, type } from '../styles/theme';
import { ui } from '../styles/ui';
import { API_BASE_URL } from '../config/backend';

const TABS = {
  profile: 'profile',
  performance: 'performance',
};

const formatMs = (ms) => {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
};

const AccountScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [activeTab, setActiveTab] = useState(TABS.profile);

  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState(null);

  const [metricsLoading, setMetricsLoading] = useState(true);
  const [series, setSeries] = useState([]);
  const [metricsError, setMetricsError] = useState(null);

  const days = 14;

  const loadProfile = async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      const trimmedToken = sessionToken?.trim();
      if (!trimmedToken) {
        setProfile(null);
        setProfileError('Please log in to view your profile.');
        return;
      }

      const res = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${trimmedToken}`,
        },
      });

      setProfile(res.data?.user || null);
    } catch (e) {
      console.error('Failed to load profile:', e?.response?.data || e?.message || e);
      if (e?.response?.status === 401) {
        await AsyncStorage.removeItem('sessionToken');
        setProfile(null);
        setProfileError('Session expired. Please log in again.');
      } else {
        setProfileError('Unable to load profile.');
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const loadMetrics = async () => {
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      const trimmedToken = sessionToken?.trim();
      if (!trimmedToken) {
        setSeries([]);
        setMetricsError('Please log in to view performance.');
        return;
      }

      const res = await axios.get(`${API_BASE_URL}/api/trivia/metrics/daily?days=${days}`, {
        headers: {
          Authorization: `Bearer ${trimmedToken}`,
        },
      });

      setSeries(res.data?.series || []);
    } catch (e) {
      console.error('Failed to load metrics:', e?.response?.data || e?.message || e);
      if (e?.response?.status === 401) {
        await AsyncStorage.removeItem('sessionToken');
        setSeries([]);
        setMetricsError('Session expired. Please log in again.');
      } else {
        setMetricsError('Unable to load performance.');
      }
    } finally {
      setMetricsLoading(false);
    }
  };

  useEffect(() => {
    if (!isFocused) return;
    loadProfile();
    loadMetrics();
  }, [isFocused]);

  return (
    <SafeAreaView style={ui.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={[ui.header, styles.accountHeader]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={ui.screenTitle}>Account</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            onPress={() => setActiveTab(TABS.profile)}
            style={[styles.tabButton, activeTab === TABS.profile && styles.tabButtonActive]}
          >
            <Text style={[styles.tabText, activeTab === TABS.profile && styles.tabTextActive]}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab(TABS.performance)}
            style={[styles.tabButton, styles.tabButtonLast, activeTab === TABS.performance && styles.tabButtonActive]}
          >
            <Text style={[styles.tabText, activeTab === TABS.performance && styles.tabTextActive]}>Performance</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === TABS.profile ? (
          <View style={ui.card}>
            {profileLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.brand} />
                <Text style={styles.loadingText}>Loading profile…</Text>
              </View>
            ) : profileError ? (
              <Text style={styles.errorText}>{profileError}</Text>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Your Details</Text>

                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <Text style={styles.fieldValue}>{profile?.name || '—'}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <Text style={styles.fieldValue}>{profile?.email || '—'}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Age</Text>
                  <Text style={styles.fieldValue}>{profile?.age ?? '—'}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Gender</Text>
                  <Text style={styles.fieldValue}>{profile?.gender || '—'}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Country</Text>
                  <Text style={styles.fieldValue}>{profile?.countryOfOrigin || '—'}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Education (years)</Text>
                  <Text style={styles.fieldValue}>{profile?.yearsOfEducation ?? '—'}</Text>
                </View>
              </>
            )}
          </View>
        ) : (
          <View style={ui.card}>
            {metricsLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.brand} />
                <Text style={styles.loadingText}>Loading performance…</Text>
              </View>
            ) : metricsError ? (
              <Text style={styles.errorText}>{metricsError}</Text>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Daily Performance (last {days} days)</Text>
                {series.filter((d) => (d.totalAttempts || 0) > 0).length === 0 ? (
                  <Text style={styles.mutedText}>No attempts yet. Play a trivia quiz to see results here.</Text>
                ) : (
                  series
                    .filter((d) => (d.totalAttempts || 0) > 0)
                    .slice()
                    .reverse()
                    .map((d) => {
                      const total = d.totalAttempts || (d.correctCount || 0) + (d.incorrectCount || 0);
                      const correctFlex = d.correctCount || 0;
                      const incorrectFlex = d.incorrectCount || 0;

                      return (
                        <View key={d.date} style={styles.dayRow}>
                          <View style={styles.dayHeader}>
                            <Text style={styles.dayDate}>{d.date}</Text>
                            <Text style={styles.dayStats}>
                              {d.correctCount}✓ / {d.incorrectCount}✗ · avg {formatMs(d.avgTimeTakenMs)}
                            </Text>
                          </View>

                          <View style={styles.barTrack}>
                            {total === 0 ? (
                              <View style={[styles.barFill, { flex: 1, backgroundColor: colors.gray200 }]} />
                            ) : (
                              <>
                                <View
                                  style={[
                                    styles.barFill,
                                    { flex: Math.max(correctFlex, 0.0001), backgroundColor: colors.success },
                                  ]}
                                />
                                <View
                                  style={[
                                    styles.barFill,
                                    { flex: Math.max(incorrectFlex, 0.0001), backgroundColor: colors.danger },
                                  ]}
                                />
                              </>
                            )}
                          </View>
                        </View>
                      );
                    })
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  accountHeader: {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 24,
    color: colors.slate600,
    fontWeight: '700',
    lineHeight: 24,
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  tabRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    width: '100%',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.slate100,
    borderWidth: 1,
    borderColor: colors.slate200,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  tabButtonLast: {
    marginRight: 0,
  },
  tabButtonActive: {
    backgroundColor: colors.brandTint,
    borderColor: colors.brandBorder,
  },
  tabText: {
    fontSize: type.bodySm,
    fontWeight: '700',
    color: colors.slate600,
  },
  tabTextActive: {
    color: colors.brandSelectedText,
  },
  content: {
    padding: spacing.lg,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: spacing.sm,
    color: colors.textMuted,
    fontSize: type.bodySm,
  },
  sectionTitle: {
    fontSize: type.bodyLg,
    fontWeight: '800',
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.dangerDark,
    fontSize: type.body,
  },
  mutedText: {
    color: colors.textMuted,
    fontSize: type.body,
  },
  fieldRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  fieldLabel: {
    fontSize: type.caption,
    color: colors.textMuted,
    marginBottom: 3,
  },
  fieldValue: {
    fontSize: type.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  dayRow: {
    marginBottom: spacing.lg,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  dayDate: {
    fontSize: type.bodySm,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  dayStats: {
    fontSize: type.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  barTrack: {
    height: 10,
    borderRadius: 6,
    backgroundColor: colors.gray100,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  barFill: {
    height: '100%',
  },
});

export default AccountScreen;
