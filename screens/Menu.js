import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
  Alert,
  Platform,
} from 'react-native';
import axios from 'axios';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { colors, shadow, spacing } from '../styles/theme';
import { ui } from '../styles/ui';
import { API_BASE_URL } from "../config/backend";
import { clearStoredSessionToken, getStoredSessionToken } from "../utils/session";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const getMenuWidth = (screenWidth) => {
  const isTablet = screenWidth >= 768;
  const minWidth = isTablet ? 320 : 260;
  const maxWidth = isTablet ? 420 : Math.min(360, screenWidth * 0.88);
  const preferred = isTablet ? screenWidth * 0.32 : screenWidth * 0.8;
  return clamp(preferred, minWidth, maxWidth);
};

const Menu = ({ navigation, isOpen, closeMenu, menuAnimation, isLoggedIn, handleLogout }) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const menuWidth = getMenuWidth(screenWidth);
  
  const primaryItems = [
    ...(isLoggedIn ? [{ label: 'Home', icon: 'home-outline', action: () => navigation.navigate("Home") }] : []),
    ...(isLoggedIn ? [{ label: 'Categories', icon: 'grid-outline', action: () => navigation.navigate("Categories") }] : []),
    { label: 'Games', icon: 'game-controller-outline', action: () => navigation.navigate("Games") },
    ...(isLoggedIn ? [{ label: 'Progress', icon: 'stats-chart-outline', action: () => navigation.navigate("Performance") }] : []),
    ...(isLoggedIn
      ? [{ label: 'Account', icon: 'person-circle-outline', action: () => navigation.navigate("Account") }]
      : [{ label: 'Log In / Sign Up', icon: 'log-in-outline', action: () => navigation.navigate("Login") }]),
  ];

  const handleDeleteAccount = async () => {
    try {
      Alert.alert(
        "Delete Account", 
        "Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete", 
            style: "destructive",
            onPress: async () => {
              try {
                const sessionToken = await getStoredSessionToken();
                
                if (!sessionToken) {
                  Alert.alert("Error", "You must be logged in to delete your account.");
                  return;
                }
                
                await axios.delete(`${API_BASE_URL}/api/auth/delete-account`, {
                  headers: { Authorization: `Bearer ${sessionToken}` },
                });
                
                await clearStoredSessionToken();
                
                Alert.alert(
                  "Account Deleted", 
                  "Your account has been successfully deleted.",
                  [{ text: "OK", onPress: () => { closeMenu(); navigation.replace("Login"); } }]
                );
              } catch (error) {
                console.error("Error deleting account:", error);
                Alert.alert("Error", "Failed to delete account. Please try again later.");
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error("Delete Account Error:", error);
      Alert.alert("Error", "Failed to process your request. Please try again.");
    }
  };
  
  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Full Screen Menu Container */}
      <Animated.View
        style={[
          styles.menuContainer,
          {
            width: menuWidth,
            height: screenHeight,
            transform: [{ translateX: menuAnimation }],
          },
        ]}
      >
        {/* Header */}
        <View style={[ui.headerRow, styles.header]}>
          <Text style={styles.title}>Menu</Text>
          <TouchableOpacity onPress={closeMenu} style={[ui.iconButton, styles.closeButton]}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>
        
        {/* Menu Items Container */}
        <View style={styles.menuItems}>
          {primaryItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuItem}
              onPress={() => {
                item.action();
                closeMenu();
              }}
            >
              <View style={styles.menuIconWrap}>
                <Ionicons name={item.icon} size={20} color={colors.slate600} />
              </View>
              <Text style={styles.menuText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
          
          {/* Account Actions */}
          {isLoggedIn && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.menuItem} onPress={async () => {
                if (handleLogout) {
                  handleLogout();
                } else {
                  await clearStoredSessionToken();
                  Alert.alert("Logout Successful", "You have been logged out.");
                  navigation.replace("Login");
                }
                closeMenu();
              }}>
                <View style={styles.menuIconWrap}>
                  <Ionicons name="log-out-outline" size={20} color={colors.dangerDark} />
                </View>
                <Text style={[styles.menuText, styles.dangerText]}>Logout</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.menuItem} onPress={() => { handleDeleteAccount(); }}>
                <View style={styles.menuIconWrap}>
                  <Ionicons name="trash-outline" size={20} color={colors.dangerDark} />
                </View>
                <Text style={[styles.menuText, styles.dangerText]}>Delete Account</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Animated.View>
      
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={closeMenu}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
    </>
  );
};

const styles = StyleSheet.create({
  menuContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: colors.white,
    ...shadow({ offsetWidth: 2, offsetHeight: 0, opacity: 0.15, radius: 8, elevation: 8 }),
    zIndex: 1000,
  },
  header: {
    paddingHorizontal: spacing.xxl,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: colors.slate50,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.slate800,
  },
  closeButton: {
    borderRadius: 20,
    backgroundColor: colors.slate100,
  },
  closeIcon: {
    fontSize: 16,
    color: colors.slate500,
    fontWeight: "600",
  },
  menuItems: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 0,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.slate100,
  },
  menuText: {
    fontSize: 17,
    color: colors.slate700,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: colors.slate200,
    marginVertical: 20,
    marginHorizontal: 0,
  },
  dangerText: {
    color: colors.dangerDark,
    fontWeight: "600",
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
});

export default Menu;