import { colors, layout, radii, shadow, spacing, type } from '../styles/theme';
import { ui } from '../styles/ui';
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  useWindowDimensions,
  ScrollView,
  StatusBar,
  TouchableWithoutFeedback,
  Modal,
} from "react-native";
import axios from "axios";
import Menu, { getMenuWidth } from "./Menu"; // Import the Menu component
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { API_BASE_URL } from "../config/backend";
import { clearStoredSessionToken, getStoredSessionToken } from "../utils/session";

// Category emojis mapping
const categoryEmojis = {
  politics: "🗳️",
  geography: "🗺️",
  history: "📚",
  religion: "🏛️",
  // mythology: "🏛️",
  generalknowledge: "🧠",
  entertainment: "🎬",
  sports: "🏏",
  "current affairs": "📰",
  default: "📱",
};

const normalisePreferenceEntry = (pref) => {
  let category = null;
  let subDomain = null;

  if (pref && typeof pref.category === "string") {
    category = pref.category;
    subDomain = pref.subDomain || pref.domain || pref.subdomain || pref.sub_domain;
  } else if (pref && typeof pref.category === "object" && pref.category && pref.category.category) {
    category = pref.category.category;
    subDomain = pref.subDomain || pref.domain || pref.subdomain || pref.sub_domain;
  } else if (pref && typeof pref === "object") {
    const keys = Object.keys(pref);

    if (keys.includes("category")) {
      if (typeof pref.category === "string") {
        category = pref.category;
      } else if (typeof pref.category === "object" && pref.category) {
        category = pref.category.category || pref.category.name || Object.values(pref.category)[0];
      }
    }

    if (keys.includes("subDomain") || keys.includes("subdomain") || keys.includes("sub_domain")) {
      subDomain = pref.subDomain || pref.subdomain || pref.sub_domain;
    }

    if (!subDomain && keys.includes("domain")) {
      subDomain = pref.domain;
    }
  }

  if (!category || !subDomain) {
    return null;
  }

  return {
    category: String(category).trim(),
    subDomain: String(subDomain).trim(),
  };
};

