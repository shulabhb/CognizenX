import { colors, layout, shadow, spacing, type } from '../styles/theme';
import { ui } from '../styles/ui';
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
  Animated,
  Dimensions,
  useWindowDimensions,
  ScrollView,
  StatusBar,
  TouchableWithoutFeedback,
  Modal,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Menu, { getMenuWidth } from "./Menu"; // Import the Menu component
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL } from "../config/backend";

const { width, height } = Dimensions.get("window");

// Category emojis mapping
const categoryEmojis = {
  politics: "🗳️",
  geography: "🗺️",
  history: "📚",
  mythology: "🏛️",
  generalknowledge: "🧠",
  entertainment: "🎬",
  sports: "🏏",
  "current affairs": "📰",
  default: "📱",
};

// Default categories for anonymous users
const DEFAULT_CATEGORIES = {
  "General Knowledge": ["Trivia", "Facts"],
  "History": ["World History", "Ancient Civilizations"],
  "Geography": ["Countries", "Landmarks"],
  "Entertainment": ["Movies", "Music", "TV Shows"],
  "Sports": ["Cricket", "Football", "Olympics"],
  "Science": ["Biology", "Technology"]
};

// Menu icons (using emoji or text to avoid vector icon issues)
const MENU_ICON = "≡";
const CLOSE_ICON = "✕";
const PLUS_ICON = "➕";

