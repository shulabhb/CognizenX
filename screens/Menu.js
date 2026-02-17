import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  Platform,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';

import { colors, shadow, spacing } from '../styles/theme';
import { ui } from '../styles/ui';

// Switch to local backend for testing (change to false for production)
const USE_LOCAL_BACKEND = false;
const API_BASE_URL = USE_LOCAL_BACKEND 
  ? `http://127.0.0.1:6000`  // Local backend
  : `https://cognizen-x-backend.vercel.app`;  // Production backend
const { width, height } = Dimensions.get('window');

const Menu = ({ navigation, isOpen, closeMenu, menuAnimation, isLoggedIn, handleLogout }) => {
  
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
                const sessionToken = await AsyncStorage.getItem("sessionToken");
                
                if (!sessionToken) {
                  Alert.alert("Error", "You must be logged in to delete your account.");
                  return;
                }
                
                await axios.delete(`${API_BASE_URL}/api/auth/delete-account`, {
                  headers: { Authorization: `Bearer ${sessionToken}` },
                });
                
                await AsyncStorage.removeItem("sessionToken");
                
                Alert.alert(
                  "Account Deleted", 
                  "Your account has been successfully deleted.",
                  [{ text: "OK", onPress: () => { closeMenu(); navigation.replace("Home"); } }]
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
      <Animated.View style={[styles.menuContainer, { transform: [{ translateX: menuAnimation }] }]}>
        {/* Header */}
        <View style={[ui.headerRow, styles.header]}>
          <Text style={styles.title}>Menu</Text>
          <TouchableOpacity onPress={closeMenu} style={[ui.iconButton, styles.closeButton]}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>
        
        {/* Menu Items Container */}
        <View style={styles.menuItems}>
          <TouchableOpacity style={styles.menuItem} onPress={() => { navigation.navigate("Home"); closeMenu(); }}>
            <Text style={styles.menuIcon}>🏠</Text>
            <Text style={styles.menuText}>Home</Text>
          </TouchableOpacity>
          
          {isLoggedIn && (
            <TouchableOpacity style={styles.menuItem} onPress={() => { navigation.navigate("Categories"); closeMenu(); }}>
              <Text style={styles.menuIcon}>📂</Text>
              <Text style={styles.menuText}>Categories</Text>
            </TouchableOpacity>
          )}
          
          {!isLoggedIn && (
            <TouchableOpacity style={styles.menuItem} onPress={() => { navigation.navigate("Login"); closeMenu(); }}>
              <Text style={styles.menuIcon}>🔑</Text>
              <Text style={styles.menuText}>Log In / Sign Up</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.menuItem} onPress={() => { Alert.alert("Coming Soon", "History feature will be available in the next update!"); closeMenu(); }}>
            <Text style={styles.menuIcon}>🕒</Text>
            <Text style={styles.menuText}>History</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => { navigation.navigate("Games"); closeMenu(); }}>
            <Text style={styles.menuIcon}>🎮</Text>
            <Text style={styles.menuText}>Games</Text>
          </TouchableOpacity>
          
          {/* Account Actions */}
          {isLoggedIn && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.menuItem} onPress={() => {
                if (handleLogout) {
                  handleLogout();
                } else {
                  AsyncStorage.removeItem("sessionToken");
                  Alert.alert("Logout Successful", "You have been logged out.");
                  navigation.replace("Login");
                }
                closeMenu();
              }}>
                <Text style={styles.menuIcon}>🚪</Text>
                <Text style={[styles.menuText, styles.dangerText]}>Logout</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.menuItem} onPress={() => { handleDeleteAccount(); }}>
                <Text style={styles.menuIcon}>🗑️</Text>
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
    width: width * 0.8,
    height: height,
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
  menuIcon: {
    fontSize: 22,
    marginRight: 20,
    width: 28,
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