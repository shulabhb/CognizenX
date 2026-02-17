import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  useWindowDimensions,
  StatusBar,
  SafeAreaView,
  TouchableWithoutFeedback
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Menu, { getMenuWidth } from './Menu';

import { colors, shadow, spacing } from '../styles/theme';
import { ui } from '../styles/ui';

const { width, height } = Dimensions.get('window');

// Menu icons
const MENU_ICON = '≡';

const GamesScreen = () => {
  const { width: screenWidth } = useWindowDimensions();
  const menuWidth = getMenuWidth(screenWidth);

  const navigation = useNavigation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(true); // You can add login check logic here
  
  // Animation for the menu
  const menuAnimation = useRef(new Animated.Value(-menuWidth)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (!menuOpen) {
      menuAnimation.setValue(-menuWidth);
    }
  }, [menuWidth, menuOpen, menuAnimation]);

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
      // Add logout logic here if needed
      navigation.replace("Home");
    } catch (error) {
      console.error('Logout Error:', error);
    }
  };

  const games = [
    {
      id: 'snake',
      title: 'Snake Game',
      description: 'Classic snake game with simple controls',
      icon: '🐍',
      color: '#10B981',
      gradientStart: '#10B981',
      gradientEnd: '#34D399',
    },
    {
      id: 'snakeTouch',
      title: 'Touch Snake',
      description: 'Touch and drag to control the snake (finger tracker)',
      icon: '👆',
      color: '#0EA5E9',
      gradientStart: '#0EA5E9',
      gradientEnd: '#38BDF8',
    },
    {
      id: 'puzzles',
      title: 'Puzzles',
      description: 'Brain-teasing puzzles for cognitive exercise',
      icon: '🧩',
      color: '#8B5CF6',
      gradientStart: '#8B5CF6',
      gradientEnd: '#A78BFA',
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

        {/* Games Content */}
        <View style={styles.content}>
          <Text style={styles.welcomeText}>Choose Your Game</Text>
          <Text style={styles.subtitleText}>Select a game to start playing and exercising your mind</Text>
          
          <View style={styles.gamesContainer}>
            {games.map((game) => (
              <TouchableOpacity
                key={game.id}
                style={[styles.gameCard, { backgroundColor: game.color }]}
                onPress={() => handleGamePress(game.id)}
                activeOpacity={0.8}
              >
                <View style={styles.gameIconContainer}>
                  <Text style={styles.gameIcon}>{game.icon}</Text>
                </View>
                <View style={styles.gameInfo}>
                  <Text style={styles.gameTitle}>{game.title}</Text>
                  <Text style={styles.gameDescription}>{game.description}</Text>
                </View>
                <View style={styles.playButton}>
                  <Text style={styles.playButtonText}>▶</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Coming Soon Section */}
          <View style={styles.comingSoonContainer}>
            <Text style={styles.comingSoonTitle}>More Games Coming Soon!</Text>
            <Text style={styles.comingSoonText}>
              We're working on adding more engaging games to help with cognitive exercises.
            </Text>
          </View>
        </View>
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
  },
  gamesContainer: {
    marginBottom: 40,
  },
  gameCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    ...shadow({ color: colors.black, offsetHeight: 4, opacity: 0.1, radius: 8, elevation: 4 }),
  },
  gameIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  gameIcon: {
    fontSize: 30,
  },
  gameInfo: {
    flex: 1,
  },
  gameTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.white,
    marginBottom: 4,
  },
  gameDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 20,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  playButtonText: {
    fontSize: 16,
    color: colors.white,
    fontWeight: "600",
  },
  comingSoonContainer: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 16,
    ...shadow({ color: colors.brand, offsetHeight: 2, opacity: 0.1, radius: 4, elevation: 2 }),
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});

export default GamesScreen;
