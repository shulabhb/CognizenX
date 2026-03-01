import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Alert,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, radii, shadow, spacing } from '../styles/theme';
import { ui } from '../styles/ui';

const { width, height } = Dimensions.get('window');

const PuzzlesGameScreen = () => {
  const navigation = useNavigation();
  const [selectedPuzzle, setSelectedPuzzle] = useState(null);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);

  const handleBackPress = () => {
    if (gameStarted) {
      Alert.alert(
        "Exit Puzzle",
        "Are you sure you want to leave? Your progress will be lost.",
        [
          { text: "Continue", style: "cancel" },
          { text: "Leave", style: "destructive", onPress: () => navigation.goBack() }
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const puzzles = [
    {
      id: 'memory',
      title: 'Memory Match',
      description: 'Match pairs of cards to test your memory',
      icon: '🧠',
      difficulty: 'Easy',
      color: colors.brandDark,
    },
    {
      id: 'pattern',
      title: 'Pattern Recognition',
      description: 'Watch and repeat the colored circle pattern',
      icon: '🔢',
      difficulty: 'Medium',
      color: colors.success,
    },
  ];

  const startPuzzle = (puzzleId) => {
    // Navigate to the implemented screens directly
    if (puzzleId === 'memory') {
      navigation.navigate('MemoryMatchGame');
      return;
    }
    if (puzzleId === 'pattern') {
      navigation.navigate('PatternGame');
      return;
    }

    // Fallback to local placeholder mode if we ever add non-implemented ones
    setSelectedPuzzle(puzzleId);
    setGameStarted(true);
    setScore(0);
  };

  const resetGame = () => {
    setSelectedPuzzle(null);
    setGameStarted(false);
    setScore(0);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy':
        return colors.success;
      case 'Medium':
        return colors.warning;
      case 'Hard':
        return colors.danger;
      default:
        return colors.textMuted;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.brandDark} barStyle="light-content" />
      
      {/* Header */}
      <View style={[ui.headerRow, styles.header]}>
        <TouchableOpacity onPress={handleBackPress} style={ui.iconButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={ui.headerTitleLight}>Puzzles</Text>
        <View style={ui.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {!gameStarted ? (
          <ScrollView style={styles.puzzlesContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.welcomeSection}>
              <Text style={styles.gameIcon}>🧩</Text>
              <Text style={styles.welcomeTitle}>Brain Puzzles</Text>
              <Text style={styles.welcomeDescription}>
                Choose a puzzle to exercise your mind and improve cognitive function
              </Text>
            </View>

            <View style={styles.puzzlesGrid}>
              {puzzles.map((puzzle) => (
                <TouchableOpacity
                  key={puzzle.id}
                  style={[styles.puzzleCard, { backgroundColor: puzzle.color }]}
                  onPress={() => startPuzzle(puzzle.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.puzzleIconContainer}>
                    <Text style={styles.puzzleIcon}>{puzzle.icon}</Text>
                  </View>
                  <View style={styles.puzzleInfo}>
                    <Text style={styles.puzzleTitle}>{puzzle.title}</Text>
                    <Text style={styles.puzzleDescription}>{puzzle.description}</Text>
                    <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(puzzle.difficulty) }]}>
                      <Text style={styles.difficultyText}>{puzzle.difficulty}</Text>
                    </View>
                  </View>
                  <View style={styles.playButton}>
                    <Text style={styles.playButtonText}>▶</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.gameArea}>
            <View style={styles.gameHeader}>
              <Text style={styles.gameTitle}>
                {puzzles.find(p => p.id === selectedPuzzle)?.title}
              </Text>
              <Text style={styles.scoreText}>Score: {score}</Text>
            </View>
            
            <View style={styles.gameBoard}>
              <Text style={styles.comingSoonText}>Puzzle Implementation Coming Soon!</Text>
              <Text style={styles.comingSoonSubtext}>
                The {puzzles.find(p => p.id === selectedPuzzle)?.title} will be implemented in the next update.
              </Text>
            </View>
            
            <View style={styles.gameControls}>
              <TouchableOpacity style={[ui.buttonPill, styles.resetButton]} onPress={resetGame}>
                <Text style={ui.buttonPillText}>Back to Puzzles</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.brandDark,
  },
  header: {
    backgroundColor: colors.brandDark,
  },
  backIcon: {
    fontSize: 24,
    color: colors.white,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    backgroundColor: colors.backgroundTint,
  },
  puzzlesContainer: {
    flex: 1,
    padding: spacing.xl,
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  gameIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  welcomeDescription: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: spacing.xl,
  },
  puzzlesGrid: {
    gap: 16,
  },
  puzzleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.xl,
    borderRadius: radii.xl,
    ...shadow({ offsetHeight: 4, opacity: 0.1, radius: 8, elevation: 4 }),
  },
  puzzleIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.lg,
  },
  puzzleIcon: {
    fontSize: 30,
  },
  puzzleInfo: {
    flex: 1,
  },
  puzzleTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.white,
    marginBottom: 4,
  },
  puzzleDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 20,
    marginBottom: 8,
  },
  difficultyBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: "600",
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
  gameArea: {
    flex: 1,
    padding: spacing.xl,
  },
  gameHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  gameTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textMuted,
  },
  gameBoard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    marginBottom: spacing.xl,
    justifyContent: "center",
    alignItems: "center",
    ...shadow({ offsetHeight: 2, opacity: 0.1, radius: 4, elevation: 2 }),
  },
  comingSoonText: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 8,
  },
  comingSoonSubtext: {
    fontSize: 14,
    color: colors.gray400,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
  gameControls: {
    alignItems: "center",
  },
  resetButton: {
    backgroundColor: colors.textMuted,
  },
});

export default PuzzlesGameScreen;
