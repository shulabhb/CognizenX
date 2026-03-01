import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, radii, shadow, spacing } from '../styles/theme';
import { ui } from '../styles/ui';

const { width, height } = Dimensions.get('window');

const PatternGame = () => {
  const navigation = useNavigation();
  const [currentPattern, setCurrentPattern] = useState([]);
  const [userSequence, setUserSequence] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [showingPattern, setShowingPattern] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);

  // Simple, dementia-friendly patterns
  const patternOptions = [
    { id: 1, symbol: '🔴', color: colors.danger, name: 'Red Circle' },
    { id: 2, symbol: '🔵', color: colors.blue500, name: 'Blue Circle' },
    { id: 3, symbol: '🟢', color: colors.success, name: 'Green Circle' },
    { id: 4, symbol: '🟡', color: colors.warning, name: 'Yellow Circle' },
    { id: 5, symbol: '🟣', color: colors.brandDark, name: 'Purple Circle' },
    { id: 6, symbol: '🟠', color: '#F97316', name: 'Orange Circle' },
  ];

  const generatePattern = useCallback((length) => {
    const pattern = [];
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * patternOptions.length);
      pattern.push(patternOptions[randomIndex]);
    }
    return pattern;
  }, []);

  const initializeGame = useCallback(() => {
    const newPattern = generatePattern(3); // Start with 3 items
    setCurrentPattern(newPattern);
    setUserSequence([]);
    setLevel(1);
    setScore(0);
    setGameStarted(true);
    setGameCompleted(false);
    showPattern(newPattern);
  }, [generatePattern]);

  const showPattern = (pattern) => {
    setShowingPattern(true);
    // Pattern will be shown for 1.5 seconds per item (minimum 3 seconds total)
    const displayTime = Math.max(pattern.length * 1500, 3000);
    setTimeout(() => {
      setShowingPattern(false);
    }, displayTime);
  };

  const handlePatternItemPress = (item) => {
    if (showingPattern) return;

    const newUserSequence = [...userSequence, item];
    setUserSequence(newUserSequence);

    // Check if the sequence is correct so far
    const currentIndex = newUserSequence.length - 1;
    if (newUserSequence[currentIndex].id !== currentPattern[currentIndex].id) {
      // Wrong sequence
      Alert.alert(
        '❌ Try Again',
        'That\'s not quite right. Watch the pattern again and try to remember the sequence.',
        [
          { text: 'Watch Again', onPress: () => {
            setUserSequence([]);
            showPattern(currentPattern);
          }},
          { text: 'New Pattern', onPress: initializeGame }
        ]
      );
      return;
    }

    // Check if sequence is complete
    if (newUserSequence.length === currentPattern.length) {
      // Correct sequence!
      const newScore = score + (level * 10);
      setScore(newScore);
      
      if (level >= 10) {
        // Game mastered - all 10 levels completed!
        setGameCompleted(true);
        Alert.alert(
          '🏆 Master Achieved!',
          `Congratulations! You've mastered the pattern recognition game by completing all 10 levels! Final score: ${newScore}`,
          [
            { text: 'Play Again', onPress: initializeGame },
            { text: 'Back to Puzzles', onPress: () => navigation.goBack() }
          ]
        );
      } else {
        // Next level
        const nextLevel = level + 1;
        const newPattern = generatePattern(3 + nextLevel - 1); // Increase pattern length
        setLevel(nextLevel);
        setCurrentPattern(newPattern);
        setUserSequence([]);
        
        setTimeout(() => {
          Alert.alert(
            '✅ Correct!',
            `Level ${nextLevel}! Watch the new pattern.`,
            [{ text: 'Continue', onPress: () => showPattern(newPattern) }]
          );
        }, 500);
      }
    }
  };

  const renderPatternDisplay = () => {
    if (!showingPattern) return null;

    return (
      <View style={styles.patternDisplay}>
        <Text style={styles.patternTitle}>Watch the Pattern:</Text>
        <View style={styles.patternSequence}>
          {currentPattern.map((item, index) => (
            <View
              key={index}
              style={[
                styles.patternItem,
                { backgroundColor: item.color },
                { animationDelay: `${index * 1500}ms` }
              ]}
            >
              <Text style={styles.patternSymbol}>{item.symbol}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderUserSequence = () => {
    return (
      <View style={styles.userSequenceContainer}>
        <Text style={styles.userSequenceTitle}>Your Sequence:</Text>
        <View style={styles.userSequence}>
          {userSequence.map((item, index) => (
            <View
              key={index}
              style={[
                styles.userSequenceItem,
                { backgroundColor: item.color }
              ]}
            >
              <Text style={styles.userSequenceSymbol}>{item.symbol}</Text>
            </View>
          ))}
          {Array.from({ length: currentPattern.length - userSequence.length }).map((_, index) => (
            <View
              key={`empty-${index}`}
              style={styles.userSequenceItemEmpty}
            >
              <Text style={styles.userSequenceSymbol}>?</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const handleBackPress = () => {
    if (gameStarted) {
      Alert.alert(
        "Exit Game",
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.success} barStyle="light-content" />
      
      {/* Header */}
      <View style={[ui.headerRow, styles.header]}>
        <TouchableOpacity onPress={handleBackPress} style={ui.iconButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={ui.headerTitleLight}>Pattern Recognition</Text>
        <View style={ui.headerSpacer} />
      </View>

      {/* Game Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Level</Text>
          <Text style={styles.statValue}>{level}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Score</Text>
          <Text style={styles.statValue}>{score}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Pattern Length</Text>
          <Text style={styles.statValue}>{currentPattern.length}</Text>
        </View>
      </View>

      {/* Game Area */}
      <View style={styles.gameContainer}>
        {!gameStarted ? (
          <View style={styles.startScreen}>
            <Text style={styles.gameIcon}>🔍</Text>
            <Text style={styles.gameTitle}>Pattern Recognition</Text>
            <Text style={styles.gameDescription}>
              Watch the pattern of colored circles, then tap them in the same order.
              Complete all 10 levels to master the game!
            </Text>
            <TouchableOpacity style={[ui.buttonPillLg, styles.startButton]} onPress={initializeGame}>
              <Text style={ui.buttonPillLgText}>Start Game</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.gameBoard}>
            {renderPatternDisplay()}
            {renderUserSequence()}
            
            {!showingPattern && (
              <View style={styles.patternOptions}>
                <Text style={styles.instructionsText}>
                  Tap the circles in the same order as the pattern.{'\n'}
                  Long patterns will wrap to multiple rows.
                </Text>
                <View style={styles.optionsGrid}>
                  {patternOptions.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.optionButton,
                        { backgroundColor: option.color }
                      ]}
                      onPress={() => handlePatternItemPress(option)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.optionSymbol}>{option.symbol}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.success,
  },
  header: {
    backgroundColor: colors.success,
  },
  backIcon: {
    fontSize: 24,
    color: colors.white,
    fontWeight: "600",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: spacing.xl,
    paddingVertical: 15,
    backgroundColor: colors.successDark,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: colors.successTextLight,
    fontWeight: "500",
  },
  statValue: {
    fontSize: 18,
    color: colors.white,
    fontWeight: "700",
    marginTop: 2,
  },
  gameContainer: {
    flex: 1,
    backgroundColor: colors.successBg,
    padding: spacing.xl,
  },
  startScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  gameIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  gameTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.successTextDark,
    marginBottom: 16,
  },
  gameDescription: {
    fontSize: 16,
    color: colors.slate500,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
    paddingHorizontal: spacing.xl,
  },
  startButton: {
    backgroundColor: colors.success,
  },
  gameBoard: {
    flex: 1,
  },
  patternDisplay: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: 20,
    alignItems: "center",
    ...shadow({ offsetHeight: 2, opacity: 0.1, radius: 4, elevation: 2 }),
    minHeight: 120, // Ensure enough space for wrapping
  },
  patternTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.successTextDark,
    marginBottom: 16,
  },
  patternSequence: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    maxWidth: width - 80, // Leave some margin on sides
  },
  patternItem: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    ...shadow({ offsetHeight: 2, opacity: 0.2, radius: 4, elevation: 3 }),
    margin: 5, // Add some margin for better spacing when wrapping
  },
  patternSymbol: {
    fontSize: 20,
  },
  userSequenceContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: 20,
    alignItems: "center",
    ...shadow({ offsetHeight: 2, opacity: 0.1, radius: 4, elevation: 2 }),
    minHeight: 100, // Ensure enough space for wrapping user sequence
  },
  userSequenceTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.successTextDark,
    marginBottom: 16,
  },
  userSequence: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    maxWidth: width - 80, // Same as pattern sequence for consistency
  },
  userSequenceItem: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    ...shadow({ offsetHeight: 2, opacity: 0.2, radius: 4, elevation: 3 }),
    margin: 5, // Add margin for better spacing when wrapping
  },
  userSequenceItemEmpty: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.gray200,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.gray300,
    borderStyle: "dashed",
    margin: 5, // Add margin for consistency with other items
  },
  userSequenceSymbol: {
    fontSize: 20,
  },
  patternOptions: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  instructionsText: {
    fontSize: 16,
    color: colors.successTextDark,
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "500",
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 15,
  },
  optionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    ...shadow({ offsetHeight: 4, opacity: 0.2, radius: 8, elevation: 4 }),
  },
  optionSymbol: {
    fontSize: 28,
  },
});

export default PatternGame;
