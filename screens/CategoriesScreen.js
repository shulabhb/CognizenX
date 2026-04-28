import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  StatusBar,
  Dimensions,
  useWindowDimensions,
  ActivityIndicator,
  TouchableWithoutFeedback
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Menu, { getMenuWidth } from './Menu'; // Import the Menu component
import { colors, radii, shadow, spacing } from '../styles/theme';
import { ui } from '../styles/ui';
import { API_BASE_URL, SESSION_TOKEN_KEY } from "../config/backend";

const { width, height } = Dimensions.get('window');

// Menu icons
const MENU_ICON = '≡';
const CLOSE_ICON = '✕';

// Category emojis mapping
const categoryEmojis = {
  politics: '🗳️',
  geography: '🗺️',
  history: '📚',
  religion: '🏛️',
 // mythology: '🏛️',
  generalknowledge: '🧠',
  entertainment: '🎬',
  sports: '🏏',
  'current affairs': '📰',
  default: '📱',
};

const CategoriesScreen = () => {
  const { width: screenWidth } = useWindowDimensions();
  const menuWidth = getMenuWidth(screenWidth);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [scaleValue] = useState(new Animated.Value(1));
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // New state for selected categories
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Animation for the menu
  const menuAnimation = useRef(new Animated.Value(-menuWidth)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  // Debug: helps confirm the running JS bundle has religion (not mythology).
  useEffect(() => {
    try {
      console.log('[CategoriesScreen] build check: categories=', categories.map((c) => c.name));
    } catch (e) {
      // no-op
    }
  }, []);

  // New animation values for notification
  const notificationSlide = useRef(new Animated.Value(-100)).current;
  const notificationOpacity = useRef(new Animated.Value(0)).current;

  const getSessionToken = async () => {
    const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    if (token) return token;

    // Backwards compatibility: migrate legacy key if it exists
    const legacyToken = await AsyncStorage.getItem('sessionToken');
    if (legacyToken) {
      await AsyncStorage.setItem(SESSION_TOKEN_KEY, legacyToken);
      await AsyncStorage.removeItem('sessionToken');
      return legacyToken;
    }

    return null;
  };

  const categories = [
    {
      name: 'politics',
      subDomains: ['National', 'North Indian', 'South Indian'],
      icon: 'newspaper-outline',
      colorStart: '#1e3c72',
      colorEnd: '#2a5298',
    },
    {
      name: 'geography',
      subDomains: ['States and Capitals', 'Rivers and Mountains', 'National Parks', 'Libraries and Statues'],
      icon: 'map-outline',
      colorStart: '#56ab2f',
      colorEnd: '#a8e063',
    },
    {
      name: 'history',
      subDomains: ['Ancient India', 'Medieval India', 'Modern India','Freedom Movement'],
      icon: 'book-outline',
      colorStart: '#ff7e5f',
      colorEnd: '#feb47b',
    },
    {
      name: 'religion',
      subDomains: ['Hindu', 'Islam', 'Christianity', 'Sikhism', 'Buddhism', 'Jainism'],
      icon: 'accessibility-outline',
      colorStart: '#614385',
      colorEnd: '#516395',
    },
    {
      name: 'generalKnowledge',
      subDomains: ['Economy', 'Festivals','Literature','Indian Literature','Science and Technology in India'],
      icon: 'accessibility-outline',
      colorStart: '#614385',
      colorEnd: '#516395',
    },
    {
      name: 'entertainment',
      subDomains: ['Bollywood Movies', 'Bollywood Actors', 'Bollywood Songs','Indian TV Shows'],
      icon: 'tv-outline',
      colorStart: '#ff4e50',
      colorEnd: '#f9d423',
    },
    {
      name: 'sports',
      subDomains: ['Cricket'],
      icon: 'tv-outline',
      colorStart: '#ff4e50',
      colorEnd: '#f9d423',
    },
    {
      name: 'current affairs',
      subDomains: ['Economic Affairs','Infrastructure','International Relations','Health and Environment'],
      icon: 'tv-outline',
      colorStart: '#ff4e50',
      colorEnd: '#f9d423',
    },
  ];

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

  useEffect(() => {
    if (!menuOpen) {
      menuAnimation.setValue(-menuWidth);
    }
  }, [menuWidth, menuOpen, menuAnimation]);

  // Check login status and fetch User ID
  useEffect(() => {
    const checkLoginAndFetchUserId = async () => {
      try {
        const sessionToken = await getSessionToken();
        if (!sessionToken) {
          // Not logged in, redirect to Home screen
          setIsLoggedIn(false);
          setLoading(false);
          Alert.alert(
            'Login Required', 
            'You need to be logged in to access categories.',
            [
              { 
                text: 'OK', 
                onPress: () => navigation.replace('Home')
              }
            ]
          );
          return;
        }
    
        setIsLoggedIn(true);

        // Fetch user ID since user is logged in.
        // Serverless DB reads can be briefly inconsistent after login; retry 401s a few times.
        const maxAttempts = 3;
        let response;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            response = await axios.get(`${API_BASE_URL}/api/auth/get-user-id`, {
              headers: {
                Authorization: `Bearer ${sessionToken.trim()}`,
              },
              timeout: 5000,
            });
            break;
          } catch (err) {
            const status = err.response?.status;
            if (status === 401 && attempt < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
              continue;
            }
            throw err;
          }
        }

        setUserId(response?.data?.userId || null);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user ID:', error.response?.data || error.message);
        console.error('Error response:', error.response?.data);

        setLoading(false);

        // Only clear tokens on confirmed auth failure.
        if (error.response?.status === 401) {
          await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
          await AsyncStorage.removeItem('sessionToken');
          setIsLoggedIn(false);

          const errorMessage =
            error.response?.data?.message ||
            'Your session has expired or is invalid. Please log in again.';

          Alert.alert('Authentication Required', errorMessage, [
            {
              text: 'OK',
              onPress: () => navigation.replace('Home'),
            },
          ]);
        } else {
          // Network/server error: keep token, but bail out of the screen.
          Alert.alert(
            'Unable to Load Categories',
            'Please check your connection and try again.',
            [
              {
                text: 'OK',
                onPress: () => navigation.replace('Home'),
              },
            ]
          );
        }
      }
    };
    
    checkLoginAndFetchUserId();
  }, [navigation]);

  // Log Activity
  const logActivity = async (category, subDomain) => {
    try {
      const sessionToken = await getSessionToken();

      if (!sessionToken) {
        console.error('No session token found');
        Alert.alert('Error', 'User is not logged in.');
        return;
      }
      await axios.post(
        `${API_BASE_URL}/api/log-activity`,
        // Backward compatibility: some deployed backends still validate `domain`.
        // Send both until all environments are migrated.
        { category, subDomain, domain: subDomain },
        {
          headers: {
            Authorization: `Bearer ${sessionToken.trim()}`,
          },
        }
      );
      console.log('Activity logged successfully');
    } catch (error) {
      console.error('Error logging activity:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to log activity.');
    }
  };

  // Handle Category Selection
  const handleCategorySelect = async (category, subDomain) => {
    if (!isLoggedIn) {
      Alert.alert('Login Required', 'You need to be logged in to select categories.');
      navigation.replace('Home');
      return;
    }
    
    if (!userId) {
      Alert.alert('Error', 'User ID not found. Please log in again.');
      navigation.replace('Login');
      return;
    }
    await logActivity(category, subDomain);
    navigation.navigate('Trivia', { category, subDomain });
  };

  // Button Animation
  const animateButtonPress = () => {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
      await AsyncStorage.removeItem('sessionToken');
      Alert.alert('Logout Successful', 'You have been logged out.');
      navigation.replace('Login');
    } catch (error) {
      console.error('Logout Error:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  // New function to handle selection of categories
  const handleSubdomainSelect = (category, subDomain) => {
    if (!isLoggedIn) {
      Alert.alert('Login Required', 'You need to be logged in to select categories.');
      navigation.replace('Home');
      return;
    }
    
    animateButtonPress();
    
    console.log(`Selection action: category=${category}, subDomain=${subDomain}`);
    
    // Check if this category/subdomain pair is already selected
    const alreadySelected = selectedCategories.some(
      selection => selection.category === category && selection.subDomain === subDomain
    );
    
    if (alreadySelected) {
      // Remove if already selected
      console.log(`Removing selection: ${category} - ${subDomain}`);
      setSelectedCategories(prev => 
        prev.filter(item => !(item.category === category && item.subDomain === subDomain))
      );
    } else {
      // Add if not selected
      console.log(`Adding selection: ${category} - ${subDomain}`);
      setSelectedCategories(prev => {
        const newSelections = [...prev, { category, subDomain }];
        console.log("Updated selections:", JSON.stringify(newSelections));
        return newSelections;
      });
    }
  };
  
  // Function to check if a category/subdomain is selected
  const isSelected = (category, subDomain) => {
    return selectedCategories.some(
      selection => selection.category === category && selection.subDomain === subDomain
    );
  };

  // Function to show notification
  const showNotification = (message) => {
    setSuccessMessage(message);
    
    // Animation sequence
    Animated.parallel([
      Animated.timing(notificationSlide, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(notificationOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Hide notification after 5 seconds
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(notificationSlide, {
          toValue: -100,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(notificationOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setSuccessMessage('');
      });
    }, 5000);
  };

  // New function to handle adding selected categories
  const handleAddCategories = async () => {
    if (selectedCategories.length === 0) {
      Alert.alert('No Categories Selected', 'Please select at least one category.');
      return;
    }
    
    console.log("About to add categories:", JSON.stringify(selectedCategories));
    
    // Store the selected categories to create the notification message
    const categoriesForMessage = [...selectedCategories];
    
    // Clear selections and hide "Add" button immediately
    setSelectedCategories([]);
    
    try {
      const sessionToken = await getSessionToken();
      
      if (!sessionToken) {
        console.error('No session token found');
        Alert.alert('Error', 'User is not logged in.');
        return;
      }
      
      // Log activity for each selected category
      for (const { category, subDomain } of categoriesForMessage) {
        await logActivity(category, subDomain);
      }
      
      // First, fetch current preferences
      const currentPrefsResponse = await axios.get(
        `${API_BASE_URL}/api/user-preferences`,
        {
          headers: { Authorization: `Bearer ${sessionToken.trim()}` },
        }
      );
      const currentPrefs = currentPrefsResponse.data.preferences || [];
      
      
      console.log("Current preferences from API:", JSON.stringify(currentPrefs));
      console.log("Adding new preferences:", JSON.stringify(categoriesForMessage));
      
      // Combine current and new preferences
      // Use a Set to track unique category-subDomain pairs to avoid duplicates
      const uniquePairs = new Set();
      const combinedPreferences = [];
      
      // Process current preferences first to keep existing selections
      currentPrefs.forEach(pref => {
        let category, subDomain;
        
        // Extract category and subDomain from various possible structures
        if (typeof pref === 'object') {
          if (pref.category && typeof pref.category === 'string') {
            category = pref.category;
            subDomain = pref.subDomain || pref.domain || pref.subdomain || pref.sub_domain;
          } else if (pref.category && typeof pref.category === 'object') {
            category = pref.category.category;
            subDomain = pref.subDomain || pref.domain || pref.subdomain || pref.sub_domain;
          } else {
            console.warn("Skipping unrecognized preference format:", pref);
            return;
          }
        } else {
          console.warn("Skipping non-object preference:", pref);
          return;
        }
        
        // Skip if category is missing or if subDomain is null/undefined/"General" 
        if (!category || !subDomain || subDomain === "General") {
          // NOTE: Some backends/older DB docs may return category-only prefs (no subDomain).
          // We silently skip these because the app requires a subDomain to quiz/log activity.
          console.log("Skipping incomplete or General-only preference:", JSON.stringify(pref));
          return;
        }
        
        const key = `${category}-${subDomain}`;
        console.log(`Processing existing preference: ${key}`);
        
        if (!uniquePairs.has(key)) {
          uniquePairs.add(key);
          // Store preferences in the normalized format
          combinedPreferences.push({
            category: category,
            subDomain: subDomain
          });
        }
      });
      
      // Add new preferences
      categoriesForMessage.forEach(item => {
        const key = `${item.category}-${item.subDomain}`;
        console.log(`Processing new preference: ${key}`);
        
        if (!uniquePairs.has(key)) {
          uniquePairs.add(key);
          combinedPreferences.push({
            category: item.category,
            subDomain: item.subDomain
          });
        }
      });
      
      console.log("Final combined preferences to send:", JSON.stringify(combinedPreferences));
      console.log("Selected categories:", JSON.stringify(categoriesForMessage));
      
      // Note: Activity is already logged above, no need to log again
      console.log("Categories added successfully!");
      
      // Create a more descriptive success message
      const categoryCounts = {};
      categoriesForMessage.forEach(({ category, subDomain }) => {
        if (!categoryCounts[category]) {
          categoryCounts[category] = [];
        }
        categoryCounts[category].push(subDomain);
      });
      
      // Format message to include category and subcategory details
      const categoryMessages = Object.entries(categoryCounts)
        .map(([category, subDomains]) => 
          `${category}: ${subDomains.join(', ')}`
        );
      
      // Create the main success message with counts
      let successMsg = categoriesForMessage.length === 1
        ? `Added 1 subcategory successfully!\n`
        : `Added ${categoriesForMessage.length} subcategories successfully!\n`;
      
      // Add detail about which categories and subcategories were added
      if (categoryMessages.length > 0) {
        successMsg += categoryMessages.join('\n');
      }
      
      console.log("Success message:", successMsg);
      
      // Show animated notification
      showNotification(successMsg);
      
    } catch (error) {
      console.error('Error adding categories:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error message:', error.message);
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        // Clear invalid token
        await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
        await AsyncStorage.removeItem('sessionToken');
        Alert.alert(
          'Authentication Required',
          'Your session has expired. Please log in again to add categories.',
          [
            {
              text: 'OK',
              onPress: () => navigation.replace('Home')
            }
          ]
        );
      } else {
        const errorMessage = error.response?.data?.message || 
                           'Failed to add categories. Please try again.';
        Alert.alert('Error', errorMessage);
      }
      
      // Restore selections on error so user can try again
      setSelectedCategories(categoriesForMessage);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.backgroundTint} barStyle="dark-content" />
      
      {/* Success Notification */}
      {successMessage ? (
        <Animated.View 
          style={[
            styles.notificationContainer,
            {
              transform: [{ translateY: notificationSlide }],
              opacity: notificationOpacity
            }
          ]}
        >
          <View style={styles.notificationContent}>
            <Text style={styles.notificationIcon}>✓</Text>
            <Text style={styles.notificationText}>{successMessage}</Text>
          </View>
        </Animated.View>
      ) : null}
      
      {/* Main Content */}
      <Animated.View style={[ui.screenTint, { opacity: screenOpacity }]}>
        {/* Header with Menu Icon */}
        <View style={[ui.headerRow, styles.header]}>
          <TouchableOpacity onPress={toggleMenu} style={ui.iconButton}>
            <Text style={styles.menuIconText}>{MENU_ICON}</Text>
          </TouchableOpacity>
          <Text style={ui.headerTitleLg}>Categories</Text>
          <View style={ui.headerSpacer} />
        </View>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {categories.map((category) => {
            // Count selected subdomains for this category
            const selectedCount = selectedCategories.filter(
              item => item.category === category.name
            ).length;
            
            return (
              <View key={category.name} style={ui.sectionCard}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryIconContainer}>
                    <Text style={styles.categoryEmoji}>
                      {categoryEmojis[category.name.toLowerCase()] || categoryEmojis.default}
                    </Text>
                  </View>
                  <View style={styles.categoryTitleContainer}>
                    <Text style={styles.categoryTitle}>{category.name}</Text>
                    {selectedCount > 0 && (
                      <Text style={styles.selectedCount}>
                        {selectedCount} selected
                      </Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.subdomainsContainer}>
                  {category.subDomains.map((subDomain) => (
                    <TouchableOpacity
                      key={subDomain}
                      style={[
                        ui.subdomainCard,
                        isSelected(category.name, subDomain) && styles.selectedSubdomainCard
                      ]}
                      onPress={() => handleSubdomainSelect(category.name, subDomain)}
                      activeOpacity={0.7}
                    >
                      <Text style={ui.subdomainText}>{subDomain}</Text>
                      {isSelected(category.name, subDomain) && (
                        <View style={styles.checkmarkContainer}>
                          <Text style={styles.checkmark}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })}
          
          {/* Add some padding at the bottom to account for the floating button */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
        
        {/* Add Categories Button */}
        {selectedCategories.length > 0 && (
          <View style={styles.addButtonContainer}>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddCategories}
              activeOpacity={0.8}
            >
              <Text style={styles.addButtonText}>
                Add ({selectedCategories.length}) {selectedCategories.length === 1 ? 'Category' : 'Categories'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
  container: {
    flex: 1,
    backgroundColor: colors.backgroundTint,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: colors.backgroundTint,
  },
  menuIconText: {
    fontSize: 26,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 30,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundTint,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.lg,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryTitleContainer: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  selectedCount: {
    fontSize: 12,
    color: colors.brandDark,
    marginTop: 2,
  },
  subdomainsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    zIndex: 999,
  },
  selectedSubdomainCard: {
    backgroundColor: colors.brandDark,
  },
  checkmarkContainer: {
    position: 'absolute',
    right: 8,
    top: 8,
  },
  checkmark: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  addButtonContainer: {
    position: 'absolute',
    bottom: spacing.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  addButton: {
    backgroundColor: colors.brand,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    elevation: 5,
    ...shadow({ offsetHeight: 2, opacity: 0.3, radius: 4, elevation: 5 }),
  },
  addButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  notificationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    padding: spacing.lg,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + spacing.lg : spacing.lg,
  },
  notificationContent: {
    backgroundColor: colors.brandDark,
    borderRadius: radii.md,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow({ offsetHeight: 4, opacity: 0.2, radius: 8, elevation: 5 }),
  },
  notificationIcon: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: 30,
    height: 30,
    borderRadius: 15,
    textAlign: 'center',
    lineHeight: 30,
  },
  notificationText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  bottomSpacer: {
    height: 100,
  },
});

export default CategoriesScreen;
