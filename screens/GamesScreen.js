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

import { colors, layout, radii, shadow, spacing, type } from '../styles/theme';
import { ui } from '../styles/ui';
import { clearStoredSessionToken, getStoredSessionToken } from '../utils/session';

// Menu icons
const MENU_ICON = '≡';

const GamesScreen = () => {
  const { width: screenWidth } = useWindowDimensions();
  const menuWidth = getMenuWidth(screenWidth);

  const navigation = useNavigation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Animation for the menu
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
        if (isActive) {
          setIsLoggedIn(!!sessionToken);
        }
      };

      refreshAuthState();

      return () => {
        isActive = false;
      };
    }, [])
  );

  // Toggle menu function
  const toggleMenu = () => {
    if (menuOpen) {
      // Close menu
      Animated.parallel([
        Animated.timing(menuAnimation, {
          toValue: -menuWidth,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(screenOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Open menu
      Animated.parallel([
        Animated.timing(menuAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(screenOpacity, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
    setMenuOpen(!menuOpen);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await clearStoredSessionToken();
      setIsLoggedIn(false);
      navigation.replace("Login");
    } catch (error) {
      console.error('Logout Error:', error);
    }
  };

  const games = [
    {
      id: 'snake',
      title: 'Snake Game',
      description: 'Classic snake with clear controls and a steady pace.',
      icon: '🐍',
      eyebrow: 'Classic',
      accentBg: colors.successBg,
      accentText: colors.successDark,
      tag: 'Simple controls',
    },
    {
      id: 'snakeTouch',
      title: 'Touch Snake',
      description: 'Guide the snake with touch and drag gestures.',
      icon: '👆',
      eyebrow: 'Interactive',
      accentBg: colors.blue50,
      accentText: colors.blue600,
      tag: 'Touch play',
    },
    {
      id: 'puzzles',
      title: 'Puzzles',
      description: 'Short puzzle play for memory and focus practice.',
      icon: '🧩',
      eyebrow: 'Focus',
      accentBg: colors.brandTint,
      accentText: colors.brandDark,
      tag: 'Brain exercise',
    },
  ];

  const handleGamePress = (gameId) => {
    if (gameId === 'snake') {
      // Navigate to Snake game
      navigation.navigate('SnakeGame');
    } else if (gameId === 'snakeTouch') {
      // Navigate to Touch-controlled Snake game
      navigation.navigate('SnakeTouch');
    } else if (gameId === 'puzzles') {
      // Navigate to Puzzles game
      navigation.navigate('PuzzlesGame');
    }
  };

  return (
    <SafeAreaView style={ui.screenTint}>
      <StatusBar backgroundColor={colors.backgroundTint} barStyle="dark-content" />
      
      {/* Main Content */}
      <Animated.View style={[ui.screenTint, { opacity: screenOpacity }]}>
        {/* Header with Menu Icon */}
        <View style={[ui.headerRow, styles.header]}>
          <TouchableOpacity onPress={toggleMenu} style={ui.iconButton}>
            <Text style={styles.menuIconText}>{MENU_ICON}</Text>
          </TouchableOpacity>
          <Text style={ui.headerTitleLg}>Games</Text>
          <View style={ui.headerSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={[ui.sectionCard, styles.heroCard, styles.contentMaxWidth]}>
            <Text style={styles.heroTitle}>Choose a game</Text>
            <Text style={styles.heroSubtitle}>
              Pick one simple activity and start when you are ready.
            </Text>
          </View>

          <View style={[styles.sectionHeader, styles.contentMaxWidth]}>
            <Text style={styles.sectionTitle}>Available games</Text>
          </View>

          <View style={styles.gamesContainer}>
            {games.map((game) => (
              <TouchableOpacity
                key={game.id}
                style={[ui.sectionCard, styles.gameCard]}
                onPress={() => handleGamePress(game.id)}
                activeOpacity={0.9}
              >
                <View style={styles.gameRow}>
                  <View style={[styles.gameIconContainer, { backgroundColor: game.accentBg }]}>
                    <Text style={styles.gameIcon}>{game.icon}</Text>
                  </View>

                  <View style={styles.gameInfo}>
                    <Text style={[styles.gameEyebrow, { color: game.accentText }]}>{game.eyebrow}</Text>
                    <Text style={styles.gameTitle}>{game.title}</Text>
                    <Text style={styles.gameDescription}>{game.description}</Text>
                  </View>
                </View>

                <View style={styles.gameFooter}>
                  <View style={[styles.gameTag, { backgroundColor: game.accentBg }]}>
                    <Text style={[styles.gameTagText, { color: game.accentText }]}>{game.tag}</Text>
                  </View>

                  <View style={styles.playButton}>
                    <Text style={styles.playButtonText}>Open</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[ui.sectionCard, styles.comingSoonContainer, styles.contentMaxWidth]}>
            <Text style={styles.comingSoonTitle}>More games coming soon</Text>
            <Text style={styles.comingSoonText}>
              We are adding more quiet, easy-to-follow activities over time.
            </Text>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Drawer Menu */}
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
  header: {
    backgroundColor: colors.backgroundTint,
  },
  menuIconText: {
    fontSize: 26,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  contentMaxWidth: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  heroCard: {
    marginTop: spacing.lg,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'left',
  },
  heroSubtitle: {
    marginTop: spacing.sm,
    fontSize: type.bodySm,
    color: colors.textMuted,
    textAlign: 'left',
    lineHeight: 24,
  },
  sectionHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  gamesContainer: {
    marginBottom: spacing.lg,
  },
  gameCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gameIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  gameIcon: {
    fontSize: 30,
  },
  gameInfo: {
    flex: 1,
  },
  gameEyebrow: {
    fontSize: type.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.xs,
  },
  gameTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  gameDescription: {
    fontSize: type.bodySm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  gameFooter: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  gameTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  gameTagText: {
    fontSize: type.caption,
    fontWeight: '700',
  },
  playButton: {
    minWidth: 88,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.brandTint,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    alignItems: 'center',
  },
  playButtonText: {
    fontSize: type.bodySm,
    color: colors.brandDark,
    fontWeight: '700',
  },
  comingSoonContainer: {
    marginBottom: spacing.md,
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  comingSoonText: {
    fontSize: type.bodySm,
    color: colors.textMuted,
    lineHeight: 22,
  },
});

export default GamesScreen;