const HomeScreen = ({ navigation }) => {
  const { width: screenWidth } = useWindowDimensions();
  const menuWidth = getMenuWidth(screenWidth);

  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginPromptVisible, setLoginPromptVisible] = useState(false);
  
  // Animation values
  const menuAnimation = useRef(new Animated.Value(-menuWidth)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!menuOpen) {
      menuAnimation.setValue(-menuWidth);
    }
  }, [menuWidth, menuOpen, menuAnimation]);

  // Process preferences into grouped format
  const processPreferences = (prefsArray) => {
    const grouped = {};
    
    if (!prefsArray || prefsArray.length === 0) {
      return grouped;
    }
    
    console.log("Processing preferences array:", JSON.stringify(prefsArray));
    console.log("Current API_BASE_URL:", API_BASE_URL);
    
    prefsArray.forEach((pref, index) => {
      try {
        // Extract category and subDomain - support multiple formats
        let category = null;
        let subDomain = null;
        
        console.log(`Processing preference ${index}:`, JSON.stringify(pref));
        
        // Case 1: {category: "string", subDomain: "string"}
        if (pref && typeof pref.category === 'string') {
          category = pref.category;
          subDomain = pref.subDomain;
          console.log(`  Case 1: category=${category}, subDomain=${subDomain}`);
        } 
        // Case 2: {category: {category: "string"}, subDomain: "string"}
        else if (pref && typeof pref.category === 'object' && pref.category && pref.category.category) {
          category = pref.category.category;
          subDomain = pref.subDomain;
          console.log(`  Case 2: category=${category}, subDomain=${subDomain}`);
        }
        // Case 3: Direct string (fallback)
        else if (typeof pref === 'string') {
          category = pref;
          console.log(`  Case 3: category=${category}, no subDomain`);
        }
        // Case 4: Other possible structures
        else if (pref && typeof pref === 'object') {
          // Try to extract any recognizable category/subdomain data
          const keys = Object.keys(pref);
          console.log(`  Case 4: object with keys: ${keys.join(', ')}`);
          
          if (keys.includes('category')) {
            if (typeof pref.category === 'string') {
              category = pref.category;
            } else if (typeof pref.category === 'object' && pref.category) {
              // Try to extract from nested object
              category = pref.category.category || pref.category.name || Object.values(pref.category)[0];
            }
          }
          
          if (keys.includes('subDomain') || keys.includes('subdomain') || keys.includes('sub_domain')) {
            subDomain = pref.subDomain || pref.subdomain || pref.sub_domain;
          }
          
          console.log(`  After Case 4 extraction: category=${category}, subDomain=${subDomain}`);
        }
        
        // If we found a valid category, add it to our grouped preferences
        if (category) {
          if (!grouped[category]) {
            grouped[category] = [];
          }
          
          // Add subDomain if present (can be "General" or any other value)
          if (subDomain) {
            // Add the subdomain if not already present
            if (!grouped[category].includes(subDomain)) {
              grouped[category].push(subDomain);
              console.log(`  Added subdomain to category: ${category} → ${subDomain}`);
            }
          }
        }
      } catch (err) {
        console.warn("Error processing preference:", err.message, pref);
      }
    });
    
    console.log("Final grouped preferences:", JSON.stringify(grouped));
    return grouped;
  };
  
  // Check login status (just checks if token exists)
  const checkLoginStatus = async () => {
    try {
      const sessionToken = await AsyncStorage.getItem("sessionToken");
      const loggedIn = !!sessionToken;
      setIsLoggedIn(loggedIn);
      return loggedIn;
    } catch (error) {
      console.error("Error checking login status:", error);
      setIsLoggedIn(false);
      return false;
    }
  };

  // Get grouped preferences from current state or use default for anonymous users
  const groupedPreferences = isLoggedIn ? processPreferences(preferences) : DEFAULT_CATEGORIES;

  const fetchUserPreferences = async () => {
    setLoading(true);
    let trimmedToken;

    try {
      const loggedIn = await checkLoginStatus();
      
      if (loggedIn) {
        // User is logged in, fetch their preferences
        const sessionToken = await AsyncStorage.getItem("sessionToken");
        
        // Double-check token still exists (might have been cleared)
        if (!sessionToken) {
          console.log("Token was cleared, skipping preferences fetch");
          setIsLoggedIn(false);
          setPreferences([]);
          setLoading(false);
          return;
        }
        
        // Trim token to remove any whitespace
        trimmedToken = sessionToken.trim();
        console.log("Fetching preferences with token:", trimmedToken.substring(0, 20) + "...");
        
        // Retry logic for initial fetch (in case of timing issues after login)
        let response;
        let retries = 2;
        let lastError;
        
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            if (attempt > 0) {
              // Wait before retry (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, 300 * attempt));
              console.log(`Retrying preferences fetch (attempt ${attempt + 1}/${retries + 1})...`);
            }
            
            response = await axios.get(`${API_BASE_URL}/api/user-preferences`, {
              headers: {
                Authorization: `Bearer ${trimmedToken}`,
              },
            });
            
            // Success - break out of retry loop
            break;
          } catch (error) {
            lastError = error;
            // If it's not a 401 or it's the last attempt, break
            if (error.response?.status !== 401 || attempt === retries) {
              throw error;
            }
            // Otherwise, continue to retry
            console.log(`401 error on attempt ${attempt + 1}, will retry...`);
          }
        }
        
        console.log("Raw API Response:", JSON.stringify(response.data));
        
        if (response.data && response.data.preferences) {
          const prefs = response.data.preferences;
          console.log("Preferences from API:", JSON.stringify(prefs));
          
          // Inspect all preferences in detail to help debug
          prefs.forEach((pref, i) => {
            console.log(`Preference ${i}:`, JSON.stringify(pref));
            console.log(`  Keys: ${Object.keys(pref).join(', ')}`);
            if (pref.category) {
              console.log(`  Category: ${typeof pref.category === 'string' ? 
                pref.category : JSON.stringify(pref.category)}`);
            }
            if (pref.subDomain) {
              console.log(`  SubDomain: ${pref.subDomain}`);
            }
          });
          
          // Accept ALL preferences from the API
          setPreferences(prefs);
          console.log("Set preferences from API, count:", prefs.length);
        } else {
          console.log("No preferences found in response");
          setPreferences([]);
        }
      } else {
        // User is not logged in, use default categories
        console.log("User not logged in, using default categories");
        setPreferences([]);
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error message:", error.message);
      
      // If it's a 401 (unauthorized), clear the invalid token
      if (error.response?.status === 401) {
        console.log("401 error - clearing invalid token");
        console.log(
          "Token that failed:",
          trimmedToken ? trimmedToken.substring(0, 20) + "..." : "no token"
        );
        await AsyncStorage.removeItem("sessionToken");
        setIsLoggedIn(false);
        setPreferences([]);
        setLoading(false); // Make sure loading is cleared
        // Show alert to user so they know what happened
        Alert.alert(
          "Authentication Error",
          "Your session could not be verified. Please log in again.",
          [{ text: "OK" }]
        );
        return;
      }
      
      // For other errors, still allow user to use app
      if (isLoggedIn) {
        console.log("Non-401 error, allowing user to continue with default categories");
      }
      setPreferences([]);
    } finally {
      // Always clear loading state
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("sessionToken");
      setIsLoggedIn(false);
      Alert.alert("Logout Successful", "You have been logged out.");
      // Stay on the same screen but show default categories
      fetchUserPreferences();
    } catch (error) {
      console.error("Logout Error:", error);
      Alert.alert("Error", "Failed to log out. Please try again.");
    }
  };

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

  // Replace useEffect with useFocusEffect to refresh whenever the screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log("HomeScreen focused - refreshing preferences");
      fetchUserPreferences();
      return () => {
        // Clean up if needed
      };
    }, [])
  );

  // Show login prompt when an account-required action is attempted
  const showLoginPrompt = () => {
    setLoginPromptVisible(true);
  };

  // Group preferences by category
  const renderCategorySections = () => {
    if (Object.keys(groupedPreferences).length === 0) {
      console.log("No preferences available to render");
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>😕</Text>
          <Text style={styles.emptyStateText}>
            No categories available. {isLoggedIn ? "Start exploring!" : "Please log in to customize categories."}
          </Text>
        </View>
      );
    }

    // Log the structure of grouped preferences in a clearer format
    console.log("Grouped Preferences Structure at render time:");
    Object.entries(groupedPreferences).forEach(([category, subdomains]) => {
      console.log(`Category: ${category}`);
      console.log(`  Subdomains (${subdomains?.length || 0}): ${subdomains && subdomains.length ? subdomains.join(', ') : 'None'}`);
    });
    
    // Render the categories
    return Object.entries(groupedPreferences).map(([category, subDomains]) => {
      const uniqueKey = `category-${category}`;
      console.log(`Rendering category: ${category} with ${subDomains?.length || 0} subdomains: ${subDomains?.join(', ') || 'none'}`);
      
      // Handle lowercase category names for emoji mapping
      const categoryLower = category.toLowerCase();
      const emoji = categoryEmojis[categoryLower] || categoryEmojis.default;
      
      return (
        <View key={uniqueKey} style={ui.sectionCard}>
          <View style={styles.categoryHeader}>
            <View style={styles.categoryIconContainer}>
              <Text style={styles.categoryEmoji}>{emoji}</Text>
            </View>
            <Text style={styles.categoryTitle}>{category}</Text>
          </View>
          
          {/* Start Quiz Button - moved below category name */}
          <TouchableOpacity
            style={styles.categoryButton}
            onPress={() => {
              if (isLoggedIn) {
                console.log(`Starting quiz for category: ${category}`);
                // Use first subDomain if available, otherwise just category
                const firstSubDomain = subDomains && subDomains.length > 0 ? subDomains[0] : null;
                navigation.navigate("RandomQuestionsScreen", {
                  categories: [category],
                  subDomain: firstSubDomain, // Pass first subDomain if available
                });
              } else {
                showLoginPrompt();
              }
            }}
          >
            <Text style={styles.categoryButtonText}>Start Quiz</Text>
          </TouchableOpacity>
          
          {/* Display subdomains if present */}
          {subDomains && subDomains.length > 0 ? (
            <View style={styles.subdomainContainer}>
              <Text style={styles.subdomainLabel}>Subdomains:</Text>
              <View style={styles.subdomainList}>
                {subDomains.map((subdomain, index) => (
                  <TouchableOpacity
                    key={`${category}-${subdomain}-${index}`}
                    style={styles.subdomainItem}
                    onPress={() => {
                      if (isLoggedIn) {
                        console.log(`Starting quiz for ${category} - ${subdomain}`);
                        navigation.navigate("RandomQuestionsScreen", {
                          categories: [category],
                          subDomain: subdomain
                        });
                      } else {
                        showLoginPrompt();
                      }
                    }}
                  >
                    <Text style={styles.subdomainText}>{subdomain}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.subdomainContainer}>
              <Text style={styles.noSubdomainsText}>No specific subdomains selected</Text>
            </View>
          )}
        </View>
      );
    });
  };

  const handleQuizAll = () => {
    if (!isLoggedIn) {
      showLoginPrompt();
      return;
    }
    
    // Check if there are any categories available
    if (Object.keys(groupedPreferences).length === 0) {
      Alert.alert("No Categories", "Please add some categories first.");
      return;
    }
    
    // Use the category names from grouped preferences
    const categories = Object.keys(groupedPreferences);
    console.log("Starting quiz with all categories:", categories);
    
    navigation.navigate("RandomQuestionsScreen", {
      categories: categories,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={ui.screenTint}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={ui.headerTitleLg}>CognizenX</Text>
          <View style={ui.headerSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Explore Section */}
          <View style={[styles.sectionHeader, styles.contentMaxWidth]}>
            <Text style={styles.sectionTitle}>Explore</Text>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={handleQuizAll}
            >
              <Text style={styles.viewAllText}>Random Quiz</Text>
            </TouchableOpacity>
          </View>
          
          {/* Categories Sections */}
          {renderCategorySections()}
          
          {/* Add More Categories Button */}
          <TouchableOpacity
            style={styles.addMoreButton}
            onPress={() => {
              if (isLoggedIn) {
                navigation.navigate("Categories");
              } else {
                showLoginPrompt();
              }
            }}
          >
            <Text style={styles.addMoreButtonIcon}>{PLUS_ICON}</Text>
            <Text style={styles.addMoreText}>Add More Categories</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      {/* Login Prompt Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={loginPromptVisible}
        onRequestClose={() => setLoginPromptVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setLoginPromptVisible(false)}>
          <View style={ui.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={ui.modalContent}>
                <Text style={styles.modalTitle}>Login Required</Text>
                <Text style={styles.modalText}>
                  You need to be logged in to access this feature.
                </Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.loginButton]}
                    onPress={() => {
                      setLoginPromptVisible(false);
                      navigation.navigate("Login");
                    }}
                  >
                    <Text style={styles.loginButtonText}>Login</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.signupButton]}
                    onPress={() => {
                      setLoginPromptVisible(false);
                      navigation.navigate("SignUp");
                    }}
                  >
                    <Text style={styles.signupButtonText}>Sign Up</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setLoginPromptVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Drawer Menu */}
      <Menu 
        navigation={navigation}
        isOpen={menuOpen}
        closeMenu={toggleMenu}
        menuAnimation={menuAnimation}
        isLoggedIn={isLoggedIn}
        handleLogout={handleLogout}
      />
      
      {menuOpen && (
        <TouchableWithoutFeedback onPress={toggleMenu}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 30,
  },
  contentMaxWidth: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  viewAllButton: {
    backgroundColor: colors.brand,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewAllText: {
    color: colors.white,
    fontSize: type.bodySm,
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    marginTop: 20,
  },
  emptyEmoji: {
    fontSize: 50,
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: type.body,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 24,
  },
  addMoreButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    ...shadow({ color: colors.brand, offsetHeight: 4, opacity: 0.1, radius: 8, elevation: 2 }),
  },
  addMoreButtonIcon: {
    fontSize: 20,
    marginRight: 10,
    color: colors.brand,
  },
  addMoreText: {
    fontSize: type.button,
    fontWeight: "600",
    color: colors.brand,
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
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundTint,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  categoryButton: {
    backgroundColor: colors.brand,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  categoryButtonText: {
    color: colors.white,
    fontSize: type.bodySm,
    fontWeight: "500",
  },
  subdomainContainer: {
    marginTop: 16,
  },
  subdomainLabel: {
    fontSize: type.body,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  subdomainList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  subdomainItem: {
    backgroundColor: colors.brandTint,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    margin: 6,
    minWidth: "45%",
    borderWidth: 1,
    borderColor: colors.brandBorder,
    ...shadow({ color: colors.brandShadow, offsetHeight: 2, opacity: 0.2, radius: 3, elevation: 2 }),
  },
  subdomainText: {
    color: '#7C3AED',
    fontSize: type.bodySm,
    fontWeight: "600",
    textAlign: "center",
  },
  noSubdomainsText: {
    color: colors.textMuted,
    fontSize: type.bodySm,
    fontWeight: "500",
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 12,
  },
  modalText: {
    fontSize: type.body,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 6,
  },
  loginButton: {
    backgroundColor: colors.brand,
  },
  signupButton: {
    backgroundColor: colors.brandTint,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  loginButtonText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: type.button,
  },
  signupButtonText: {
    color: colors.brand,
    fontWeight: "600",
    fontSize: type.button,
  },
  cancelButton: {
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: "#6B7280",
    color: colors.textMuted,
    fontSize: type.bodySm,
  },
});

export default HomeScreen;