// Menu icons (using emoji or text to avoid vector icon issues)
const MENU_ICON = "≡";
const HomeScreen = ({ navigation }) => {
  const { width: screenWidth } = useWindowDimensions();
  const menuWidth = getMenuWidth(screenWidth);

  const [preferences, setPreferences] = useState([]);
  const [userName, setUserName] = useState("");
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
        console.log(`Processing preference ${index}:`, JSON.stringify(pref));
        const normalized = normalisePreferenceEntry(pref);
        const category = normalized?.category;
        const subDomain = normalized?.subDomain;
        
        // Only include categories that have at least one usable subDomain.
        // Category-only prefs are not actionable (cannot quiz/log activity without subDomain).
        if (category && subDomain) {
          if (!grouped[category]) {
            grouped[category] = [];
          }

          if (!grouped[category].includes(subDomain)) {
            grouped[category].push(subDomain);
            console.log(`  Added subdomain to category: ${category} → ${subDomain}`);
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
      const sessionToken = await getStoredSessionToken();
      const loggedIn = !!sessionToken;
      setIsLoggedIn(loggedIn);
      return loggedIn;
    } catch (error) {
      console.error("Error checking login status:", error);
      setIsLoggedIn(false);
      return false;
    }
  };

  const getDisplayName = (user) => {
    const rawName = String(user?.name || "").trim();
    if (rawName) {
      return rawName.split(" ")[0];
    }

    const email = String(user?.email || "").trim();
    if (email.includes("@")) {
      return email.split("@")[0];
    }

    return "";
  };

  // Get grouped preferences from current state
  const savedGroupedPreferences = processPreferences(preferences);
  const groupedPreferences = savedGroupedPreferences;
  const savedSelections = preferences.reduce((acc, pref) => {
    const normalized = normalisePreferenceEntry(pref);
    if (!normalized) {
      return acc;
    }

    const exists = acc.some(
      (item) => item.category === normalized.category && item.subDomain === normalized.subDomain
    );
    if (!exists) {
      acc.push(normalized);
    }
    return acc;
  }, []);

  const fetchUserPreferences = async () => {
    setLoading(true);
    let trimmedToken;

    try {
      const loggedIn = await checkLoginStatus();
      
      if (loggedIn) {
        // User is logged in, fetch their preferences
        const sessionToken = await getStoredSessionToken();
        
        // Double-check token still exists (might have been cleared)
        if (!sessionToken) {
          console.log("Token was cleared, skipping preferences fetch");
          setIsLoggedIn(false);
          setPreferences([]);
          setUserName("");
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

        try {
          const userResponse = await axios.get(`${API_BASE_URL}/api/users/me`, {
            headers: {
              Authorization: `Bearer ${trimmedToken}`,
            },
          });
          setUserName(getDisplayName(userResponse?.data?.user));
        } catch (profileError) {
          console.error("Error fetching user profile:", profileError);
          setUserName("");
        }
      } else {
        console.log("User not logged in, redirecting to login");
        setPreferences([]);
        setUserName("");
        navigation.replace("Login");
        return;
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
        await clearStoredSessionToken();
        setIsLoggedIn(false);
        setPreferences([]);
        setUserName("");
        setLoading(false); // Make sure loading is cleared
        // Show alert to user so they know what happened
        Alert.alert(
          "Authentication Error",
          "Your session could not be verified. Please log in again.",
          [{ text: "OK", onPress: () => navigation.replace("Login") }]
        );
        return;
      }
      
      // For other errors, still allow user to use app
      if (isLoggedIn) {
        console.log("Non-401 error, allowing user to continue with default categories");
      }
      setPreferences([]);
      setUserName("");
    } finally {
      // Always clear loading state
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await clearStoredSessionToken();
      setIsLoggedIn(false);
      Alert.alert("Logout Successful", "You have been logged out.");
      navigation.replace("Login");
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

  const startSavedQuiz = (category, subDomain) => {
    navigation.navigate("Quiz", {
      categories: [category],
      subDomain: subDomain || null,
    });
  };

  const startCategoryQuiz = (category, subDomains = []) => {
    const categorySelections = (subDomains || [])
      .filter(Boolean)
      .map((item) => ({
        category,
        subDomain: item,
      }));

    if (categorySelections.length > 0) {
      navigation.navigate("Quiz", {
        categories: [category],
        selections: categorySelections,
      });
      return;
    }

    navigation.navigate("Quiz", {
      categories: [category],
    });
  };

  const handleQuizAll = () => {
    if (!isLoggedIn) {
      showLoginPrompt();
      return;
    }

    if (savedSelections.length === 0) {
      navigation.navigate("Categories");
      return;
    }

    const categories = [...new Set(savedSelections.map((item) => item.category))];

    navigation.navigate("Quiz", {
      categories,
      selections: savedSelections,
    });
  };

  const quickActions = [
    {
      key: "quiz",
      title: "Quiz All",
      icon: "play-circle-outline",
      onPress: handleQuizAll,
    },
    {
      key: "games",
      title: "Games",
      icon: "game-controller-outline",
      onPress: () => navigation.navigate("Games"),
    },
    {
      key: "performance",
      title: "Progress",
      icon: "stats-chart-outline",
      onPress: () => {
        if (isLoggedIn) {
          navigation.navigate("Performance");
        } else {
          showLoginPrompt();
        }
      },
    },
  ];

  // Group preferences by category
  const renderCategorySections = () => {
    if (Object.keys(groupedPreferences).length === 0) {
      console.log("No preferences available to render");
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>😕</Text>
          <Text style={styles.emptyStateText}>
            No categories available yet. Start by saving a few categories.
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
            <View style={styles.categoryHeaderMain}>
              <View style={styles.categoryIconContainer}>
                <Text style={styles.categoryEmoji}>{emoji}</Text>
              </View>
              <View style={styles.categoryTitleWrap}>
                <Text style={styles.categoryTitle}>{category}</Text>
                <Text style={styles.categoryMeta}>
                  {subDomains?.length || 0} saved {subDomains?.length === 1 ? "topic" : "topics"}
                </Text>
              </View>
            </View>
          <TouchableOpacity
              style={styles.categoryHeaderAction}
              onPress={() => {
                if (isLoggedIn) {
                  console.log(`Starting quiz for category: ${category}`);
                  startCategoryQuiz(category, subDomains);
                } else {
                  showLoginPrompt();
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={`Start quiz for ${category}`}
            >
              <Ionicons name="play" size={14} color={colors.brandDark} />
              <Ionicons name="chevron-forward" size={14} color={colors.brandDark} />
            </TouchableOpacity>
          </View>
          
          {subDomains && subDomains.length > 0 ? (
            <View style={styles.subdomainContainer}>
              <Text style={styles.subdomainLabel}>Select a topic to start a quiz!</Text>
              <View style={styles.subdomainList}>
                {subDomains.map((subdomain, index) => (
                  <TouchableOpacity
                    key={`${category}-${subdomain}-${index}`}
                    style={[ui.subdomainCard, styles.subdomainItem]}
                    onPress={() => {
                      if (isLoggedIn) {
                        console.log(`Starting quiz for ${category} - ${subdomain}`);
                        startSavedQuiz(category, subdomain);
                      } else {
                        showLoginPrompt();
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Start ${subdomain} quiz`}
                  >
                    <Text style={[ui.subdomainText, styles.subdomainText]}>{subdomain}</Text>
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

  if (loading) {
    return (
      <SafeAreaView style={ui.screenTint}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (!isLoggedIn) {
    return null;
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
          <Text style={ui.headerTitleLg}>MindMitra</Text>
          <View style={ui.headerSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={[ui.sectionCard, styles.heroCard, styles.contentMaxWidth]}>
            <Text style={styles.heroTitle}>
              {userName ? `Welcome back, ${userName}` : "Welcome back"}
            </Text>
          </View>

          <View style={[styles.sectionHeader, styles.contentMaxWidth]}>
            <Text style={styles.sectionTitle}>Quick access</Text>
          </View>

          <View style={[styles.quickGrid, styles.contentMaxWidth]}>
            {quickActions.map((action) => (
              <TouchableOpacity key={action.key} style={styles.quickCard} onPress={action.onPress}>
                <View style={styles.quickIconWrap}>
                  <Ionicons name={action.icon} size={22} color={colors.brandDark} />
                </View>
                <Text
                  style={styles.quickCardTitle}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.sectionHeader, styles.contentMaxWidth]}>
            <Text style={styles.sectionTitle}>Explore</Text>
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
            <Ionicons name="add-circle-outline" size={20} color={colors.brandDark} />
            <Text style={styles.addMoreText}>Manage Categories</Text>
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
  heroCard: {
    marginTop: spacing.lg,
    paddingVertical: spacing.xl,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  quickGrid: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.sm,
  },
  quickCard: {
    flex: 1,
    minHeight: 118,
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.slate200,
    alignItems: "center",
    justifyContent: "center",
    ...shadow({ color: colors.brandShadow, offsetHeight: 4, opacity: 0.08, radius: 10, elevation: 2 }),
  },
  quickIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brandTint,
  },
  quickCardTitle: {
    marginTop: spacing.md,
    width: "100%",
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    lineHeight: 19,
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
    borderRadius: radii.lg,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    gap: spacing.sm,
    ...shadow({ color: colors.brand, offsetHeight: 4, opacity: 0.1, radius: 8, elevation: 2 }),
  },
  addMoreText: {
    fontSize: type.button,
    fontWeight: "700",
    color: colors.brandDark,
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
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  categoryHeaderMain: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
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
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  categoryTitleWrap: {
    flex: 1,
  },
  categoryMeta: {
    marginTop: spacing.xs,
    fontSize: type.caption,
    color: colors.textMuted,
    fontWeight: "600",
  },
  categoryHeaderAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: colors.brandTint,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    gap: 0,
  },
  subdomainContainer: {
    marginTop: spacing.sm,
  },
  subdomainLabel: {
    fontSize: type.bodySm,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  subdomainList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  subdomainItem: {
    justifyContent: "center",
    ...shadow({ color: colors.brandShadow, offsetHeight: 2, opacity: 0.2, radius: 3, elevation: 2 }),
  },
  subdomainText: {
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
