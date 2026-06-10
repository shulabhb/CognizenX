import React, { useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Menu, { getMenuWidth } from './Menu';
import GameIcon from '../components/games/GameIcon';

import { colors, layout, radii, spacing, type } from '../styles/theme';
import { ui } from '../styles/ui';
import { gameColors } from '../styles/gameTheme';
import { clearStoredSessionToken, getStoredSessionToken } from '../utils/session';
import {
  GAME_FILTER_OPTIONS,
  getGamesByCategory,
  getGamesGroupedByCategory,
} from '../constants/gamesRegistry';

const MENU_ICON = '≡';

const GamesScreen = () => {
  const { width: screenWidth } = useWindowDimensions();
  const menuWidth = getMenuWidth(screenWidth);
  const navigation = useNavigation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const menuAnimation = useRef(new Animated.Value(-menuWidth)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (!menuOpen) {
      menuAnimation.setValue(-menuWidth);
    }
  }, [menuWidth, menuOpen, menuAnimation]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const refreshAuthState = async () => {
        const sessionToken = await getStoredSessionToken();
        if (isActive) setIsLoggedIn(!!sessionToken);
      };
      refreshAuthState();
      return () => { isActive = false; };
    }, [])
  );

  const toggleMenu = () => {
    const toMenu = menuOpen ? -menuWidth : 0;
    const toOpacity = menuOpen ? 1 : 0.8;
    Animated.parallel([
      Animated.timing(menuAnimation, { toValue: toMenu, duration: 300, useNativeDriver: true }),
      Animated.timing(screenOpacity, { toValue: toOpacity, duration: 300, useNativeDriver: true }),
    ]).start();
    setMenuOpen(!menuOpen);
  };

  const handleLogout = async () => {
    try {
      await clearStoredSessionToken();
      setIsLoggedIn(false);
      navigation.replace('Login');
    } catch (error) {
      console.error('Logout Error:', error);
    }
  };

  const groupedSections = activeFilter === 'all'
    ? getGamesGroupedByCategory()
    : [{ id: activeFilter, label: GAME_FILTER_OPTIONS.find((f) => f.id === activeFilter)?.label, games: getGamesByCategory(activeFilter) }];

  const renderGameCard = (game) => (
    <TouchableOpacity
      key={game.id}
      style={[ui.sectionCard, styles.gameCard]}
      onPress={() => navigation.navigate(game.route)}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`${game.title}. ${game.description}`}
    >
      <View style={styles.gameRow}>
        <GameIcon name={game.iconName} />
        <View style={styles.gameInfo}>
          <Text style={styles.gameEyebrow}>{game.tag}</Text>
          <Text style={styles.gameTitle}>{game.title}</Text>
          <Text style={styles.gameDescription}>{game.description}</Text>
          <Text style={styles.gameMeta}>About {game.estimatedMinutes} min</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={ui.screenTint}>
      <StatusBar backgroundColor={gameColors.canvas} barStyle="dark-content" />
      <Animated.View style={[ui.screenTint, { opacity: screenOpacity }]}>
        <View style={[ui.headerRow, styles.header]}>
          <TouchableOpacity onPress={toggleMenu} style={ui.iconButton}>
            <Text style={styles.menuIconText}>{MENU_ICON}</Text>
          </TouchableOpacity>
          <Text style={ui.headerTitleLg}>Activities</Text>
          <View style={ui.headerSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={[ui.sectionCard, styles.heroCard, styles.contentMaxWidth]}>
            <Text style={styles.heroTitle}>Brain activities</Text>
            <Text style={styles.heroSubtitle}>
              Calm, structured exercises designed for focus and recall.
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {GAME_FILTER_OPTIONS.map((filter) => {
              const isActive = activeFilter === filter.id;
              return (
                <TouchableOpacity
                  key={filter.id}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setActiveFilter(filter.id)}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {groupedSections.map((section) => (
            <View key={section.id} style={styles.contentMaxWidth}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.label}</Text>
              </View>
              <View style={styles.gamesContainer}>
                {section.games.map(renderGameCard)}
              </View>
            </View>
          ))}

          {!isLoggedIn ? (
            <View style={[ui.sectionCard, styles.noteCard, styles.contentMaxWidth]}>
              <Text style={styles.noteTitle}>Sign in to save progress</Text>
              <Text style={styles.noteText}>
                Activities work without an account. Signing in lets you track sessions in Progress.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </Animated.View>

      <Menu
        navigation={navigation}
        isOpen={menuOpen}
        closeMenu={toggleMenu}
        menuAnimation={menuAnimation}
        isLoggedIn={isLoggedIn}
        handleLogout={handleLogout}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: { backgroundColor: gameColors.canvas },
  menuIconText: { fontSize: 26, color: colors.textSecondary },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  contentMaxWidth: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
  heroCard: { marginTop: spacing.lg },
  heroTitle: { fontSize: 28, fontWeight: '800', color: colors.textPrimary },
  heroSubtitle: { marginTop: spacing.sm, fontSize: type.bodySm, color: colors.textMuted, lineHeight: 24 },
  filterRow: { paddingVertical: spacing.md, gap: spacing.sm },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginRight: spacing.sm,
  },
  filterChipActive: { backgroundColor: gameColors.accentSoft, borderColor: gameColors.borderFocus },
  filterChipText: { fontSize: type.bodySm, color: colors.textSecondary, fontWeight: '600' },
  filterChipTextActive: { color: gameColors.accentStrong },
  sectionHeader: { marginTop: spacing.lg, marginBottom: spacing.md },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: colors.textSecondary },
  gamesContainer: { marginBottom: spacing.sm },
  gameCard: { marginBottom: spacing.md, padding: spacing.lg },
  gameRow: { flexDirection: 'row', alignItems: 'flex-start' },
  gameInfo: { flex: 1, marginLeft: spacing.md },
  gameEyebrow: {
    fontSize: type.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: gameColors.accentStrong,
    marginBottom: spacing.xs,
  },
  gameTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.xs },
  gameDescription: { fontSize: type.bodySm, color: colors.textMuted, lineHeight: 20 },
  gameMeta: { marginTop: spacing.sm, fontSize: type.caption, color: colors.textMuted },
  noteCard: { marginTop: spacing.lg },
  noteTitle: { fontSize: 18, fontWeight: '700', color: colors.textSecondary, marginBottom: spacing.sm },
  noteText: { fontSize: type.bodySm, color: colors.textMuted, lineHeight: 22 },
});

export default GamesScreen;
